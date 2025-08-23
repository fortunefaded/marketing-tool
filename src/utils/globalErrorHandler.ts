/**
 * グローバルエラーハンドリング
 * Meta API関連のエラーを統一的に処理
 */

import { logger } from './logger'
import { getApiCallStats, getRecentErrors } from './metaApiMonitor'

export interface ErrorInfo {
  message: string
  code?: string | number
  type: 'api' | 'network' | 'auth' | 'unknown'
  context?: any
  timestamp: Date
  stack?: string
}

// エラー履歴の保存
const errorHistory: ErrorInfo[] = []
const MAX_ERROR_HISTORY = 50

// エラーリスナー
const errorListeners = new Set<(error: ErrorInfo) => void>()

/**
 * Meta APIエラーを分類して処理
 */
export function handleMetaApiError(error: any, context?: string): ErrorInfo {
  const errorInfo: ErrorInfo = {
    message: error.message || 'Unknown error',
    code: error.code || error.statusCode,
    type: 'unknown',
    context,
    timestamp: new Date(),
    stack: error.stack
  }

  // エラータイプの分類
  if (error.code === 190 || error.message?.includes('access token')) {
    errorInfo.type = 'auth'
    errorInfo.message = 'アクセストークンが無効です。再認証が必要です。'
  } else if (error.code === 429 || error.message?.includes('rate limit')) {
    errorInfo.type = 'api'
    errorInfo.message = 'APIレート制限に達しました。しばらく待ってから再試行してください。'
  } else if (error.code === 3018 || error.message?.includes('37 months')) {
    errorInfo.type = 'api'
    errorInfo.message = 'Meta APIの日付制限（37ヶ月）を超えています。'
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    errorInfo.type = 'network'
    errorInfo.message = 'ネットワークエラーが発生しました。接続を確認してください。'
  } else if (error.code >= 400 && error.code < 500) {
    errorInfo.type = 'api'
  } else if (error.code >= 500) {
    errorInfo.type = 'api'
    errorInfo.message = 'Meta APIサーバーエラーが発生しました。'
  }

  // エラー履歴に追加
  errorHistory.push(errorInfo)
  if (errorHistory.length > MAX_ERROR_HISTORY) {
    errorHistory.shift()
  }

  // リスナーに通知
  errorListeners.forEach(listener => {
    try {
      listener(errorInfo)
    } catch (e) {
      logger.error('Error in error listener:', e)
    }
  })

  // ログ出力
  logger.error(`[MetaAPI Error] ${errorInfo.type}:`, {
    message: errorInfo.message,
    code: errorInfo.code,
    context: errorInfo.context
  })

  return errorInfo
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const errorInfo = handleMetaApiError(error)
  
  // カスタムメッセージがある場合はそれを使用
  if (errorInfo.message !== error.message) {
    return errorInfo.message
  }

  // デフォルトメッセージ
  switch (errorInfo.type) {
    case 'auth':
      return '認証エラーが発生しました。設定を確認してください。'
    case 'network':
      return 'ネットワーク接続を確認してください。'
    case 'api':
      return 'Meta APIでエラーが発生しました。しばらく待ってから再試行してください。'
    default:
      return 'エラーが発生しました。問題が続く場合はサポートにお問い合わせください。'
  }
}

/**
 * エラーリスナーを追加
 */
export function addErrorListener(listener: (error: ErrorInfo) => void) {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}

/**
 * エラー統計を取得
 */
export function getErrorStats() {
  const stats = {
    total: errorHistory.length,
    byType: {} as Record<string, number>,
    byCode: {} as Record<string, number>,
    recent: errorHistory.slice(-10),
    apiMonitorStats: getApiCallStats(),
    recentApiErrors: getRecentErrors()
  }

  errorHistory.forEach(error => {
    // タイプ別集計
    stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
    
    // コード別集計
    if (error.code) {
      const codeStr = String(error.code)
      stats.byCode[codeStr] = (stats.byCode[codeStr] || 0) + 1
    }
  })

  return stats
}

/**
 * エラー履歴をクリア
 */
export function clearErrorHistory() {
  errorHistory.length = 0
}

/**
 * React Error Boundary用のエラーハンドラー
 */
export function handleReactError(error: Error, errorInfo: any) {
  logger.error('[React Error]', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack
  })

  // Meta API関連のエラーかチェック
  if (error.message?.includes('Meta') || error.message?.includes('API')) {
    handleMetaApiError(error, 'React Component')
  }
}

// 開発環境でのデバッグ用
if (process.env.NODE_ENV === 'development') {
  (window as any).__errorStats = getErrorStats
  (window as any).__clearErrors = clearErrorHistory
}