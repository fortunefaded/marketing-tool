/**
 * api-types.ts
 * Meta API関連の型定義
 */

/**
 * Meta APIから返される生のインサイトデータ
 */
export interface MetaApiInsight {
  // 識別子
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  account_id: string

  // 日付
  date_start: string
  date_stop: string

  // プラットフォーム
  publisher_platform?: string

  // メトリクス（APIは文字列で返す）
  impressions: string
  clicks: string
  spend: string
  reach?: string
  frequency?: string
  unique_clicks?: string
  ctr: string
  cpm: string
  cpc: string

  // コンバージョン
  conversions?: string
  conversion_values?: string
  first_conversions?: string

  // クリエイティブ情報
  creative_id?: string
  creative_name?: string
  creative_type?: string
  thumbnail_url?: string
  video_url?: string
  image_url?: string
  object_type?: string
}

/**
 * APIレスポンスのラッパー
 */
export interface MetaApiResponse<T> {
  data: T[]
  paging?: {
    cursors?: {
      before?: string
      after?: string
    }
    next?: string
    previous?: string
  }
  summary?: {
    total_count?: number
  }
  error?: {
    message: string
    type: string
    code: number
  }
}

/**
 * アカウント情報
 */
export interface MetaAccount {
  id: string
  name: string
  account_id: string
  account_status?: number
  business?: {
    id: string
    name: string
  }
  currency?: string
  timezone_name?: string
  created_time?: string
}

/**
 * キャンペーン情報
 */
export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective?: string
  created_time?: string
  start_time?: string
  stop_time?: string
  daily_budget?: string
  lifetime_budget?: string
}

/**
 * 広告セット情報
 */
export interface MetaAdSet {
  id: string
  name: string
  campaign_id: string
  status: string
  billing_event?: string
  optimization_goal?: string
  targeting?: any
  created_time?: string
  start_time?: string
  end_time?: string
}

/**
 * クリエイティブ情報
 */
export interface MetaCreative {
  id: string
  name: string
  title?: string
  body?: string
  object_type?: string
  object_story_spec?: any
  thumbnail_url?: string
  image_url?: string
  video_url?: string
  call_to_action_type?: string
  effective_object_story_id?: string
}

/**
 * プラットフォーム種別
 */
export type PlatformType = 'facebook' | 'instagram' | 'audience_network' | 'messenger' | 'unknown'

/**
 * 日付範囲フィルター
 */
export type DateRangeFilter =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_28d'
  | 'last_30d'
  | 'last_90d'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'all'
  | 'custom'

/**
 * APIエラー
 */
export interface MetaApiError {
  code: number
  message: string
  error_subcode?: number
  error_user_title?: string
  error_user_msg?: string
  fbtrace_id?: string
}
