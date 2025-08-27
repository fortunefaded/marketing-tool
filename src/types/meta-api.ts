// Meta API関連の型定義を統一

// 統合版 MetaAccount (最も完全な定義を採用)
export interface MetaAccount {
  id?: string  // オプショナル（互換性のため）
  accountId: string  // act_なしのID
  fullAccountId?: string  // act_付きのID（オプショナル）
  name: string
  accessToken: string
  currency?: string
  timezone?: string
  permissions?: string[]
  isActive?: boolean
  createdAt?: Date
  lastUsedAt?: Date
}

// AdInsight (features/meta-api/core/types.tsから移動)
export interface AdInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  adset_id?: string
  adset_name?: string
  
  // 基本パフォーマンス
  impressions: number
  reach: number
  frequency: number
  spend: number
  
  // クリック関連
  clicks: number
  unique_clicks: number
  cpc: number
  cost_per_unique_click?: number
  
  // CTR関連  
  ctr: number
  unique_ctr: number
  unique_link_clicks_ctr?: number
  unique_inline_link_clicks?: number
  unique_inline_link_click_ctr: number
  
  // CPM関連
  cpm: number
  cpp?: number
  
  // コンバージョン
  actions?: any[]
  unique_actions?: any[]
  conversions?: number
  cost_per_conversion?: number
  cost_per_action_type?: any[]
  
  // クリエイティブ情報
  creative_media_type?: string
  ad_creative_id?: string
  publisher_platform?: string
  
  // Instagram特有メトリクス（計算済み）
  instagram_metrics?: {
    profile_views: number
    likes: number
    comments: number
    shares: number
    saves: number
    engagement_rate: number
    publisher_platform: string
  }
}

// MetaInsightsData (統合版)
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
  
  // コンバージョン関連
  conversions?: string
  conversion_value?: string
  cost_per_conversion?: string
  roas?: string
  
  // キャンペーン情報
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  
  // クリエイティブ情報
  creative_id?: string
  creative_name?: string
  creative_type?: string
  creative_url?: string
  thumbnail_url?: string
  video_url?: string
  video_id?: string
  carousel_cards?: Array<{
    image_url?: string
    video_url?: string
    link?: string
    name?: string
    description?: string
  }>
  
  [key: string]: any  // 拡張性のため
}

// Fatigue関連
export interface FatigueData {
  adId: string
  adName: string
  // 広告セット・キャンペーン情報を追加
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  score: number
  status: 'healthy' | 'caution' | 'warning' | 'critical'
  metrics: {
    frequency: number
    ctr: number
    cpm: number
    // 新しく追加されたメトリクス
    impressions: number
    clicks: number
    spend: number
    reach: number
    unique_ctr: number
    unique_inline_link_click_ctr: number
    cpc: number
    conversions?: number
    // Instagram メトリクス
    instagram_metrics?: {
      profile_views: number
      likes: number
      comments: number
      shares: number
      saves: number
      engagement_rate: number
      publisher_platform: string
    } | null
  }
}

// Meta API設定
export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
}

// Meta APIエラー
export class MetaApiError extends Error {
  code?: string | number
  type?: string
  statusCode?: number
  
  constructor(message: string, details?: {
    code?: string | number
    type?: string
    statusCode?: number
  }) {
    super(message)
    this.name = 'MetaApiError'
    if (details) {
      this.code = details.code
      this.type = details.type
      this.statusCode = details.statusCode
    }
  }
}

// レスポンス型
export interface MetaApiResponse<T> {
  data: T[]
  paging?: {
    cursors?: {
      before: string
      after: string
    }
    next?: string
    previous?: string
  }
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

// 疲労度スコアリングシステム型定義
export type FatigueStatus = 'healthy' | 'warning' | 'critical'
export type AdType = 'video' | 'image' | 'carousel' | 'collection'
export type InstagramAdType = 'feed' | 'reel' | 'story'
export type Platform = 'facebook' | 'instagram' | 'audience_network'
export type CalculationConfidence = number // 0.0 - 1.0

// Meta広告インサイトデータ
export interface MetaAdInsights {
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  adsetId: string
  adsetName: string
  accountId: string
  
  // パフォーマンスメトリクス
  adSpend: number
  impressions: number
  clicks: number
  conversions: number
  reach: number
  
  // レートメトリクス
  ctr: number
  uniqueCtr: number
  inlineLinkClickCtr: number
  cpc: number
  cpm: number
  frequency: number
  
  // クリエイティブ情報
  adType: AdType
  platform: Platform[]
  
  // 期間情報
  dateStart: string
  dateStop: string
  
  // データ品質
  dataCompleteness: number
  
  // Instagram特有メトリクス（オプション）
  instagramMetrics?: InstagramMetrics
  
  // API情報
  apiVersion: string
  retrievedAt: string
}

// Instagramメトリクス
export interface InstagramMetrics {
  profileViews: number
  followerCount: number
  likes: number
  comments: number
  saves: number
  shares: number
  profileVisitRate: number
  followRate: number
  engagementRate: number
  adType: InstagramAdType
  placement: string[]
}

// ベースラインメトリクス
export interface BaselineMetrics {
  // パフォーマンスベースライン（30日平均）
  ctr: number
  uniqueCtr: number
  inlineLinkClickCtr: number
  cpm: number
  frequency: number
  engagementRate?: number // Instagram専用
  
  // ベースライン計算期間
  calculationPeriod: {
    start: string
    end: string
    daysIncluded: number
  }
  
  // 品質指標
  dataQuality: CalculationConfidence
  isIndustryAverage: boolean
  confidence: CalculationConfidence
  
  // 計算詳細
  calculatedAt: string
  version: string
}

// ベースライン計算リクエスト
export interface BaselineCalculationRequest {
  adId: string
  accountId: string
  forceRecalculation?: boolean
  customPeriod?: {
    start: string
    end: string
  }
}

// データ検証結果
export interface ValidationResult {
  isValid: boolean
  confidence: CalculationConfidence
  issues: Array<{
    field: string
    issue: string
    severity: 'error' | 'warning'
    value: any
    expectedRange?: {
      min: number
      max: number
    }
  }>
  appliedActions: Array<{
    field: string
    action: string
    originalValue: any
    newValue?: any
    reason: string
  }>
}