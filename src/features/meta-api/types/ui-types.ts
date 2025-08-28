/**
 * ui-types.ts
 * UIコンポーネント用の型定義
 */

import { UnifiedAdData, FatigueData, AdStatus, DateRange } from './domain-types'
import { DateRangeFilter, MetaAccount } from './api-types'

/**
 * フィルター条件
 */
export interface FilterCriteria {
  campaigns?: string[]
  adsets?: string[]
  status?: AdStatus[]
  metrics?: {
    ctr?: { min?: number; max?: number }
    cpm?: { min?: number; max?: number }
    spend?: { min?: number; max?: number }
    impressions?: { min?: number; max?: number }
    conversions?: { min?: number; max?: number }
    roas?: { min?: number; max?: number }
  }
  search?: string
}

/**
 * ソート設定
 */
export interface SortConfig {
  field: SortField
  direction: 'asc' | 'desc'
}

/**
 * ソート可能フィールド
 */
export type SortField = 
  | 'ad_name'
  | 'campaign_name'
  | 'impressions'
  | 'clicks'
  | 'spend'
  | 'ctr'
  | 'cpm'
  | 'cpc'
  | 'conversions'
  | 'roas'
  | 'fatigueScore'
  | 'status'

/**
 * テーブル列設定
 */
export interface TableColumn {
  key: string
  label: string
  width?: number
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: (value: any) => string
  visible?: boolean
}

/**
 * ダッシュボードプロパティ
 */
export interface DashboardProps {
  accountId: string
  dateRange: DateRangeFilter
  enableAggregation?: boolean
  enableFatigue?: boolean
  onDateRangeChange?: (range: DateRangeFilter) => void
}

/**
 * フィルターコンポーネントプロパティ
 */
export interface FilterProps {
  data: UnifiedAdData[]
  onFilter: (filtered: UnifiedAdData[]) => void
  criteria?: FilterCriteria
  onCriteriaChange?: (criteria: FilterCriteria) => void
}

/**
 * テーブルコンポーネントプロパティ
 */
export interface TableProps {
  data: UnifiedAdData[]
  columns?: TableColumn[]
  sortConfig?: SortConfig
  onSort?: (config: SortConfig) => void
  onRowClick?: (row: UnifiedAdData) => void
  loading?: boolean
  virtualized?: boolean
  height?: number
}

/**
 * StatCardプロパティ
 */
export interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

/**
 * モーダルプロパティ
 */
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

/**
 * アラートプロパティ
 */
export interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }>
}

/**
 * プログレスプロパティ
 */
export interface ProgressProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

/**
 * タブプロパティ
 */
export interface TabsProps {
  tabs: Array<{
    id: string
    label: string
    content: React.ReactNode
    icon?: React.ReactNode
    badge?: number
  }>
  defaultTab?: string
  onChange?: (tabId: string) => void
}

/**
 * ページネーション設定
 */
export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
}

/**
 * ページネーションプロパティ
 */
export interface PaginationProps extends PaginationConfig {
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

/**
 * チャート設定
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area'
  data: any[]
  xAxis?: string
  yAxis?: string | string[]
  colors?: string[]
  showLegend?: boolean
  showTooltip?: boolean
  height?: number
}

/**
 * ツールチッププロパティ
 */
export interface TooltipProps {
  content: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  children: React.ReactNode
}

/**
 * ドロップダウンオプション
 */
export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

/**
 * ドロップダウンプロパティ
 */
export interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
}

/**
 * 日付ピッカープロパティ
 */
export interface DatePickerProps {
  value?: Date | DateRange
  onChange: (date: Date | DateRange) => void
  type?: 'single' | 'range'
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
}

/**
 * チェックボックスグループプロパティ
 */
export interface CheckboxGroupProps {
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  value: string[]
  onChange: (value: string[]) => void
  orientation?: 'horizontal' | 'vertical'
}