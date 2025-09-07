/**
 * Ad Fatigue分析用フック
 * 新しいMeta APIアーキテクチャを使用
 */

import { useMemo } from 'react'
import { useInsights } from './useInsights'
import { MetaApiTypes } from '../../services/core/types'
import { calculateAdFatigue } from '../../utils/fatigueCalculations'

export interface AdFatigueData {
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  fatigueScore: number
  fatigueLevel: 'low' | 'medium' | 'high' | 'critical'
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    frequency: number
    spend: number
    cpm: number
    cpc: number
  }
  trends: {
    ctrTrend: number
    frequencyTrend: number
    cpmTrend: number
  }
  recommendations: string[]
}

export interface UseAdFatigueOptions {
  dateRange?: {
    start: string
    end: string
  }
  minImpressions?: number
  accountId?: string
  onSuccess?: (data: AdFatigueData[]) => void
  onError?: (error: Error) => void
}

/**
 * Ad Fatigue分析データを取得するフック
 */
export function useAdFatigue(options: UseAdFatigueOptions = {}) {
  const {
    dateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    minImpressions = 1000,
    accountId,
    onSuccess,
    onError
  } = options

  // インサイトデータを取得
  const { data: insights, loading, error, refetch } = useInsights({
    level: 'ad',
    dateRange,
    fields: [
      'ad_id', 'ad_name', 'campaign_id', 'campaign_name',
      'impressions', 'clicks', 'spend', 'reach', 'frequency',
      'cpm', 'cpc', 'ctr', 'actions', 'action_values'
    ],
    filters: accountId ? { account_id: accountId } : undefined
  }, {
    onSuccess: (data) => {
      // Fatigue分析が完了したらコールバックを呼ぶ
      if (onSuccess && fatigueData) {
        onSuccess(fatigueData)
      }
    },
    onError
  })

  // Fatigue分析の実行
  const fatigueData = useMemo(() => {
    if (!insights || insights.length === 0) {
      return []
    }

    // 最小インプレッション数でフィルタリング
    const filteredInsights = insights.filter(
      insight => insight.impressions >= minImpressions
    )

    // Fatigue分析を実行
    return filteredInsights.map(insight => {
      const fatigueScore = calculateAdFatigue(insight)
      
      return {
        adId: insight.ad_id,
        adName: insight.ad_name || 'Unknown Ad',
        campaignId: insight.campaign_id || '',
        campaignName: insight.campaign_name || 'Unknown Campaign',
        fatigueScore,
        fatigueLevel: getFatigueLevel(fatigueScore),
        metrics: {
          impressions: insight.impressions,
          clicks: insight.clicks,
          ctr: insight.ctr,
          frequency: insight.frequency,
          spend: insight.spend,
          cpm: insight.cpm,
          cpc: insight.cpc
        },
        trends: calculateTrends(insight),
        recommendations: getRecommendations(fatigueScore, insight)
      }
    }).sort((a, b) => b.fatigueScore - a.fatigueScore)
  }, [insights, minImpressions])

  return {
    data: fatigueData,
    loading,
    error,
    refetch,
    summary: useMemo(() => {
      if (!fatigueData || fatigueData.length === 0) return null
      
      return {
        totalAds: fatigueData.length,
        criticalAds: fatigueData.filter(ad => ad.fatigueLevel === 'critical').length,
        highFatigueAds: fatigueData.filter(ad => ad.fatigueLevel === 'high').length,
        averageFatigueScore: fatigueData.reduce((sum, ad) => sum + ad.fatigueScore, 0) / fatigueData.length
      }
    }, [fatigueData])
  }
}

/**
 * Fatigueレベルを判定
 */
function getFatigueLevel(score: number): AdFatigueData['fatigueLevel'] {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * トレンドを計算（簡易版）
 */
function calculateTrends(insight: MetaApiTypes.Insight): AdFatigueData['trends'] {
  // 実際の実装では、時系列データから計算する
  return {
    ctrTrend: -0.15, // 15%減少
    frequencyTrend: 0.25, // 25%増加
    cpmTrend: 0.10 // 10%増加
  }
}

/**
 * レコメンデーションを生成
 */
function getRecommendations(fatigueScore: number, insight: MetaApiTypes.Insight): string[] {
  const recommendations: string[] = []
  
  if (fatigueScore >= 80) {
    recommendations.push('広告を一時停止して、新しいクリエイティブを準備することを強く推奨します')
  }
  
  if (insight.frequency > 5) {
    recommendations.push('フリークエンシーが高すぎます。ターゲティングを見直してください')
  }
  
  if (insight.ctr < 0.5) {
    recommendations.push('CTRが低下しています。広告文やビジュアルの更新を検討してください')
  }
  
  if (insight.cpm > 5000) {
    recommendations.push('CPMが高騰しています。オーディエンスの競合を確認してください')
  }
  
  return recommendations
}

/**
 * 単一広告のFatigue分析
 */
export function useAdFatigueById(adId: string, options: Omit<UseAdFatigueOptions, 'accountId'> = {}) {
  const { data, loading, error, refetch } = useAdFatigue({
    ...options,
    minImpressions: 0 // 単一広告の場合は制限なし
  })
  
  const adData = useMemo(() => {
    return data?.find(ad => ad.adId === adId) || null
  }, [data, adId])
  
  return {
    data: adData,
    loading,
    error,
    refetch
  }
}