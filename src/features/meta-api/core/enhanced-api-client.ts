/**
 * Enhanced Meta API Client
 * 
 * getTimeSeriesInsights()メソッドを持つエクスポート可能なクラス
 * SimpleMetaApiクラスを拡張し、追加機能を提供
 */

import { SimpleMetaApi } from './api-client'
import type { 
  EnhancedInsightsOptions, 
  EnhancedPaginatedResult 
} from './types/enhanced-api'

export class EnhancedMetaApi extends SimpleMetaApi {
  /**
   * getTimeSeriesInsightsは親クラスに実装済み
   * ここでは追加のヘルパーメソッドを提供可能
   */
  
  /**
   * デフォルトオプション付きの時系列データ取得
   */
  async getLastMonthInsights(): Promise<EnhancedPaginatedResult> {
    return this.getTimeSeriesInsights({
      datePreset: 'last_month',
      timezone: 'Asia/Tokyo',
      useUnifiedAttribution: true,
      attributionWindows: ['1d_click', '1d_view']
    })
  }
  
  /**
   * 今月のインサイト取得
   */
  async getCurrentMonthInsights(): Promise<EnhancedPaginatedResult> {
    return this.getTimeSeriesInsights({
      datePreset: 'this_month',
      timezone: 'Asia/Tokyo',
      useUnifiedAttribution: true
    })
  }
  
  /**
   * カスタム期間のインサイト取得
   */
  async getCustomRangeInsights(
    since: string, 
    until: string
  ): Promise<EnhancedPaginatedResult> {
    return this.getTimeSeriesInsights({
      timeRange: { since, until },
      timezone: 'Asia/Tokyo',
      useUnifiedAttribution: true
    })
  }
}