/**
 * useAdFatigueWithAggregation
 * 
 * データ集約機能を追加した新しいバージョンのフック
 * フィーチャーフラグで既存の実装と切り替え可能
 */

import { useState, useEffect, useMemo } from 'react'
import { useAdFatigueSimplified, type DateRangeFilter } from './useAdFatigueSimplified'
import { AdDataAggregator } from '../core/ad-data-aggregator'
import type { 
  AdPerformanceData, 
  MetaApiInsight,
  AggregationOptions 
} from '../../../docs/design/meta-api-data-aggregation/interfaces'

interface UseAdFatigueWithAggregationOptions {
  accountId: string
  dateRange?: DateRangeFilter
  enableAggregation?: boolean // フィーチャーフラグ
  aggregationOptions?: Partial<AggregationOptions>
}

interface UseAdFatigueWithAggregationResult {
  // 既存のプロパティ
  data: any[]
  insights: any[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refetch: (options?: { clearCache?: boolean }) => Promise<void>
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
  
  // 追加プロパティ（FatigueDashboardContainer用）
  progress: number
  totalInsights: number
  filteredCount: number
  
  // 新規：集約関連
  aggregatedData: AdPerformanceData[] | null
  isAggregating: boolean
  aggregationError: Error | null
  aggregationMetrics?: {
    inputRows: number
    outputRows: number
    processingTimeMs: number
    dataReduction: string // e.g., "90.5%"
  }
}

/**
 * データ集約機能を追加した広告疲労度フック
 */
export function useAdFatigueWithAggregation({
  accountId,
  dateRange = 'last_30d',
  enableAggregation = false,
  aggregationOptions = {}
}: UseAdFatigueWithAggregationOptions): UseAdFatigueWithAggregationResult {
  // 既存のフックを使用
  const existingResult = useAdFatigueSimplified({
    accountId,
    preferCache: false,
    enrichWithCreatives: true,
    dateRange
  })

  // 集約関連の状態
  const [aggregatedData, setAggregatedData] = useState<AdPerformanceData[] | null>(null)
  const [isAggregating, setIsAggregating] = useState(false)
  const [aggregationError, setAggregationError] = useState<Error | null>(null)
  const [aggregationMetrics, setAggregationMetrics] = useState<any>(null)

  // データ集約処理
  useEffect(() => {
    if (!enableAggregation || !existingResult.insights || existingResult.insights.length === 0) {
      console.log('[Aggregation] スキップ:', {
        enableAggregation,
        hasInsights: !!existingResult.insights,
        insightsLength: existingResult.insights?.length || 0
      })
      return
    }

    const performAggregation = async () => {
      console.log('[Aggregation] 開始:', {
        inputRows: existingResult.insights.length,
        enabledOptions: aggregationOptions
      })

      setIsAggregating(true)
      setAggregationError(null)
      
      const startTime = performance.now()

      try {
        // 型変換（既存のinsightsをMetaApiInsight型に変換）
        const typedInsights: MetaApiInsight[] = existingResult.insights.map((insight: any) => ({
          ad_id: insight.ad_id || insight.id,
          ad_name: insight.ad_name || insight.name,
          campaign_id: insight.campaign_id,
          campaign_name: insight.campaign_name,
          adset_id: insight.adset_id,
          adset_name: insight.adset_name,
          account_id: insight.account_id || accountId,
          
          date_start: insight.date_start || insight.date,
          date_stop: insight.date_stop || insight.date,
          
          publisher_platform: insight.publisher_platform || insight.platform,
          
          impressions: String(insight.impressions || 0),
          clicks: String(insight.clicks || 0),
          spend: String(insight.spend || 0),
          reach: String(insight.reach || 0),
          frequency: String(insight.frequency || 0),
          unique_clicks: String(insight.unique_clicks || 0),
          ctr: String(insight.ctr || 0),
          cpm: String(insight.cpm || 0),
          cpc: String(insight.cpc || 0),
          
          conversions: String(insight.conversions || 0),
          conversion_values: String(insight.conversion_values || 0),
          first_conversions: String(insight.first_conversions || 0),
          
          // クリエイティブ情報
          creative_id: insight.creative_id,
          creative_name: insight.creative_name,
          creative_type: insight.creative_type,
          thumbnail_url: insight.thumbnail_url,
          video_url: insight.video_url,
          image_url: insight.image_url,
          object_type: insight.object_type,
        }))

        // 集約処理を実行
        const result = AdDataAggregator.aggregate(typedInsights, {
          groupBy: 'ad',
          includePlatformBreakdown: true,
          includeDailyBreakdown: true,
          calculateFatigue: false, // 疲労度計算は別途実行
          ...aggregationOptions
        })

        const endTime = performance.now()
        const processingTime = endTime - startTime

        // 結果を保存
        setAggregatedData(result.data)
        
        // メトリクスを計算
        const dataReduction = ((1 - result.data.length / typedInsights.length) * 100).toFixed(1)
        setAggregationMetrics({
          inputRows: typedInsights.length,
          outputRows: result.data.length,
          processingTimeMs: processingTime,
          dataReduction: `${dataReduction}%`
        })

        console.log('[Aggregation] 完了:', {
          inputRows: typedInsights.length,
          outputRows: result.data.length,
          processingTime: `${processingTime.toFixed(2)}ms`,
          dataReduction: `${dataReduction}%`,
          errors: result.metadata.errors.length
        })

        // エラーがあればログ出力
        if (result.metadata.errors.length > 0) {
          console.warn('[Aggregation] 警告:', result.metadata.errors)
        }

      } catch (error) {
        console.error('[Aggregation] エラー:', error)
        setAggregationError(error as Error)
      } finally {
        setIsAggregating(false)
      }
    }

    // 非同期で集約処理を実行
    performAggregation()
  }, [
    existingResult.insights, 
    enableAggregation, 
    accountId,
    // aggregationOptionsは頻繁に変わる可能性があるので依存から外す
  ])

  // デバッグ情報をウィンドウオブジェクトに追加（開発用）
  useEffect(() => {
    if (typeof window !== 'undefined' && enableAggregation) {
      (window as any).__AGGREGATION_DEBUG__ = {
        aggregatedData,
        aggregationMetrics,
        isAggregating,
        error: aggregationError?.message
      }
    }
  }, [aggregatedData, aggregationMetrics, isAggregating, aggregationError, enableAggregation])

  return {
    // 既存のプロパティをそのまま返す
    ...existingResult,
    
    // 追加プロパティ
    progress: existingResult.progress, // Pass through the progress from the underlying hook
    totalInsights: existingResult.insights?.length || 0,
    filteredCount: existingResult.data?.length || 0,
    
    // 新規：集約関連のプロパティ
    aggregatedData,
    isAggregating,
    aggregationError,
    aggregationMetrics
  }
}

/**
 * デフォルトエクスポート
 * 既存のuseAdFatigueとの互換性を保つ
 */
export function useAdFatigue(
  accountId: string, 
  dateRange?: DateRangeFilter,
  enableNewAggregation: boolean = false // デフォルトは無効
) {
  if (enableNewAggregation) {
    console.log('✨ [AdFatigue] 新しい集約機能を有効化')
    return useAdFatigueWithAggregation({
      accountId,
      dateRange,
      enableAggregation: true,
      aggregationOptions: {
        includePlatformBreakdown: true,
        includeDailyBreakdown: true
      }
    })
  }
  
  // 既存の実装を使用
  return useAdFatigueSimplified({
    accountId,
    preferCache: false,
    enrichWithCreatives: true,
    dateRange: dateRange || 'last_30d'
  })
}