/**
 * 新しいバックエンドAPIを使用するAdFatigueフック
 * 既存のUIとの互換性を保ちながら、新しいAPIを使用
 */

import { useAdFatigueWithNewBackend } from './useAdFatigueWithNewBackend'

// 既存のuseAdFatigueMonitoredと同じインターフェースをエクスポート
export const useAdFatigueNewBackend = useAdFatigueWithNewBackend

// 設定で切り替え可能にするためのフラグ
export const USE_NEW_BACKEND = process.env.REACT_APP_USE_NEW_META_API === 'true'

/**
 * 環境変数で新旧のAPIを切り替える統合フック
 */
export function useAdFatigueHybrid(accountId: string, adId?: string) {
  if (USE_NEW_BACKEND) {
    return useAdFatigueWithNewBackend(accountId, adId)
  }
  
  // 既存の実装を使用（動的インポートで循環依存を避ける）
  const { useAdFatigueMonitored } = require('./useAdFatigueMonitored')
  return useAdFatigueMonitored(accountId, adId)
}