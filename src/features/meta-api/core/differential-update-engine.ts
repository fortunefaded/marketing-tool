/**
 * TASK-202: 差分取得エンジン実装
 * Differential Update Engine Implementation
 * 
 * APIコールを最小化し、変更されたデータのみを効率的に取得
 */

import * as React from 'react'
import type { AdInsight } from '../types'
import { DataFreshnessManager, type FreshnessState } from './data-freshness-manager'

// ============================================================================
// 型定義
// ============================================================================

export type UpdateStrategy = 'full' | 'incremental' | 'smart' | 'minimal'
export type UpdateStatus = 'idle' | 'preparing' | 'fetching' | 'merging' | 'completed' | 'failed'

export interface DifferentialUpdateConfig {
  // 基本設定
  strategy: UpdateStrategy
  maxBatchSize: number
  minUpdateInterval: number // 分
  
  // 差分検出設定
  detection: {
    checkpointInterval: number // 分
    compareFields: string[] // 比較対象フィールド
    ignoreFields: string[] // 無視するフィールド
    significantChangeThreshold: number // 有意な変更の閾値 (%)
  }
  
  // 最適化設定
  optimization: {
    enableBatching: boolean
    enableCompression: boolean
    enableCaching: boolean
    prioritizeRecent: boolean
  }
  
  // エラー処理
  errorHandling: {
    maxRetries: number
    retryDelay: number // ミリ秒
    fallbackToFull: boolean
  }
}

export interface UpdateCheckpoint {
  timestamp: Date
  dataHash: string
  recordCount: number
  lastModified: Date
  fields: string[]
}

export interface DifferentialUpdate {
  id: string
  accountId: string
  dateRange: string
  strategy: UpdateStrategy
  status: UpdateStatus
  startedAt: Date
  completedAt?: Date
  
  // 差分情報
  changes: {
    added: AdInsight[]
    modified: AdInsight[]
    deleted: string[] // ad_ids
  }
  
  // 統計
  stats: {
    totalRecords: number
    addedCount: number
    modifiedCount: number
    deletedCount: number
    apiCalls: number
    dataSaved: number // bytes
    timeSaved: number // ミリ秒
  }
  
  // チェックポイント
  previousCheckpoint?: UpdateCheckpoint
  currentCheckpoint?: UpdateCheckpoint
}

export interface UpdatePlan {
  strategy: UpdateStrategy
  estimatedApiCalls: number
  estimatedDuration: number // ミリ秒
  dataParts: UpdateDataPart[]
  priority: number
  reason: string
}

export interface UpdateDataPart {
  type: 'date_range' | 'ad_ids' | 'campaign_ids' | 'metrics'
  identifier: string
  priority: number
  required: boolean
}

// ============================================================================
// 差分更新エンジンクラス
// ============================================================================

export class DifferentialUpdateEngine {
  private config: DifferentialUpdateConfig
  private checkpoints: Map<string, UpdateCheckpoint>
  private updateHistory: Map<string, DifferentialUpdate[]>
  private freshnessManager: DataFreshnessManager
  
  constructor(config?: Partial<DifferentialUpdateConfig>) {
    this.config = this.mergeWithDefaults(config)
    this.checkpoints = new Map()
    this.updateHistory = new Map()
    this.freshnessManager = new DataFreshnessManager()
  }
  
  /**
   * 更新計画の作成
   */
  createUpdatePlan(
    currentData: AdInsight[],
    metadata: {
      accountId: string
      dateRange: string
      lastFetched?: Date
      freshnessState?: FreshnessState
    }
  ): UpdatePlan {
    const key = `${metadata.accountId}_${metadata.dateRange}`
    const previousCheckpoint = this.checkpoints.get(key)
    
    // 鮮度状態の評価
    const freshnessState = metadata.freshnessState || 
      this.freshnessManager.evaluateFreshness(currentData, metadata)
    
    // 戦略の決定
    const strategy = this.determineStrategy(
      currentData,
      previousCheckpoint,
      freshnessState,
      metadata
    )
    
    // データパーツの特定
    const dataParts = this.identifyDataParts(
      currentData,
      previousCheckpoint,
      strategy,
      metadata
    )
    
    // API呼び出し数の推定
    const estimatedApiCalls = this.estimateApiCalls(dataParts, strategy)
    
    // 実行時間の推定
    const estimatedDuration = this.estimateDuration(dataParts, estimatedApiCalls)
    
    // 優先度の計算
    const priority = this.calculatePriority(freshnessState, strategy)
    
    return {
      strategy,
      estimatedApiCalls,
      estimatedDuration,
      dataParts,
      priority,
      reason: this.getStrategyReason(strategy, freshnessState)
    }
  }
  
  /**
   * 差分更新の実行
   */
  async executeDifferentialUpdate(
    plan: UpdatePlan,
    fetcher: (part: UpdateDataPart) => Promise<AdInsight[]>,
    currentData: AdInsight[],
    metadata: {
      accountId: string
      dateRange: string
    }
  ): Promise<DifferentialUpdate> {
    const updateId = this.generateUpdateId()
    const key = `${metadata.accountId}_${metadata.dateRange}`
    
    const update: DifferentialUpdate = {
      id: updateId,
      accountId: metadata.accountId,
      dateRange: metadata.dateRange,
      strategy: plan.strategy,
      status: 'preparing',
      startedAt: new Date(),
      changes: {
        added: [],
        modified: [],
        deleted: []
      },
      stats: {
        totalRecords: 0,
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        apiCalls: 0,
        dataSaved: 0,
        timeSaved: 0
      },
      previousCheckpoint: this.checkpoints.get(key)
    }
    
    try {
      // 準備フェーズ
      update.status = 'preparing'
      const startTime = Date.now()
      
      // フェッチフェーズ
      update.status = 'fetching'
      const fetchedData = await this.fetchDataParts(plan.dataParts, fetcher)
      update.stats.apiCalls = plan.dataParts.filter(p => p.required).length
      
      // マージフェーズ
      update.status = 'merging'
      const mergedData = this.mergeData(currentData, fetchedData, plan.strategy)
      
      // 差分検出
      const changes = this.detectChanges(currentData, mergedData)
      update.changes = changes
      
      // 統計の更新
      update.stats = {
        ...update.stats,
        totalRecords: mergedData.length,
        addedCount: changes.added.length,
        modifiedCount: changes.modified.length,
        deletedCount: changes.deleted.length,
        dataSaved: this.calculateDataSaved(plan.strategy, currentData, mergedData),
        timeSaved: Date.now() - startTime
      }
      
      // チェックポイントの作成
      const newCheckpoint = this.createCheckpoint(mergedData)
      this.checkpoints.set(key, newCheckpoint)
      update.currentCheckpoint = newCheckpoint
      
      // 完了
      update.status = 'completed'
      update.completedAt = new Date()
      
      // 履歴に追加
      this.addToHistory(key, update)
      
      return update
      
    } catch (error) {
      update.status = 'failed'
      update.completedAt = new Date()
      
      // フォールバック処理
      if (this.config.errorHandling.fallbackToFull && plan.strategy !== 'full') {
        console.warn('Differential update failed, falling back to full update')
        const fullPlan = { ...plan, strategy: 'full' as UpdateStrategy }
        return this.executeDifferentialUpdate(fullPlan, fetcher, currentData, metadata)
      }
      
      throw error
    }
  }
  
  /**
   * 更新戦略の決定
   */
  private determineStrategy(
    currentData: AdInsight[],
    previousCheckpoint: UpdateCheckpoint | undefined,
    freshnessState: FreshnessState,
    _metadata: any
  ): UpdateStrategy {
    // チェックポイントがない場合は完全更新
    if (!previousCheckpoint) {
      return 'full'
    }
    
    // 鮮度が critical の場合は完全更新
    if (freshnessState.updatePriority === 'critical') {
      return 'full'
    }
    
    // 最後の更新から時間が経過している場合
    const minutesSinceLastUpdate = 
      (Date.now() - previousCheckpoint.timestamp.getTime()) / (1000 * 60)
    
    if (minutesSinceLastUpdate > this.config.minUpdateInterval * 10) {
      return 'full'
    }
    
    // データ量が少ない場合はインクリメンタル
    if (currentData.length < 100) {
      return 'incremental'
    }
    
    // 設定に基づく戦略
    if (this.config.strategy === 'smart') {
      // スマート戦略: 状況に応じて最適な方法を選択
      if (freshnessState.staleness < 30) {
        return 'minimal'
      } else if (freshnessState.staleness < 60) {
        return 'incremental'
      } else {
        return 'full'
      }
    }
    
    return this.config.strategy
  }
  
  /**
   * データパーツの特定
   */
  private identifyDataParts(
    currentData: AdInsight[],
    previousCheckpoint: UpdateCheckpoint | undefined,
    strategy: UpdateStrategy,
    metadata: any
  ): UpdateDataPart[] {
    const parts: UpdateDataPart[] = []
    
    switch (strategy) {
      case 'full':
        // 全期間を取得
        parts.push({
          type: 'date_range',
          identifier: metadata.dateRange,
          priority: 1,
          required: true
        })
        break
        
      case 'incremental':
        // 最新の数日分のみ
        parts.push({
          type: 'date_range',
          identifier: 'last_3d',
          priority: 1,
          required: true
        })
        
        // 変更が多い広告のみ
        const activeAdIds = this.identifyActiveAds(currentData)
        if (activeAdIds.length > 0) {
          parts.push({
            type: 'ad_ids',
            identifier: activeAdIds.join(','),
            priority: 2,
            required: false
          })
        }
        break
        
      case 'minimal':
        // 最小限のメトリクスのみ
        parts.push({
          type: 'metrics',
          identifier: 'impressions,clicks,ctr',
          priority: 1,
          required: true
        })
        break
        
      case 'smart':
        // 優先度に基づいて動的に決定
        const criticalParts = this.identifyCriticalParts(currentData, previousCheckpoint)
        parts.push(...criticalParts)
        break
    }
    
    return parts
  }
  
  /**
   * アクティブな広告の特定
   */
  private identifyActiveAds(data: AdInsight[]): string[] {
    // インプレッションが多い上位20%の広告
    const sorted = [...data].sort((a, b) => 
      parseInt(b.impressions || '0') - parseInt(a.impressions || '0')
    )
    
    const topCount = Math.ceil(sorted.length * 0.2)
    return sorted.slice(0, topCount).map(d => d.ad_id)
  }
  
  /**
   * 重要なデータパーツの特定
   */
  private identifyCriticalParts(
    currentData: AdInsight[],
    _previousCheckpoint?: UpdateCheckpoint
  ): UpdateDataPart[] {
    const parts: UpdateDataPart[] = []
    
    // 高パフォーマンス広告
    const highPerformers = currentData.filter(d => 
      parseFloat(d.ctr || '0') > 3.0
    )
    
    if (highPerformers.length > 0) {
      parts.push({
        type: 'ad_ids',
        identifier: highPerformers.map(d => d.ad_id).join(','),
        priority: 1,
        required: true
      })
    }
    
    // 問題のある広告（高頻度、低CTR）
    const problematicAds = currentData.filter(d =>
      parseFloat(d.frequency || '0') > 3.5 ||
      parseFloat(d.ctr || '0') < 1.0
    )
    
    if (problematicAds.length > 0) {
      parts.push({
        type: 'ad_ids',
        identifier: problematicAds.map(d => d.ad_id).join(','),
        priority: 2,
        required: true
      })
    }
    
    return parts
  }
  
  /**
   * API呼び出し数の推定
   */
  private estimateApiCalls(parts: UpdateDataPart[], strategy: UpdateStrategy): number {
    switch (strategy) {
      case 'full':
        return 1 // 単一の大きなAPI呼び出し
      case 'incremental':
        return parts.filter(p => p.required).length
      case 'minimal':
        return 1
      case 'smart':
        return Math.min(parts.length, this.config.maxBatchSize)
      default:
        return parts.length
    }
  }
  
  /**
   * 実行時間の推定
   */
  private estimateDuration(parts: UpdateDataPart[], apiCalls: number): number {
    // 基本的な推定: API呼び出しあたり2秒
    const apiTime = apiCalls * 2000
    
    // データ処理時間: パーツあたり100ms
    const processingTime = parts.length * 100
    
    return apiTime + processingTime
  }
  
  /**
   * 優先度の計算
   */
  private calculatePriority(freshnessState: FreshnessState, strategy: UpdateStrategy): number {
    const priorityMap = {
      'critical': 100,
      'high': 80,
      'medium': 60,
      'low': 40,
      'none': 20
    }
    
    const strategyBonus = {
      'full': 10,
      'incremental': 5,
      'smart': 8,
      'minimal': 2
    }
    
    return priorityMap[freshnessState.updatePriority] + strategyBonus[strategy]
  }
  
  /**
   * 戦略選択の理由
   */
  private getStrategyReason(strategy: UpdateStrategy, freshnessState: FreshnessState): string {
    const reasons: Record<UpdateStrategy, string> = {
      'full': `完全更新: データの鮮度が ${freshnessState.staleness}% で更新が必要`,
      'incremental': `増分更新: 最近の変更のみを取得`,
      'smart': `スマート更新: 重要な変更を優先的に取得`,
      'minimal': `最小更新: 必要最小限のデータのみ取得`
    }
    
    return reasons[strategy]
  }
  
  /**
   * データパーツのフェッチ
   */
  private async fetchDataParts(
    parts: UpdateDataPart[],
    fetcher: (part: UpdateDataPart) => Promise<AdInsight[]>
  ): Promise<AdInsight[]> {
    const results: AdInsight[] = []
    
    // バッチ処理が有効な場合
    if (this.config.optimization.enableBatching) {
      const batches = this.createBatches(parts, this.config.maxBatchSize)
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(part => fetcher(part))
        )
        results.push(...batchResults.flat())
      }
    } else {
      // 順次処理
      for (const part of parts) {
        if (part.required) {
          const partData = await fetcher(part)
          results.push(...partData)
        }
      }
    }
    
    return results
  }
  
  /**
   * バッチの作成
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }
  
  /**
   * データのマージ
   */
  private mergeData(
    currentData: AdInsight[],
    fetchedData: AdInsight[],
    strategy: UpdateStrategy
  ): AdInsight[] {
    if (strategy === 'full') {
      // 完全置換
      return fetchedData
    }
    
    // IDマップの作成
    const currentMap = new Map(currentData.map(d => [d.ad_id, d]))
    const fetchedMap = new Map(fetchedData.map(d => [d.ad_id, d]))
    
    // マージ
    const merged = new Map<string, AdInsight>()
    
    // 既存データを保持
    for (const [id, data] of currentMap) {
      merged.set(id, data)
    }
    
    // 新しいデータで上書き
    for (const [id, data] of fetchedMap) {
      if (strategy === 'incremental' || strategy === 'smart') {
        // 新しいデータを優先
        merged.set(id, data)
      } else if (strategy === 'minimal') {
        // 特定のフィールドのみ更新
        const existing = merged.get(id)
        if (existing) {
          merged.set(id, this.mergeFields(existing, data))
        } else {
          merged.set(id, data)
        }
      }
    }
    
    return Array.from(merged.values())
  }
  
  /**
   * フィールドのマージ
   */
  private mergeFields(existing: AdInsight, updated: AdInsight): AdInsight {
    const result = { ...existing }
    
    // 更新対象フィールドのみマージ
    for (const field of this.config.detection.compareFields) {
      if (field in updated) {
        (result as any)[field] = (updated as any)[field]
      }
    }
    
    return result
  }
  
  /**
   * 変更の検出
   */
  private detectChanges(
    oldData: AdInsight[],
    newData: AdInsight[]
  ): DifferentialUpdate['changes'] {
    const oldMap = new Map(oldData.map(d => [d.ad_id, d]))
    const newMap = new Map(newData.map(d => [d.ad_id, d]))
    
    const added: AdInsight[] = []
    const modified: AdInsight[] = []
    const deleted: string[] = []
    
    // 追加と変更の検出
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id)
      
      if (!oldItem) {
        added.push(newItem)
      } else if (this.hasSignificantChange(oldItem, newItem)) {
        modified.push(newItem)
      }
    }
    
    // 削除の検出
    for (const [id] of oldMap) {
      if (!newMap.has(id)) {
        deleted.push(id)
      }
    }
    
    return { added, modified, deleted }
  }
  
  /**
   * 有意な変更の検出
   */
  private hasSignificantChange(oldItem: AdInsight, newItem: AdInsight): boolean {
    for (const field of this.config.detection.compareFields) {
      if (this.config.detection.ignoreFields.includes(field)) {
        continue
      }
      
      const oldValue = (oldItem as any)[field]
      const newValue = (newItem as any)[field]
      
      // 数値フィールドの場合
      if (typeof oldValue === 'number' && typeof newValue === 'number') {
        const changeRate = Math.abs((newValue - oldValue) / oldValue)
        if (changeRate > this.config.detection.significantChangeThreshold) {
          return true
        }
      }
      
      // 文字列フィールドの場合
      if (oldValue !== newValue) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * データ節約量の計算
   */
  private calculateDataSaved(
    strategy: UpdateStrategy,
    _oldData: AdInsight[],
    newData: AdInsight[]
  ): number {
    const fullSize = JSON.stringify(newData).length
    
    switch (strategy) {
      case 'full':
        return 0 // 節約なし
      case 'incremental':
        return fullSize * 0.7 // 約70%節約
      case 'minimal':
        return fullSize * 0.9 // 約90%節約
      case 'smart':
        return fullSize * 0.5 // 約50%節約
      default:
        return 0
    }
  }
  
  /**
   * チェックポイントの作成
   */
  private createCheckpoint(data: AdInsight[]): UpdateCheckpoint {
    return {
      timestamp: new Date(),
      dataHash: this.calculateHash(data),
      recordCount: data.length,
      lastModified: new Date(),
      fields: Object.keys(data[0] || {})
    }
  }
  
  /**
   * データハッシュの計算
   */
  private calculateHash(data: AdInsight[]): string {
    const str = JSON.stringify(data)
    let hash = 0
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    return hash.toString(16)
  }
  
  /**
   * 更新IDの生成
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 履歴への追加
   */
  private addToHistory(key: string, update: DifferentialUpdate): void {
    const history = this.updateHistory.get(key) || []
    history.push(update)
    
    // 最新10件のみ保持
    if (history.length > 10) {
      history.shift()
    }
    
    this.updateHistory.set(key, history)
  }
  
  /**
   * デフォルト設定とマージ
   */
  private mergeWithDefaults(config?: Partial<DifferentialUpdateConfig>): DifferentialUpdateConfig {
    const defaults: DifferentialUpdateConfig = {
      strategy: 'smart',
      maxBatchSize: 5,
      minUpdateInterval: 5,
      detection: {
        checkpointInterval: 30,
        compareFields: ['impressions', 'clicks', 'ctr', 'cpm', 'frequency', 'spend'],
        ignoreFields: ['date_start', 'date_stop'],
        significantChangeThreshold: 0.05
      },
      optimization: {
        enableBatching: true,
        enableCompression: false,
        enableCaching: true,
        prioritizeRecent: true
      },
      errorHandling: {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackToFull: true
      }
    }
    
    return {
      ...defaults,
      ...config,
      detection: { ...defaults.detection, ...config?.detection },
      optimization: { ...defaults.optimization, ...config?.optimization },
      errorHandling: { ...defaults.errorHandling, ...config?.errorHandling }
    }
  }
  
  /**
   * 統計情報の取得
   */
  getStatistics(accountId: string, dateRange: string): {
    totalUpdates: number
    successRate: number
    averageApiCalls: number
    totalDataSaved: number
    averageTimeSaved: number
  } {
    const key = `${accountId}_${dateRange}`
    const history = this.updateHistory.get(key) || []
    
    if (history.length === 0) {
      return {
        totalUpdates: 0,
        successRate: 0,
        averageApiCalls: 0,
        totalDataSaved: 0,
        averageTimeSaved: 0
      }
    }
    
    const successful = history.filter(u => u.status === 'completed')
    const totalApiCalls = successful.reduce((sum, u) => sum + u.stats.apiCalls, 0)
    const totalDataSaved = successful.reduce((sum, u) => sum + u.stats.dataSaved, 0)
    const totalTimeSaved = successful.reduce((sum, u) => sum + u.stats.timeSaved, 0)
    
    return {
      totalUpdates: history.length,
      successRate: (successful.length / history.length) * 100,
      averageApiCalls: successful.length > 0 ? totalApiCalls / successful.length : 0,
      totalDataSaved,
      averageTimeSaved: successful.length > 0 ? totalTimeSaved / successful.length : 0
    }
  }
}

// ============================================================================
// React Hook
// ============================================================================

export function useDifferentialUpdate(
  accountId: string,
  dateRange: string,
  options?: {
    strategy?: UpdateStrategy
    onUpdate?: (update: DifferentialUpdate) => void
    onError?: (error: Error) => void
  }
) {
  const [engine] = React.useState(() => new DifferentialUpdateEngine({
    strategy: options?.strategy || 'smart'
  }))
  
  const [currentUpdate, setCurrentUpdate] = React.useState<DifferentialUpdate | null>(null)
  const [updatePlan, setUpdatePlan] = React.useState<UpdatePlan | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  
  const createPlan = React.useCallback(
    (data: AdInsight[], freshnessState?: FreshnessState) => {
      const plan = engine.createUpdatePlan(data, {
        accountId,
        dateRange,
        lastFetched: new Date(),
        freshnessState
      })
      
      setUpdatePlan(plan)
      return plan
    },
    [engine, accountId, dateRange]
  )
  
  const executeUpdate = React.useCallback(
    async (
      plan: UpdatePlan,
      fetcher: (part: UpdateDataPart) => Promise<AdInsight[]>,
      currentData: AdInsight[]
    ) => {
      setIsUpdating(true)
      
      try {
        const update = await engine.executeDifferentialUpdate(
          plan,
          fetcher,
          currentData,
          { accountId, dateRange }
        )
        
        setCurrentUpdate(update)
        options?.onUpdate?.(update)
        
        return update
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Update failed')
        options?.onError?.(err)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [engine, accountId, dateRange, options]
  )
  
  const statistics = React.useMemo(
    () => engine.getStatistics(accountId, dateRange),
    [engine, accountId, dateRange, currentUpdate]
  )
  
  return {
    createPlan,
    executeUpdate,
    currentUpdate,
    updatePlan,
    isUpdating,
    statistics
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export default DifferentialUpdateEngine