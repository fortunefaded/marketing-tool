/**
 * Legacy compatibility hooks for gradual migration
 * These hooks provide the same interface as the old implementation
 * but use the new clean Meta API under the hood
 */
import { useMetaInsights, useMetaCampaigns } from './useMetaApi'
import { insightsToLegacyFormat } from '../utils/typeMigration'
import type { MetaInsightsData, MetaCampaignData } from '../../../_archived/services/metaApiService'

interface LegacyMetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
}

/**
 * Legacy hook that returns data in the old format
 * @deprecated Use useMetaInsights from the new API instead
 */
export function useLegacyMetaInsights(
  config: LegacyMetaApiConfig,
  options?: {
    dateRange?: { start: string; end: string }
    level?: 'account' | 'campaign' | 'adset' | 'ad'
  }
): {
  data: MetaInsightsData[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { data, isLoading, error, refetch } = useMetaInsights(
    {
      accessToken: config.accessToken,
      accountId: config.accountId,
      apiVersion: config.apiVersion || 'v23.0'
    },
    {
      level: options?.level || 'ad',
      dateRange: options?.dateRange ? {
        since: options.dateRange.start,
        until: options.dateRange.end
      } : undefined
    }
  )

  return {
    data: data ? insightsToLegacyFormat(data.data) : [],
    isLoading,
    error,
    refetch
  }
}

/**
 * Legacy hook for campaigns
 * @deprecated Use useMetaCampaigns from the new API instead
 */
export function useLegacyMetaCampaigns(
  config: LegacyMetaApiConfig
): {
  data: MetaCampaignData[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { data, isLoading, error, refetch } = useMetaCampaigns({
    accessToken: config.accessToken,
    accountId: config.accountId,
    apiVersion: config.apiVersion || 'v23.0'
  })

  // Convert to legacy format
  const legacyData: MetaCampaignData[] = data?.data.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective || '',
    dailyBudget: Number(campaign.daily_budget || 0),
    lifetimeBudget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) : undefined,
    spend: 0, // This would need to come from insights
    created_time: new Date().toISOString(), // Not available in basic campaign data
    updated_time: new Date().toISOString()
  })) || []

  return {
    data: legacyData,
    isLoading,
    error,
    refetch
  }
}