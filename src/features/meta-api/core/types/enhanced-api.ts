// Enhanced API Types

import type { PaginatedResult } from '../api-client'
import type { DebugSession } from '../../debug'

export interface EnhancedInsightsOptions {
  datePreset?: string
  timeRange?: { since: string; until: string }
  timezone?: string  // デフォルト: 'Asia/Tokyo'
  currency?: string  // デフォルト: アカウント通貨
  useUnifiedAttribution?: boolean  // デフォルト: true
  attributionWindows?: string[]  // デフォルト: ['1d_click', '1d_view']
  forceRefresh?: boolean
  maxPages?: number
  onProgress?: (count: number) => void
  debugSession?: DebugSession  // デバッグセッション
}

export interface EnhancedPaginatedResult extends PaginatedResult {
  metadata: {
    currency: string
    timezone: string
    attributionSettings: {
      unified: boolean
      windows: string[]
    }
    requestTimestamp: Date
    processingTime: number
  }
}

export interface EnhancedMetaApiInterface {
  getTimeSeriesInsights(
    options?: EnhancedInsightsOptions
  ): Promise<EnhancedPaginatedResult>
}