/**
 * 3層キャッシュシステム
 * 
 * L1: メモリキャッシュ（高速・揮発性）
 * L2: Convexデータベース（永続化・リアルタイム同期）
 * L3: Meta API（最新データ・レート制限考慮）
 */

import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { MemoryCache } from './memory-cache'
import { ResilientMetaApiClient } from './resilient-client'
import { DataFreshnessManager } from './data-freshness-manager'
import { DifferentialUpdateEngine } from './differential-update-engine'
import type { AdInsight } from '../types'

export interface CacheResult<T> {
  data: T | null
  source: 'L1' | 'L2' | 'L3' | 'miss'
  metadata?: {
    hitRate?: number
    latency?: number
    freshnessScore?: number
  }
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  forceRefresh?: boolean
  skipL1?: boolean
  skipL2?: boolean
}

export class ThreeLayerCache {
  private memoryCache: MemoryCache
  private convex: ConvexReactClient
  private apiClient: ResilientMetaApiClient
  private freshnessManager: DataFreshnessManager
  private updateEngine: DifferentialUpdateEngine
  private metrics: Map<string, { hits: number; misses: number }>
  private accessToken: string | null = null

  constructor(convex: ConvexReactClient) {
    this.memoryCache = new MemoryCache()
    this.convex = convex
    this.apiClient = new ResilientMetaApiClient()
    this.freshnessManager = new DataFreshnessManager()
    this.updateEngine = new DifferentialUpdateEngine()
    this.metrics = new Map()
  }

  /**
   * 3層キャッシュからデータを取得
   * 上位層から順にチェックし、ヒットしたらそれより上位層にも保存
   */
  async get<T = any>(
    key: string,
    options: CacheOptions = {}
  ): Promise<CacheResult<T>> {
    const startTime = Date.now()
    console.log('[ThreeLayerCache] get() called', { key, options })
    
    // メトリクス初期化
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { hits: 0, misses: 0 })
    }

    // Force refresh オプション
    if (options.forceRefresh) {
      console.log('[ThreeLayerCache] Force refresh requested, going to L3')
      // keyからaccountIdとdateRangeを抽出
      const keyWithoutPrefix = key.replace('act_', '')
      const firstUnderscoreIndex = keyWithoutPrefix.indexOf('_')
      
      let accountId: string
      let dateRange: string
      
      if (firstUnderscoreIndex > 0) {
        accountId = keyWithoutPrefix.substring(0, firstUnderscoreIndex)
        dateRange = keyWithoutPrefix.substring(firstUnderscoreIndex + 1)
      } else {
        console.error('[ThreeLayerCache] Invalid cache key format:', key)
        accountId = keyWithoutPrefix
        dateRange = 'last_30d'
      }
      
      console.log('[ThreeLayerCache] Force refresh - extracted:', { key, accountId, dateRange })
      return this.fetchFromApi(accountId, dateRange, options)
    }

    // L1: メモリキャッシュ
    if (!options.skipL1) {
      console.log('[ThreeLayerCache] Checking L1 (Memory Cache)')
      const memoryData = this.memoryCache.get(key)
      if (memoryData) {
        console.log('[ThreeLayerCache] L1 HIT!', { dataSize: JSON.stringify(memoryData).length })
        this.recordHit(key)
        return {
          data: memoryData as T,
          source: 'L1',
          metadata: {
            hitRate: this.getHitRate(key),
            latency: Date.now() - startTime
          }
        }
      }
      console.log('[ThreeLayerCache] L1 MISS')
    }

    // L2: Convexデータベース
    // 【最適化】L2を読み取り専用モードで有効化（書き込みは無効化）
    if (!options.skipL2) {
      console.log('[ThreeLayerCache] Checking L2 (Convex Database) - 読み取り専用モード')
      try {
        const convexData = await this.convex.query(api.cache.cacheEntries.getByCacheKey, {
          cacheKey: key
        })
        
        if (convexData && convexData.data) {
          console.log('[ThreeLayerCache] L2 HIT! 既存データを取得', { 
            dataSize: JSON.stringify(convexData.data).length,
            key 
          })
          this.recordHit(key)
          
          // L1に保存
          if (!options.skipL1) {
            this.memoryCache.set(key, convexData.data, options.ttl)
            console.log('[ThreeLayerCache] Saved to L1 for future access')
          }
          
          return {
            data: convexData.data as T,
            source: 'L2',
            metadata: {
              hitRate: this.getHitRate(key),
              latency: Date.now() - startTime
            }
          }
        }
        console.log('[ThreeLayerCache] L2 MISS - Convexにデータなし')
      } catch (error) {
        console.error('[ThreeLayerCache] Convex cache error:', error)
      }
    }

    // L3: Meta API
    console.log('[ThreeLayerCache] Going to L3 (Meta API)')
    // keyからaccountIdとdateRangeを抽出
    // 例: "act_596086994975714_last_30d" -> accountId: "596086994975714", dateRange: "last_30d"
    // act_プレフィックスと最初の数値部分を分離
    const keyWithoutPrefix = key.replace('act_', '')
    const firstUnderscoreIndex = keyWithoutPrefix.indexOf('_')
    
    let accountId: string
    let dateRange: string
    
    if (firstUnderscoreIndex > 0) {
      accountId = keyWithoutPrefix.substring(0, firstUnderscoreIndex)
      dateRange = keyWithoutPrefix.substring(firstUnderscoreIndex + 1)
    } else {
      // フォールバック（_が見つからない場合）
      console.error('[ThreeLayerCache] Invalid cache key format:', key)
      accountId = keyWithoutPrefix
      dateRange = 'last_30d'
    }
    
    console.log('[ThreeLayerCache] Extracted from key:', { key, accountId, dateRange })
    return this.fetchFromApi(accountId, dateRange, options)
  }

  /**
   * キャッシュにデータを保存
   * 全層に保存する
   */
  async set<T = any>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    // L1: メモリキャッシュに保存
    if (!options.skipL1) {
      this.memoryCache.set(key, data, options.ttl)
    }

    // L2: Convexに保存
    // 【最適化】L2への保存を完全に無効化（Bandwidth削減のため）
    // 読み取りは有効だが、書き込みは無効
    if (!options.skipL2 && false) { // 書き込みは強制的に無効化
      console.log('[ThreeLayerCache] L2への保存をスキップ（Bandwidth削減 - 読み取り専用モード）')
    }
  }

  /**
   * キャッシュをクリア
   */
  async clear(key?: string): Promise<void> {
    if (key) {
      // 特定のキーをクリア
      this.memoryCache.delete(key)
      
      try {
        await this.convex.mutation(api.cache.cacheEntries.remove, {
          cacheKey: key
        })
      } catch (error) {
        console.error('Failed to clear Convex cache:', error)
      }
    } else {
      // 全キャッシュをクリア
      this.memoryCache.clear()
      // Convexの全削除は実装が必要
    }
  }

  /**
   * 全キャッシュをクリア
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear()
    // Convexの全削除は現時点では個別削除で対応
    try {
      // 既存のキーをすべて削除
      for (const key of this.metrics.keys()) {
        await this.clear(key)
      }
    } catch (error) {
      console.error('Failed to clear all Convex cache:', error)
    }
  }

  /**
   * Meta APIからデータを取得（パブリックメソッドに変更）
   */
  async fetchFromApi<T>(
    accountId: string,
    dateRange: string,
    options?: any
  ): Promise<CacheResult<T>> {
    const startTime = Date.now()
    const key = `${accountId}_${dateRange}`
    console.log('[ThreeLayerCache] fetchFromApi() called', { key })
    
    try {
      // アクセストークンチェック
      if (!this.accessToken) {
        console.error('[ThreeLayerCache] ERROR: No access token set!')
        this.recordMiss(key)
        return {
          data: null,
          source: 'miss',
          metadata: {
            hitRate: this.getHitRate(key),
            latency: Date.now() - startTime,
            error: 'No access token set'
          }
        }
      }
      
      console.log('[ThreeLayerCache] Access token available', { 
        tokenLength: this.accessToken.length,
        tokenPrefix: this.accessToken.substring(0, 10) + '...'
      })

      // パラメータはすでに引数として渡されているので、そのまま使用
      console.log('[ThreeLayerCache] Using params', { 
        accountId, 
        dateRange,
        options 
      })
      
      // Meta API v23.0エンドポイント
      const baseUrl = 'https://graph.facebook.com/v23.0'
      const url = new URL(`${baseUrl}/act_${accountId}/insights`)
      
      // パラメータ設定
      url.searchParams.append('access_token', this.accessToken)
      
      // カスタム日付範囲の処理
      if (options && options.since && options.until) {
        // time_rangeをJSON形式で指定
        const timeRange = {
          since: options.since,
          until: options.until
        }
        url.searchParams.append('time_range', JSON.stringify(timeRange))
        
        // タイムゾーンを明示的に指定（日本時間）
        url.searchParams.append('time_zone', 'Asia/Tokyo')
        
        // アトリビューション設定を追加（重要！）
        url.searchParams.append('use_unified_attribution_setting', 'true')
        url.searchParams.append('action_attribution_windows', '1d_click,7d_click,1d_view,7d_view')
        
        console.log('[ThreeLayerCache] Using custom time_range:', timeRange)
      } else if (dateRange === 'august_2025') {
        // 2025年8月の固定期間を設定（time_rangeをJSON形式で指定）
        const timeRange = {
          since: '2025-08-01',
          until: '2025-08-31'  // 8月1日から8月31日まで
        }
        url.searchParams.append('time_range', JSON.stringify(timeRange))
        
        // タイムゾーンを明示的に指定（日本時間）
        url.searchParams.append('time_zone', 'Asia/Tokyo')
        
        // アトリビューション設定を追加（重要！）
        url.searchParams.append('use_unified_attribution_setting', 'true')
        url.searchParams.append('action_attribution_windows', '1d_click,7d_click,1d_view,7d_view')
        
        console.log('[ThreeLayerCache] Using time_range format with attribution:', timeRange)
      } else {
        url.searchParams.append('date_preset', dateRange || 'last_30d')
      }
      
      // フィルタリング条件を一時的に削除（すべての広告を取得）
      // 問題の原因を特定するため
      // url.searchParams.append('filtering', JSON.stringify([
      //   {
      //     field: 'ad.configured_status',
      //     operator: 'IN',
      //     value: ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']
      //   }
      // ]))
      // フィールド設定（optionsから取得、なければデフォルト）
      const fields = options?.fields || [
        'ad_id',
        'campaign_id',
        'campaign_name',
        'adset_name',
        'ad_name',
        'impressions',
        'clicks',
        'ctr',
        'cpm',
        'frequency',
        'spend',
        'unique_ctr',
        'inline_link_click_ctr',
        'date_start',
        'date_stop'
      ]
      url.searchParams.append('fields', fields.join(','))
      
      // レベル設定（optionsから取得、なければ'ad'）
      url.searchParams.append('level', options?.level || 'ad')
      
      // 制限設定（optionsから取得、なければ1000）
      url.searchParams.append('limit', options?.limit || '1000')
      
      // 時間増分設定（optionsから取得、なければ日別）
      if (options?.time_increment) {
        url.searchParams.append('time_increment', options.time_increment)
      }
      
      // API URLの詳細をログに記録（重要！）
      const urlParams = Object.fromEntries(url.searchParams.entries())
      const debugParams = { ...urlParams }
      if (debugParams.access_token) {
        debugParams.access_token = '***hidden***'
      }
      
      console.log('[ThreeLayerCache] 🔍 API URL 詳細:', {
        fullUrl: url.toString().replace(this.accessToken, '***TOKEN***'),
        pathname: url.pathname,
        params: debugParams,
        dateInfo: {
          dateRange: dateRange,
          since: urlParams.since || 'not set',
          until: urlParams.until || 'not set',
          date_preset: urlParams.date_preset || 'not set'
        }
      })
      
      // API呼び出し
      console.log('[ThreeLayerCache] Fetching from Meta API...')
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000) // 30秒タイムアウト
      })
      
      console.log('[ThreeLayerCache] API Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('[ThreeLayerCache] Meta API error:', {
          error: responseData.error,
          status: response.status
        })
        this.recordMiss(key)
        return {
          data: null,
          source: 'miss',
          metadata: {
            hitRate: this.getHitRate(key),
            latency: Date.now() - startTime,
            error: responseData.error?.message || `HTTP ${response.status}`
          }
        }
      }
      
      let allData = responseData.data || []
      let nextPageUrl = responseData.paging?.next
      let pageCount = 1
      
      // ページング情報を詳細にログ出力（重要！）
      console.log('[ThreeLayerCache] 🚨 初回ページ情報:', {
        hasNextPage: !!nextPageUrl,
        recordCount: allData.length,
        firstDate: allData[0]?.date_start,
        lastDate: allData[allData.length - 1]?.date_start
      })
      
      // ページネーション処理（全ページ取得）
      while (nextPageUrl && pageCount < 10) { // 安全のため10ページまでに制限
        console.log(`[ThreeLayerCache] 📄 ${pageCount + 1}ページ目を取得中...`)
        
        const nextResponse = await fetch(nextPageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(30000)
        })
        
        const nextData = await nextResponse.json()
        
        if (nextResponse.ok && nextData.data) {
          allData = [...allData, ...nextData.data]
          nextPageUrl = nextData.paging?.next
          pageCount++
          
          console.log(`[ThreeLayerCache] ${pageCount}ページ目取得完了:`, {
            newRecords: nextData.data.length,
            totalRecords: allData.length,
            hasMorePages: !!nextPageUrl
          })
        } else {
          console.error('[ThreeLayerCache] ページネーションエラー:', nextData.error)
          break
        }
      }
      
      const data = allData
      
      // 詳細なデバッグ情報を出力
      const uniqueDates = [...new Set(data.map(d => d.date_start))].sort()
      const missingDates = []

      // 8月1日と2日のデータが存在するか確認
      const aug1Data = data.filter(d => d.date_start === '2025-08-01')
      const aug2Data = data.filter(d => d.date_start === '2025-08-02')

      if (aug1Data.length === 0) missingDates.push('2025-08-01')
      if (aug2Data.length === 0) missingDates.push('2025-08-02')

      console.log('[ThreeLayerCache] 🎯 全データ取得完了:', {
        totalPages: pageCount,
        totalRecords: data.length,
        hasMorePages: !!nextPageUrl,
        dateRange: {
          first: data[0]?.date_start,
          last: data[data.length - 1]?.date_start
        },
        uniqueDates: uniqueDates,
        uniqueDateCount: uniqueDates.length,
        aug1DataCount: aug1Data.length,
        aug2DataCount: aug2Data.length,
        missingDates: missingDates.length > 0 ? missingDates : 'なし'
      })

      if (missingDates.length > 0) {
        console.error('[ThreeLayerCache] ⚠️ 警告: 以下の日付のデータが取得できませんでした:', missingDates)
      }
      
      // データを全層にキャッシュ
      if (data.length > 0) {
        console.log('[ThreeLayerCache] Caching data to all layers...')
        await this.set(key, data)
      }
      
      this.recordHit(key)
      console.log('[ThreeLayerCache] L3 fetch successful!')
      
      return {
        data: data as T,
        source: 'L3',
        metadata: {
          hitRate: this.getHitRate(key),
          latency: Date.now() - startTime,
          recordCount: data.length,
          hasNextPage: !!responseData.paging?.next,
          paging: responseData.paging
        }
      }
    } catch (error: any) {
      console.error('[ThreeLayerCache] API fetch error:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        accountId,
        dateRange,
        options
      })
      
      // エラーをそのまま投げて、呼び出し元でキャッチできるようにする
      throw error
    }
  }

  /**
   * ヒットを記録
   */
  private recordHit(key: string): void {
    const metrics = this.metrics.get(key)
    if (metrics) {
      metrics.hits++
    } else {
      this.metrics.set(key, { hits: 1, misses: 0 })
    }
  }

  /**
   * ミスを記録
   */
  private recordMiss(key: string): void {
    const metrics = this.metrics.get(key)
    if (metrics) {
      metrics.misses++
    } else {
      this.metrics.set(key, { hits: 0, misses: 1 })
    }
  }

  /**
   * ヒット率を取得
   */
  private getHitRate(key: string): number {
    const metrics = this.metrics.get(key)
    if (!metrics) return 0
    
    const total = metrics.hits + metrics.misses
    if (total === 0) return 0
    
    return (metrics.hits / total) * 100
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    totalKeys: number
    overallHitRate: number
    memorySize: number
    metrics: Map<string, { hits: number; misses: number }>
  } {
    let totalHits = 0
    let totalMisses = 0
    
    this.metrics.forEach(metric => {
      totalHits += metric.hits
      totalMisses += metric.misses
    })
    
    const totalRequests = totalHits + totalMisses
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    
    return {
      totalKeys: this.metrics.size,
      overallHitRate,
      memorySize: this.memoryCache.size(),
      metrics: this.metrics
    }
  }

  /**
   * APIクライアントにアクセストークンを設定
   */
  setAccessToken(token: string): void {
    this.accessToken = token
    // ResilientMetaApiClientはsetAccessTokenメソッドを持たない
    // 内部でアクセストークンを管理
  }

  /**
   * データ鮮度マネージャーを取得
   */
  getFreshnessManager(): DataFreshnessManager {
    return this.freshnessManager
  }

  /**
   * 差分更新エンジンを取得
   */
  getUpdateEngine(): DifferentialUpdateEngine {
    return this.updateEngine
  }
}