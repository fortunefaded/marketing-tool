/**
 * TASK-203: Meta API統合最適化
 * Meta API Integration Optimizer
 * 
 * レート制限管理、バッチ処理、エラー回復機構の実装
 */

import * as React from 'react'
import type { AdInsight } from '../types'
import { SimpleMetaApi } from './api-client'
import { DifferentialUpdateEngine } from './differential-update-engine'

// ============================================================================
// 型定義
// ============================================================================

export type RateLimitStrategy = 'standard' | 'aggressive' | 'conservative'
export type RetryStrategy = 'exponential' | 'linear' | 'immediate'

export interface RateLimitConfig {
  // Meta API制限
  limits: {
    requestsPerHour: number     // 時間あたりリクエスト数
    requestsPerDay: number      // 日あたりリクエスト数
    burstLimit: number          // 瞬間最大リクエスト数
    concurrentRequests: number  // 同時リクエスト数
  }
  
  // 戦略設定
  strategy: RateLimitStrategy
  
  // バックオフ設定
  backoff: {
    initialDelayMs: number
    maxDelayMs: number
    multiplier: number
    jitter: boolean
  }
  
  // モニタリング
  monitoring: {
    trackUsage: boolean
    alertThreshold: number // 使用率%
    logDetails: boolean
  }
}

export interface BatchRequest {
  id: string
  accountId: string
  dateRange: string
  priority: number
  retryCount: number
  createdAt: Date
  executedAt?: Date
  completedAt?: Date
  error?: string
}

export interface BatchResult {
  requestId: string
  success: boolean
  data?: AdInsight[]
  error?: Error
  duration: number
  retryCount: number
}

export interface OptimizationStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  retriedRequests: number
  rateLimitHits: number
  averageResponseTime: number
  apiUsage: {
    hourly: number
    daily: number
    percentOfLimit: number
  }
}

// ============================================================================
// レート制限マネージャー
// ============================================================================

class RateLimitManager {
  private config: RateLimitConfig
  private requestHistory: Date[]
  private hourlyCount: number
  private dailyCount: number
  private lastResetHour: Date
  private lastResetDay: Date
  
  constructor(config: RateLimitConfig) {
    this.config = config
    this.requestHistory = []
    this.hourlyCount = 0
    this.dailyCount = 0
    this.lastResetHour = new Date()
    this.lastResetDay = new Date()
  }
  
  /**
   * リクエスト可能かチェック
   */
  canMakeRequest(): boolean {
    this.resetCountersIfNeeded()
    
    // 戦略に基づく判定
    switch (this.config.strategy) {
      case 'aggressive':
        // 制限ギリギリまで使用
        return this.hourlyCount < this.config.limits.requestsPerHour &&
               this.dailyCount < this.config.limits.requestsPerDay
               
      case 'conservative':
        // 80%で制限
        return this.hourlyCount < this.config.limits.requestsPerHour * 0.8 &&
               this.dailyCount < this.config.limits.requestsPerDay * 0.8
               
      case 'standard':
      default:
        // 90%で制限
        return this.hourlyCount < this.config.limits.requestsPerHour * 0.9 &&
               this.dailyCount < this.config.limits.requestsPerDay * 0.9
    }
  }
  
  /**
   * リクエストを記録
   */
  recordRequest(): void {
    const now = new Date()
    this.requestHistory.push(now)
    this.hourlyCount++
    this.dailyCount++
    
    // 古い履歴を削除（直近1時間のみ保持）
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    this.requestHistory = this.requestHistory.filter(d => d > oneHourAgo)
  }
  
  /**
   * 待機時間を計算
   */
  getWaitTime(): number {
    if (this.canMakeRequest()) {
      return 0
    }
    
    const { backoff } = this.config
    let delay = backoff.initialDelayMs
    
    // 指数バックオフ
    const overageRatio = Math.max(
      this.hourlyCount / this.config.limits.requestsPerHour,
      this.dailyCount / this.config.limits.requestsPerDay
    )
    
    if (overageRatio > 1) {
      delay *= Math.pow(backoff.multiplier, overageRatio - 1)
    }
    
    // 最大遅延の適用
    delay = Math.min(delay, backoff.maxDelayMs)
    
    // ジッター追加（衝突回避）
    if (backoff.jitter) {
      delay += Math.random() * 1000
    }
    
    return Math.round(delay)
  }
  
  /**
   * カウンターリセット
   */
  private resetCountersIfNeeded(): void {
    const now = new Date()
    
    // 時間リセット
    if (now.getTime() - this.lastResetHour.getTime() >= 60 * 60 * 1000) {
      this.hourlyCount = 0
      this.lastResetHour = now
    }
    
    // 日次リセット
    if (now.getTime() - this.lastResetDay.getTime() >= 24 * 60 * 60 * 1000) {
      this.dailyCount = 0
      this.lastResetDay = now
    }
  }
  
  /**
   * 使用統計を取得
   */
  getUsageStats(): OptimizationStats['apiUsage'] {
    this.resetCountersIfNeeded()
    
    return {
      hourly: this.hourlyCount,
      daily: this.dailyCount,
      percentOfLimit: Math.max(
        (this.hourlyCount / this.config.limits.requestsPerHour) * 100,
        (this.dailyCount / this.config.limits.requestsPerDay) * 100
      )
    }
  }
}

// ============================================================================
// Meta API最適化エンジン
// ============================================================================

export class MetaApiOptimizer {
  private rateLimitManager: RateLimitManager
  private batchQueue: BatchRequest[]
  private activeRequests: Map<string, BatchRequest>
  private stats: OptimizationStats
  private retryQueue: BatchRequest[]
  
  constructor(config?: Partial<RateLimitConfig>) {
    const fullConfig = this.getDefaultConfig(config)
    this.rateLimitManager = new RateLimitManager(fullConfig)
    this.batchQueue = []
    this.activeRequests = new Map()
    this.retryQueue = []
    this.stats = this.initializeStats()
  }
  
  /**
   * バッチリクエストの実行
   */
  async executeBatch(
    requests: Array<{
      accountId: string
      dateRange: string
      priority?: number
    }>,
    apiClient: SimpleMetaApi
  ): Promise<BatchResult[]> {
    console.log(`🚀 バッチ処理開始: ${requests.length}件のリクエスト`)
    
    // リクエストをBatchRequestに変換
    const batchRequests = requests.map(req => this.createBatchRequest(req))
    
    // 優先度でソート
    batchRequests.sort((a, b) => b.priority - a.priority)
    
    // キューに追加
    this.batchQueue.push(...batchRequests)
    
    // バッチ処理実行
    const results = await this.processBatchQueue(apiClient)
    
    console.log(`✅ バッチ処理完了: 成功 ${results.filter(r => r.success).length}/${results.length}`)
    
    return results
  }
  
  /**
   * バッチキューの処理
   */
  private async processBatchQueue(apiClient: SimpleMetaApi): Promise<BatchResult[]> {
    const results: BatchResult[] = []
    
    while (this.batchQueue.length > 0 || this.retryQueue.length > 0) {
      // リトライキューを優先
      const request = this.retryQueue.shift() || this.batchQueue.shift()
      if (!request) break
      
      // レート制限チェック
      if (!this.rateLimitManager.canMakeRequest()) {
        const waitTime = this.rateLimitManager.getWaitTime()
        console.log(`⏳ レート制限: ${waitTime}ms待機`)
        await this.delay(waitTime)
        
        // 待機後も制限中なら再キューイング
        if (!this.rateLimitManager.canMakeRequest()) {
          this.retryQueue.push(request)
          continue
        }
      }
      
      // リクエスト実行
      const result = await this.executeRequest(request, apiClient)
      results.push(result)
      
      // 失敗時のリトライ判定
      if (!result.success && request.retryCount < 3) {
        request.retryCount++
        this.retryQueue.push(request)
        console.log(`🔄 リトライキューに追加: ${request.id} (試行 ${request.retryCount}/3)`)
      }
      
      // 統計更新
      this.updateStats(result)
      
      // 同時実行数制御
      if (this.activeRequests.size >= 3) {
        await this.waitForActiveRequests()
      }
    }
    
    return results
  }
  
  /**
   * 単一リクエストの実行
   */
  private async executeRequest(
    request: BatchRequest,
    apiClient: SimpleMetaApi
  ): Promise<BatchResult> {
    const startTime = Date.now()
    request.executedAt = new Date()
    this.activeRequests.set(request.id, request)
    
    try {
      // レート制限記録
      this.rateLimitManager.recordRequest()
      
      // API呼び出し
      const result = await apiClient.getTimeSeriesInsights({
        datePreset: request.dateRange,
        forceRefresh: true
      })
      
      request.completedAt = new Date()
      this.activeRequests.delete(request.id)
      
      return {
        requestId: request.id,
        success: true,
        data: result.data,
        duration: Date.now() - startTime,
        retryCount: request.retryCount
      }
      
    } catch (error) {
      request.error = error instanceof Error ? error.message : 'Unknown error'
      this.activeRequests.delete(request.id)
      
      // エラー分析
      const isRateLimitError = this.isRateLimitError(error)
      if (isRateLimitError) {
        this.stats.rateLimitHits++
        console.warn(`⚠️ レート制限エラー: ${request.id}`)
      }
      
      return {
        requestId: request.id,
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        duration: Date.now() - startTime,
        retryCount: request.retryCount
      }
    }
  }
  
  /**
   * エラー回復メカニズム
   */
  async recoverFromError(
    error: Error,
    request: BatchRequest,
    apiClient: SimpleMetaApi
  ): Promise<BatchResult | null> {
    console.log(`🔧 エラー回復処理: ${error.message}`)
    
    // エラータイプ判定
    if (this.isRateLimitError(error)) {
      // レート制限: 長めの待機
      await this.delay(60000) // 1分待機
      return this.executeRequest(request, apiClient)
      
    } else if (this.isAuthError(error)) {
      // 認証エラー: 回復不可
      console.error(`❌ 認証エラー: 回復不可`)
      return null
      
    } else if (this.isNetworkError(error)) {
      // ネットワークエラー: 指数バックオフでリトライ
      const delay = Math.min(1000 * Math.pow(2, request.retryCount), 30000)
      await this.delay(delay)
      return this.executeRequest(request, apiClient)
      
    } else {
      // その他: 即座にリトライ
      return this.executeRequest(request, apiClient)
    }
  }
  
  /**
   * エラータイプ判定
   */
  private isRateLimitError(error: any): boolean {
    const message = error?.message?.toLowerCase() || ''
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           error?.code === 32 || // Meta API rate limit code
           error?.code === 613   // Meta API rate limit code
  }
  
  private isAuthError(error: any): boolean {
    const message = error?.message?.toLowerCase() || ''
    return message.includes('oauth') ||
           message.includes('token') ||
           message.includes('permission') ||
           error?.code === 190 // Meta API auth error code
  }
  
  private isNetworkError(error: any): boolean {
    const message = error?.message?.toLowerCase() || ''
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('econnrefused')
  }
  
  /**
   * BatchRequestの作成
   */
  private createBatchRequest(req: {
    accountId: string
    dateRange: string
    priority?: number
  }): BatchRequest {
    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId: req.accountId,
      dateRange: req.dateRange,
      priority: req.priority || 1,
      retryCount: 0,
      createdAt: new Date()
    }
  }
  
  /**
   * アクティブリクエストの待機
   */
  private async waitForActiveRequests(): Promise<void> {
    while (this.activeRequests.size >= 3) {
      await this.delay(100)
    }
  }
  
  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * 統計更新
   */
  private updateStats(result: BatchResult): void {
    this.stats.totalRequests++
    
    if (result.success) {
      this.stats.successfulRequests++
    } else {
      this.stats.failedRequests++
    }
    
    if (result.retryCount > 0) {
      this.stats.retriedRequests++
    }
    
    // 平均応答時間の更新
    const currentAvg = this.stats.averageResponseTime
    const newAvg = (currentAvg * (this.stats.totalRequests - 1) + result.duration) / this.stats.totalRequests
    this.stats.averageResponseTime = Math.round(newAvg)
    
    // API使用量の更新
    this.stats.apiUsage = this.rateLimitManager.getUsageStats()
  }
  
  /**
   * 統計初期化
   */
  private initializeStats(): OptimizationStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      apiUsage: {
        hourly: 0,
        daily: 0,
        percentOfLimit: 0
      }
    }
  }
  
  /**
   * デフォルト設定
   */
  private getDefaultConfig(overrides?: Partial<RateLimitConfig>): RateLimitConfig {
    const defaults: RateLimitConfig = {
      limits: {
        requestsPerHour: 200,    // Meta APIの標準制限
        requestsPerDay: 4800,     // Meta APIの標準制限
        burstLimit: 10,           // 瞬間最大
        concurrentRequests: 3     // 同時実行数
      },
      strategy: 'standard',
      backoff: {
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        multiplier: 2,
        jitter: true
      },
      monitoring: {
        trackUsage: true,
        alertThreshold: 80,
        logDetails: true
      }
    }
    
    return {
      ...defaults,
      ...overrides,
      limits: { ...defaults.limits, ...overrides?.limits },
      backoff: { ...defaults.backoff, ...overrides?.backoff },
      monitoring: { ...defaults.monitoring, ...overrides?.monitoring }
    }
  }
  
  /**
   * 統計取得
   */
  getStatistics(): OptimizationStats {
    return {
      ...this.stats,
      apiUsage: this.rateLimitManager.getUsageStats()
    }
  }
  
  /**
   * キューのクリア
   */
  clearQueues(): void {
    this.batchQueue = []
    this.retryQueue = []
    this.activeRequests.clear()
  }
}

// ============================================================================
// React Hook
// ============================================================================

export function useMetaApiOptimizer(
  options?: {
    strategy?: RateLimitStrategy
    onRateLimit?: () => void
    onError?: (error: Error) => void
  }
) {
  const [optimizer] = React.useState(() => new MetaApiOptimizer({
    strategy: options?.strategy || 'standard'
  }))
  
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [statistics, setStatistics] = React.useState(optimizer.getStatistics())
  
  const executeBatch = React.useCallback(
    async (
      requests: Array<{ accountId: string; dateRange: string; priority?: number }>,
      apiClient: SimpleMetaApi
    ) => {
      setIsProcessing(true)
      
      try {
        const results = await optimizer.executeBatch(requests, apiClient)
        setStatistics(optimizer.getStatistics())
        
        // レート制限チェック
        if (statistics.rateLimitHits > 0) {
          options?.onRateLimit?.()
        }
        
        return results
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Batch execution failed')
        options?.onError?.(err)
        throw err
      } finally {
        setIsProcessing(false)
      }
    },
    [optimizer, options, statistics.rateLimitHits]
  )
  
  const clearQueues = React.useCallback(() => {
    optimizer.clearQueues()
  }, [optimizer])
  
  return {
    executeBatch,
    clearQueues,
    isProcessing,
    statistics
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export default MetaApiOptimizer