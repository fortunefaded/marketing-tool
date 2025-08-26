import { MetaInsightsData, MetaApiError, AdInsight, MetaAccount } from '@/types'

/**
 * Meta API関連の型ガード集
 */

/**
 * unknown型を安全にErrorに変換
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  
  if (typeof error === 'string') {
    return new Error(error)
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message))
  }
  
  return new Error('Unknown error')
}

/**
 * unknown型を安全にMetaApiErrorに変換
 */
export function toMetaApiError(error: unknown): MetaApiError {
  if (error instanceof MetaApiError) {
    return error
  }
  
  const baseError = toError(error)
  
  // Meta APIのエラーレスポンス形式をチェック
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = (error as any).error
    return new MetaApiError(
      apiError.message || baseError.message,
      {
        code: apiError.code,
        type: apiError.type,
        statusCode: apiError.error_subcode
      }
    )
  }
  
  return new MetaApiError(baseError.message)
}

/**
 * MetaInsightsDataの型ガード
 */
export function isMetaInsightsData(value: unknown): value is MetaInsightsData {
  if (!value || typeof value !== 'object') {
    return false
  }
  
  const data = value as any
  
  // 必須フィールドのチェック
  return (
    typeof data.date_start === 'string' &&
    typeof data.date_stop === 'string' &&
    typeof data.impressions === 'string' &&
    typeof data.clicks === 'string' &&
    typeof data.spend === 'string'
  )
}

/**
 * AdInsightの型ガード
 */
export function isAdInsight(value: unknown): value is AdInsight {
  if (!value || typeof value !== 'object') {
    return false
  }
  
  const data = value as any
  
  return (
    typeof data.ad_id === 'string' &&
    typeof data.ad_name === 'string' &&
    typeof data.campaign_id === 'string' &&
    typeof data.campaign_name === 'string' &&
    typeof data.impressions === 'number' &&
    typeof data.reach === 'number' &&
    typeof data.frequency === 'number' &&
    typeof data.ctr === 'number' &&
    typeof data.cpm === 'number' &&
    typeof data.spend === 'number'
  )
}

/**
 * MetaAccountの型ガード
 */
export function isMetaAccount(value: unknown): value is MetaAccount {
  if (!value || typeof value !== 'object') {
    return false
  }
  
  const account = value as any
  
  return (
    typeof account.accountId === 'string' &&
    typeof account.name === 'string' &&
    typeof account.accessToken === 'string'
  )
}

/**
 * 配列の型ガード
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(itemGuard)
}

/**
 * Meta APIレスポンスの型ガード
 */
export function isMetaApiResponse<T>(
  value: unknown,
  dataGuard: (data: unknown) => data is T
): value is { data: T[]; paging?: any; error?: any } {
  if (!value || typeof value !== 'object') {
    return false
  }
  
  const response = value as any
  
  // エラーレスポンス
  if (response.error) {
    return true // エラーレスポンスも有効なレスポンス
  }
  
  // 正常レスポンス
  return (
    'data' in response &&
    isArrayOf(response.data, dataGuard)
  )
}

/**
 * 日付文字列の検証
 */
export function isValidDateString(value: string): boolean {
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Meta APIの日付形式（YYYY-MM-DD）の検証
 */
export function isMetaApiDateFormat(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValidDateString(value)
}

/**
 * 数値文字列の安全な変換
 */
export function parseNumberString(value: string | number | undefined | null): number {
  if (value === undefined || value === null) {
    return 0
  }
  
  if (typeof value === 'number') {
    return value
  }
  
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * オブジェクトのnullish値を除去
 */
export function removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value
    }
  }
  
  return result
}

/**
 * 網羅性チェック（never型を利用）
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Exhaustive check failed: ${value}`)
}