import { MetaApiClient } from './MetaApiClient'
import { logger } from '@shared/utils/logger'

export interface InsightsOptions {
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange?: {
    since: string
    until: string
  }
  fields?: string[]
  limit?: number
  timeIncrement?: string
  breakdowns?: string[]
  actionBreakdowns?: string[]
  useAccountAttributionSetting?: boolean
}

export interface MetaInsightsData {
  [key: string]: any
  ad_id?: string
  ad_name?: string
  campaign_id?: string
  campaign_name?: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpc: number
  cpm: number
  actions?: Array<{
    action_type: string
    value: string | number
  }>
}

export class MetaInsightsService {
  constructor(private client: MetaApiClient) {}

  /**
   * Get insights data from Meta API
   */
  async getInsights(options: InsightsOptions = {}): Promise<MetaInsightsData[]> {
    const accountId = this.client.getAccountId()
    const endpoint = `/${accountId}/insights`
    
    const params: Record<string, any> = {
      level: options.level || 'ad',
      limit: options.limit || 500,
      time_increment: options.timeIncrement,
      breakdowns: options.breakdowns,
      action_breakdowns: options.actionBreakdowns,
    }

    // Date range
    if (options.dateRange) {
      params.time_range = JSON.stringify({
        since: options.dateRange.since,
        until: options.dateRange.until
      })
    }

    // Fields
    const defaultFields = [
      'ad_id',
      'ad_name',
      'campaign_id', 
      'campaign_name',
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'ctr',
      'cpc',
      'cpm',
      'actions'
    ]
    params.fields = options.fields || defaultFields

    // Attribution settings
    if (options.useAccountAttributionSetting) {
      params.use_account_attribution_setting = true
      params.use_unified_attribution_setting = true
      params.action_attribution_windows = ['7d_click', '1d_view']
    }

    try {
      const response = await this.client.apiCall(endpoint, params)
      const data = Array.isArray(response) ? response : response.data || []
      
      logger.api('insights_response', { 
        recordCount: data.length,
        hasActions: data.some((item: any) => item.actions?.length > 0)
      })
      
      return data
    } catch (error) {
      logger.error('Failed to get insights:', error)
      throw error
    }
  }

  /**
   * Extract action value from actions array
   */
  extractActionValue(actions: any[], actionType: string): number {
    if (!actions || !Array.isArray(actions)) return 0
    
    const action = actions.find(a => a.action_type === actionType)
    return action ? parseFloat(action.value) : 0
  }

  /**
   * Process insights data with calculations
   */
  processInsights(insights: MetaInsightsData[]): MetaInsightsData[] {
    return insights.map(insight => {
      // Calculate engagement rate if we have the data
      const impressions = insight.impressions || 0
      const likes = this.extractActionValue(insight.actions || [], 'like')
      const comments = this.extractActionValue(insight.actions || [], 'comment')
      const shares = this.extractActionValue(insight.actions || [], 'post')
      const saves = this.extractActionValue(insight.actions || [], 'post_save')
      
      const totalEngagements = likes + comments + shares + saves
      const engagementRate = impressions > 0 ? (totalEngagements / impressions) * 100 : 0
      
      return {
        ...insight,
        engagement_rate: engagementRate,
        likes,
        comments,
        shares,
        saves
      }
    })
  }
}