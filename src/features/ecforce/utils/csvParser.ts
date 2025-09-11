import { parse as papaParse, ParseResult } from 'papaparse'

// CSVヘッダーマッピング
const HEADER_MAPPING: Record<string, string> = {
  期間: 'period',
  日付: 'date',
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
    // Shift-JIS → UTF-8変換
    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder('shift-jis')
    const text = decoder.decode(buffer)

    // CSV解析
    const result: ParseResult<any> = papaParse(text, {
      header: true,
      skipEmptyLines: true,
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

    // データ変換
    const transformedData: ECForceRecord[] = []
    const dateSet = new Set<string>() // 日付の種類を収集

    filteredData.forEach((row: any, index: number) => {
      try {
        // 各行から日付を取得（「日付」フィールドを優先、なければ「期間」フィールドから抽出）
        const dateField = row['日付'] || row['期間']
        if (!dateField) {
          throw new Error('日付または期間フィールドが設定されていません')
        }

        // 日付フォーマットを正規化
        let rowDataDate = String(dateField).replace(/\//g, '-')
        if (row['日付']) {
          // 日付フィールドの場合はそのまま使用: "2025/08/01" → "2025-08-01"
          rowDataDate = rowDataDate.split(' ')[0] // 念のため時刻部分があれば除去
        } else {
          // 期間フィールドの場合は時刻部分を除去: "2025-09-09 00:00:00 - 2025-09-09 23:59:59" → "2025-09-09"
          rowDataDate = rowDataDate.split(' ')[0]
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
  limit: number = 1000
): Promise<{
  headers: string[]
  rows: any[]
  error?: string
  dateRange?: { startDate: string; endDate: string; uniqueDates: string[] }
  totalRows: number
  filteredRows: number
}> {
  try {
    // Shift-JIS → UTF-8変換
    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder('shift-jis')
    const text = decoder.decode(buffer)

    // 全データを解析（統計情報用）
    const fullResult: ParseResult<any> = papaParse(text, {
      header: true,
      skipEmptyLines: true,
    })

    // プレビュー用にも全データを解析
    const result: ParseResult<any> = fullResult

    if (result.errors && result.errors.length > 0) {
      return {
        headers: [],
        rows: [],
        error: result.errors[0].message,
      }
    }

    const headers = result.meta.fields || []
    const rows = result.data

    // 統計情報（全データから計算）
    const totalRows = fullResult.data.length
    const allFilteredRows = fullResult.data.filter((row: any) => row['デバイス'] === '合計')
    const filteredRowsCount = allFilteredRows.length

    // プレビュー用の複数日付の抽出
    let dateRange: { startDate: string; endDate: string; uniqueDates: string[] } | undefined
    const filteredRows = rows.filter((row: any) => row['デバイス'] === '合計')

    if (filteredRows.length > 0) {
      const dateSet = new Set<string>()
      filteredRows.forEach((row: any) => {
        const dateField = row['日付'] || row['期間']
        if (dateField) {
          let normalizedDate = String(dateField).replace(/\//g, '-')
          if (row['日付']) {
            // 日付フィールドの場合はそのまま使用
            normalizedDate = normalizedDate.split(' ')[0] // 念のため時刻部分があれば除去
          } else {
            // 期間フィールドの場合は時刻部分を除去
            normalizedDate = normalizedDate.split(' ')[0]
          }
          dateSet.add(normalizedDate)
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

    return { headers, rows, dateRange, totalRows, filteredRows: filteredRowsCount }
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
