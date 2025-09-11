import { parse as papaParse, ParseResult } from 'papaparse'

// CSVヘッダーマッピング
const HEADER_MAPPING: Record<string, string> = {
  期間: 'period',
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
  'CV（アップセル）': 'cvUpsell',
  'CV（サンクスアップセル）': 'cvThanksUpsell',
  'CV（サンクスクロスセル）': 'cvThanksCrossSell',
  'オファー成功率（アップセル）': 'offerRateUpsell',
  'オファー成功率（サンクスアップセル）': 'offerRateThanksUpsell',
  'オファー成功率（サンクスクロスセル）': 'offerRateThanksCrossSell',
}

// パース結果の型定義
export interface ECForceRecord {
  advertiser: string
  advertiserNormalized: string
  dataDate: string
  orderAmount: number
  salesAmount: number
  cost: number
  accessCount: number
  cvOrder: number
  cvrOrder: number
  cvPayment: number
  cvrPayment: number
  cvUpsell: number
  cvThanksUpsell: number
  cvThanksCrossSell: number
  offerRateUpsell: number
  offerRateThanksUpsell: number
  offerRateThanksCrossSell: number
  paymentRate?: number
  realCPA?: number
  roas?: number
}

export interface ECForceParseResult {
  data: ECForceRecord[]
  totalRows: number
  filteredRows: number
  errors: Array<{ row: number; message: string }>
}

// Shift-JIS対応CSVパーサー
export async function parseECForceCSV(file: File, dataDate: string): Promise<ECForceParseResult> {
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

    filteredData.forEach((row: any, index: number) => {
      try {
        const transformed: any = { dataDate }

        // 各フィールドをマッピング
        Object.entries(row).forEach(([key, value]) => {
          const mappedKey = HEADER_MAPPING[key]
          if (mappedKey && key !== '期間' && key !== 'デバイス') {
            const strValue = String(value || '').trim()

            // 数値変換
            if (mappedKey === 'advertiser') {
              transformed[mappedKey] = strValue
            } else if (
              mappedKey.includes('Amount') ||
              mappedKey.includes('cost') ||
              mappedKey.includes('cv') ||
              mappedKey === 'accessCount'
            ) {
              // カンマを除去して数値に変換
              const numValue = strValue.replace(/,/g, '').replace(/[^\d.-]/g, '')
              transformed[mappedKey] = parseInt(numValue) || 0
            }
            // パーセンテージ変換（％を小数に）
            else if (mappedKey.includes('cvr') || mappedKey.includes('Rate')) {
              const percentValue = strValue.replace('%', '').replace(/[^\d.-]/g, '')
              transformed[mappedKey] = parseFloat(percentValue) / 100 || 0
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

        transformedData.push(transformed as ECForceRecord)
      } catch (error) {
        errors.push({
          row: index + 2, // ヘッダー行を考慮
          message: error instanceof Error ? error.message : '変換エラー',
        })
      }
    })

    return {
      data: transformedData,
      totalRows: result.data.length,
      filteredRows: filteredData.length,
      errors,
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
    }
  }
}

// CSVプレビュー用（最初のN件のみ）
export async function previewECForceCSV(
  file: File,
  limit: number = 5
): Promise<{ headers: string[]; rows: any[]; error?: string }> {
  try {
    // Shift-JIS → UTF-8変換
    const buffer = await file.arrayBuffer()
    const decoder = new TextDecoder('shift-jis')
    const text = decoder.decode(buffer)

    // 最初の数行のみ解析
    const lines = text.split('\n').slice(0, limit + 1)
    const previewText = lines.join('\n')

    const result: ParseResult<any> = papaParse(previewText, {
      header: true,
      skipEmptyLines: true,
    })

    if (result.errors && result.errors.length > 0) {
      return {
        headers: [],
        rows: [],
        error: result.errors[0].message,
      }
    }

    const headers = result.meta.fields || []
    const rows = result.data

    return { headers, rows }
  } catch (error) {
    return {
      headers: [],
      rows: [],
      error: error instanceof Error ? error.message : 'プレビューエラー',
    }
  }
}

// 広告主リスト取得（重複チェック用）
export function extractAdvertisers(data: ECForceRecord[]): string[] {
  const advertisersSet = new Set(data.map((record) => record.advertiser))
  return Array.from(advertisersSet)
}
