import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { FatigueScore, FatigueLevel, FatigueType } from '../../convex/adFatigue'

interface AdFatigueData {
  adId: string
  adName: string
  campaignId: string
  fatigueScore: FatigueScore
  metrics: {
    frequency: number
    firstTimeRatio: number
    ctrDeclineRate: number
    cpmIncreaseRate: number
    reach: number
    impressions: number
    ctr: number
    cpm: number
  }
  recommendedAction: string
  analyzedAt: string
  dataRangeStart: string
  dataRangeEnd: string
}

export function useAdFatigue(accountId: string, adId?: string) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 疲労度スコアの計算（Phase 2の高度な分析を使用）
  // 注: Convexエラーを避けるため、現時点では無効化
  const calculateFatigue = null // useQuery(
  //   api.adFatigue.calculateAdvancedFatigueScore,
  //   adId ? { 
  //     accountId, 
  //     adId,
  //     includeVideo: true,
  //     includeInstagram: true 
  //   } : undefined
  // )

  // 疲労度ステータスの取得（TODO: 実装）
  const fatigueStatus = null // useQuery(
  //   api.adFatigue.getFatigueStatus,
  //   { accountId, adId }
  // )

  // 疲労度分析結果の保存 - 現在は無効化
  // const saveFatigueAnalysis = useMutation(api.adFatigue.saveFatigueAnalysis)

  // 疲労度の計算と保存
  const analyzeFatigue = async (targetAdId: string) => {
    setIsCalculating(true)
    setError(null)

    try {
      // 現在はデモデータを返す
      const demoResult = {
        adId: targetAdId,
        adName: 'デモ広告',
        campaignId: 'demo-campaign',
        fatigueScore: {
          total: 65,
          breakdown: {
            audience: 70,
            creative: 60,
            algorithm: 65
          },
          primaryIssue: 'audience' as const,
          status: 'warning' as const
        },
        metrics: {
          frequency: 3.2,
          firstTimeRatio: 0.35,
          ctrDeclineRate: 0.28,
          cpmIncreaseRate: 0.22,
          reach: 50000,
          impressions: 160000,
          ctr: 1.2,
          cpm: 1200
        },
        recommendedAction: 'オーディエンスへの露出頻度が高くなっています。新しいターゲティングの追加を検討してください。',
        dataRangeStart: '2024-01-01',
        dataRangeEnd: '2024-01-21'
      }

      // TODO: 実際の保存処理を実装
      // await saveFatigueAnalysis({ ... })

      return demoResult
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      throw err
    } finally {
      setIsCalculating(false)
    }
  }

  return {
    fatigueData: calculateFatigue as AdFatigueData | undefined,
    fatigueStatus,
    isCalculating,
    error,
    analyzeFatigue
  }
}

// 疲労度タイプ別の分析
export function useFatigueAnalysis(accountId: string) {
  // TODO: これらの関数を実装するまで無効化
  const analysis = null // useQuery(
  //   api.adFatigue.analyzeFatigueType,
  //   { accountId }
  // )

  const recommendedActions = null // useQuery(
  //   api.adFatigue.getRecommendedActions,
  //   { accountId }
  // )

  // デモデータを返す
  return {
    typeBreakdown: {
      audience: { count: 5, percentage: 45 },
      creative: { count: 3, percentage: 27 },
      algorithm: { count: 3, percentage: 27 }
    },
    levelBreakdown: {
      critical: { count: 2, percentage: 18 },
      warning: { count: 4, percentage: 36 },
      caution: { count: 3, percentage: 27 },
      healthy: { count: 2, percentage: 18 }
    },
    criticalAds: [],
    recommendedActions: []
  }
}

// 疲労度アラートの管理
export function useFatigueAlerts(accountId: string) {
  const [alerts, setAlerts] = useState<any[]>([])

  // アラートの取得（実際のConvex関数が必要）
  // const activeAlerts = useQuery(api.adFatigue.getActiveAlerts, { accountId })

  const dismissAlert = async (alertId: string) => {
    // アラートを非表示にする処理
    setAlerts(alerts.filter(a => a._id !== alertId))
  }

  return {
    alerts,
    dismissAlert
  }
}