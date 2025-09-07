/**
 * TASK-102: 常時集約モード - 集約設定型定義
 * 要件: REQ-001対応 (常に集約表示)
 */

/**
 * 集約設定 (簡素化後)
 * 要件: REQ-001対応 (常に集約表示)
 */
export interface SimplifiedAggregationConfig {
  alwaysEnabled: true // 固定値
  showToggle: false // 固定値 (REQ-001)
  defaultGroupBy: 'ad' | 'adset' | 'campaign'
  includePlatformBreakdown: true // 固定値
  includeDailyBreakdown: boolean
}

/**
 * デフォルト集約設定
 * TASK-102で使用する定数設定
 */
export const DEFAULT_SIMPLIFIED_CONFIG: SimplifiedAggregationConfig = {
  alwaysEnabled: true,
  showToggle: false,
  defaultGroupBy: 'ad',
  includePlatformBreakdown: true,
  includeDailyBreakdown: true
} as const

/**
 * 集約設定バリデーター
 * 設定の整合性を確認
 */
export function validateSimplifiedConfig(config: Partial<SimplifiedAggregationConfig>): boolean {
  // alwaysEnabledは常にtrueでなければならない
  if (config.alwaysEnabled !== true) {
    console.warn('[AggregationConfig] alwaysEnabled must be true')
    return false
  }
  
  // showToggleは常にfalseでなければならない  
  if (config.showToggle !== false) {
    console.warn('[AggregationConfig] showToggle must be false')
    return false
  }
  
  // includePlatformBreakdownは常にtrueでなければならない
  if (config.includePlatformBreakdown !== true) {
    console.warn('[AggregationConfig] includePlatformBreakdown must be true')
    return false
  }
  
  return true
}

/**
 * 旧設定から新設定への移行ヘルパー
 * レガシー設定との互換性を保つ
 */
export function migrateToSimplifiedConfig(
  legacyConfig?: { enableAggregation?: boolean; [key: string]: any }
): SimplifiedAggregationConfig {
  if (legacyConfig?.enableAggregation === false) {
    console.warn('[AggregationConfig] Legacy enableAggregation=false is ignored. Always enabled now.')
  }
  
  return {
    ...DEFAULT_SIMPLIFIED_CONFIG,
    defaultGroupBy: legacyConfig?.groupBy || 'ad',
    includeDailyBreakdown: legacyConfig?.includeDailyBreakdown ?? true
  }
}