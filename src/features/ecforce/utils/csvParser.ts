import { parse as papaParse, ParseResult } from 'papaparse'
import * as Encoding from 'encoding-japanese'

// CSVヘッダーマッピング
const HEADER_MAPPING: Record<string, string> = {
  期間: 'period',
  日付: 'date',
  広告主別: 'advertiser',
  デバイス: 'device',
  受注金額: 'orderAmount',
  売上金額: 'salesAmount',
  アクセス数: 'accessCount',
  'CV（受注）': 'cvOrder',
  'CVR（受注）': 'cvrOrder',
  'CV（決済）': 'cvPayment',
  'CVR（決済）': 'cvrPayment',
  コスト: 'cost',
  'CV（サンクスアップセル）': 'cvThanksUpsell',
  'オファー成功率（サンクスアップセル）': 'offerRateThanksUpsell',
}

// パース結果の型定義
export interface ECForceRecord {
  advertiser: string
  advertiserNormalized: string
  dataDate: string
  date?: string
  orderAmount: number
  salesAmount: number
  cost: number
  accessCount: number
  cvOrder: number
  cvrOrder: number
  cvPayment: number
  cvrPayment: number
  cvThanksUpsell: number
  offerRateThanksUpsell: number
  paymentRate?: number
  realCPA?: number
  roas?: number
}

export interface ECForceParseResult {
  data: ECForceRecord[]
  totalRows: number
  filteredRows: number
  errors: Array<{ row: number; message: string }>
  dateRange?: {
    startDate: string
    endDate: string
    uniqueDates: string[]
  } // CSVから抽出された日付範囲
}

// Shift-JIS対応CSVパーサー
export async function parseECForceCSV(file: File): Promise<ECForceParseResult> {
  const errors: Array<{ row: number; message: string }> = []

  try {
    // ファイルをバイト配列として読み込み
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // encoding-japaneseでエンコーディングを自動検出して変換
    const detectedEncoding = Encoding.detect(uint8Array)
    console.log('🔍 検出されたエンコーディング:', detectedEncoding)

    // UTF-8に変換
    const unicodeArray = Encoding.convert(uint8Array, {
      to: 'UNICODE',
      from: detectedEncoding || 'SJIS', // 検出できない場合はShift-JISと仮定
    })

    // UTF-8文字列に変換
    const text = Encoding.codeToString(unicodeArray)

    // エンコーディング変換後の最初の数行を確認
    const lines = text.split('\n').slice(0, 3)
    console.log('📄 変換後のCSV最初の3行:')
    lines.forEach((line, i) => console.log(`  ${i + 1}: ${line.substring(0, 100)}...`))

    // CSV解析
    const result: ParseResult<any> = papaParse(text, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8', // Shift-JISはすでにUTF-8に変換済み
    })

    if (result.errors && result.errors.length > 0) {
      result.errors.forEach((error: any) => {
        errors.push({
          row: error.row || 0,
          message: error.message,
        })
      })
    }

    // デバイス=「合計」のみフィルタリング
    const filteredData = result.data.filter((row: any) => row['デバイス'] === '合計')

    // フィルタ結果を確認
    console.log(`📊 CSVデータ: 全${result.data.length}行中、デバイス="合計"は${filteredData.length}行`)

    // デバイス列の値を確認（デバッグ用）
    if (result.data.length > 0) {
      const deviceValues = new Set(result.data.map((row: any) => row['デバイス']))
      console.log('📱 デバイス列の値:', Array.from(deviceValues))
    }

    // 「合計」行が存在しない場合、すべての行を使用
    const dataToProcess = filteredData.length > 0 ? filteredData : result.data

    if (filteredData.length === 0) {
      console.log('⚠️ デバイス="合計"の行が見つかりません。すべての行を処理します。')
    }

    // データ変換
    const transformedData: ECForceRecord[] = []
    const dateSet = new Set<string>() // 日付の種類を収集

    dataToProcess.forEach((row: any, index: number) => {
      try {
        // デバッグ: 利用可能なフィールドを確認
        if (index === 0) {
          console.log('=== 🔍 ECForce CSVパース デバッグ情報 ===')
          console.log('📋 利用可能なすべてのフィールド:')
          Object.keys(row).forEach(key => {
            console.log(`  - "${key}": "${row[key]}"`)
          })
          console.log('=====================================')
        }

        // 各行から日付を取得（複数のパターンに対応）
        let dateField = row['日付'] || row['期間'] || row['日時'] || row['date'] || row['Date']

        // より多くのパターンをチェック
        const datePatterns = [
          '日付', '期間', '日時', 'date', 'Date', 'DATE',
          '購入日', '注文日', '作成日', '登録日',
          '受注日', '決済日', '出荷日', '配送日',
          'order_date', 'purchase_date', 'created_at',
          'timestamp', 'datetime', 'DateTime'
        ]

        if (!dateField) {
          console.log('⚠️ 標準的な日付フィールドが見つかりません。拡張パターンで検索中...')

          // 日付が見つからない場合は、キーから日付らしいものを探す
          for (const key of Object.keys(row)) {
            const lowerKey = key.toLowerCase()
            for (const pattern of datePatterns) {
              if (lowerKey.includes(pattern.toLowerCase()) && row[key]) {
                dateField = row[key]
                console.log(`✅ 日付フィールド発見: "${key}" = "${dateField}"`)
                break
              }
            }
            if (dateField) break
          }

          // それでも見つからない場合は、日付形式のデータを探す
          if (!dateField) {
            console.log('⚠️ 日付フィールド名が見つかりません。データ形式から日付を検索中...')
            for (const key of Object.keys(row)) {
              const value = String(row[key] || '').trim()
              // YYYY/MM/DD, YYYY-MM-DD, YYYY年MM月DD日 のパターンを検出
              if (value.match(/^\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日]?/)) {
                dateField = value
                console.log(`✅ 日付データ発見: "${key}" = "${dateField}"`)
                break
              }
            }
          }
        }

        if (!dateField) {
          console.error('❌ 日付フィールドが見つかりません')
          console.error('利用可能なフィールド:', Object.keys(row))
          throw new Error(`日付フィールドが見つかりません。利用可能なフィールド: ${Object.keys(row).join(', ')}`)
        }

        // 日付フォーマットを正規化
        let rowDataDate = String(dateField).trim()

        // 複数の日付フォーマットに対応
        // パターン1: "2025/08/01" or "2025-08-01"
        // パターン2: "2025/08/01 00:00:00 - 2025/08/01 23:59:59"
        // パターン3: "2025年8月1日"

        // スラッシュをハイフンに変換
        rowDataDate = rowDataDate.replace(/\//g, '-')

        // 期間形式の場合、最初の日付を抽出
        if (rowDataDate.includes(' - ')) {
          rowDataDate = rowDataDate.split(' - ')[0]
        }

        // 時刻部分を除去
        rowDataDate = rowDataDate.split(' ')[0]

        // 年月日形式を変換
        const japaneseMatch = rowDataDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        if (japaneseMatch) {
          const [, year, month, day] = japaneseMatch
          rowDataDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }

        // 最終的な日付形式をチェック (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rowDataDate)) {
          console.warn(`不正な日付形式: "${rowDataDate}" (行: ${index + 2})`)
        }

        dateSet.add(rowDataDate)

        const transformed: any = { dataDate: rowDataDate }

        // 各フィールドをマッピング
        Object.entries(row).forEach(([key, value]) => {
          const mappedKey = HEADER_MAPPING[key]
          if (mappedKey && key !== '期間' && key !== 'デバイス') {
            const strValue = String(value || '').trim()

            // デバッグ: CVR関連の値を確認
            if (key.includes('CVR')) {
              console.log(`処理中: ${key} = "${value}" → mappedKey: ${mappedKey}`)
            }

            // 数値変換
            if (mappedKey === 'advertiser') {
              transformed[mappedKey] = strValue
            } else if (mappedKey === 'date') {
              // 日付フィールドをフォーマット（例: "2025/08/01" → "2025-08-01"）
              let formattedDate = strValue.replace(/\//g, '-')
              // 時刻情報が含まれている場合は日付部分のみ抽出
              formattedDate = formattedDate.split(' ')[0]
              transformed[mappedKey] = formattedDate
            } else if (
              mappedKey.includes('Amount') ||
              mappedKey.includes('cost') ||
              (mappedKey.includes('cv') && !mappedKey.includes('cvr')) || // cvrは除外
              mappedKey === 'accessCount'
            ) {
              // カンマを除去して数値に変換
              const numValue = strValue.replace(/,/g, '').replace(/[^\d.-]/g, '')
              transformed[mappedKey] = parseInt(numValue) || 0

              // デバッグ: CV系の処理を確認
              if (mappedKey.includes('cv')) {
                console.log(`  → 整数処理: ${mappedKey} = ${transformed[mappedKey]}`)
              }
            }
            // パーセンテージ変換（％を小数に）
            else if (mappedKey.includes('cvr') || mappedKey.includes('Rate')) {
              // CSVの値は既にパーセント値（例：7.46）なので、100で割って小数に変換
              const percentValue = strValue.replace('%', '').replace(/[^\d.-]/g, '')
              const finalValue = parseFloat(percentValue) / 100 || 0

              // デバッグログ
              console.log(
                `  → パーセント処理: ${mappedKey}: "${strValue}" → ${percentValue} → ${finalValue}`
              )

              transformed[mappedKey] = finalValue
            } else {
              transformed[mappedKey] = strValue
            }
          }
        })

        // 広告主名が設定されていることを確認
        if (!transformed.advertiser) {
          throw new Error('広告主名が設定されていません')
        }

        // 広告主名の正規化
        transformed.advertiserNormalized = transformed.advertiser
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[　]/g, '') // 全角スペースも除去
          .trim()

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

        // デバッグ: 変換後の値を確認
        if (index === 0) {
          // 最初のレコードのみ
          console.log('=== 変換後の最初のレコード ===')
          console.log('cvrOrder:', transformed.cvrOrder, typeof transformed.cvrOrder)
          console.log('cvrPayment:', transformed.cvrPayment, typeof transformed.cvrPayment)
          console.log(
            'offerRateThanksUpsell:',
            transformed.offerRateThanksUpsell,
            typeof transformed.offerRateThanksUpsell
          )
        }

        transformedData.push(transformed as ECForceRecord)
      } catch (error) {
        errors.push({
          row: index + 2, // ヘッダー行を考慮
          message: error instanceof Error ? error.message : '変換エラー',
        })
      }
    })

    // 日付範囲を計算
    let dateRange: { startDate: string; endDate: string; uniqueDates: string[] } | undefined
    if (dateSet.size > 0) {
      const sortedDates = Array.from(dateSet).sort()
      dateRange = {
        startDate: sortedDates[0],
        endDate: sortedDates[sortedDates.length - 1],
        uniqueDates: sortedDates,
      }
    }

    return {
      data: transformedData,
      totalRows: result.data.length,
      filteredRows: filteredData.length,
      errors,
      dateRange,
    }
  } catch (error) {
    return {
      data: [],
      totalRows: 0,
      filteredRows: 0,
      errors: [
        {
          row: 0,
          message: error instanceof Error ? error.message : 'ファイル読み込みエラー',
        },
      ],
      dateRange: undefined,
    }
  }
}

// CSVプレビュー用（最初のN件のみ）
export async function previewECForceCSV(
  file: File,
  limit: number = 10
): Promise<{
  headers: string[]
  rows: any[]
  error?: string
  dateRange?: { startDate: string; endDate: string; uniqueDates: string[] }
  totalRows: number
  filteredRows: number
}> {
  try {
    // ファイルをバイト配列として読み込み
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // encoding-japaneseでエンコーディングを自動検出して変換
    const detectedEncoding = Encoding.detect(uint8Array)
    console.log('🔍 プレビュー: 検出されたエンコーディング:', detectedEncoding)

    // UTF-8に変換
    const unicodeArray = Encoding.convert(uint8Array, {
      to: 'UNICODE',
      from: detectedEncoding || 'SJIS', // 検出できない場合はShift-JISと仮定
    })

    // UTF-8文字列に変換
    const text = Encoding.codeToString(unicodeArray)

    // エンコーディング変換後の最初の数行を確認
    const lines = text.split('\n').slice(0, 3)
    console.log('📄 プレビュー: 変換後のCSV最初の3行:')
    lines.forEach((line, i) => console.log(`  ${i + 1}: ${line.substring(0, 100)}...`))

    // 全データを解析（統計情報用）
    const fullResult: ParseResult<any> = papaParse(text, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8', // Shift-JISはすでにUTF-8に変換済み
    })

    // プレビュー用に件数を制限
    const result: ParseResult<any> = {
      ...fullResult,
      data: fullResult.data.slice(0, limit * 3), // デバイス=合計のフィルタ前なので多めに取得
    }

    if (result.errors && result.errors.length > 0) {
      return {
        headers: [],
        rows: [],
        error: result.errors[0].message,
        totalRows: 0,
        filteredRows: 0,
      }
    }

    const headers = result.meta.fields || []
    const rows = result.data

    // 統計情報（全データから計算）
    const totalRows = fullResult.data.length
    const allFilteredRows = fullResult.data.filter((row: any) => row['デバイス'] === '合計')
    const filteredRowsCount = allFilteredRows.length

    console.log(`📊 プレビュー: 全${totalRows}行中、デバイス="合計"は${filteredRowsCount}行`)

    // デバイス列の値を確認（デバッグ用）
    if (fullResult.data.length > 0) {
      const deviceValues = new Set(fullResult.data.map((row: any) => row['デバイス']))
      console.log('📱 プレビュー: デバイス列の値:', Array.from(deviceValues))
    }

    // プレビュー用のデータを制限（デバイス=合計がある場合はそれを、ない場合は全データを使用）
    const previewData = filteredRowsCount > 0 ?
      rows.filter((row: any) => row['デバイス'] === '合計').slice(0, limit) :
      rows.slice(0, limit)

    const dataForDateExtraction = filteredRowsCount > 0 ? allFilteredRows : fullResult.data

    if (filteredRowsCount === 0) {
      console.log('⚠️ プレビュー: デバイス="合計"の行が見つかりません。すべての行を使用します。')
    }

    // 日付範囲の抽出（適切なデータから）
    let dateRange: { startDate: string; endDate: string; uniqueDates: string[] } | undefined
    if (dataForDateExtraction.length > 0) {
      const dateSet = new Set<string>()
      dataForDateExtraction.forEach((row: any, index: number) => {
        // デバッグ: 最初の行で利用可能なフィールドを確認
        if (index === 0) {
          console.log('=== 📊 プレビュー: ECForce CSV フィールド確認 ===')
          console.log('利用可能なフィールド:', Object.keys(row))
        }

        // 複数のパターンに対応
        let dateField = row['日付'] || row['期間'] || row['日時'] || row['date'] || row['Date']

        // より多くのパターンをチェック
        const datePatterns = [
          '日付', '期間', '日時', 'date', 'Date', 'DATE',
          '購入日', '注文日', '作成日', '登録日',
          '受注日', '決済日', '出荷日', '配送日',
          'order_date', 'purchase_date', 'created_at',
          'timestamp', 'datetime', 'DateTime'
        ]

        if (!dateField) {
          // 日付が見つからない場合は、キーから日付らしいものを探す
          for (const key of Object.keys(row)) {
            const lowerKey = key.toLowerCase()
            for (const pattern of datePatterns) {
              if (lowerKey.includes(pattern.toLowerCase()) && row[key]) {
                dateField = row[key]
                if (index === 0) {
                  console.log(`✅ プレビュー: 日付フィールド発見: "${key}"`)
                }
                break
              }
            }
            if (dateField) break
          }

          // それでも見つからない場合は、日付形式のデータを探す
          if (!dateField) {
            for (const key of Object.keys(row)) {
              const value = String(row[key] || '').trim()
              // YYYY/MM/DD, YYYY-MM-DD, YYYY年MM月DD日 のパターンを検出
              if (value.match(/^\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日]?/)) {
                dateField = value
                if (index === 0) {
                  console.log(`✅ プレビュー: 日付データ発見: "${key}" = "${dateField}"`)
                }
                break
              }
            }
          }
        }

        if (dateField) {
          let normalizedDate = String(dateField).trim().replace(/\//g, '-')

          // 期間形式の場合、最初の日付を抽出
          if (normalizedDate.includes(' - ')) {
            normalizedDate = normalizedDate.split(' - ')[0]
          }

          // 時刻部分を除去
          normalizedDate = normalizedDate.split(' ')[0]

          // 年月日形式を変換
          const japaneseMatch = normalizedDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
          if (japaneseMatch) {
            const [, year, month, day] = japaneseMatch
            normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }

          // 有効な日付形式のみ追加
          if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
            dateSet.add(normalizedDate)
          }
        }
      })

      if (dateSet.size > 0) {
        const sortedDates = Array.from(dateSet).sort()
        dateRange = {
          startDate: sortedDates[0],
          endDate: sortedDates[sortedDates.length - 1],
          uniqueDates: sortedDates,
        }
      }
    }

    // プレビュー用のrows（制限付き）を返す
    return { headers, rows: previewData, dateRange, totalRows, filteredRows: filteredRowsCount }
  } catch (error) {
    return {
      headers: [],
      rows: [],
      error: error instanceof Error ? error.message : 'プレビューエラー',
      totalRows: 0,
      filteredRows: 0,
    }
  }
}

// 広告主リスト取得（重複チェック用）
export function extractAdvertisers(data: ECForceRecord[]): string[] {
  const advertisersSet = new Set(data.map((record) => record.advertiser))
  return Array.from(advertisersSet)
}
