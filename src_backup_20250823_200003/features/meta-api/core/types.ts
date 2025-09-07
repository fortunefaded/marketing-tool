export interface MetaAccount {
  accountId: string
  name: string
  accessToken: string
}

export interface AdInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  impressions: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  spend: number
}

// Legacy type compatibility for MetaInsightsData
export interface MetaInsightsData {
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  frequency: string
  cpm: string
  cpc: string
  ctr: string

  // Main conversion metrics
  conversions?: string
  conversion_value?: string
  cost_per_conversion?: string
  roas?: string

  // Detailed conversion data
  purchase_conversions?: number
  website_purchase_conversions?: number
  offsite_conversions?: number
  omni_purchase_conversions?: number

  purchase_value?: number
  website_purchase_value?: number
  offsite_conversion_value?: number
  omni_purchase_value?: number

  purchase_cpa?: number
  website_purchase_cpa?: number
  offsite_conversion_cpa?: number

  purchase_roas_value?: number
  website_purchase_roas_value?: number

  // Raw data (for debugging)
  actions_raw?: any[]
  action_values_raw?: any[]
  cost_per_action_type_raw?: any[]
  purchase_roas_raw?: any
  website_purchase_roas_raw?: any
  parser_debug?: any

  // Campaign information
  campaign_id?: string
  campaign_name?: string
  // Ad set information
  adset_id?: string
  adset_name?: string
  // Ad information
  ad_id?: string
  ad_name?: string
  // Creative information
  creative_id?: string
  creative_name?: string
  creative_type?: string
  creative_url?: string
  thumbnail_url?: string
  video_url?: string
  video_id?: string
  carousel_cards?: Array<{
    name: string
    description: string
    image_url: string
    link: string
  }>
  [key: string]: string | Array<any> | number | undefined
}