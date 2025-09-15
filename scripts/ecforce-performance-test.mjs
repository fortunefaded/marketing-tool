#!/usr/bin/env node

// ECForce インポート パフォーマンステストツール
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'
import iconv from 'iconv-lite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 環境変数を読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// テスト設定
const TEST_CONFIGS = [
  { batchSize: 50, name: 'Small' },
  { batchSize: 100, name: 'Medium' },
  { batchSize: 200, name: 'Large' },
  { batchSize: 500, name: 'XLarge' },
  { batchSize: 1000, name: 'XXLarge' },
]

// パフォーマンスメトリクス
class PerformanceMetrics {
  constructor(batchSize) {
    this.batchSize = batchSize
    this.startTime = Date.now()
    this.batchTimes = []
    this.apiCalls = 0
    this.recordsProcessed = 0
    this.errors = 0
    this.memorySnapshots = []
    this.convexOperations = {
      reads: 0,
      writes: 0,
      mutations: 0,
    }
  }

  startBatch() {
    return Date.now()
  }

  endBatch(startTime, recordCount) {
    const duration = Date.now() - startTime
    this.batchTimes.push(duration)
    this.recordsProcessed += recordCount
    this.apiCalls++
    this.convexOperations.mutations++
    this.convexOperations.writes += recordCount
  }

  recordError() {
    this.errors++
  }

  takeMemorySnapshot() {
    const usage = process.memoryUsage()
    this.memorySnapshots.push({
      timestamp: Date.now() - this.startTime,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    })
  }

  getReport() {
    const totalTime = Date.now() - this.startTime
    const avgBatchTime = this.batchTimes.length > 0
      ? this.batchTimes.reduce((a, b) => a + b, 0) / this.batchTimes.length
      : 0
    const throughput = this.recordsProcessed / (totalTime / 1000) // records per second
    const maxMemory = Math.max(...this.memorySnapshots.map(s => s.heapUsed))
    const avgMemory = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.memorySnapshots.length
      : 0

    return {
      batchSize: this.batchSize,
      totalTime: Math.round(totalTime / 1000), // seconds
      recordsProcessed: this.recordsProcessed,
      throughput: Math.round(throughput),
      apiCalls: this.apiCalls,
      avgBatchTime: Math.round(avgBatchTime),
      maxBatchTime: Math.max(...this.batchTimes),
      minBatchTime: Math.min(...this.batchTimes),
      errors: this.errors,
      errorRate: (this.errors / this.recordsProcessed * 100).toFixed(2),
      memory: {
        max: maxMemory,
        avg: Math.round(avgMemory),
      },
      convexOperations: this.convexOperations,
      efficiency: {
        // API効率: 少ないAPI呼び出しで多くのレコードを処理
        apiEfficiency: Math.round(this.recordsProcessed / this.apiCalls),
        // 時間効率: バッチサイズに対する処理時間の比率
        timeEfficiency: Math.round(this.batchSize / avgBatchTime * 1000),
        // コスト指標: Convex操作数に基づく推定
        estimatedCost: this.convexOperations.writes * 0.001 + this.convexOperations.reads * 0.0001,
      },
    }
  }
}

// CSVデータの準備（テスト用サンプルデータ生成）
function generateTestData(recordCount) {
  const data = []
  const startDate = new Date('2024-01-01')

  for (let i = 0; i < recordCount; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + Math.floor(i / 10)) // 10レコードごとに日付を進める

    data.push({
      advertiser: 'テスト広告主',
      advertiserNormalized: 'テスト広告主',
      dataDate: currentDate.toISOString().split('T')[0],
      date: currentDate.toISOString().split('T')[0],
      orderAmount: Math.floor(Math.random() * 100000),
      salesAmount: Math.floor(Math.random() * 100000),
      cost: Math.floor(Math.random() * 50000),
      accessCount: Math.floor(Math.random() * 1000),
      cvOrder: Math.floor(Math.random() * 50),
      cvrOrder: Math.random() * 0.1,
      cvPayment: Math.floor(Math.random() * 40),
      cvrPayment: Math.random() * 0.08,
      cvThanksUpsell: Math.floor(Math.random() * 10),
      offerRateThanksUpsell: Math.random() * 0.3,
      paymentRate: Math.random(),
      realCPA: Math.floor(Math.random() * 5000),
      roas: Math.random() * 3,
    })
  }

  return data
}

// テスト実行
async function runPerformanceTest(batchSize, testData) {
  const metrics = new PerformanceMetrics(batchSize)
  const convexUrl = process.env.VITE_CONVEX_URL

  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URLが設定されていません')
  }

  const client = new ConvexHttpClient(convexUrl)

  console.log(`\n🧪 バッチサイズ ${batchSize} でテスト開始...`)

  // メモリ使用量の初期スナップショット
  metrics.takeMemorySnapshot()

  // インポートセッション作成
  const importSession = await client.mutation(api.ecforce.createImport, {
    fileName: `performance_test_${batchSize}.csv`,
    fileSize: JSON.stringify(testData).length,
    dataDate: testData[0].dataDate,
    source: 'performance_test',
    totalRows: testData.length,
    filteredRows: testData.length,
  })

  // バッチ処理
  const batches = []
  for (let i = 0; i < testData.length; i += batchSize) {
    batches.push(testData.slice(i, i + batchSize))
  }

  console.log(`  ${batches.length}個のバッチを処理中...`)
  const progressInterval = Math.max(1, Math.floor(batches.length / 10))

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const batchStart = metrics.startBatch()

    try {
      const result = await client.mutation(api.ecforce.savePerformanceData, {
        importId: importSession.importId,
        data: batch,
        skipDuplicates: false,
      })

      metrics.endBatch(batchStart, batch.length)

      // 進捗表示
      if (i % progressInterval === 0 || i === batches.length - 1) {
        const progress = Math.round((i + 1) / batches.length * 100)
        process.stdout.write(`\r  進捗: ${progress}% (${i + 1}/${batches.length})`)
      }

      // 定期的にメモリスナップショット
      if (i % 10 === 0) {
        metrics.takeMemorySnapshot()
      }

    } catch (error) {
      metrics.recordError()
      console.error(`\n  ❌ バッチ ${i + 1} でエラー:`, error.message)
    }
  }

  process.stdout.write('\n')

  // 最終メモリスナップショット
  metrics.takeMemorySnapshot()

  // クリーンアップ（テストデータを削除）
  await client.mutation(api.ecforce.updateImportStatus, {
    importId: importSession.importId,
    status: 'test_completed',
    processedRows: testData.length,
    successRows: testData.length - metrics.errors,
    errorRows: metrics.errors,
    duplicateRows: 0,
  })

  return metrics.getReport()
}

// メイン処理
async function main() {
  console.log('========================================')
  console.log('📊 ECForce インポート パフォーマンステスト')
  console.log('========================================')

  // コマンドライン引数の処理
  const args = process.argv.slice(2)
  let recordCount = 1000 // デフォルト
  let specificBatchSize = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--records' || args[i] === '-r') {
      recordCount = parseInt(args[++i]) || 1000
    } else if (args[i] === '--batch-size' || args[i] === '-b') {
      specificBatchSize = parseInt(args[++i])
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
使用方法:
  node ecforce-performance-test.mjs [オプション]

オプション:
  --records, -r <num>     テストレコード数 (デフォルト: 1000)
  --batch-size, -b <num>  特定のバッチサイズのみテスト
  --help, -h              このヘルプを表示

例:
  # 5000レコードで全バッチサイズをテスト
  node ecforce-performance-test.mjs --records 5000

  # バッチサイズ200のみテスト
  node ecforce-performance-test.mjs --batch-size 200 --records 2000
`)
      process.exit(0)
    }
  }

  console.log(`\n📝 テスト設定:`)
  console.log(`  レコード数: ${recordCount}`)
  console.log(`  バッチサイズ: ${specificBatchSize || 'すべて (50, 100, 200, 500, 1000)'}`)
  console.log('')

  // テストデータ生成
  console.log('🔧 テストデータを生成中...')
  const testData = generateTestData(recordCount)
  console.log(`✅ ${testData.length}件のテストデータを生成しました`)

  // テスト実行
  const results = []
  const configs = specificBatchSize
    ? [{ batchSize: specificBatchSize, name: `Custom-${specificBatchSize}` }]
    : TEST_CONFIGS

  for (const config of configs) {
    try {
      const report = await runPerformanceTest(config.batchSize, testData)
      results.push(report)

      // 各テスト間で少し待機（Convexの負荷を分散）
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`❌ バッチサイズ ${config.batchSize} のテストでエラー:`, error)
    }
  }

  // 結果レポート
  console.log('\n========================================')
  console.log('📈 パフォーマンステスト結果')
  console.log('========================================\n')

  // テーブル形式で表示
  console.table(results.map(r => ({
    'バッチサイズ': r.batchSize,
    '処理時間(秒)': r.totalTime,
    'スループット(件/秒)': r.throughput,
    'API呼び出し': r.apiCalls,
    '平均バッチ時間(ms)': r.avgBatchTime,
    'エラー率(%)': r.errorRate,
    '最大メモリ(MB)': r.memory.max,
    'API効率': r.efficiency.apiEfficiency,
    '推定コスト($)': r.efficiency.estimatedCost.toFixed(4),
  })))

  // 最適なバッチサイズの推奨
  console.log('\n💡 分析結果:')

  // スループットが最高のもの
  const bestThroughput = results.reduce((best, current) =>
    current.throughput > best.throughput ? current : best
  )

  // エラー率が最低のもの
  const bestErrorRate = results.reduce((best, current) =>
    parseFloat(current.errorRate) < parseFloat(best.errorRate) ? current : best
  )

  // コスト効率が最高のもの
  const bestCost = results.reduce((best, current) =>
    current.efficiency.estimatedCost < best.efficiency.estimatedCost ? current : best
  )

  console.log(`  🏆 最高スループット: バッチサイズ ${bestThroughput.batchSize} (${bestThroughput.throughput}件/秒)`)
  console.log(`  ✅ 最低エラー率: バッチサイズ ${bestErrorRate.batchSize} (${bestErrorRate.errorRate}%)`)
  console.log(`  💰 最低コスト: バッチサイズ ${bestCost.batchSize} ($${bestCost.efficiency.estimatedCost.toFixed(4)})`)

  // 総合推奨
  const scores = results.map(r => ({
    batchSize: r.batchSize,
    score: (
      (r.throughput / bestThroughput.throughput) * 0.3 +  // スループット重視
      (1 - parseFloat(r.errorRate) / 100) * 0.3 +        // エラー率重視
      (bestCost.efficiency.estimatedCost / r.efficiency.estimatedCost) * 0.2 + // コスト重視
      (1 - r.memory.max / 500) * 0.2                      // メモリ使用量
    ),
  }))

  const recommended = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  )

  console.log(`\n🎯 推奨バッチサイズ: ${recommended.batchSize}`)
  console.log(`   (総合スコア: ${(recommended.score * 100).toFixed(1)}/100)`)

  // 詳細レポートをファイルに保存
  const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify({
    config: {
      recordCount,
      testDate: new Date().toISOString(),
    },
    results,
    recommendations: {
      bestThroughput: bestThroughput.batchSize,
      bestErrorRate: bestErrorRate.batchSize,
      bestCost: bestCost.batchSize,
      overall: recommended.batchSize,
    },
  }, null, 2))

  console.log(`\n📄 詳細レポートを保存: ${reportPath}`)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error)
  process.exit(1)
})

// 実行
main()
  .then(() => {
    console.log('\n✅ パフォーマンステスト完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ テスト失敗:', error)
    process.exit(1)
  })