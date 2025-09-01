/**
 * Ad Fatigue データ取得 with 3層キャッシュシステム
 *
 * 既存のuseAdFatigueを3層キャッシュシステムで強化
 */

import { useMemo, useCallback, useState, useEffect } from 'react'
import { useThreeLayerCache } from './useThreeLayerCache'
import { useConvexCache } from './useConvexCache'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { DateRangePreset } from '@/features/common/types/date'
import type { AdFatigueResult } from '@/features/ad-fatigue/types'

// ============================================================================
// 型定義
// ============================================================================

export interface UseAdFatigueWithCacheOptions {
  accountId: string
  dateRange: DateRangePreset
  enableCache?: boolean
  forceRefresh?: boolean
  onDataUpdate?: (data: AdFatigueResult[]) => void
  onCacheHit?: (source: 'memory' | 'convex' | 'api') => void
  onError?: (error: Error) => void
}

export interface AdFatigueWithCacheResult {
  data: AdFatigueResult[] | null
  loading: boolean
  error: Error | null
  cacheSource: 'memory' | 'convex' | 'api' | 'none'
  isStale: boolean
  lastUpdated: Date | null
  refresh: () => Promise<void>
  clearCache: () => Promise<void>
  stats: {
    totalAds: number
    criticalAds: number
    warningAds: number
    healthyAds: number
    avgFatigueScore: number
    cacheHitRate: number
    apiCallsSaved: number
  }
}

// ============================================================================
// Meta API フェッチャー
// ============================================================================

async function fetchAdFatigueFromMetaAPI(
  accountId: string,
  dateRange: DateRangePreset
): Promise<AdFatigueResult[]> {
  // 実際のMeta API呼び出しロジック
  // ここでは既存のfetchAdInsightsを使用

  try {
    const response = await fetch('/api/meta/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        dateRange,
        fields: [
          'ad_id',
          'ad_name',
          'campaign_id',
          'campaign_name',
          'impressions',
          'clicks',
          'ctr',
          'cpm',
          'frequency',
          'reach',
          'spend',
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const insights = await response.json()

    // 疲労度スコアを計算
    const fatigueResults = calculateAdFatigue(insights)

    return fatigueResults
  } catch (error) {
    console.error('Failed to fetch from Meta API:', error)
    throw error
  }
}

// ============================================================================
// 疲労度計算
// ============================================================================

function calculateAdFatigue(insights: any[]): AdFatigueResult[] {
  return insights.map((insight) => {
    // 疲労度スコア計算ロジック
    const frequency = insight.frequency || 0
    const ctr = insight.ctr || 0
    const cpm = insight.cpm || 0

    // 視聴者疲労（Frequency基準）
    const audienceFatigueScore = Math.min(100, (frequency / 3.5) * 100)

    // クリエイティブ疲労（CTR低下基準）
    const baselineCtr = 2.0 // 業界平均CTR（仮定）
    const ctrDeclineRate = Math.max(0, (baselineCtr - ctr) / baselineCtr)
    const creativeFatigueScore = Math.min(100, ctrDeclineRate * 100)

    // アルゴリズム疲労（CPM上昇基準）
    const baselineCpm = 10.0 // ベースラインCPM（仮定）
    const cpmIncreaseRate = Math.max(0, (cpm - baselineCpm) / baselineCpm)
    const algorithmFatigueScore = Math.min(100, cpmIncreaseRate * 100)

    // 総合スコア（加重平均）
    const totalScore =
      audienceFatigueScore * 0.35 + creativeFatigueScore * 0.35 + algorithmFatigueScore * 0.3

    // 疲労レベル判定
    let fatigueLevel: 'healthy' | 'caution' | 'warning' | 'critical'
    if (totalScore < 25) fatigueLevel = 'healthy'
    else if (totalScore < 50) fatigueLevel = 'caution'
    else if (totalScore < 75) fatigueLevel = 'warning'
    else fatigueLevel = 'critical'

    return {
      adId: insight.ad_id,
      adName: insight.ad_name,
      campaignId: insight.campaign_id,
      campaignName: insight.campaign_name,

      fatigueScore: {
        total: Math.round(totalScore),
        breakdown: {
          audience: Math.round(audienceFatigueScore),
          creative: Math.round(creativeFatigueScore),
          algorithm: Math.round(algorithmFatigueScore),
        },
        primaryIssue:
          audienceFatigueScore > creativeFatigueScore
            ? audienceFatigueScore > algorithmFatigueScore
              ? 'audience'
              : 'algorithm'
            : creativeFatigueScore > algorithmFatigueScore
              ? 'creative'
              : 'algorithm',
        status: fatigueLevel,
      },

      metrics: {
        frequency,
        ctr,
        cpm,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        reach: insight.reach || 0,
        spend: insight.spend || 0,
      },

      recommendedAction: getRecommendedAction(fatigueLevel, totalScore),

      analyzedAt: new Date().toISOString(),
      dataRangeStart: '', // 実際の日付範囲から設定
      dataRangeEnd: '', // 実際の日付範囲から設定
    }
  })
}

function getRecommendedAction(level: string, score: number): string {
  if (level === 'critical') {
    return '即座に広告を停止し、新しいクリエイティブに切り替えることを推奨'
  } else if (level === 'warning') {
    return 'クリエイティブのリフレッシュまたはターゲティングの調整を検討'
  } else if (level === 'caution') {
    return 'パフォーマンスを注視し、必要に応じて軽微な調整を実施'
  }
  return '現状維持で問題なし、定期的なモニタリングを継続'
}

// ============================================================================
// メインHook
// ============================================================================

export function useAdFatigueWithCache(
  options: UseAdFatigueWithCacheOptions
): AdFatigueWithCacheResult {
  const [stats, setStats] = useState({
    totalAds: 0,
    criticalAds: 0,
    warningAds: 0,
    healthyAds: 0,
    avgFatigueScore: 0,
    cacheHitRate: 0,
    apiCallsSaved: 0,
  })

  // 差分更新の記録
  const startDifferentialUpdate = useMutation(api.cache.differentialUpdates.startUpdate)
  const completeDifferentialUpdate = useMutation(api.cache.differentialUpdates.completeUpdate)

  // フェッチャー関数
  const fetcher = useCallback(async () => {
    // 差分更新を開始
    const updateResult = await startDifferentialUpdate({
      accountId: options.accountId,
      dateRange: options.dateRange,
      targetDates: [], // 実際の日付リストを計算
      triggeredBy: options.forceRefresh ? 'manual' : 'api',
    })

    try {
      const data = await fetchAdFatigueFromMetaAPI(options.accountId, options.dateRange)

      // 差分更新を完了
      await completeDifferentialUpdate({
        updateId: updateResult.updateId,
        totalRecordsAfter: data.length,
      })

      return data
    } catch (error) {
      // エラー時も差分更新を記録
      await completeDifferentialUpdate({
        updateId: updateResult.updateId,
        totalRecordsAfter: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }, [
    options.accountId,
    options.dateRange,
    options.forceRefresh,
    startDifferentialUpdate,
    completeDifferentialUpdate,
  ])

  // 3層キャッシュシステムを使用
  const cacheResult = useThreeLayerCache<AdFatigueResult[]>(
    {
      accountId: options.accountId,
      dateRange: options.dateRange,
      forceRefresh: options.forceRefresh,
      enableMemoryCache: options.enableCache !== false,
      enableConvexCache: options.enableCache !== false,
      expiresInHours: 24,
      onCacheHit: options.onCacheHit,
      onError: options.onError,
    },
    fetcher
  )

  // Convexキャッシュ情報を取得
  const convexCache = useConvexCache({
    accountId: options.accountId,
    dateRange: options.dateRange,
    enabled: options.enableCache !== false,
    autoRefresh: true,
    refreshInterval: 10, // 10分ごと
    onUpdate: options.onDataUpdate,
    onError: options.onError,
  })

  // 統計を計算
  useEffect(() => {
    if (!cacheResult.data) return

    const data = cacheResult.data
    const critical = data.filter((d) => d.fatigueScore.status === 'critical').length
    const warning = data.filter((d) => d.fatigueScore.status === 'warning').length
    const healthy = data.filter((d) => d.fatigueScore.status === 'healthy').length
    const totalScore = data.reduce((sum, d) => sum + d.fatigueScore.total, 0)

    setStats({
      totalAds: data.length,
      criticalAds: critical,
      warningAds: warning,
      healthyAds: healthy,
      avgFatigueScore: data.length > 0 ? Math.round(totalScore / data.length) : 0,
      cacheHitRate: cacheResult.cacheStats.hitRate,
      apiCallsSaved: cacheResult.cacheStats.memoryHits + cacheResult.cacheStats.convexHits,
    })
  }, [cacheResult.data, cacheResult.cacheStats])

  // キャッシュクリア
  const clearCache = useCallback(async () => {
    cacheResult.clear()
    await convexCache.invalidate()
  }, [cacheResult, convexCache])

  // 最終更新日時
  const lastUpdated = useMemo(() => {
    if (convexCache.cacheInfo) {
      return new Date(convexCache.cacheInfo.updatedAt)
    }
    if (cacheResult.cacheStats.lastUpdated) {
      return cacheResult.cacheStats.lastUpdated
    }
    return null
  }, [convexCache.cacheInfo, cacheResult.cacheStats])

  return {
    data: cacheResult.data,
    loading: cacheResult.loading || convexCache.loading,
    error: cacheResult.error || convexCache.error,
    cacheSource: cacheResult.source,
    isStale: convexCache.isStale,
    lastUpdated,
    refresh: cacheResult.refresh,
    clearCache,
    stats,
  }
}

// ============================================================================
// プリフェッチHook
// ============================================================================

export function useAdFatiguePrefetch() {
  const [isPrefetching, setIsPrefetching] = useState(false)
  const [progress, setProgress] = useState(0)

  const prefetch = useCallback(
    async (
      configs: Array<{
        accountId: string
        dateRange: DateRangePreset
      }>
    ) => {
      setIsPrefetching(true)
      setProgress(0)

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i]

        try {
          await fetchAdFatigueFromMetaAPI(config.accountId, config.dateRange)
        } catch (error) {
          console.error(`Prefetch failed for ${config.accountId}/${config.dateRange}:`, error)
        }

        setProgress(((i + 1) / configs.length) * 100)
      }

      setIsPrefetching(false)
    },
    []
  )

  return { prefetch, isPrefetching, progress }
}
