import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { MetaApiServiceMonitored } from '../services/metaApiServiceMonitored'
import { monitorMetaApiCall } from '../utils/metaApiMonitor'
import { handleMetaApiError } from '../utils/globalErrorHandler'
import { logger } from '../utils/logger'

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
  }
  recommendedAction: string
  dataRange: {
    start: string
    end: string
  }
  analyzedAt: string
}


/**
 * 監視機能付き広告疲労度フック
 */
import { MetaApiService } from '../_archived/services/metaApiService'

export function useAdFatigueMonitored(accountId: string, adId?: string, apiServiceOrToken?: MetaApiService | string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [fatigueData, setFatigueData] = useState<AdFatigueData[]>([])

  // Convexからのデータ取得
  const convexData = useQuery(api.metaInsights.getInsights, {
    accountId,
    limit: 100
  })

  // Meta APIサービスの初期化
  const apiService = useMemo(() => {
    // apiServiceOrTokenがMetaApiServiceインスタンスの場合、そのまま使用
    if (apiServiceOrToken && typeof apiServiceOrToken !== 'string') {
      return apiServiceOrToken
    }
    
    // 文字列（アクセストークン）の場合、新しいサービスを作成
    if (typeof apiServiceOrToken === 'string') {
      try {
        return new MetaApiServiceMonitored({
          accessToken: apiServiceOrToken,
          accountId
        })
      } catch (err) {
        logger.warn('Failed to initialize MetaApiService', err)
        return null
      }
    }
    
    // apiServiceOrTokenがnullまたはundefinedの場合
    logger.info('No API service or token provided, will use Convex data only')
    return null
  }, [accountId, apiServiceOrToken])

  // 広告疲労度の計算
  const calculateFatigue = useCallback(async (insights: any[]): Promise<AdFatigueData[]> => {
    return monitorMetaApiCall(async () => {
      const results: AdFatigueData[] = []
      
      // 広告ごとにグループ化
      const adGroups = new Map<string, any[]>()
      insights.forEach(insight => {
        const adId = insight.ad_id || 'unknown'
        if (!adGroups.has(adId)) {
          adGroups.set(adId, [])
        }
        adGroups.get(adId)!.push(insight)
      })

      // 各広告の疲労度を計算
      for (const [adId, adInsights] of adGroups) {
        if (adInsights.length === 0) continue

        // 最新のデータ
        const latest = adInsights[adInsights.length - 1]
        
        // メトリクスの計算
        const frequency = parseFloat(latest.frequency) || 0
        const ctr = parseFloat(latest.ctr) || 0
        const cpm = parseFloat(latest.cpm) || 0
        const reach = parseInt(latest.reach) || 0
        const impressions = parseInt(latest.impressions) || 0

        // 過去データとの比較
        const oldestCtr = adInsights[0]?.ctr ? parseFloat(adInsights[0].ctr) : ctr
        const oldestCpm = adInsights[0]?.cpm ? parseFloat(adInsights[0].cpm) : cpm
        
        const ctrDeclineRate = oldestCtr > 0 ? Math.max(0, (oldestCtr - ctr) / oldestCtr) : 0
        const cpmIncreaseRate = oldestCpm > 0 ? Math.max(0, (cpm - oldestCpm) / oldestCpm) : 0

        // 疲労度スコアの計算
        const audienceScore = Math.min(100, frequency * 20) // フリークエンシーベース
        const creativeScore = Math.min(100, ctrDeclineRate * 200) // CTR低下率ベース
        const algorithmScore = Math.min(100, cpmIncreaseRate * 150) // CPM上昇率ベース
        
        const totalScore = (audienceScore + creativeScore + algorithmScore) / 3

        // ステータスの判定
        let status: 'healthy' | 'caution' | 'warning' | 'critical' = 'healthy'
        if (totalScore >= 70) status = 'critical'
        else if (totalScore >= 50) status = 'warning'
        else if (totalScore >= 30) status = 'caution'

        // 主要な問題の特定
        let primaryIssue: 'audience' | 'creative' | 'algorithm' = 'audience'
        if (creativeScore > audienceScore && creativeScore > algorithmScore) {
          primaryIssue = 'creative'
        } else if (algorithmScore > audienceScore && algorithmScore > creativeScore) {
          primaryIssue = 'algorithm'
        }

        // 推奨アクション
        let recommendedAction = '継続的な監視を推奨します'
        if (status === 'critical') {
          if (primaryIssue === 'audience') {
            recommendedAction = 'オーディエンスの拡大または広告の一時停止を検討してください'
          } else if (primaryIssue === 'creative') {
            recommendedAction = '新しいクリエイティブの追加またはA/Bテストを実施してください'
          } else {
            recommendedAction = '入札戦略の見直しまたはターゲティングの最適化を検討してください'
          }
        }

        results.push({
          adId,
          adName: latest.ad_name || `広告 ${adId}`,
          campaignId: latest.campaign_id || 'unknown',
          campaignName: latest.campaign_name || 'キャンペーン名なし',
          creativeId: latest.creative_id || 'unknown',
          creativeType: latest.creative_type || 'unknown',
          fatigueScore: {
            total: Math.round(totalScore),
            breakdown: {
              audience: Math.round(audienceScore),
              creative: Math.round(creativeScore),
              algorithm: Math.round(algorithmScore)
            },
            primaryIssue,
            status
          },
          metrics: {
            frequency,
            firstTimeRatio: reach > 0 ? reach / impressions : 0,
            ctrDeclineRate,
            cpmIncreaseRate,
            reach,
            impressions,
            ctr,
            cpm,
            conversions: parseInt(latest.conversions) || 0,
            daysActive: adInsights.length
          },
          recommendedAction,
          dataRange: {
            start: adInsights[0]?.date_start || '',
            end: latest.date_start || ''
          },
          analyzedAt: new Date().toISOString()
        })
      }

      return results
    }, 'calculateAdFatigue')
  }, [])

  // データの取得と処理
  const fetchData = useCallback(async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (convexData?.items && convexData.items.length > 0) {
          // Convexからのデータを使用
          logger.info('Using data from Convex')
          const fatigueResults = await calculateFatigue(convexData.items)
          setFatigueData(fatigueResults)
        } else if (apiService) {
          // Meta APIから直接取得を試みる
          logger.info('Attempting to fetch from Meta API')
          const insights = await monitorMetaApiCall(
            () => apiService.getInsights({
              level: 'ad',
              dateRange: {
                since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                until: new Date().toISOString().split('T')[0]
              },
              limit: 100
            }),
            'fetchAdInsights'
          )
          
          if (insights && insights.length > 0) {
            const fatigueResults = await calculateFatigue(insights)
            setFatigueData(fatigueResults)
          } else {
            // データがない場合は空配列を設定
            setFatigueData([])
          }
        } else {
          throw new Error('API service not available')
        }
      } catch (err) {
        logger.warn('Failed to fetch real data', err)
        handleMetaApiError(err, 'useAdFatigueMonitored')
        setError(err as Error)
        
        // データなしの状態を設定
        setFatigueData([])
      } finally {
        setIsLoading(false)
      }
  }, [accountId, convexData, apiService, calculateFatigue])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 特定の広告IDでフィルタリング
  const filteredData = useMemo(() => {
    if (!adId) return fatigueData
    return fatigueData.filter(data => data.adId === adId)
  }, [fatigueData, adId])

  return {
    data: filteredData,
    isLoading,
    error,
    refetch: () => {
      // 再取得のトリガー
      setFatigueData([])
      setError(null)
      // useEffectのトリガーのために強制的に再実行
      fetchData()
    }
  }
}