/**
 * Meta API関連の型定義
 */

export namespace MetaApiTypes {
  export interface Insight {
    ad_id: string
    ad_name?: string
    campaign_id?: string
    campaign_name?: string
    adset_id?: string
    adset_name?: string
    
    // メトリクス
    impressions: number
    clicks: number
    spend: number
    reach: number
    frequency: number
    cpm: number
    cpc: number
    ctr: number
    
    // 日付
    date_start?: string
    date_stop?: string
    
    // アクション
    actions?: Action[]
    action_values?: ActionValue[]
    
    // その他
    [key: string]: any
  }

  export interface Campaign {
    id: string
    name: string
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
    objective: string
    daily_budget?: string
    lifetime_budget?: string
    spend?: string
    created_time: string
    updated_time: string
  }

  export interface AdSet {
    id: string
    name: string
    campaign_id: string
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
    daily_budget?: string
    lifetime_budget?: string
    optimization_goal: string
    billing_event: string
    bid_amount?: string
    created_time: string
    updated_time: string
  }

  export interface Ad {
    id: string
    name: string
    adset_id: string
    campaign_id: string
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
    creative?: Creative
    created_time: string
    updated_time: string
  }

  export interface Creative {
    id: string
    name?: string
    title?: string
    body?: string
    image_url?: string
    video_url?: string
    thumbnail_url?: string
    call_to_action_type?: string
  }

  export interface Action {
    action_type: string
    value: string
  }

  export interface ActionValue {
    action_type: string
    value: string
  }

  export interface AccountInfo {
    id: string
    name: string
    currency: string
    timezone_name: string
    timezone_id: number
    account_status: number
    spend_cap?: string
    amount_spent?: string
  }

  export interface PagedResponse<T> {
    data: T[]
    paging?: {
      cursors: {
        before: string
        after: string
      }
      next?: string
      previous?: string
    }
  }

  export interface ErrorResponse {
    error: {
      message: string
      type: string
      code: number
      error_subcode?: number
      fbtrace_id: string
    }
  }
}