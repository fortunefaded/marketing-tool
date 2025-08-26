import { useAdFatigueSimplified } from './useAdFatigueSimplified'

/**
 * 広告疲労度データを管理するメインフック
 * 
 * リファクタリング後の簡潔な実装を使用
 */
export function useAdFatigue(accountId: string) {
  return useAdFatigueSimplified({
    accountId,
    preferCache: true,
    enrichWithCreatives: true
  })
}