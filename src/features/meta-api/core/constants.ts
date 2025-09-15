/**
 * Meta Graph API関連の定数
 */

// Meta Graph API バージョン
export const META_API_VERSION = 'v23.0'

// Meta Graph API ベースURL
export const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

// Meta API エンドポイント定数
export const META_API_ENDPOINTS = {
  // 基本エンドポイント
  ME: '/me',
  OAUTH_ACCESS_TOKEN: '/oauth/access_token',
  DEBUG_TOKEN: '/debug_token',
  
  // 広告関連エンドポイント
  AD_ACCOUNTS: (accountId: string) => `/act_${accountId}`,
  CAMPAIGNS: (accountId: string) => `/act_${accountId}/campaigns`,
  ADSETS: (accountId: string) => `/act_${accountId}/adsets`,
  ADS: (accountId: string) => `/act_${accountId}/ads`,
  INSIGHTS: (accountId: string) => `/act_${accountId}/insights`,
  AD_INSIGHTS: (adId: string) => `/${adId}/insights`,
  AD_CREATIVE: (adId: string) => `/${adId}`,
  
  // 投稿・クリエイティブ関連
  POST_ATTACHMENTS: (postId: string) => `/${postId}`,
  
  // Facebook動画プラグイン
  VIDEO_PLUGIN: (videoUrl: string, width = 254, height = 240) => 
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=${width}&height=${height}`
} as const

// Meta API フィールド定数
export const META_API_FIELDS = {
  // 基本フィールド
  BASIC: 'id,name',
  
  // 広告アカウント
  AD_ACCOUNT: 'id,name,currency,timezone_name,account_status',
  
  // キャンペーン
  CAMPAIGN: 'id,name,status,objective,created_time,updated_time',
  
  // 広告セット  
  ADSET: 'id,name,status,campaign_id,created_time,updated_time',
  
  // 広告
  AD: 'id,name,status,campaign_id,adset_id,created_time,updated_time',
  
  // クリエイティブ
  CREATIVE: 'creative{id,name,title,body,image_url,video_id,thumbnail_url,object_type,link_url,effective_object_story_id,object_story_spec{page_id,instagram_actor_id,video_data{video_id,image_url,title,call_to_action},link_data{link,message,picture,call_to_action}}}',
  
  // インサイト
  INSIGHTS: 'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,conversions,actions,action_values,cost_per_action_type,video_play_curve_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,date_start,date_stop'
} as const

// APIレスポンス関連の定数
export const META_API_LIMITS = {
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 500,
  INSIGHTS_LIMIT: 1000
} as const

// エラー関連の定数
export const META_API_ERROR_CODES = {
  INVALID_TOKEN: 190,
  PERMISSIONS_ERROR: 200,
  RATE_LIMIT: 613,
  TEMPORARILY_BLOCKED: 368
} as const