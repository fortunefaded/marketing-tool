/**
 * useAdAggregation.ts
 * データ集約機能のフック
 */

import { useMemo } from 'react'
import {
  UnifiedAdData,
  AdPerformanceData,
  AggregationOptions
} from '../../types'
import { AdDataAggregator } from '../../core/ad-data-aggregator'

export interface UseAdAggregationOptions extends Partial<AggregationOptions> {
  enabled?: boolean
}

export interface UseAdAggregationResult {
  aggregatedData: AdPerformanceData[]
  isAggregating: boolean
  aggregationMetrics?: {
    inputRows: number
    outputRows: number
    processingTimeMs: number
    dataReduction: string
  }
  error: Error | null
}

/**
 * 広告データの集約フック
 */
export function useAdAggregation(
  data: UnifiedAdData[],
  options: UseAdAggregationOptions = {}
): UseAdAggregationResult {
  const {
    enabled = true,
    groupBy = 'ad',
    includePlatformBreakdown = true,
    includeDailyBreakdown = true,
    calculateFatigue = false
  } = options

  const result = useMemo(() => {
    if (!enabled || !data || data.length === 0) {
      return {
        aggregatedData: [],
        isAggregating: false,
        aggregationMetrics: undefined,
        error: null
      }
    }

    const startTime = performance.now()

    try {
      // データを MetaApiInsight 形式に変換
      const insights = data.map(item => ({
        ad_id: item.ad_id,
        ad_name: item.ad_name,
        campaign_id: item.campaign_id || '',
        campaign_name: item.campaign_name || '',
        adset_id: item.adset_id || '',
        adset_name: item.adset_name || '',
        account_id: item.account_id || '',
        
        date_start: item.summary?.dateRange?.start || '',
        date_stop: item.summary?.dateRange?.end || '',
        publisher_platform: '',
        
        impressions: String(item.metrics.impressions),
        clicks: String(item.metrics.clicks),
        spend: String(item.metrics.spend),
        reach: String(item.metrics.reach),
        frequency: String(item.metrics.frequency),
        ctr: String(item.metrics.ctr),
        cpm: String(item.metrics.cpm),
        cpc: String(item.metrics.cpc),
        
        conversions: String(item.metrics.conversions),
        first_conversions: String(item.metrics.first_conversions),
        
        creative_type: item.creative?.type,
        thumbnail_url: item.creative?.thumbnail_url,
        video_url: item.creative?.video_url,
        image_url: item.creative?.image_url
      }))

      // 集約実行
      const aggregationResult = AdDataAggregator.aggregate(insights, {
        groupBy,
        includePlatformBreakdown,
        includeDailyBreakdown,
        calculateFatigue
      })

      const endTime = performance.now()
      const processingTimeMs = endTime - startTime

      return {
        aggregatedData: aggregationResult.data,
        isAggregating: false,
        aggregationMetrics: {
          inputRows: aggregationResult.metadata.totalInputRows,
          outputRows: aggregationResult.metadata.totalOutputRows,
          processingTimeMs,
          dataReduction: aggregationResult.metadata.dataReduction
        },
        error: null
      }

    } catch (err) {
      console.error('[AdAggregation] Error:', err)
      return {
        aggregatedData: [],
        isAggregating: false,
        aggregationMetrics: undefined,
        error: err as Error
      }
    }
  }, [data, enabled, groupBy, includePlatformBreakdown, includeDailyBreakdown, calculateFatigue])

  return result
}