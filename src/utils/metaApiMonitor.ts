/**
 * Meta API呼び出しの監視とエラートラッキング
 */

import { logger } from './logger'

export interface MetaApiCallMetrics {
  context: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: any
  responseSize?: number
}

// メトリクスの保存（メモリ内）
const apiCallMetrics: MetaApiCallMetrics[] = []
const MAX_METRICS_HISTORY = 100

// エラー発生回数の追跡
const errorCounts = new Map<string, number>()
const ERROR_THRESHOLD = 5 // 5回以上エラーが発生したら警告

/**
 * Meta API呼び出しを監視する
 */
export async function monitorMetaApiCall<T>(
  apiCall: () => Promise<T>,
  context: string
): Promise<T> {
  const metric: MetaApiCallMetrics = {
    context,
    startTime: Date.now(),
    success: false
  }

  logger.info(`[Meta API] Starting: ${context}`)

  try {
    const result = await apiCall()
    
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = true
    
    // レスポンスサイズの推定
    if (result) {
      metric.responseSize = JSON.stringify(result).length
    }

    logger.info(`[Meta API] Success: ${context} (${metric.duration}ms)`)
    
    // エラーカウントをリセット
    errorCounts.delete(context)
    
    // メトリクスを保存
    saveMetric(metric)
    
    return result
  } catch (error) {
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.error = error
    
    // エラーカウントを増加
    const currentCount = (errorCounts.get(context) || 0) + 1
    errorCounts.set(context, currentCount)
    
    logger.error(`[Meta API] Failed: ${context} (${metric.duration}ms)`, error)
    
    // エラーが閾値を超えた場合の警告
    if (currentCount >= ERROR_THRESHOLD) {
      logger.error(`[Meta API] CRITICAL: ${context} has failed ${currentCount} times consecutively`)
    }
    
    // メトリクスを保存
    saveMetric(metric)
    
    throw error
  }
}

/**
 * 非同期API呼び出しをタイムアウト付きで監視
 */
export async function monitorMetaApiCallWithTimeout<T>(
  apiCall: () => Promise<T>,
  context: string,
  timeoutMs: number = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`API call timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  return monitorMetaApiCall(
    () => Promise.race([apiCall(), timeoutPromise]),
    context
  )
}

/**
 * バッチAPI呼び出しを監視
 */
export async function monitorMetaApiBatch<T>(
  apiCalls: Array<{ call: () => Promise<T>; context: string }>,
  options: { parallel?: boolean } = {}
): Promise<T[]> {
  if (options.parallel) {
    return Promise.all(
      apiCalls.map(({ call, context }) => monitorMetaApiCall(call, context))
    )
  } else {
    const results: T[] = []
    for (const { call, context } of apiCalls) {
      results.push(await monitorMetaApiCall(call, context))
    }
    return results
  }
}

/**
 * メトリクスを保存
 */
function saveMetric(metric: MetaApiCallMetrics) {
  apiCallMetrics.push(metric)
  
  // 履歴の上限を維持
  if (apiCallMetrics.length > MAX_METRICS_HISTORY) {
    apiCallMetrics.shift()
  }
}

/**
 * API呼び出しの統計を取得
 */
export function getApiCallStats() {
  const totalCalls = apiCallMetrics.length
  const successfulCalls = apiCallMetrics.filter(m => m.success).length
  const failedCalls = totalCalls - successfulCalls
  
  const avgDuration = apiCallMetrics
    .filter(m => m.duration)
    .reduce((sum, m) => sum + (m.duration || 0), 0) / (totalCalls || 1)
  
  const contextStats = new Map<string, {
    total: number
    success: number
    failed: number
    avgDuration: number
  }>()
  
  // コンテキスト別の統計
  apiCallMetrics.forEach(metric => {
    const stats = contextStats.get(metric.context) || {
      total: 0,
      success: 0,
      failed: 0,
      avgDuration: 0
    }
    
    stats.total++
    if (metric.success) {
      stats.success++
    } else {
      stats.failed++
    }
    
    if (metric.duration) {
      stats.avgDuration = (stats.avgDuration * (stats.total - 1) + metric.duration) / stats.total
    }
    
    contextStats.set(metric.context, stats)
  })
  
  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100).toFixed(2) + '%' : '0%',
    avgDuration: Math.round(avgDuration),
    contextStats: Object.fromEntries(contextStats),
    currentErrors: Object.fromEntries(errorCounts)
  }
}

/**
 * エラー追跡をリセット
 */
export function resetErrorTracking(context?: string) {
  if (context) {
    errorCounts.delete(context)
  } else {
    errorCounts.clear()
  }
}

/**
 * 最近のエラーを取得
 */
export function getRecentErrors(limit: number = 10) {
  return apiCallMetrics
    .filter(m => !m.success)
    .slice(-limit)
    .map(m => ({
      context: m.context,
      timestamp: new Date(m.startTime).toISOString(),
      duration: m.duration,
      error: m.error?.message || 'Unknown error'
    }))
}

// 開発環境でのデバッグ用
if (process.env.NODE_ENV === 'development') {
  (window as any).__metaApiStats = getApiCallStats
  (window as any).__metaApiErrors = getRecentErrors
}