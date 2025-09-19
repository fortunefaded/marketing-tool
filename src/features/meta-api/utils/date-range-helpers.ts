/**
 * date-range-helpers.ts
 * TASK-005: 日付範囲処理のユーティリティ関数
 */

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_3d'
  | 'last_7d'
  | 'last_14d'
  | 'last_28d'
  | 'last_30d'
  | 'last_60d'
  | 'last_90d'
  | 'last_month'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'all'

export interface DateRangeInfo {
  preset: DateRangePreset
  startDate?: Date
  endDate?: Date
  isCustomRange: boolean
  daysCount: number
  displayName: string
}

/**
 * 日付範囲プリセットから情報を取得
 */
export function getDateRangeInfo(preset: DateRangePreset): DateRangeInfo {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return {
        preset,
        startDate: today,
        endDate: today,
        isCustomRange: false,
        daysCount: 1,
        displayName: '今日',
      }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        preset,
        startDate: yesterday,
        endDate: yesterday,
        isCustomRange: false,
        daysCount: 1,
        displayName: '昨日',
      }
    }

    case 'last_3d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 3)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 3,
        displayName: '過去3日間',
      }
    }

    case 'last_7d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 7,
        displayName: '過去7日間',
      }
    }

    case 'last_14d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 14)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 14,
        displayName: '過去14日間',
      }
    }

    case 'last_28d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 28)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 28,
        displayName: '過去28日間',
      }
    }

    case 'last_30d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 30,
        displayName: '過去30日間',
      }
    }

    case 'last_60d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 60)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 60,
        displayName: '過去60日間',
      }
    }

    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        preset,
        startDate: lastMonth,
        endDate: endOfLastMonth,
        isCustomRange: false,
        daysCount: endOfLastMonth.getDate(),
        displayName: '先月',
      }
    }

    case 'last_90d': {
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 90)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 90,
        displayName: '過去90日間',
      }
    }

    case 'last_3_months': {
      const startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 3)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 90,
        displayName: '過去3ヶ月',
      }
    }

    case 'last_6_months': {
      const startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 6)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 180,
        displayName: '過去6ヶ月',
      }
    }

    case 'last_12_months': {
      const startDate = new Date(today)
      startDate.setMonth(startDate.getMonth() - 12)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 1)
      return {
        preset,
        startDate,
        endDate,
        isCustomRange: false,
        daysCount: 365,
        displayName: '過去1年',
      }
    }

    case 'all':
    default:
      return {
        preset,
        isCustomRange: false,
        daysCount: Infinity,
        displayName: '全期間',
      }
  }
}

/**
 * 日付範囲が短期間かどうか判定
 */
export function isShortTermRange(preset: DateRangePreset | string): boolean {
  const shortTermPatterns = ['today', 'yesterday', 'last_3d', 'last_7d']
  return shortTermPatterns.includes(preset)
}

/**
 * 日付範囲に適した閾値を取得
 */
export function getDateRangeThresholds(preset: DateRangePreset | string) {
  const isShortTerm = isShortTermRange(preset)

  return {
    isShortTerm,
    ctrDeclineThreshold: isShortTerm ? 0.2 : 0.25, // 短期間はより厳しく
    frequencyWarningThreshold: 3.5,
    cpmIncreaseThreshold: isShortTerm ? 0.16 : 0.2, // 短期間はより厳しく
    strictMode: isShortTerm,
  }
}

/**
 * 日付範囲からキャッシュキーを生成
 */
export function generateDateRangeCacheKey(accountId: string, preset: DateRangePreset): string {
  const info = getDateRangeInfo(preset)

  if (info.startDate && info.endDate) {
    const start = formatDateForCache(info.startDate)
    const end = formatDateForCache(info.endDate)
    return `insights_${accountId}_${preset}_${start}_${end}`
  }

  return `insights_${accountId}_${preset}`
}

/**
 * キャッシュ用の日付フォーマット
 */
function formatDateForCache(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * 日付範囲プリセットの妥当性チェック
 */
export function isValidDateRangePreset(preset: string): preset is DateRangePreset {
  const validPresets: DateRangePreset[] = [
    'today',
    'yesterday',
    'last_3d',
    'last_7d',
    'last_14d',
    'last_28d',
    'last_30d',
    'last_60d',
    'last_90d',
    'last_month',
    'this_week',
    'last_week',
    'this_month',
    'last_3_months',
    'all',
  ]
  return validPresets.includes(preset as DateRangePreset)
}

/**
 * 日付範囲の優先度を取得（短期間ほど高優先度）
 */
export function getDateRangePriority(preset: DateRangePreset): number {
  const priorities: Record<DateRangePreset, number> = {
    today: 1,
    yesterday: 2,
    last_3d: 3,
    last_7d: 4,
    last_14d: 5,
    last_28d: 6,
    last_30d: 7,
    last_60d: 8,
    last_90d: 9,
    this_week: 10,
    last_week: 11,
    this_month: 12,
    last_month: 13,
    last_3_months: 14,
    all: 15,
  }

  return priorities[preset] || 9
}
