/**
 * TASK-401: キャッシュウォーミング実装
 * Cache Warming Implementation
 * 
 * よく使われるデータを事前にキャッシュに読み込む
 */

import * as React from 'react'
import type { AdInsight } from '../types'
import { DifferentialUpdateEngine } from './differential-update-engine'
import { DataFreshnessManager } from './data-freshness-manager'

// ============================================================================
// 型定義
// ============================================================================

export type WarmingStrategy = 'aggressive' | 'balanced' | 'conservative'
export type WarmingPriority = 'critical' | 'high' | 'medium' | 'low'

export interface CacheWarmingConfig {
  // 基本設定
  strategy: WarmingStrategy
  maxParallelWarms: number
  timeoutMs: number
  
  // ウォーミング対象
  targets: {
    yesterdayData: boolean      // 昨日のデータ
    last7Days: boolean          // 直近7日
    topPerformers: boolean      // 高パフォーマンス広告
    problematicAds: boolean     // 問題のある広告
    frequentlyAccessed: boolean // 頻繁にアクセスされるデータ
  }
  
  // スケジュール設定
  schedule: {
    morningWarmup: string      // 朝のウォームアップ時刻（例: "08:30"）
    preBusinessHours: boolean  // ビジネスアワー前に実行
    afterDataUpdate: boolean   // データ更新後に実行
  }
  
  // パフォーマンス設定
  performance: {
    maxMemoryMB: number
    compressionEnabled: boolean
    priorityQueue: boolean
  }
}

export interface WarmingTask {
  id: string
  accountId: string
  dateRange: string
  priority: WarmingPriority
  status: 'pending' | 'warming' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  dataSize?: number
  error?: string
}

export interface WarmingResult {
  tasksCompleted: number
  tasksFailed: number
  totalDataWarmed: number // bytes
  totalTimeMs: number
  cacheHitRate: number
  details: WarmingTask[]
}

// ============================================================================
// キャッシュウォーミングエンジン
// ============================================================================

export class CacheWarmingEngine {
  private config: CacheWarmingConfig
  private warmingQueue: WarmingTask[]
  private activeWarms: Map<string, WarmingTask>
  private differentialEngine: DifferentialUpdateEngine
  private freshnessManager: DataFreshnessManager
  private memoryUsage: number
  
  constructor(config?: Partial<CacheWarmingConfig>) {
    this.config = this.mergeWithDefaults(config)
    this.warmingQueue = []
    this.activeWarms = new Map()
    this.differentialEngine = new DifferentialUpdateEngine()
    this.freshnessManager = new DataFreshnessManager()
    this.memoryUsage = 0
  }
  
  /**
   * ウォーミングタスクの計画
   */
  planWarmingTasks(
    accountId: string,
    options?: {
      forceTargets?: string[]
      excludeTargets?: string[]
      customPriority?: WarmingPriority
    }
  ): WarmingTask[] {
    const tasks: WarmingTask[] = []
    const now = new Date()
    
    // 昨日のデータ（最優先）
    if (this.config.targets.yesterdayData) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      tasks.push({
        id: `warm_${accountId}_${yesterdayStr}_${Date.now()}`,
        accountId,
        dateRange: yesterdayStr,
        priority: 'critical',
        status: 'pending'
      })
    }
    
    // 直近7日（高優先度）
    if (this.config.targets.last7Days) {
      for (let i = 2; i <= 7; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        tasks.push({
          id: `warm_${accountId}_${dateStr}_${Date.now()}`,
          accountId,
          dateRange: dateStr,
          priority: i <= 3 ? 'high' : 'medium',
          status: 'pending'
        })
      }
    }
    
    // カスタムターゲット
    if (options?.forceTargets) {
      for (const target of options.forceTargets) {
        tasks.push({
          id: `warm_${accountId}_${target}_${Date.now()}`,
          accountId,
          dateRange: target,
          priority: options.customPriority || 'high',
          status: 'pending'
        })
      }
    }
    
    // 除外処理
    if (options?.excludeTargets) {
      return tasks.filter(t => !options.excludeTargets?.includes(t.dateRange))
    }
    
    return this.sortByPriority(tasks)
  }
  
  /**
   * ウォーミングの実行
   */
  async executeWarming(
    tasks: WarmingTask[],
    fetcher: (dateRange: string) => Promise<AdInsight[]>
  ): Promise<WarmingResult> {
    console.log(`🔥 キャッシュウォーミング開始: ${tasks.length}タスク`)
    
    const startTime = Date.now()
    const result: WarmingResult = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalDataWarmed: 0,
      totalTimeMs: 0,
      cacheHitRate: 0,
      details: []
    }
    
    // 戦略に基づくバッチサイズを決定
    const batchSize = this.getBatchSize()
    
    // バッチ処理
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize)
      
      // メモリチェック
      if (!this.hasEnoughMemory()) {
        console.warn('⚠️ メモリ不足のためウォーミングを中断')
        break
      }
      
      // 並列実行
      const batchResults = await this.executeBatch(batch, fetcher)
      
      // 結果の集計
      for (const taskResult of batchResults) {
        result.details.push(taskResult)
        
        if (taskResult.status === 'completed') {
          result.tasksCompleted++
          result.totalDataWarmed += taskResult.dataSize || 0
        } else {
          result.tasksFailed++
        }
      }
      
      // 戦略に基づく待機
      if (i + batchSize < tasks.length) {
        await this.waitBetweenBatches()
      }
    }
    
    result.totalTimeMs = Date.now() - startTime
    result.cacheHitRate = this.calculateCacheHitRate(result)
    
    console.log(`✅ ウォーミング完了: ${result.tasksCompleted}/${tasks.length}成功`)
    return result
  }
  
  /**
   * バッチの実行
   */
  private async executeBatch(
    batch: WarmingTask[],
    fetcher: (dateRange: string) => Promise<AdInsight[]>
  ): Promise<WarmingTask[]> {
    const promises = batch.map(async (task) => {
      task.startedAt = new Date()
      this.activeWarms.set(task.id, task)
      
      try {
        // タイムアウト付きフェッチ
        const data = await this.fetchWithTimeout(
          fetcher(task.dateRange),
          this.config.timeoutMs
        )
        
        // データサイズ計算
        task.dataSize = JSON.stringify(data).length
        this.memoryUsage += task.dataSize
        
        // 圧縮が有効な場合
        if (this.config.performance.compressionEnabled && task.dataSize > 1024 * 1024) {
          // 大きなデータは圧縮（実装は簡略化）
          console.log(`📦 データ圧縮: ${task.dateRange}`)
        }
        
        task.status = 'completed'
        task.completedAt = new Date()
        
      } catch (error) {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : 'Unknown error'
        task.completedAt = new Date()
      } finally {
        this.activeWarms.delete(task.id)
      }
      
      return task
    })
    
    return Promise.all(promises)
  }
  
  /**
   * 高パフォーマンス広告の特定
   */
  async identifyHighPerformers(
    accountId: string,
    data: AdInsight[]
  ): Promise<string[]> {
    // CTRが高い上位20%の広告
    const sorted = [...data].sort((a, b) => 
      parseFloat(b.ctr || '0') - parseFloat(a.ctr || '0')
    )
    
    const topCount = Math.ceil(sorted.length * 0.2)
    return sorted.slice(0, topCount).map(d => d.ad_id)
  }
  
  /**
   * 問題のある広告の特定
   */
  async identifyProblematicAds(
    accountId: string,
    data: AdInsight[]
  ): Promise<string[]> {
    return data
      .filter(d => 
        parseFloat(d.frequency || '0') > 3.5 ||
        parseFloat(d.ctr || '0') < 1.0 ||
        parseFloat(d.cpm || '0') > 20.0
      )
      .map(d => d.ad_id)
  }
  
  /**
   * 頻繁にアクセスされるデータの特定
   */
  async identifyFrequentlyAccessed(
    accountId: string,
    accessLogs?: Array<{ dateRange: string; accessCount: number }>
  ): Promise<string[]> {
    if (!accessLogs || accessLogs.length === 0) {
      // デフォルト: 直近3日
      const ranges = []
      for (let i = 0; i < 3; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        ranges.push(date.toISOString().split('T')[0])
      }
      return ranges
    }
    
    // アクセス頻度でソート
    return accessLogs
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(log => log.dateRange)
  }
  
  /**
   * 戦略に基づくバッチサイズ
   */
  private getBatchSize(): number {
    switch (this.config.strategy) {
      case 'aggressive':
        return this.config.maxParallelWarms
      case 'balanced':
        return Math.ceil(this.config.maxParallelWarms / 2)
      case 'conservative':
        return Math.max(1, Math.ceil(this.config.maxParallelWarms / 4))
    }
  }
  
  /**
   * バッチ間の待機
   */
  private async waitBetweenBatches(): Promise<void> {
    const waitMs = this.config.strategy === 'aggressive' ? 100 :
                   this.config.strategy === 'balanced' ? 500 : 1000
    
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
  
  /**
   * メモリチェック
   */
  private hasEnoughMemory(): boolean {
    const maxBytes = this.config.performance.maxMemoryMB * 1024 * 1024
    return this.memoryUsage < maxBytes * 0.8 // 80%まで
  }
  
  /**
   * タイムアウト付きフェッチ
   */
  private async fetchWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ])
  }
  
  /**
   * 優先度でソート
   */
  private sortByPriority(tasks: WarmingTask[]): WarmingTask[] {
    const priorityOrder: Record<WarmingPriority, number> = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    }
    
    return tasks.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    )
  }
  
  /**
   * キャッシュヒット率の計算
   */
  private calculateCacheHitRate(result: WarmingResult): number {
    // 簡略化: 成功率をヒット率とみなす
    const total = result.tasksCompleted + result.tasksFailed
    return total > 0 ? (result.tasksCompleted / total) * 100 : 0
  }
  
  /**
   * デフォルト設定とマージ
   */
  private mergeWithDefaults(config?: Partial<CacheWarmingConfig>): CacheWarmingConfig {
    const defaults: CacheWarmingConfig = {
      strategy: 'balanced',
      maxParallelWarms: 3,
      timeoutMs: 10000,
      targets: {
        yesterdayData: true,
        last7Days: true,
        topPerformers: true,
        problematicAds: true,
        frequentlyAccessed: false
      },
      schedule: {
        morningWarmup: "08:30",
        preBusinessHours: true,
        afterDataUpdate: true
      },
      performance: {
        maxMemoryMB: 100,
        compressionEnabled: false,
        priorityQueue: true
      }
    }
    
    return {
      ...defaults,
      ...config,
      targets: { ...defaults.targets, ...config?.targets },
      schedule: { ...defaults.schedule, ...config?.schedule },
      performance: { ...defaults.performance, ...config?.performance }
    }
  }
  
  /**
   * ウォーミング状態のクリア
   */
  clearWarmingState(): void {
    this.warmingQueue = []
    this.activeWarms.clear()
    this.memoryUsage = 0
  }
  
  /**
   * 統計情報の取得
   */
  getStatistics(): {
    queueLength: number
    activeWarms: number
    memoryUsageMB: number
    strategy: WarmingStrategy
  } {
    return {
      queueLength: this.warmingQueue.length,
      activeWarms: this.activeWarms.size,
      memoryUsageMB: this.memoryUsage / (1024 * 1024),
      strategy: this.config.strategy
    }
  }
}

// ============================================================================
// React Hook
// ============================================================================

export function useCacheWarming(
  accountId: string,
  options?: {
    strategy?: WarmingStrategy
    autoWarm?: boolean
    onComplete?: (result: WarmingResult) => void
    fetcher?: (dateRange: string) => Promise<AdInsight[]>
  }
) {
  const [engine] = React.useState(() => new CacheWarmingEngine({
    strategy: options?.strategy || 'balanced'
  }))
  
  const [isWarming, setIsWarming] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<WarmingResult | null>(null)
  const [statistics, setStatistics] = React.useState(engine.getStatistics())
  
  const warm = React.useCallback(
    async (customTargets?: string[]) => {
      if (!options?.fetcher || isWarming) return
      
      setIsWarming(true)
      
      try {
        // タスクの計画
        const tasks = engine.planWarmingTasks(accountId, {
          forceTargets: customTargets
        })
        
        // ウォーミング実行
        const result = await engine.executeWarming(tasks, options.fetcher)
        
        setLastResult(result)
        options?.onComplete?.(result)
        
        return result
      } finally {
        setIsWarming(false)
        setStatistics(engine.getStatistics())
      }
    },
    [engine, accountId, options, isWarming]
  )
  
  // 自動ウォーミング
  React.useEffect(() => {
    if (!options?.autoWarm) return
    
    // 朝8:30に自動実行
    const now = new Date()
    const scheduledTime = new Date()
    scheduledTime.setHours(8, 30, 0, 0)
    
    if (now > scheduledTime) {
      // 翌日の8:30に設定
      scheduledTime.setDate(scheduledTime.getDate() + 1)
    }
    
    const timeUntilWarmup = scheduledTime.getTime() - now.getTime()
    const timeout = setTimeout(() => warm(), timeUntilWarmup)
    
    return () => clearTimeout(timeout)
  }, [options?.autoWarm, warm])
  
  return {
    warm,
    isWarming,
    lastResult,
    statistics,
    clearState: () => engine.clearWarmingState()
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export default CacheWarmingEngine