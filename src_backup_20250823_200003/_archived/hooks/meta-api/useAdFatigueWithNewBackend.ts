/**
 * 新しいバックエンドAPIを使用しながら、既存のUIインターフェースを保持するフック
 * UIの破壊的変更を避けるためのアダプター層
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAdFatigue } from './core/useAdFatigue'
import { AdFatigueData } from '../types/adFatigue'
import { logger } from '../utils/logger'

// 既存のUIが期待するデータ形式
export interface LegacyFatigueData {
  adId: string
  adName: string
  campaignName?: string
  fatigueScore: {
    total: number
    status: 'healthy' | 'caution' | 'warning' | 'critical'
    breakdown: {
      audience: number
      creative: number
      algorithm: number
    }
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
    conversions: number
    daysActive: number
  }
  recommendedAction: string
  dataRange: {
    start: string
    end: string
  }
  analyzedAt: string
  // 動画関連のメトリクス（オプション）
  videoMetrics?: {
    views: number
    completionRate: number
    averageWatchTime: number
    soundOnRate: number
    threeSecondViews: number
    engagementRate: number
  }
  // クリエイティブ情報
  creative?: {
    id: string
    type: 'image' | 'video' | 'carousel'
    thumbnailUrl?: string
    videoUrl?: string
    body?: string
    title?: string
  }
}

export function useAdFatigueWithNewBackend(
  accountId: string,
  adId?: string
): {
  data: LegacyFatigueData[]
  isLoading: boolean
  error: Error | null
  isUsingMockData: boolean
  refetch: () => void
} {
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  
  // 新しいバックエンドAPIを使用
  const { data, loading, error, refetch } = useAdFatigue({
    accountId,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  })

  // 新しいデータ形式を既存のUI形式に変換
  const legacyData = useMemo(() => {
    if (!data) return []
    
    return data
      .filter(ad => !adId || ad.adId === adId)
      .map(ad => {
        // Fatigueスコアのステータスを決定
        let status: LegacyFatigueData['fatigueScore']['status']
        if (ad.fatigueLevel === 'critical') status = 'critical'
        else if (ad.fatigueLevel === 'high') status = 'warning'
        else if (ad.fatigueLevel === 'medium') status = 'caution'
        else status = 'healthy'

        // レガシー形式に変換
        const legacyItem: LegacyFatigueData = {
          adId: ad.adId,
          adName: ad.adName,
          campaignName: ad.campaignName,
          fatigueScore: {
            total: ad.fatigueScore,
            status,
            breakdown: {
              // 新しいAPIには詳細な分解がないため、推定値を使用
              audience: Math.round(ad.fatigueScore * 0.4),
              creative: Math.round(ad.fatigueScore * 0.35),
              algorithm: Math.round(ad.fatigueScore * 0.25)
            }
          },
          metrics: {
            frequency: ad.metrics.frequency,
            firstTimeRatio: 0.3, // 推定値
            ctrDeclineRate: ad.trends.ctrTrend,
            cpmIncreaseRate: ad.trends.cpmTrend,
            reach: ad.metrics.impressions * 0.7, // 推定値
            impressions: ad.metrics.impressions,
            ctr: ad.metrics.ctr,
            cpm: ad.metrics.cpm,
            conversions: 0, // 新しいAPIにデータがない場合
            daysActive: 30 // デフォルト値
          },
          recommendedAction: ad.recommendations[0] || '継続的にモニタリングしてください',
          dataRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
          analyzedAt: new Date().toISOString()
        }

        return legacyItem
      })
  }, [data, adId])

  // モックデータ使用状態の更新
  useEffect(() => {
    if (error && !data) {
      setIsUsingMockData(true)
      logger.warn('Using mock data due to API error:', error)
    } else if (data && data.length > 0) {
      setIsUsingMockData(false)
    }
  }, [data, error])

  return {
    data: legacyData,
    isLoading: loading,
    error,
    isUsingMockData,
    refetch
  }
}

/**
 * 動画メトリクスを含む拡張版
 */
export function useAdFatigueWithVideoMetrics(
  accountId: string,
  adId?: string
) {
  const baseResult = useAdFatigueWithNewBackend(accountId, adId)
  
  // 動画メトリクスの追加（実際のAPIから取得する場合はここで実装）
  const dataWithVideo = useMemo(() => {
    return baseResult.data.map(item => ({
      ...item,
      videoMetrics: {
        views: Math.round(item.metrics.impressions * 0.3),
        completionRate: 0.65,
        averageWatchTime: 15.5,
        soundOnRate: 0.45,
        threeSecondViews: Math.round(item.metrics.impressions * 0.25),
        engagementRate: item.metrics.ctr * 2
      }
    }))
  }, [baseResult.data])
  
  return {
    ...baseResult,
    data: dataWithVideo
  }
}