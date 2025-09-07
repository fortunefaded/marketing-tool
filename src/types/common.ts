// プロジェクト全体で使用する共通型

export type DateRange = {
  since: string
  until: string
}

export type DateRangeAlt = {
  start: string
  end: string
}

export type Status = 'active' | 'paused' | 'archived' | 'deleted'

export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: SortOrder
}

export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
  message?: string
}

export interface ApiError {
  code: string
  message: string
  statusCode?: number
  details?: any
}

// アプリケーション全体で使用する共通のメトリクス
export interface BaseMetrics {
  impressions: number
  clicks: number
  spend: number
  ctr?: number
  cpc?: number
  cpm?: number
}

// 時系列データ
export interface TimeSeriesData<T = any> {
  date: string
  value: T
}

// フィルター関連
export interface FilterOptions {
  dateRange?: DateRange | DateRangeAlt
  status?: Status | Status[]
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
  page?: number
  limit?: number
}

// グラフ・チャート用のデータ
export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
    fill?: boolean
  }>
}

// ダッシュボード設定
export interface DashboardConfig {
  layout?: 'grid' | 'list' | 'compact'
  theme?: 'light' | 'dark' | 'auto'
  refreshInterval?: number
  defaultDateRange?: DateRange | DateRangeAlt
  widgets?: string[]
}

// 比較データ
export interface ComparisonData<T> {
  current: T
  previous: T
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}