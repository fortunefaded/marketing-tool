import type { MetaCampaign, MetaCreative, MetaInsight, MetaCreativeInsight } from './types'

interface ConvexCampaign {
  metaId: string
  accountId: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  dailyBudget: number
  lifetimeBudget?: number
  startTime: string
  stopTime?: string
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
}

interface ConvexCreative {
  metaId: string
  name: string
  campaignId: string
  adsetId: string
  creativeType: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  thumbnailUrl?: string
  videoUrl?: string
  body?: string
  title?: string
  callToActionType?: string
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
}

interface ConvexInsight {
  campaignId?: string
  creativeId?: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue?: number
  dateStart: string
  dateStop: string
  createdAt: string
}

export function transformCampaignToConvex(campaign: MetaCampaign): ConvexCampaign {
  const now = new Date().toISOString()

  return {
    metaId: campaign.id,
    accountId: campaign.account_id,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    dailyBudget: campaign.daily_budget,
    ...(campaign.lifetime_budget && { lifetimeBudget: campaign.lifetime_budget }),
    startTime: campaign.start_time,
    ...(campaign.stop_time && { stopTime: campaign.stop_time }),
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export function transformCreativeToConvex(creative: MetaCreative): ConvexCreative {
  const now = new Date().toISOString()

  return {
    metaId: creative.id,
    name: creative.name,
    campaignId: creative.campaign_id,
    adsetId: creative.adset_id,
    creativeType: creative.creative_type,
    ...(creative.thumbnail_url && { thumbnailUrl: creative.thumbnail_url }),
    ...(creative.video_url && { videoUrl: creative.video_url }),
    ...(creative.body && { body: creative.body }),
    ...(creative.title && { title: creative.title }),
    ...(creative.call_to_action_type && { callToActionType: creative.call_to_action_type }),
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export function transformInsightToConvex(insight: MetaInsight, campaignId?: string): ConvexInsight {
  const now = new Date().toISOString()

  return {
    ...(campaignId && { campaignId }),
    impressions: parseInt(insight.impressions, 10),
    clicks: parseInt(insight.clicks, 10),
    spend: parseFloat(insight.spend),
    conversions: parseInt(insight.conversions, 10),
    ...(insight.revenue && { revenue: parseFloat(insight.revenue) }),
    dateStart: insight.date_start,
    dateStop: insight.date_stop,
    createdAt: now,
  }
}

export function transformCreativeInsightToConvex(insight: MetaCreativeInsight): ConvexInsight {
  const now = new Date().toISOString()

  return {
    creativeId: insight.creative_id,
    impressions: parseInt(insight.impressions, 10),
    clicks: parseInt(insight.clicks, 10),
    spend: parseFloat(insight.spend),
    conversions: parseInt(insight.conversions, 10),
    ...(insight.revenue && { revenue: parseFloat(insight.revenue) }),
    dateStart: insight.date_start,
    dateStop: insight.date_stop,
    createdAt: now,
  }
}
