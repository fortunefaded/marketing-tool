import { Insight } from '../services/MetaApiServiceV2'
import type { 
  MetaInsightsData, 
  MetaCampaignData, 
  MetaAdSetData, 
  MetaAdData 
} from '../../../_archived/services/metaApiService'

/**
 * Convert new Insight type to legacy MetaInsightsData type
 * This is a temporary adapter during migration
 */
export function insightToLegacyFormat(insight: Insight): MetaInsightsData {
  return {
    date_start: insight.date_start || '',
    date_stop: insight.date_stop || '',
    impressions: String(insight.impressions),
    clicks: String(insight.clicks),
    spend: String(insight.spend),
    reach: String(insight.reach),
    frequency: insight.frequency,
    cpm: String(insight.cpm),
    cpc: String(insight.cpc),
    ctr: String(insight.ctr),
    
    // Map actions to legacy fields
    conversions: getActionValue(insight.actions, 'purchase') || '0',
    conversion_value: getActionValue(insight.actions, 'purchase', true) || '0',
    cost_per_conversion: calculateCPA(insight.spend, getActionValue(insight.actions, 'purchase')),
    roas: calculateROAS(getActionValue(insight.actions, 'purchase', true), insight.spend),
    
    // Additional conversion metrics
    purchase_conversions: Number(getActionValue(insight.actions, 'purchase') || 0),
    website_purchase_conversions: Number(getActionValue(insight.actions, 'website_purchase') || 0),
    offsite_conversions: Number(getActionValue(insight.actions, 'offsite_conversion') || 0),
    omni_purchase_conversions: Number(getActionValue(insight.actions, 'omni_purchase') || 0),
    
    purchase_value: Number(getActionValue(insight.actions, 'purchase', true) || 0),
    website_purchase_value: Number(getActionValue(insight.actions, 'website_purchase', true) || 0),
    offsite_conversion_value: Number(getActionValue(insight.actions, 'offsite_conversion', true) || 0),
    omni_purchase_value: Number(getActionValue(insight.actions, 'omni_purchase', true) || 0),
    
    // Legacy fields
    ad_id: insight.ad_id,
    ad_name: insight.ad_name,
    campaign_id: insight.campaign_id,
    campaign_name: insight.campaign_name,
  }
}

/**
 * Extract action value from actions array
 */
function getActionValue(
  actions: Array<{ action_type: string; value: string | number }> | undefined,
  actionType: string,
  isValue = false
): string | undefined {
  if (!actions) return undefined
  
  const action = actions.find(a => a.action_type === actionType)
  if (!action) return undefined
  
  // For value fields, we need to parse from 'value' or return the raw value
  if (isValue && typeof action.value === 'string') {
    // Value might be in format like "123.45" or just a number
    return action.value
  }
  
  return String(action.value)
}

/**
 * Calculate CPA (Cost Per Acquisition)
 */
function calculateCPA(spend: number, conversions: string | undefined): string {
  const convNum = Number(conversions || 0)
  if (convNum === 0) return '0'
  return String(spend / convNum)
}

/**
 * Calculate ROAS (Return on Ad Spend)
 */
function calculateROAS(value: string | undefined, spend: number): string {
  const valueNum = Number(value || 0)
  if (spend === 0) return '0'
  return String(valueNum / spend)
}

/**
 * Convert array of new Insights to legacy format
 */
export function insightsToLegacyFormat(insights: Insight[]): MetaInsightsData[] {
  return insights.map(insightToLegacyFormat)
}