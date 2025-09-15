/**
 * date-range-converter.ts
 * DateRangeFilter から Meta API のパラメータに変換
 */

import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'

/**
 * DateRangeFilter を Meta API の date_preset に変換
 */
export function convertToMetaApiDatePreset(
  dateRange: DateRangeFilter
): string | { since: string; until: string } {
  switch (dateRange) {
    case 'today':
      return 'today'

    case 'yesterday':
      return 'yesterday'

    case 'last_7d':
      return 'last_7_d'

    case 'last_14d':
      return 'last_14_d'

    case 'last_30d':
      return 'last_30_d'

    case 'last_90d':
      return 'last_90_d'

    case 'last_month':
      // 先月の開始日と終了日を計算
      return getLastMonthDateRange()

    case 'all':
      return 'maximum'

    default:
      return 'last_30_d'
  }
}

/**
 * 先月の開始日と終了日を計算
 * @returns Meta API用の日付範囲オブジェクト
 */
function getLastMonthDateRange(): { since: string; until: string } {
  const now = new Date()

  // 先月の最終日を取得（今月の0日目 = 先月の最終日）
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // 先月の初日を取得
  const firstDayOfLastMonth = new Date(
    lastDayOfLastMonth.getFullYear(),
    lastDayOfLastMonth.getMonth(),
    1
  )

  // YYYY-MM-DD形式にフォーマット
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    since: formatDate(firstDayOfLastMonth),
    until: formatDate(lastDayOfLastMonth),
  }
}

/**
 * 日付範囲の表示用ラベルを取得
 */
export function getDateRangeLabel(dateRange: DateRangeFilter): string {
  const now = new Date()

  if (dateRange === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const year = lastMonth.getFullYear()
    const month = lastMonth.getMonth() + 1
    return `${year}年${month}月`
  }

  const labels: Record<DateRangeFilter, string> = {
    today: '今日',
    yesterday: '昨日',
    last_7d: '過去7日間',
    last_14d: '過去14日間',
    last_28d: '過去28日間',
    last_30d: '過去30日間',
    last_90d: '過去90日間',
    this_week: '今週',
    last_week: '先週',
    this_month: '今月',
    last_month: '先月',
    custom: 'カスタム',
    all: 'すべて',
  }

  return labels[dateRange] || dateRange
}

/**
 * 日付範囲の実際の日付を取得（表示用）
 */
export function getActualDateRange(dateRange: DateRangeFilter): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateRange) {
    case 'today':
      return { start: today, end: today }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: yesterday }
    }

    case 'last_7d': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6) // 今日を含めて7日
      return { start, end: today }
    }

    case 'last_14d': {
      const start = new Date(today)
      start.setDate(start.getDate() - 13) // 今日を含めて14日
      return { start, end: today }
    }

    case 'last_30d': {
      const start = new Date(today)
      start.setDate(start.getDate() - 29) // 今日を含めて30日
      return { start, end: today }
    }

    case 'last_month': {
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const firstDayOfLastMonth = new Date(
        lastDayOfLastMonth.getFullYear(),
        lastDayOfLastMonth.getMonth(),
        1
      )
      return { start: firstDayOfLastMonth, end: lastDayOfLastMonth }
    }

    case 'last_90d': {
      const start = new Date(today)
      start.setDate(start.getDate() - 89) // 今日を含めて90日
      return { start, end: today }
    }

    case 'all':
      // 適当な過去日付から今日まで
      return { start: new Date(2020, 0, 1), end: today }

    default:
      return { start: today, end: today }
  }
}
