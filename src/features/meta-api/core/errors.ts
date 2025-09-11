/**
 * Meta API 専用のエラー型定義
 */

import { Result } from './result'

/**
 * Meta API エラーの詳細情報
 */
export interface MetaApiError {
  code: string
  message: string
  userMessage: string
  category: 'auth' | 'ratelimit' | 'network' | 'data' | 'timeout'
  retryable: boolean
  actionRequired?: {
    type: 'reauth' | 'wait' | 'retry'
    label: string
    href?: string
    onClick?: () => void
  }
  originalError?: Error
  details?: Record<string, any>
}

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  // 認証エラー
  NO_TOKEN: 'NO_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // APIエラー
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // ネットワークエラー
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // データエラー
  INVALID_DATA: 'INVALID_DATA',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
} as const

/**
 * ユーザー向けエラーメッセージ
 */
export const USER_ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.NO_TOKEN]: 'Meta広告アカウントが接続されていません。',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Meta広告のアクセストークンが期限切れです。再度接続設定を行ってください。',
  [ERROR_CODES.INVALID_TOKEN]: '無効なアクセストークンです。再度接続設定を行ってください。',
  [ERROR_CODES.RATE_LIMIT]: 'APIのリクエスト制限に達しました。しばらく待ってから再試行してください。',
  [ERROR_CODES.INVALID_REQUEST]: '無効なリクエストです。設定を確認してください。',
  [ERROR_CODES.NOT_FOUND]: 'リソースが見つかりません。',
  [ERROR_CODES.PERMISSION_DENIED]: 'アクセス権限がありません。権限設定を確認してください。',
  [ERROR_CODES.NETWORK_ERROR]: 'ネットワークエラーが発生しました。接続を確認してください。',
  [ERROR_CODES.TIMEOUT]: 'リクエストがタイムアウトしました。再試行してください。',
  [ERROR_CODES.INVALID_DATA]: 'データの形式が正しくありません。',
  [ERROR_CODES.VALIDATION_FAILED]: 'データの検証に失敗しました。'
}

/**
 * Meta API エラーを作成
 */
export function createMetaApiError(
  code: string,
  options: Partial<Omit<MetaApiError, 'code'>> = {}
): MetaApiError {
  const userMessage = options.userMessage || USER_ERROR_MESSAGES[code] || '予期しないエラーが発生しました。'
  const category = options.category || classifyErrorByCode(code)
  const retryable = options.retryable ?? isRetryableCode(code)
  
  return {
    code,
    message: options.message || code,
    userMessage,
    category,
    retryable,
    actionRequired: options.actionRequired || getDefaultAction(code),
    originalError: options.originalError,
    details: options.details
  }
}

/**
 * HTTPエラーからMetaApiErrorを作成
 */
export function createMetaApiErrorFromResponse(
  status: number,
  responseData: any,
  originalError?: Error
): MetaApiError {
  let code: string = ERROR_CODES.NETWORK_ERROR
  let message = `HTTP ${status}`
  let details = {}
  
  // Meta API のエラーレスポンスを解析
  if (responseData?.error) {
    const error = responseData.error
    message = error.message || message
    details = {
      type: error.type,
      code: error.code,
      error_subcode: error.error_subcode,
      fbtrace_id: error.fbtrace_id
    }
    
    // エラーコードをマッピング
    if (status === 401 || error.code === 190) {
      code = ERROR_CODES.TOKEN_EXPIRED
    } else if (status === 400) {
      code = ERROR_CODES.INVALID_REQUEST
    } else if (error.code === 4) {
      code = ERROR_CODES.RATE_LIMIT
    } else if (status === 403) {
      code = ERROR_CODES.PERMISSION_DENIED
    }
  }
  
  return createMetaApiError(code, {
    message,
    originalError,
    details
  })
}

/**
 * 一般的なErrorからMetaApiErrorを作成
 */
export function createMetaApiErrorFromError(error: unknown): MetaApiError {
  let code: string = ERROR_CODES.NETWORK_ERROR
  const errorObj = error as Error
  
  if (errorObj.name === 'AbortError') {
    code = ERROR_CODES.TIMEOUT
  } else if (errorObj.message?.includes('No token found')) {
    code = ERROR_CODES.NO_TOKEN
  } else if (errorObj.message?.includes('Token expired')) {
    code = ERROR_CODES.TOKEN_EXPIRED
  } else if (errorObj.message?.includes('Rate limit')) {
    code = ERROR_CODES.RATE_LIMIT
  }
  
  return createMetaApiError(code, {
    message: errorObj.message || 'Unknown error',
    originalError: error
  })
}

/**
 * エラーコードからカテゴリを判定
 */
function classifyErrorByCode(code: string): MetaApiError['category'] {
  switch (code) {
    case ERROR_CODES.NO_TOKEN:
    case ERROR_CODES.TOKEN_EXPIRED:
    case ERROR_CODES.INVALID_TOKEN:
    case ERROR_CODES.PERMISSION_DENIED:
      return 'auth'
    
    case ERROR_CODES.RATE_LIMIT:
      return 'ratelimit'
    
    case ERROR_CODES.TIMEOUT:
      return 'timeout'
    
    case ERROR_CODES.INVALID_REQUEST:
    case ERROR_CODES.INVALID_DATA:
    case ERROR_CODES.VALIDATION_FAILED:
      return 'data'
    
    default:
      return 'network'
  }
}

/**
 * リトライ可能なエラーかどうか
 */
function isRetryableCode(code: string): boolean {
  return [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.TIMEOUT,
    ERROR_CODES.RATE_LIMIT
  ].includes(code as typeof ERROR_CODES[keyof typeof ERROR_CODES])
}

/**
 * デフォルトのアクションを取得
 */
function getDefaultAction(code: string): MetaApiError['actionRequired'] | undefined {
  switch (code) {
    case ERROR_CODES.NO_TOKEN:
    case ERROR_CODES.TOKEN_EXPIRED:
    case ERROR_CODES.INVALID_TOKEN:
      return {
        type: 'reauth',
        label: 'Meta API設定を開く',
        href: '/settings/meta-api'
      }
    
    case ERROR_CODES.RATE_LIMIT:
      return {
        type: 'wait',
        label: '30秒後に再試行'
      }
    
    case ERROR_CODES.NETWORK_ERROR:
    case ERROR_CODES.TIMEOUT:
      return {
        type: 'retry',
        label: '再試行'
      }
    
    default:
      return undefined
  }
}

/**
 * Result型との統合ヘルパー
 */
export function toMetaApiResult<T>(promise: Promise<T>): Promise<Result<T, MetaApiError>> {
  return Result.fromPromise(promise, createMetaApiErrorFromError)
}