/**
 * TASK-203: 日次クリエイティブデータ管理システム
 * Daily Creative Data Management System
 * 
 * 日次更新に特化した効率的なデータ管理
 */

import * as React from 'react'
import type { AdInsight } from '../types'
// import { DifferentialUpdateEngine } from './differential-update-engine' - 未使用
// import { DataFreshnessManager } from './data-freshness-manager' - 未使用

// ============================================================================
// 型定義
// ============================================================================

export type DataAge = 'today' | 'yesterday' | 'recent' | 'historical'

export interface DailyDataConfig {
  // 更新頻度設定
  updateFrequency: {
    today: number      // 分単位（デフォルト: 60分）
    yesterday: string  // 時刻（デフォルト: "09:00"）
    recent: number     // 日数（デフォルト: 3日）
  }
  
  // キャッシュ戦略
  cacheStrategy: {
    splitByDate: boolean     // 日付ごとに分割
    compressHistorical: boolean // 古いデータを圧縮
    retentionDays: number    // 保持日数
  }
  
  // パフォーマンス設定
  performance: {
    maxParallelFetches: number
    batchSize: number
    enableSmartUpdate: boolean
  }
}

export interface DailyDataState {
  accountId: string
  date: string
  creatives: AdInsight[]
  lastUpdated: Date
  nextUpdate: Date
  updateCount: number
  dataAge: DataAge
  isStale: boolean
}

// ============================================================================
// 日次データマネージャー
// ============================================================================

export class DailyDataManager {
  private config: DailyDataConfig
  private cache: Map<string, DailyDataState>
  private updateSchedule: Map<string, NodeJS.Timeout>
  // private differentialEngine: DifferentialUpdateEngine
  // private freshnessManager: DataFreshnessManager
  
  constructor(config?: Partial<DailyDataConfig>) {
    this.config = this.mergeWithDefaults(config)
    this.cache = new Map()
    this.updateSchedule = new Map()
    // this.differentialEngine = new DifferentialUpdateEngine({ strategy: 'smart' })
    // this.freshnessManager = new DataFreshnessManager()
  }
  
  /**
   * データ取得の最適化ロジック
   */
  async fetchDailyData(
    accountId: string,
    date: string,
    fetcher: () => Promise<AdInsight[]>
  ): Promise<DailyDataState> {
    const dataAge = this.determineDataAge(date)
    const cacheKey = this.generateCacheKey(accountId, date, dataAge)
    
    // キャッシュチェック
    const cached = this.cache.get(cacheKey)
    if (cached && !this.isUpdateNeeded(cached, dataAge)) {
      return cached
    }
    
    // 更新戦略の決定
    const updateStrategy = this.getUpdateStrategy(dataAge)
    
    switch (updateStrategy) {
      case 'realtime':
        return this.fetchRealtimeData(accountId, date, fetcher)
        
      case 'morning':
        return this.fetchMorningData(accountId, date, fetcher)
        
      case 'lazy':
        return this.fetchLazyData(accountId, date, fetcher)
        
      case 'none':
        return cached || this.createEmptyState(accountId, date)
    }
  }
  
  /**
   * データ年齢の判定
   */
  private determineDataAge(dateStr: string): DataAge {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays <= this.config.updateFrequency.recent) return 'recent'
    return 'historical'
  }
  
  /**
   * 更新が必要かチェック
   */
  private isUpdateNeeded(state: DailyDataState, dataAge: DataAge): boolean {
    const now = new Date()
    
    switch (dataAge) {
      case 'today':
        // 当日: 設定された頻度でチェック
        const minutesSinceUpdate = (now.getTime() - state.lastUpdated.getTime()) / (1000 * 60)
        return minutesSinceUpdate >= this.config.updateFrequency.today
        
      case 'yesterday':
        // 昨日: 朝9時以降に1回更新
        const morningTime = this.parseMorningTime()
        const isAfterMorning = now.getHours() >= morningTime.hour
        const updatedToday = state.lastUpdated.toDateString() === now.toDateString()
        return isAfterMorning && !updatedToday
        
      case 'recent':
        // 直近: 24時間に1回
        const hoursSinceUpdate = (now.getTime() - state.lastUpdated.getTime()) / (1000 * 60 * 60)
        return hoursSinceUpdate >= 24
        
      case 'historical':
        // 履歴: 更新不要
        return false
    }
  }
  
  /**
   * リアルタイムデータの取得（当日）
   */
  private async fetchRealtimeData(
    accountId: string,
    date: string,
    fetcher: () => Promise<AdInsight[]>
  ): Promise<DailyDataState> {
    console.log(`📊 当日データ更新: ${date}`)
    
    const data = await fetcher()
    const state: DailyDataState = {
      accountId,
      date,
      creatives: data,
      lastUpdated: new Date(),
      nextUpdate: this.calculateNextUpdate('today'),
      updateCount: (this.cache.get(this.generateCacheKey(accountId, date, 'today'))?.updateCount || 0) + 1,
      dataAge: 'today',
      isStale: false
    }
    
    this.cache.set(this.generateCacheKey(accountId, date, 'today'), state)
    this.scheduleNextUpdate(accountId, date, 'today')
    
    return state
  }
  
  /**
   * 朝のデータ取得（昨日）
   */
  private async fetchMorningData(
    accountId: string,
    date: string,
    fetcher: () => Promise<AdInsight[]>
  ): Promise<DailyDataState> {
    console.log(`☀️ 昨日データ確定値取得: ${date}`)
    
    const data = await fetcher()
    const state: DailyDataState = {
      accountId,
      date,
      creatives: data,
      lastUpdated: new Date(),
      nextUpdate: this.calculateNextUpdate('yesterday'),
      updateCount: 1, // 昨日分は1日1回
      dataAge: 'yesterday',
      isStale: false
    }
    
    this.cache.set(this.generateCacheKey(accountId, date, 'yesterday'), state)
    
    // 履歴データとして永続化
    await this.persistHistoricalData(accountId, date, data)
    
    return state
  }
  
  /**
   * 遅延取得（直近）
   */
  private async fetchLazyData(
    accountId: string,
    date: string,
    fetcher: () => Promise<AdInsight[]>
  ): Promise<DailyDataState> {
    console.log(`📁 直近データ取得: ${date}`)
    
    // キャッシュがあればそれを返す
    const cached = this.cache.get(this.generateCacheKey(accountId, date, 'recent'))
    if (cached) {
      cached.isStale = true // 古いが使える
      return cached
    }
    
    const data = await fetcher()
    const state: DailyDataState = {
      accountId,
      date,
      creatives: data,
      lastUpdated: new Date(),
      nextUpdate: this.calculateNextUpdate('recent'),
      updateCount: 1,
      dataAge: 'recent',
      isStale: false
    }
    
    this.cache.set(this.generateCacheKey(accountId, date, 'recent'), state)
    return state
  }
  
  /**
   * 更新戦略の取得
   */
  private getUpdateStrategy(dataAge: DataAge): 'realtime' | 'morning' | 'lazy' | 'none' {
    switch (dataAge) {
      case 'today': return 'realtime'
      case 'yesterday': return 'morning'
      case 'recent': return 'lazy'
      case 'historical': return 'none'
    }
  }
  
  /**
   * 次回更新時刻の計算
   */
  private calculateNextUpdate(dataAge: DataAge): Date {
    const now = new Date()
    
    switch (dataAge) {
      case 'today':
        return new Date(now.getTime() + this.config.updateFrequency.today * 60 * 1000)
        
      case 'yesterday':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const morningTime = this.parseMorningTime()
        tomorrow.setHours(morningTime.hour, morningTime.minute, 0, 0)
        return tomorrow
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  
  /**
   * 次回更新のスケジュール
   */
  private scheduleNextUpdate(accountId: string, date: string, dataAge: DataAge): void {
    const key = `${accountId}_${date}`
    
    // 既存のスケジュールをクリア
    if (this.updateSchedule.has(key)) {
      clearTimeout(this.updateSchedule.get(key)!)
    }
    
    if (dataAge === 'today') {
      const timeout = setTimeout(() => {
        this.cache.delete(this.generateCacheKey(accountId, date, dataAge))
      }, this.config.updateFrequency.today * 60 * 1000)
      
      this.updateSchedule.set(key, timeout)
    }
  }
  
  /**
   * 履歴データの永続化
   */
  private async persistHistoricalData(
    _accountId: string,
    date: string,
    _data: AdInsight[]
  ): Promise<void> {
    // Convexやローカルストレージに保存
    console.log(`💾 履歴データ永続化: ${date}`)
    // 実装は別途
  }
  
  /**
   * キャッシュキーの生成
   */
  private generateCacheKey(accountId: string, date: string, dataAge: DataAge): string {
    return `${accountId}_${date}_${dataAge}`
  }
  
  /**
   * 空の状態を作成
   */
  private createEmptyState(accountId: string, date: string): DailyDataState {
    return {
      accountId,
      date,
      creatives: [],
      lastUpdated: new Date(),
      nextUpdate: new Date(),
      updateCount: 0,
      dataAge: 'historical',
      isStale: true
    }
  }
  
  /**
   * 朝の時刻をパース
   */
  private parseMorningTime(): { hour: number; minute: number } {
    const [hour, minute] = this.config.updateFrequency.yesterday.split(':').map(Number)
    return { hour, minute }
  }
  
  /**
   * デフォルト設定とマージ
   */
  private mergeWithDefaults(config?: Partial<DailyDataConfig>): DailyDataConfig {
    const defaults: DailyDataConfig = {
      updateFrequency: {
        today: 60,        // 1時間ごと
        yesterday: "09:00", // 朝9時
        recent: 3          // 3日
      },
      cacheStrategy: {
        splitByDate: true,
        compressHistorical: false,
        retentionDays: 90
      },
      performance: {
        maxParallelFetches: 3,
        batchSize: 10,
        enableSmartUpdate: true
      }
    }
    
    return {
      ...defaults,
      ...config,
      updateFrequency: { ...defaults.updateFrequency, ...config?.updateFrequency },
      cacheStrategy: { ...defaults.cacheStrategy, ...config?.cacheStrategy },
      performance: { ...defaults.performance, ...config?.performance }
    }
  }
  
  /**
   * バッチ取得の最適化
   */
  async fetchBatch(
    accountId: string,
    dates: string[],
    fetcher: (dates: string[]) => Promise<AdInsight[]>
  ): Promise<Map<string, DailyDataState>> {
    const results = new Map<string, DailyDataState>()
    
    // 日付を年齢別にグループ化
    const groupedDates = this.groupDatesByAge(dates)
    
    // 更新が必要なものだけ取得
    const datesToFetch: string[] = []
    
    for (const [dataAge, datelist] of groupedDates) {
      if (dataAge === 'today' || dataAge === 'yesterday') {
        datesToFetch.push(...datelist)
      }
    }
    
    if (datesToFetch.length > 0) {
      const freshData = await fetcher(datesToFetch)
      
      // データを日付ごとに分割して保存
      const dataByDate = this.splitDataByDate(freshData)
      
      for (const [date, dayData] of dataByDate) {
        const state = await this.fetchDailyData(
          accountId,
          date,
          async () => dayData
        )
        results.set(date, state)
      }
    }
    
    // キャッシュから残りを取得
    for (const date of dates) {
      if (!results.has(date)) {
        const cached = this.getCachedData(accountId, date)
        if (cached) {
          results.set(date, cached)
        }
      }
    }
    
    return results
  }
  
  /**
   * 日付を年齢別にグループ化
   */
  private groupDatesByAge(dates: string[]): Map<DataAge, string[]> {
    const grouped = new Map<DataAge, string[]>()
    
    for (const date of dates) {
      const age = this.determineDataAge(date)
      if (!grouped.has(age)) {
        grouped.set(age, [])
      }
      grouped.get(age)!.push(date)
    }
    
    return grouped
  }
  
  /**
   * データを日付ごとに分割
   */
  private splitDataByDate(data: AdInsight[]): Map<string, AdInsight[]> {
    const byDate = new Map<string, AdInsight[]>()
    
    for (const insight of data) {
      const date = insight.date_start || ''
      if (!byDate.has(date)) {
        byDate.set(date, [])
      }
      byDate.get(date)!.push(insight)
    }
    
    return byDate
  }
  
  /**
   * キャッシュからデータ取得
   */
  private getCachedData(accountId: string, date: string): DailyDataState | null {
    const dataAge = this.determineDataAge(date)
    const key = this.generateCacheKey(accountId, date, dataAge)
    return this.cache.get(key) || null
  }
  
  /**
   * 統計情報の取得
   */
  getStatistics(): {
    cacheSize: number
    todayUpdates: number
    yesterdayUpdates: number
    historicalCount: number
  } {
    let todayUpdates = 0
    let yesterdayUpdates = 0
    let historicalCount = 0
    
    for (const [, state] of this.cache) {
      switch (state.dataAge) {
        case 'today':
          todayUpdates += state.updateCount
          break
        case 'yesterday':
          yesterdayUpdates += state.updateCount
          break
        case 'historical':
          historicalCount++
          break
      }
    }
    
    return {
      cacheSize: this.cache.size,
      todayUpdates,
      yesterdayUpdates,
      historicalCount
    }
  }
}

// ============================================================================
// React Hook
// ============================================================================

export function useDailyData(
  accountId: string,
  dates: string[],
  options?: {
    autoUpdate?: boolean
    onUpdate?: (states: Map<string, DailyDataState>) => void
    fetcher?: (dates: string[]) => Promise<AdInsight[]>
  }
) {
  const [manager] = React.useState(() => new DailyDataManager())
  const [states, setStates] = React.useState<Map<string, DailyDataState>>(new Map())
  const [loading, setLoading] = React.useState(false)
  
  const fetchData = React.useCallback(async () => {
    if (!options?.fetcher) return
    
    setLoading(true)
    try {
      const results = await manager.fetchBatch(
        accountId,
        dates,
        options.fetcher
      )
      
      setStates(results)
      options?.onUpdate?.(results)
    } finally {
      setLoading(false)
    }
  }, [manager, accountId, dates, options])
  
  React.useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // 自動更新の設定
  React.useEffect(() => {
    if (!options?.autoUpdate) return
    
    // 当日データは1時間ごとに更新
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0]
      if (dates.includes(today)) {
        fetchData()
      }
    }, 60 * 60 * 1000) // 1時間
    
    return () => clearInterval(interval)
  }, [dates, options?.autoUpdate, fetchData])
  
  const statistics = React.useMemo(
    () => manager.getStatistics(),
    [manager, states]
  )
  
  return {
    states,
    loading,
    refresh: fetchData,
    statistics
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export default DailyDataManager