#!/usr/bin/env node

// ECForce 大量データ一括インポートツール（3年分のデータ用）
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'
import iconv from 'iconv-lite'
import { createReadStream } from 'fs'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 環境変数を読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// コマンドライン引数のパース
const args = process.argv.slice(2)
const options = {
  directory: null,
  pattern: '*.csv',
  dryRun: false,
  monthlyOnly: false, // 月次集計のみ生成（日次データはスキップ）
  batchSize: 200, // 最適化されたバッチサイズ
  parallel: false, // 並列処理
  startDate: null,
  endDate: null,
  help: false,
}

// 引数を処理
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  switch (arg) {
    case '--help':
    case '-h':
      options.help = true
      break
    case '--dir':
    case '-d':
      options.directory = args[++i]
      break
    case '--pattern':
    case '-p':
      options.pattern = args[++i]
      break
    case '--dry-run':
      options.dryRun = true
      break
    case '--monthly-only':
      options.monthlyOnly = true
      break
    case '--batch-size':
      options.batchSize = parseInt(args[++i]) || 200
      break
    case '--parallel':
      options.parallel = true
      break
    case '--start-date':
      options.startDate = args[++i]
      break
    case '--end-date':
      options.endDate = args[++i]
      break
  }
}

// ヘルプ表示
if (options.help || !options.directory) {
  console.log(`
ECForce 大量データ一括インポートツール

使用方法:
  node ecforce-bulk-import.mjs --dir <ディレクトリ> [オプション]

必須引数:
  --dir, -d <path>     インポートするCSVファイルがあるディレクトリ

オプション:
  --pattern <glob>     ファイルパターン (デフォルト: *.csv)
  --dry-run            実際にはインポートせず、処理内容を表示
  --monthly-only       月次集計のみ生成（日次データはスキップ）
  --batch-size <num>   バッチサイズ (デフォルト: 200)
  --parallel           並列処理を有効化
  --start-date <date>  開始日 (YYYY-MM-DD)
  --end-date <date>    終了日 (YYYY-MM-DD)
  --help, -h           このヘルプを表示

例:
  # 基本的な使用方法
  node ecforce-bulk-import.mjs --dir ./historical-data

  # 月次集計のみ（コスト削減）
  node ecforce-bulk-import.mjs --dir ./historical-data --monthly-only

  # 期間を指定
  node ecforce-bulk-import.mjs --dir ./historical-data --start-date 2023-01-01 --end-date 2023-12-31

  # ドライラン（実際にはインポートしない）
  node ecforce-bulk-import.mjs --dir ./historical-data --dry-run
`)
  process.exit(options.help ? 0 : 1)
}

// Convexクライアントの初期化
const convexUrl = process.env.VITE_CONVEX_URL
if (!convexUrl) {
  console.error('❌ VITE_CONVEX_URLが設定されていません')
  process.exit(1)
}

const client = new ConvexHttpClient(convexUrl)

// CSVファイルの解析（メモリ効率的なストリーミング処理）
async function parseCSVStream(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    const fileStream = createReadStream(filePath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let headers = null
    let lineNumber = 0

    rl.on('line', (line) => {
      lineNumber++

      // Shift-JISからUTF-8に変換
      const buffer = Buffer.from(line, 'binary')
      const utf8Line = iconv.decode(buffer, 'Shift_JIS')

      if (lineNumber === 1) {
        // ヘッダー行
        headers = Papa.parse(utf8Line).data[0]
      } else if (utf8Line.trim()) {
        // データ行
        const values = Papa.parse(utf8Line).data[0]
        if (values && values.length === headers.length) {
          const record = {}
          headers.forEach((header, index) => {
            record[header] = values[index]
          })

          // デバイス=合計のみフィルタ
          if (record['デバイス'] === '合計') {
            results.push(record)
          }
        }
      }
    })

    rl.on('close', () => {
      resolve(results)
    })

    rl.on('error', (error) => {
      reject(error)
    })
  })
}

// データ変換関数
function transformData(rawData, fileName) {
  const HEADER_MAPPING = {
    '期間': 'period',
    '日付': 'date',
    '広告主別': 'advertiser',
    'デバイス': 'device',
    '受注金額': 'orderAmount',
    '売上金額': 'salesAmount',
    'アクセス数': 'accessCount',
    'CV（受注）': 'cvOrder',
    'CVR（受注）': 'cvrOrder',
    'CV（決済）': 'cvPayment',
    'CVR（決済）': 'cvrPayment',
    'コスト': 'cost',
    'CV（アップセル）': 'cvUpsell',
    'CV（サンクスアップセル）': 'cvThanksUpsell',
    'CV（サンクスクロスセル）': 'cvThanksCrossSell',
    'オファー成功率（アップセル）': 'offerRateUpsell',
    'オファー成功率（サンクスアップセル）': 'offerRateThanksUpsell',
    'オファー成功率（サンクスクロスセル）': 'offerRateThanksCrossSell',
  }

  const transformedData = []

  for (const row of rawData) {
    const dateField = row['日付'] || row['期間']
    const rowDataDate = String(dateField).replace(/\//g, '-').split(' ')[0]

    // 日付フィルタ
    if (options.startDate && rowDataDate < options.startDate) continue
    if (options.endDate && rowDataDate > options.endDate) continue

    const transformed = { dataDate: rowDataDate }

    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = HEADER_MAPPING[key]
      if (mappedKey && key !== '期間' && key !== 'デバイス') {
        const strValue = String(value || '').trim()

        if (mappedKey === 'advertiser') {
          transformed[mappedKey] = strValue
          transformed.advertiserNormalized = strValue
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[　]/g, '')
            .trim()
        } else if (mappedKey === 'date') {
          transformed[mappedKey] = strValue.replace(/\//g, '-').split(' ')[0]
        } else if (
          mappedKey.includes('Amount') ||
          mappedKey.includes('cost') ||
          (mappedKey.includes('cv') && !mappedKey.includes('cvr')) ||
          mappedKey === 'accessCount'
        ) {
          const numValue = strValue.replace(/,/g, '').replace(/[^\d.-]/g, '')
          transformed[mappedKey] = parseInt(numValue) || 0
        } else if (mappedKey.includes('cvr') || mappedKey.includes('Rate')) {
          const percentValue = strValue.replace('%', '').replace(/[^\d.-]/g, '')
          transformed[mappedKey] = parseFloat(percentValue) / 100 || 0
        } else {
          transformed[mappedKey] = strValue
        }
      }
    })

    // 計算フィールド
    if (transformed.cvOrder > 0) {
      transformed.paymentRate = transformed.cvPayment / transformed.cvOrder
    }
    if (transformed.cvPayment > 0) {
      transformed.realCPA = Math.round(transformed.cost / transformed.cvPayment)
    }
    if (transformed.cost > 0) {
      transformed.roas = transformed.salesAmount / transformed.cost
    }

    if (transformed.advertiser) {
      transformedData.push(transformed)
    }
  }

  return transformedData
}

// メイン処理
async function main() {
  console.log('========================================')
  console.log('🚀 ECForce 大量データ一括インポート')
  console.log('========================================')
  console.log(`📁 ディレクトリ: ${options.directory}`)
  console.log(`📄 パターン: ${options.pattern}`)
  console.log(`📦 バッチサイズ: ${options.batchSize}`)
  console.log(`🔄 モード: ${options.monthlyOnly ? '月次集計のみ' : '日次データ+月次集計'}`)

  if (options.dryRun) {
    console.log('⚠️  ドライランモード（実際にはインポートしません）')
  }

  console.log('========================================\n')

  // CSVファイルを検索
  const files = fs.readdirSync(options.directory)
    .filter(f => f.endsWith('.csv'))
    .map(f => path.join(options.directory, f))
    .sort()

  console.log(`📊 ${files.length}個のCSVファイルを発見`)

  if (files.length === 0) {
    console.log('⚠️  処理するファイルがありません')
    return
  }

  // 全体の統計情報
  const stats = {
    totalFiles: files.length,
    totalRecords: 0,
    totalSuccess: 0,
    totalDuplicates: 0,
    totalErrors: 0,
    monthlyAggregates: new Set(),
    startTime: Date.now(),
  }

  // 各ファイルを処理
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const filePath = files[fileIndex]
    const fileName = path.basename(filePath)

    console.log(`\n📄 [${fileIndex + 1}/${files.length}] ${fileName}`)
    console.log('  解析中...')

    try {
      // CSVファイルを解析
      const rawData = await parseCSVStream(filePath)
      console.log(`  ✓ ${rawData.length}行のデータを読み込み`)

      // データ変換
      const transformedData = transformData(rawData, fileName)
      console.log(`  ✓ ${transformedData.length}行を変換完了`)

      stats.totalRecords += transformedData.length

      if (options.dryRun) {
        console.log('  ⚠️ ドライラン: インポートをスキップ')

        // 月次集計対象を記録
        transformedData.forEach(record => {
          const yearMonth = record.dataDate.substring(0, 7)
          stats.monthlyAggregates.add(yearMonth)
        })

        continue
      }

      // 日次データのインポート（月次集計のみモードではスキップ）
      if (!options.monthlyOnly) {
        console.log('  📤 日次データをインポート中...')

        // インポートセッション作成
        const importSession = await client.mutation(api.ecforce.createImport, {
          fileName,
          fileSize: fs.statSync(filePath).size,
          dataDate: transformedData[0]?.dataDate || 'unknown',
          source: 'bulk_import',
          totalRows: rawData.length,
          filteredRows: transformedData.length,
        })

        // バッチ処理
        const batches = []
        for (let i = 0; i < transformedData.length; i += options.batchSize) {
          batches.push(transformedData.slice(i, i + options.batchSize))
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          process.stdout.write(`    バッチ ${i + 1}/${batches.length}...`)

          const result = await client.mutation(api.ecforce.savePerformanceData, {
            importId: importSession.importId,
            data: batch,
            skipDuplicates: false, // 上書き更新
          })

          stats.totalSuccess += result.success
          stats.totalDuplicates += result.duplicates
          stats.totalErrors += result.errors

          process.stdout.write(` ✓\n`)
        }

        // インポート完了
        await client.mutation(api.ecforce.updateImportStatus, {
          importId: importSession.importId,
          processedRows: transformedData.length,
          successRows: stats.totalSuccess,
          duplicateRows: stats.totalDuplicates,
          errorRows: stats.totalErrors,
        })
      }

      // 月次集計対象を記録
      transformedData.forEach(record => {
        const yearMonth = record.dataDate.substring(0, 7)
        stats.monthlyAggregates.add(yearMonth)
      })

    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`)
      stats.totalErrors++
    }
  }

  // 月次集計の生成
  if (stats.monthlyAggregates.size > 0 && !options.dryRun) {
    console.log('\n📊 月次集計を生成中...')
    const yearMonths = Array.from(stats.monthlyAggregates).sort()

    for (const yearMonth of yearMonths) {
      process.stdout.write(`  ${yearMonth}...`)

      try {
        const result = await client.mutation(api.ecforceAggregates.generateMonthlyAggregates, {
          yearMonth,
        })

        process.stdout.write(` ✓ (作成: ${result.created}, 更新: ${result.updated})\n`)
      } catch (error) {
        process.stdout.write(` ❌ ${error.message}\n`)
      }
    }
  }

  // 統計情報の表示
  const duration = Math.round((Date.now() - stats.startTime) / 1000)

  console.log('\n========================================')
  console.log('📊 インポート完了')
  console.log('========================================')
  console.log(`  処理時間: ${duration}秒`)
  console.log(`  処理ファイル: ${stats.totalFiles}個`)
  console.log(`  総レコード数: ${stats.totalRecords}件`)

  if (!options.dryRun) {
    console.log(`  成功: ${stats.totalSuccess}件`)
    console.log(`  重複: ${stats.totalDuplicates}件`)
    console.log(`  エラー: ${stats.totalErrors}件`)
    console.log(`  月次集計: ${stats.monthlyAggregates.size}ヶ月分`)
  }

  console.log('========================================')

  // データ保持ポリシーの提案
  if (stats.monthlyAggregates.size > 12) {
    console.log('\n💡 推奨事項:')
    console.log('  1年以上前のデータは月次集計のみ保持することを推奨します。')
    console.log('  以下のコマンドで古い日次データをアーカイブできます:')
    console.log('  npx convex run ecforceAggregates:archiveOldDailyData --olderThanMonths 12 --deleteDaily true')
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error)
  process.exit(1)
})

// 実行
main()
  .then(() => {
    console.log('\n✅ 処理が完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error)
    process.exit(1)
  })