import { useAdFatigueSimplified, DateRangeFilter } from './useAdFatigueSimplified'

/**
 * 広告疲労度データを管理するメインフック
 * 
 * リファクタリング後の簡潔な実装を使用
 */
export function useAdFatigue(accountId: string, dateRange?: DateRangeFilter) {
  return useAdFatigueSimplified({
    accountId,
    preferCache: false, // API直接取得モード
    enrichWithCreatives: true, // クリエイティブエンリッチは有効化
    dateRange: dateRange || 'last_30d'
  })
}