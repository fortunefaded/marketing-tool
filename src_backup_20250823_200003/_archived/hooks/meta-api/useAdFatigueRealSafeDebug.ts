import { useState, useEffect } from 'react'

interface AdFatigueData {
  adId: string
  adName: string
  campaignId: string
  campaignName: string
  creativeId: string
  creativeType: string
  fatigueScore: {
    total: number
    breakdown: {
      audience: number
      creative: number
      algorithm: number
    }
    primaryIssue: 'audience' | 'creative' | 'algorithm'
    status: 'healthy' | 'caution' | 'warning' | 'critical'
  }
  metrics: {
    frequency: number
    firstTimeRatio: number
    ctrDeclineRate: number
    cpmIncreaseRate: number
    reach: number
    impressions: number
    ctr: number
    cpm: number
    conversions?: number
    daysActive: number
    negativeFeedbackRate?: number
    videoCompletionRate?: number
    avgWatchTime?: number
    instagramSaveRate?: number
    profileToFollowRate?: number
  }
  recommendedAction: string
  dataRange: {
    start: string
    end: string
  }
  analyzedAt: string
}

export function useAdFatigueRealSafeDebug(accountId: string, adId?: string) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatigueData, setFatigueData] = useState<AdFatigueData | null>(null)

  // デバッグログ
  useEffect(() => {
    console.log('useAdFatigueRealSafeDebug - QUERIES DISABLED FOR DEBUGGING')
    console.log('useAdFatigueRealSafeDebug - accountId:', accountId, 'type:', typeof accountId)
    console.log('useAdFatigueRealSafeDebug - adId:', adId, 'type:', typeof adId)
  }, [accountId, adId])

  // すべてのConvexクエリを無効化
  // const _calculateFatigue = null
  // const _savedAnalysis = null
  // const _allAdsAnalysis = null
  // const _saveFatigueAnalysis = null

  // 手動で疲労度分析を実行
  const analyzeFatigue = async (targetAdId: string) => {
    if (!targetAdId) {
      setError('広告IDが指定されていません')
      return null
    }

    setIsCalculating(true)
    setError(null)

    try {
      // デモデータを返す
      const demoResult: AdFatigueData = {
        adId: targetAdId,
        adName: 'デモ広告',
        campaignId: 'demo-campaign',
        campaignName: 'デモキャンペーン',
        creativeId: 'demo-creative',
        creativeType: 'VIDEO',
        fatigueScore: {
          total: 65,
          breakdown: {
            audience: 70,
            creative: 60,
            algorithm: 65,
          },
          primaryIssue: 'audience',
          status: 'warning',
        },
        metrics: {
          frequency: 3.2,
          firstTimeRatio: 0.35,
          ctrDeclineRate: 0.28,
          cpmIncreaseRate: 0.22,
          reach: 50000,
          impressions: 160000,
          ctr: 1.2,
          cpm: 1200,
          conversions: 100,
          daysActive: 5,
        },
        recommendedAction:
          'オーディエンスへの露出頻度が高くなっています。新しいターゲティングの追加を検討してください。',
        dataRange: {
          start: '2024-01-01',
          end: '2024-01-05',
        },
        analyzedAt: new Date().toISOString(),
      }

      setFatigueData(demoResult)
      return demoResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました'
      setError(errorMessage)
      throw err
    } finally {
      setIsCalculating(false)
    }
  }

  return {
    fatigueData,
    isCalculating,
    error,
    analyzeFatigue,
    allAdsAnalysis: [],
  }
}
