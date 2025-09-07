/**
 * インサイトデータ専用フック
 */

import { useMemo } from 'react'
import { useMetaData, useMetaApiCore } from './useMetaData'
// TODO: Replace with new insight params interface
// import { InsightParams } from '../../_archived/services/MetaApiCore'
interface InsightParams {
  level: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange?: { start: string; end: string }
  fields?: string[]
  filters?: any
  limit?: number
}
import { MetaApiTypes } from '../../services/core/types'

export interface UseInsightsOptions {
  enabled?: boolean
  refetchInterval?: number
  onSuccess?: (data: MetaApiTypes.Insight[]) => void
  onError?: (error: Error) => void
}

export function useInsights(
  params: InsightParams,
  options: UseInsightsOptions = {}
) {
  const { apiCore, isInitialized } = useMetaApiCore()
  
  // パラメータのメモ化
  const memoizedParams = useMemo(() => params, [
    params.level,
    params.dateRange?.start,
    params.dateRange?.end,
    params.fields?.join(','),
    params.limit,
    JSON.stringify(params.filters)
  ])

  // フェッチャー関数
  const fetcher = useMemo(
    () => async () => {
      if (!isInitialized) {
        throw new Error('Meta API not initialized')
      }
      return apiCore.getInsights(memoizedParams)
    },
    [apiCore, isInitialized, memoizedParams]
  )

  return useMetaData<MetaApiTypes.Insight[]>(
    fetcher,
    [memoizedParams],
    {
      ...options,
      enabled: isInitialized && (options.enabled ?? true)
    }
  )
}

/**
 * キャンペーンインサイト用フック
 */
export function useCampaignInsights(
  campaignId: string,
  dateRange?: { start: string; end: string },
  options: UseInsightsOptions = {}
) {
  return useInsights(
    {
      level: 'campaign',
      filters: { campaign_id: campaignId },
      dateRange,
      fields: [
        'campaign_id', 'campaign_name',
        'impressions', 'clicks', 'spend',
        'reach', 'frequency', 'cpm', 'cpc', 'ctr',
        'actions', 'action_values'
      ]
    },
    options
  )
}

/**
 * 広告インサイト用フック
 */
export function useAdInsights(
  adId: string,
  dateRange?: { start: string; end: string },
  options: UseInsightsOptions = {}
) {
  return useInsights(
    {
      level: 'ad',
      filters: { ad_id: adId },
      dateRange,
      fields: [
        'ad_id', 'ad_name', 'campaign_id', 'campaign_name',
        'impressions', 'clicks', 'spend',
        'reach', 'frequency', 'cpm', 'cpc', 'ctr',
        'actions', 'action_values'
      ]
    },
    options
  )
}

/**
 * アカウント全体のインサイト用フック
 */
export function useAccountInsights(
  dateRange?: { start: string; end: string },
  options: UseInsightsOptions = {}
) {
  return useInsights(
    {
      level: 'account',
      dateRange,
      fields: [
        'impressions', 'clicks', 'spend',
        'reach', 'cpm', 'cpc', 'ctr',
        'actions', 'action_values'
      ]
    },
    options
  )
}