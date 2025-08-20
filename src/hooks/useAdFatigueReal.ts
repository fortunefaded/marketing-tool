import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
    algorithm?: {
      cpmIncreaseRate: number
      deliveryRate: number
      penaltyDetected: boolean
      severity: 'low' | 'medium' | 'high' | 'none'
    }
    negative?: {
      hideClicks: number
      reportSpamClicks: number
      unlikePageClicks: number
      totalNegativeActions: number
      negativeRate: number
      userSentiment: 'positive' | 'neutral' | 'negative'
    }
  }
  recommendedAction: string
  dataRange: {
    start: string
    end: string
  }
  analyzedAt: string
}

export function useAdFatigueReal(accountId: string, adId?: string) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatigueData, setFatigueData] = useState<AdFatigueData | null>(null)

  // Meta Insightsデータから疲労度を計算
  const calculateFatigue = useQuery(
    api.adFatigueCalculator.calculateFatigueFromInsights,
    adId ? { accountId, adId, lookbackDays: 21 } : "skip"
  ) as AdFatigueData | null | undefined

  // 保存された疲労度分析結果を取得
  const savedAnalysis = useQuery(
    api.adFatigueCalculator.getSavedFatigueAnalysis,
    adId ? { accountId, adId } : "skip"
  )

  // 疲労度分析結果の保存
  const saveFatigueAnalysis = useMutation(api.adFatigueCalculator.saveFatigueAnalysis)

  // 計算結果または保存結果を使用
  useEffect(() => {
    try {
      if (calculateFatigue) {
        setFatigueData(calculateFatigue)
        setError(null)
      } else if (savedAnalysis) {
        // 保存された分析結果をフォーマット
        setFatigueData({
          adId: savedAnalysis.adId,
          adName: savedAnalysis.adName,
          campaignId: savedAnalysis.campaignId,
          campaignName: '', // TODO: キャンペーン名を追加
          creativeId: '', // TODO: クリエイティブIDを追加
          creativeType: '', // TODO: クリエイティブタイプを追加
          fatigueScore: savedAnalysis.fatigueScore,
          metrics: savedAnalysis.metrics,
          recommendedAction: savedAnalysis.recommendedAction,
          dataRange: {
            start: savedAnalysis.dataRangeStart,
            end: savedAnalysis.dataRangeEnd
          },
          analyzedAt: savedAnalysis.analyzedAt
        })
        setError(null)
      }
    } catch (err) {
      console.error('Error in useAdFatigueReal:', err)
      if (err instanceof Error && err.message.includes('Could not find public function')) {
        setError('疲労度分析機能が利用できません。Convexサーバーを再起動してください。')
      } else {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      }
    }
  }, [calculateFatigue, savedAnalysis])

  // 手動で疲労度分析を実行
  const analyzeFatigue = async (targetAdId: string) => {
    if (!targetAdId) {
      setError('広告IDが指定されていません')
      return null
    }

    setIsCalculating(true)
    setError(null)

    try {
      // Convexクエリは非同期ではないため、一度取得してから保存
      const result = calculateFatigue
      
      if (!result) {
        throw new Error('分析するデータが見つかりません')
      }

      // 結果を保存
      await saveFatigueAnalysis({
        accountId,
        adId: targetAdId,
        analysis: result
      })

      setFatigueData(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました'
      setError(errorMessage)
      throw err
    } finally {
      setIsCalculating(false)
    }
  }

  // 全広告の疲労度分析を取得
  const allAdsAnalysis = useQuery(
    api.adFatigueCalculator.getAllAdsFatigueAnalysis,
    { accountId }
  )

  return {
    fatigueData,
    isCalculating,
    error,
    analyzeFatigue,
    allAdsAnalysis
  }
}

// 疲労度トレンドの取得
export function useFatigueTrends(adId: string, days: number = 30) {
  const trends = useQuery(
    api.adFatigueCalculator.getFatigueTrends,
    adId ? { adId, days } : "skip"
  )

  return {
    trends: trends || [],
    isLoading: trends === undefined
  }
}

// 疲労度アラートの管理
export function useFatigueAlerts(accountId: string) {
  const activeAlerts = useQuery(
    api.adFatigueCalculator.getActiveAlerts,
    { accountId }
  )

  const dismissAlert = useMutation(api.adFatigueCalculator.dismissAlert)
  const acknowledgeAlert = useMutation(api.adFatigueCalculator.acknowledgeAlert)

  return {
    alerts: activeAlerts || [],
    dismissAlert: async (alertId: string) => {
      await dismissAlert({ alertId })
    },
    acknowledgeAlert: async (alertId: string, userId: string) => {
      await acknowledgeAlert({ alertId, userId })
    }
  }
}

// バッチ疲労度分析（複数広告を一度に分析）
export function useBatchFatigueAnalysis(accountId: string) {
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const analyzeAllAds = useMutation(api.adFatigueCalculator.batchAnalyzeFatigue)

  const startBatchAnalysis = async (adIds: string[]) => {
    setIsAnalyzing(true)
    setProgress({ current: 0, total: adIds.length })

    try {
      const result = await analyzeAllAds({
        accountId,
        adIds,
        lookbackDays: 21
      })

      return result
    } catch (error) {
      console.error('Batch analysis failed:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }

  return {
    startBatchAnalysis,
    progress,
    isAnalyzing
  }
}