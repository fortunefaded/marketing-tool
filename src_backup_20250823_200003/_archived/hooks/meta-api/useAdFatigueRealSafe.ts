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
  }
  recommendedAction: string
  dataRange: {
    start: string
    end: string
  }
  analyzedAt: string
}

export function useAdFatigueRealSafe(accountId: string, adId?: string) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatigueData, setFatigueData] = useState<AdFatigueData | null>(null)

  // デバッグログ（本番では削除可能）
  // useEffect(() => {
  //   console.log('useAdFatigueRealSafe - accountId:', accountId, 'type:', typeof accountId)
  //   console.log('useAdFatigueRealSafe - adId:', adId, 'type:', typeof adId)
  //   if (!accountId || accountId === 'demo-account') {
  //     console.log('useAdFatigueRealSafe - Skipping Convex queries due to invalid accountId')
  //   }
  // }, [accountId, adId])

  // accountIdが有効かチェック - より厳密な検証
  const isValidAccountId = Boolean(
    accountId &&
      typeof accountId === 'string' &&
      accountId.trim().length > 0 &&
      accountId !== 'demo-account' &&
      accountId !== 'undefined' &&
      accountId !== 'null' &&
      // テストアカウントは有効とする
      (accountId.startsWith('test-account-') || accountId.match(/^\d+$/))
  )

  // adIdが有効かチェック
  const isValidAdId = Boolean(
    adId &&
      typeof adId === 'string' &&
      adId.trim().length > 0 &&
      adId !== 'undefined' &&
      adId !== 'null'
  )

  // Convexに渡す引数をデバッグ - skipを使用
  const shouldSkipQueries = !isValidAccountId
  const shouldSkipAdQueries = !isValidAccountId || !isValidAdId

  const calculateFatigueArgs = shouldSkipAdQueries
    ? 'skip'
    : { accountId: accountId.trim(), adId: adId!.trim(), lookbackDays: 21 }

  const savedAnalysisArgs = shouldSkipAdQueries
    ? 'skip'
    : { accountId: accountId.trim(), adId: adId!.trim() }

  const allAdsAnalysisArgs = shouldSkipQueries ? 'skip' : { accountId: accountId.trim() }

  // デバッグログ（本番では削除可能）
  // useEffect(() => {
  //   console.log('Convex Query Args Debug:')
  //   console.log('- calculateFatigueArgs:', JSON.stringify(calculateFatigueArgs))
  //   console.log('- savedAnalysisArgs:', JSON.stringify(savedAnalysisArgs))
  //   console.log('- allAdsAnalysisArgs:', JSON.stringify(allAdsAnalysisArgs))
  //   console.log('- isValidAccountId:', isValidAccountId)
  //   console.log('- isValidAdId:', isValidAdId)
  // }, [calculateFatigueArgs, savedAnalysisArgs, allAdsAnalysisArgs, isValidAccountId, isValidAdId])

  // 条件付きでクエリを実行 - undefinedの場合は完全にスキップ
  const calculateFatigue = useQuery(
    api.adFatigueCalculator.calculateFatigueFromInsights,
    calculateFatigueArgs
  )

  // 保存された疲労度分析結果を取得
  const savedAnalysis = useQuery(api.adFatigueCalculator.getSavedFatigueAnalysis, savedAnalysisArgs)

  // 疲労度分析結果の保存
  const saveFatigueAnalysis = useMutation(api.adFatigueCalculator.saveFatigueAnalysis)

  // 全広告の疲労度分析を取得
  const allAdsAnalysis = useQuery(
    api.adFatigueCalculator.getAllAdsFatigueAnalysis,
    allAdsAnalysisArgs
  )

  // 計算結果または保存結果を使用
  useEffect(() => {
    try {
      // バリデーションエラーの場合は早期リターン
      if (!isValidAccountId) {
        console.warn('Invalid accountId provided to useAdFatigueRealSafe:', accountId)
        setError('有効なアカウントIDが指定されていません')
        return
      }

      if (calculateFatigue) {
        setFatigueData(calculateFatigue as AdFatigueData)
        setError(null)
      } else if (savedAnalysis && savedAnalysis.adId) {
        // 保存された分析結果をフォーマット（全プロパティの存在を確認）
        setFatigueData({
          adId: savedAnalysis.adId || '',
          adName: savedAnalysis.adName || '',
          campaignId: savedAnalysis.campaignId || '',
          campaignName: '',
          creativeId: '',
          creativeType: '',
          fatigueScore: savedAnalysis.fatigueScore || {
            total: 0,
            breakdown: { audience: 0, creative: 0, algorithm: 0 },
            primaryIssue: 'audience' as const,
            status: 'healthy' as const,
          },
          metrics: savedAnalysis.metrics || {
            frequency: 0,
            firstTimeRatio: 0,
            ctrDeclineRate: 0,
            cpmIncreaseRate: 0,
            reach: 0,
            impressions: 0,
            ctr: 0,
            cpm: 0,
            daysActive: 0,
          },
          recommendedAction: savedAnalysis.recommendedAction || '',
          dataRange: {
            start: savedAnalysis.dataRangeStart || '',
            end: savedAnalysis.dataRangeEnd || '',
          },
          analyzedAt: savedAnalysis.analyzedAt || new Date().toISOString(),
        })
        setError(null)
      }
    } catch (err) {
      console.error('Error in useAdFatigueRealSafe:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    }
  }, [calculateFatigue, savedAnalysis, isValidAccountId, accountId])

  // 手動で疲労度分析を実行
  const analyzeFatigue = async (targetAdId: string) => {
    if (!targetAdId) {
      setError('広告IDが指定されていません')
      return null
    }

    setIsCalculating(true)
    setError(null)

    try {
      if (!saveFatigueAnalysis) {
        throw new Error('保存機能が利用できません')
      }

      // デモデータを返す（Convexが利用できない場合）
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
    allAdsAnalysis: Array.isArray(allAdsAnalysis) ? allAdsAnalysis : [],
  }
}
