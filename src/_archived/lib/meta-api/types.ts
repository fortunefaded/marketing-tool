// Meta広告APIの型定義

export interface MetaCampaign {
  id: string
  account_id: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  daily_budget: number
  lifetime_budget?: number
  start_time: string
  stop_time?: string
  insights: {
    data: MetaInsight[]
  }
}

export interface MetaInsight {
  impressions: string
  clicks: string
  spend: string
  conversions: string
  revenue?: string
  date_start: string
  date_stop: string
}

export interface MetaAdSet {
  id: string
  name: string
  campaign_id: string
  status: string
  targeting?: any
  budget_remaining?: string
  daily_budget?: string
  lifetime_budget?: string
}

export interface MetaAd {
  id: string
  name: string
  adset_id: string
  campaign_id: string
  creative_id: string
  status: string
}
export interface MetaCreative {
  id: string
  name: string
  campaign_id: string
  adset_id: string
  creative_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  thumbnail_url?: string
  video_url?: string
  body?: string
  title?: string
  call_to_action_type?: string
  insights: {
    data: MetaCreativeInsight[]
  }
}

export interface MetaCreativeInsight extends MetaInsight {
  creative_id: string
}

export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
}

export interface MetaApiError {
  message: string
  code: number
  type?: string
  fbtrace_id?: string
}
