import { useMemo } from 'react'
import { AdInsight, FatigueData } from '@/types'
import { SimpleFatigueCalculator } from '../fatigue/calculator'

interface UseFatigueCalculationOptions {
  // 将来の拡張用（ベースライン設定など）
  baselineCTR?: number
  baselineCPM?: number
}

/**
 * インサイトデータから疲労度を計算する専用フック
 * 責務: 疲労度計算ロジックのみ
 */
export function useFatigueCalculation(
  insights: AdInsight[] | null,
  options?: UseFatigueCalculationOptions
): FatigueData[] {
  const calculator = useMemo(() => new SimpleFatigueCalculator(), [])
  
  const fatigueData = useMemo(() => {
    if (!insights || insights.length === 0) {
      return []
    }
    
    return calculator.calculate(insights)
  }, [insights, calculator])
  
  return fatigueData
}