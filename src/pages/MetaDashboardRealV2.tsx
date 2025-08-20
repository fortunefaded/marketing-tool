import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../services/metaAccountManager'
import { MetaApiService } from '../services/metaApiService'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { MetaInsightsData } from '../services/metaApiService'
import { useMetaInsights } from '../hooks/useMetaInsights'
import { MetricCard } from '../components/metrics/MetricCard'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { KPIDashboard } from '../components/analytics/KPIDashboard'
import { CreativePerformance } from '../components/analytics/CreativePerformance'
import { ComparisonDashboard } from '../components/analytics/ComparisonDashboard'
import { SyncSettings, type SyncSettingsData } from '../components/settings/SyncSettings'

export const MetaDashboardRealV2: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })

  // データ状態
  // const [campaigns, setCampaigns] = useState<MetaCampaignData[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' })
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'creative' | 'comparison'>(
    'overview'
  )
  const [creativeAggregationPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [syncSettings, setSyncSettings] = useState<SyncSettingsData | null>(null)

  // アクティブアカウントを取得
  const activeAccount = manager.getActiveAccount()
  const accountId = activeAccount?.accountId || ''

  // ConvexからECForceデータを取得
  // const { orders: ecforceOrders } = useECForceData()

  // ConvexからMetaデータを取得
  const {
    insights,
    hasMore,
    loadMore,
    syncStatus,
    importInsights,
    clearAccountData,
    findMissingRanges,
  } = useMetaInsights({
    accountId,
    pageSize: 5000, // 大きめのページサイズ
  })

  useEffect(() => {
    if (!activeAccount) {
      navigate('/meta-api-setup')
      return
    }

    // キャッシュされたデータを最初に表示
    if (insights.length > 0) {
      setIsLoading(false)
      console.log(`Convexからデータを表示: ${insights.length}件`)
    }

    const service = manager.getActiveApiService()
    if (service) {
      setApiService(service)

      // 全期間同期が一度も行われていない場合、かつキャッシュが空の場合のみ推奨メッセージを表示
      if ((!syncStatus || !syncStatus.lastFullSync) && insights.length === 0) {
        setTimeout(async () => {
          let maxMonths = syncSettings?.maxMonths || 37
          try {
            if (!syncSettings || syncSettings.maxMonths <= 0) {
              const dateLimit = await service.detectDateLimit()
              maxMonths = dateLimit.maxMonths
            }
          } catch (error) {
            console.warn('日付制限の検出に失敗:', error)
          }
          setError(
            `初回アクセスです。「全同期」ボタンをクリックして過去${maxMonths}ヶ月間のデータを取得することを推奨します。`
          )
        }, 1000)
      }

      // キャッシュがない場合の処理
      if (insights.length === 0) {
        setIsLoading(false)
        console.log('キャッシュが空です。ユーザーのアクションを待機します。')
      } else {
        // キャッシュがある場合は最新データのみ取得（増分更新）
        const today = new Date().toISOString().split('T')[0]
        const lastSync = syncStatus?.lastIncrementalSync || syncStatus?.lastFullSync
        if (lastSync) {
          const lastSyncDate = new Date(lastSync).toISOString().split('T')[0]
          if (lastSyncDate < today) {
            // 最後の同期から日付が変わっている場合のみ増分更新
            loadData(service, true, 'incremental')
          }
        }
      }
    }
  }, [manager, navigate, activeAccount, insights.length, syncStatus])

  const loadData = useCallback(
    async (
      service: MetaApiService,
      isUpdate: boolean = false,
      syncType: 'initial' | 'incremental' | 'full' = 'incremental'
    ) => {
      // 全期間同期中の場合は他の処理をブロック
      if (isSyncing && syncType !== 'full') {
        console.log('全期間同期中のため、処理をスキップします')
        return
      }

      setIsLoading(true)
      if (!isUpdate) {
        setError(null)
        setLoadingProgress({ current: 1, total: 4, message: '権限を確認中...' })
      }

      try {
        // まず権限を確認
        console.log('Checking permissions...')
        const permissions = await service.checkPermissions()
        console.log('Current permissions:', permissions)

        const hasAdsRead = permissions.some(
          (p) => p.permission === 'ads_read' && p.status === 'granted'
        )
        const hasAdsManagement = permissions.some(
          (p) => p.permission === 'ads_management' && p.status === 'granted'
        )

        if (!hasAdsRead || !hasAdsManagement) {
          throw new Error(
            `必要な権限が不足しています:\n` +
              `ads_read: ${hasAdsRead ? '✓' : '✗'}\n` +
              `ads_management: ${hasAdsManagement ? '✓' : '✗'}`
          )
        }

        // アカウント情報を確認
        setLoadingProgress({ current: 2, total: 4, message: 'アカウント情報を確認中...' })
        console.log('Checking account info...')
        try {
          const accountInfo = await service.getAccountInfo()
          console.log('Account info:', accountInfo)
        } catch (accountError) {
          console.error('Account access error:', accountError)
          throw new Error(
            `アカウント ${activeAccount?.fullAccountId} にアクセスできません。\n` +
              `アカウントIDが正しいか、アクセス権限があるか確認してください。`
          )
        }

        // キャンペーンデータの取得
        // const campaignsData = await service.getCampaigns({ limit: 50 })
        // setCampaigns(campaignsData)

        // 日付範囲の設定
        let missingRanges: Array<{ start: string; end: string }> = []

        if (syncType === 'full') {
          // 全同期：Meta APIの実際の制限まで
          const until = new Date().toISOString().split('T')[0]

          // 実際の日付制限を検出（設定で上書き可能）
          let sinceStr: string
          let maxMonths = syncSettings?.maxMonths || 37 // 設定値またはデフォルト

          // 設定値が指定されている場合はそれを使用
          if (syncSettings && syncSettings.maxMonths > 0) {
            const since = new Date()
            since.setMonth(since.getMonth() - Math.floor(syncSettings.maxMonths))
            since.setDate(1) // 月初に設定
            sinceStr = since.toISOString().split('T')[0]
            console.log(`同期設定に基づく期間: 過去${syncSettings.maxMonths}ヶ月まで`)
          } else {
            // 設定がない場合はAPI制限を検出
            try {
              setLoadingProgress({ current: 2, total: 4, message: 'API制限を確認中...' })
              const dateLimit = await service.detectDateLimit()
              maxMonths = dateLimit.maxMonths
              sinceStr = dateLimit.oldestDate
              console.log(`実際のAPI制限を検出: 過去${maxMonths}ヶ月まで`)
            } catch (error) {
              console.warn('日付制限の検出に失敗、デフォルトの37ヶ月を使用:', error)
              const since = new Date()
              since.setMonth(since.getMonth() - 36) // 36ヶ月（3年）に安全マージンを設定
              since.setDate(1) // 月初に設定
              sinceStr = since.toISOString().split('T')[0]
            }
          }

          // 月単位に分割して取得
          missingRanges = []
          const startDate = new Date(sinceStr)
          const endDate = new Date(until)

          let currentStart = new Date(startDate)

          while (currentStart < endDate) {
            const currentEnd = new Date(currentStart)
            currentEnd.setMonth(currentEnd.getMonth() + 1) // 1ヶ月間隔

            if (currentEnd > endDate) {
              currentEnd.setTime(endDate.getTime())
            }

            missingRanges.push({
              start: currentStart.toISOString().split('T')[0],
              end: currentEnd.toISOString().split('T')[0],
            })

            currentStart.setMonth(currentStart.getMonth() + 1)
          }
          console.log(
            `全同期モード(過去${maxMonths}ヶ月): ${missingRanges.length}ヶ月に分割`,
            sinceStr,
            'から',
            until
          )
        } else if (syncType === 'incremental') {
          // 増分同期：欠損期間のみ
          const until = new Date().toISOString().split('T')[0]
          const since = lastUpdateTime
            ? lastUpdateTime.toISOString().split('T')[0]
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30日前

          const missing = findMissingRanges(since, until)
          missingRanges = missing || []
          console.log('増分同期モード:', missingRanges.length, '個の欠損期間を検出')
        } else {
          // 初回ロード：最近30日間（全期間同期を推奨）
          const until = new Date().toISOString().split('T')[0]
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

          missingRanges = [{ start: since, end: until }]
          console.log('初回ロードモード:', since, 'から', until)
        }

        if (missingRanges.length === 0) {
          console.log('取得すべきデータはありません')
          setLoadingProgress({ current: 4, total: 4, message: 'データは最新です' })
          return
        }

        // 欠損期間ごとにデータを取得
        setLoadingProgress({
          current: 3,
          total: 4,
          message: `${missingRanges.length}個の期間のデータを取得中...`,
        })

        let allNewData: MetaInsightsData[] = []

        for (let i = 0; i < missingRanges.length; i++) {
          const range = missingRanges[i]
          const rangeStartTime = performance.now()
          console.log(`期間 ${i + 1}/${missingRanges.length}: ${range.start} から ${range.end}`)

          try {
            const rangeData = await service.getInsights({
              level: 'account',
              dateRange: {
                since: range.start,
                until: range.end,
              },
              fields: [
                'spend',
                'impressions',
                'clicks',
                'reach',
                'frequency',
                'cpm',
                'cpc',
                'ctr',
                'date_start',
                'date_stop',
              ],
              time_increment: '1',
              limit: syncSettings?.limitPerRequest || 500,
            })

            // アカウントIDを追加
            const dataWithAccountId = rangeData.map((d) => ({
              ...d,
              accountId,
            }))

            allNewData.push(...dataWithAccountId)
            const rangeEndTime = performance.now()
            const rangeDuration = rangeEndTime - rangeStartTime
            console.log(
              `期間 ${i + 1} 完了: ${rangeData.length}件 (累計: ${allNewData.length}件) - 処理時間: ${(rangeDuration / 1000).toFixed(2)}秒`
            )

            // 10期間ごとに中間保存（データ保護）
            if ((i + 1) % 10 === 0 || i === missingRanges.length - 1) {
              await importInsights(allNewData, 'merge')
              console.log(
                `中間保存: ${allNewData.length}件 (期間 ${i + 1}/${missingRanges.length})`
              )
              allNewData = [] // メモリクリア
            }

            // 進捗更新
            const progressPercent = Math.round(((i + 1) / missingRanges.length) * 80) + 10 // 10-90%の範囲
            setLoadingProgress({
              current: progressPercent,
              total: 100,
              message: `${i + 1}/${missingRanges.length} 期間完了`,
            })

            // 全期間同期の場合は追加の進捗情報
            if (syncType === 'full') {
              setSyncProgress({
                current: Math.round(((i + 1) / missingRanges.length) * 100),
                total: 100,
                message: `${i + 1}/${missingRanges.length} ヶ月分を処理中...`,
              })
            }

            // API負荷軽減のための待機（最後のリクエスト以外）
            if (i < missingRanges.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500)) // 0.5秒待機
            }
          } catch (rangeError: any) {
            console.error(`期間 ${range.start}-${range.end} の取得エラー:`, rangeError)

            // 37ヶ月制限エラーの場合はスキップ
            if (rangeError.code === 3018 || rangeError.message?.includes('37 months')) {
              console.log(
                `期間 ${range.start}-${range.end} はMeta APIの37ヶ月制限を超えているためスキップします`
              )
            }
            // その他のエラーでも続行
          }
        }

        // 広告レベルのデータも取得（クリエイティブ情報のため）
        console.log('広告レベルのデータ取得を開始...')
        const adLevelData: MetaInsightsData[] = []

        for (let i = 0; i < missingRanges.length; i++) {
          const range = missingRanges[i]
          try {
            const adData = await service.getInsights({
              level: 'ad',
              dateRange: {
                since: range.start,
                until: range.end,
              },
              fields: [
                'spend',
                'impressions',
                'clicks',
                'conversions',
                'ctr',
                'cpc',
                'cpm',
                'date_start',
                'date_stop',
                'ad_id',
                'ad_name',
                'campaign_id',
                'campaign_name',
                'adset_id',
                'adset_name',
              ],
              time_increment: '1',
              limit: syncSettings?.limitPerRequest || 500,
            })

            // アカウントIDを追加
            const dataWithAccountId = adData.map((d) => ({
              ...d,
              accountId,
            }))

            adLevelData.push(...dataWithAccountId)
            console.log(`広告レベル期間 ${i + 1}/${missingRanges.length} 完了: ${adData.length}件`)

            // 進捗更新
            if (syncType === 'full') {
              setSyncProgress({
                current: Math.round(((i + 1) / missingRanges.length) * 50) + 50, // 50-100%
                total: 100,
                message: `広告データ取得中... ${i + 1}/${missingRanges.length} 期間完了`,
              })
            }
          } catch (error) {
            console.warn(`広告レベルデータ取得エラー (${range.start}-${range.end}):`, error)
            void error // ESLintエラー回避
          }
        }

        // クリエイティブ情報を取得（設定でスキップ可能）
        const uniqueAdIds = [...new Set(adLevelData.map((d) => d.ad_id).filter(Boolean))]
        console.log(`${uniqueAdIds.length}個の広告を検出`)

        let creatives: any[] = []

        if (!syncSettings?.skipCreatives && uniqueAdIds.length > 0) {
          console.log(`${uniqueAdIds.length}個の広告のクリエイティブ情報を取得します...`)

          // バッチで処理（一度に50個ずつ）
          const batchSize = 50

          for (let i = 0; i < uniqueAdIds.length; i += batchSize) {
            const batch = uniqueAdIds.slice(i, i + batchSize)
            console.log(
              `クリエイティブ情報取得中: ${i + 1}-${Math.min(i + batchSize, uniqueAdIds.length)}/${uniqueAdIds.length}`
            )

            try {
              const batchCreatives = await service.getAdCreatives(
                batch.filter((id): id is string => id !== undefined)
              )
              creatives.push(...batchCreatives)

              // 進捗更新
              if (syncType === 'full') {
                const progress = Math.round(((i + batch.length) / uniqueAdIds.length) * 10) + 90 // 90-100%
                setSyncProgress({
                  current: progress,
                  total: 100,
                  message: `クリエイティブ情報取得中... ${i + batch.length}/${uniqueAdIds.length}`,
                })
              }
            } catch (error) {
              console.warn(`バッチ ${i / batchSize + 1} のクリエイティブ取得エラー:`, error)
            }
          }

          console.log(`クリエイティブ情報取得完了: ${creatives.length}件`)

          // クリエイティブ情報をマージ
          let mergedCount = 0
          adLevelData.forEach((ad) => {
            const creative = creatives.find((c) => c.ad_id === ad.ad_id)
            if (creative) {
              ad.creative_id = creative.creative_id
              ad.creative_name = creative.creative_name
              ad.creative_type = creative.creative_type
              ad.thumbnail_url = creative.thumbnail_url || creative.image_url
              ad.video_url =
                creative.video_url ||
                (creative.video_id ? `https://www.facebook.com/${creative.video_id}` : undefined)
              ad.carousel_cards = creative.carousel_cards
              mergedCount++
            }
          })
          console.log(`${mergedCount}件の広告にクリエイティブ情報をマージしました`)
        }

        // すべてのデータをConvexに保存
        if (adLevelData.length > 0) {
          await importInsights(adLevelData, 'merge')
        }

        setLoadingProgress({ current: 4, total: 4, message: 'データ取得完了!' })
        setLastUpdateTime(new Date())
      } catch (err: any) {
        console.error('Failed to load data:', err)

        // エラーメッセージを構築
        const errorDetails = []

        if (err.code) errorDetails.push(`エラーコード: ${err.code}`)
        if (err.statusCode) errorDetails.push(`HTTPステータス: ${err.statusCode}`)
        if (err.message) errorDetails.push(`メッセージ: ${err.message}`)

        setError(
          `APIエラーが発生しました。\n\n` +
            `詳細情報:\n${errorDetails.join('\n')}\n\n` +
            `解決案:\n` +
            `1. アクセストークンが有効か確認\n` +
            `2. アカウントIDが正しいか確認\n` +
            `3. ネットワーク接続を確認\n` +
            `4. しばらく待ってから再試行（レートリミットの場合）`
        )
      } finally {
        setIsLoading(false)
      }
    },
    [
      accountId,
      activeAccount,
      importInsights,
      findMissingRanges,
      lastUpdateTime,
      syncSettings,
      isSyncing,
    ]
  )

  const handleRefresh = useCallback(() => {
    if (apiService && insights.length > 0) {
      // データがある場合のみ増分更新
      loadData(apiService, true, 'incremental')
    } else if (apiService) {
      // データがない場合は警告を表示
      setError('データがありません。「全同期」ボタンをクリックしてデータを取得してください。')
    }
  }, [apiService, insights.length, loadData])

  // 全同期機能
  const handleFullSync = useCallback(async () => {
    if (!apiService) return

    // パフォーマンス計測開始
    const startTime = performance.now()
    console.log('=== 全期間同期パフォーマンステスト開始 ===')
    console.log('開始時刻:', new Date().toISOString())

    // まず制限を検出
    let maxMonths = 37
    try {
      const dateLimit = await apiService.detectDateLimit()
      maxMonths = dateLimit.maxMonths
    } catch (error) {
      console.warn('日付制限の検出に失敗:', error)
    }

    if (
      !window.confirm(
        `過去${maxMonths}ヶ月間のデータを全同期しますか？\n（Meta APIの制限により${maxMonths}ヶ月以上前のデータは取得できません）\nこの処理には数分かかる場合があります。`
      )
    ) {
      return
    }

    setIsSyncing(true)
    setSyncProgress({
      current: 0,
      total: 100,
      message: `全同期を開始しています(過去${maxMonths}ヶ月間)...`,
    })

    try {
      await loadData(apiService, false, 'full')

      // パフォーマンス計測完了
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('=== 全期間同期パフォーマンステスト完了 ===')
      console.log('終了時刻:', new Date().toISOString())
      console.log('処理時間:', {
        total: `${(duration / 1000).toFixed(2)}秒`,
        totalMinutes: `${(duration / 1000 / 60).toFixed(2)}分`,
      })

      setSyncProgress({
        current: 100,
        total: 100,
        message: `全同期完了! 過去${maxMonths}ヶ月間のデータを取得しました。`,
      })
    } catch (error) {
      console.error('全同期エラー:', error)
      setSyncProgress({ current: 0, total: 100, message: '同期に失敗しました' })
    } finally {
      setIsSyncing(false)
      setTimeout(() => {
        setSyncProgress({ current: 0, total: 0, message: '' })
      }, 5000) // 5秒間表示
    }
  }, [apiService, loadData])

  // キャッシュクリア
  const handleClearCache = useCallback(async () => {
    if (accountId && window.confirm('キャッシュされたデータをすべて削除しますか？')) {
      await clearAccountData()

      // 状態をリセット
      setSyncProgress({ current: 0, total: 0, message: '' })
      setError(null)
      setIsLoading(false)

      // 初回アクセスメッセージを表示
      if (apiService) {
        setTimeout(async () => {
          let maxMonths = 37
          try {
            const dateLimit = await apiService.detectDateLimit()
            maxMonths = dateLimit.maxMonths
          } catch (error) {
            console.warn('日付制限の検出に失敗:', error)
          }
          setError(
            `初回アクセスです。「全同期」ボタンをクリックして過去${maxMonths}ヶ月間のデータを取得することを推奨します。`
          )
        }, 100)
      }

      console.log('キャッシュをクリアしました')
    }
  }, [accountId, apiService, clearAccountData])

  // 集計データの計算
  const calculateMetrics = () => {
    const totalSpend = insights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0)
    const totalImpressions = insights.reduce(
      (sum, insight) => sum + Number(insight.impressions || 0),
      0
    )
    const totalClicks = insights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0)
    const totalReach = insights.reduce((sum, insight) => sum + Number(insight.reach || 0), 0)

    // 平均値の計算
    const avgCtr =
      insights.length > 0
        ? insights.reduce((sum, i) => sum + Number(i.ctr || 0), 0) / insights.length
        : 0
    const avgCpc =
      insights.length > 0
        ? insights.reduce((sum, i) => sum + Number(i.cpc || 0), 0) / insights.length
        : 0
    const avgCpm =
      insights.length > 0
        ? insights.reduce((sum, i) => sum + Number(i.cpm || 0), 0) / insights.length
        : 0

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalReach,
      avgCtr,
      avgCpc,
      avgCpm,
    }
  }

  const metrics = calculateMetrics()

  // チャートデータの準備
  const prepareChartData = () => {
    // 日付ごとにデータを集計
    const dataByDate = new Map<
      string,
      { cost: number; impressions: number; clicks: number; reach: number }
    >()

    insights.forEach((insight) => {
      const dateValue =
        insight.date_start || insight.dateStart || new Date().toISOString().split('T')[0]
      const date = String(dateValue)
      const existing = dataByDate.get(date) || { cost: 0, impressions: 0, clicks: 0, reach: 0 }

      dataByDate.set(date, {
        cost: existing.cost + Number(insight.spend || 0),
        impressions: existing.impressions + Number(insight.impressions || 0),
        clicks: existing.clicks + Number(insight.clicks || 0),
        reach: existing.reach + Number(insight.reach || 0),
      })
    })

    return Array.from(dataByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
      }))
  }

  // 全期間同期中は専用のローディング画面を表示
  if (isSyncing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {isSyncing ? 'データを同期しています...' : 'データを読み込んでいます...'}
          </p>
          {(loadingProgress.total > 0 || syncProgress.total > 0) && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    isSyncing
                      ? syncProgress.current
                      : (loadingProgress.current / loadingProgress.total) * 100
                  }%`,
                }}
              />
            </div>
          )}
          {(loadingProgress.message || syncProgress.message) && (
            <p className="text-sm text-gray-500">
              {isSyncing ? syncProgress.message : loadingProgress.message}
            </p>
          )}
          {isSyncing && (
            <p className="text-xs text-gray-400 mt-2">
              この処理には数分かかる場合があります。ページを閉じないでください。
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Meta広告ダッシュボード (Convex版)
              </h1>
              <p className="mt-1 text-sm text-gray-600">リアルタイムデータを表示しています</p>
            </div>
            <div className="flex items-center space-x-4">
              {syncStatus && (
                <div className="text-sm text-gray-500">
                  <div>総レコード: {syncStatus.totalRecords.toLocaleString()}件</div>
                  {syncStatus.lastFullSync && (
                    <div>
                      全同期: {new Date(syncStatus.lastFullSync).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                  {syncStatus.earliestDate && syncStatus.latestDate && (
                    <div>
                      期間: {syncStatus.earliestDate} 〜 {syncStatus.latestDate}
                    </div>
                  )}
                  <div>Convex使用中</div>
                </div>
              )}

              <SyncSettings onSettingsChange={setSyncSettings} />

              <button
                onClick={handleRefresh}
                disabled={isLoading || isSyncing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </button>

              <button
                onClick={handleFullSync}
                disabled={isLoading || isSyncing}
                className="inline-flex items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                全同期
              </button>

              <button
                onClick={handleClearCache}
                disabled={isLoading || isSyncing}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
              >
                クリア
              </button>
              <a
                href="/meta-api-setup"
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-4 w-4 mr-1" />
                アカウント管理
              </a>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">エラー</h3>
                <div className="mt-2 text-sm text-red-700 whitespace-pre-line">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && !isSyncing && (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-600">データを読み込み中...</span>
          </div>
        )}

        {/* データ表示 */}
        {!isLoading && insights.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">データがありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              「全同期」ボタンをクリックしてデータを取得してください
            </p>
          </div>
        )}

        {!isLoading && insights.length > 0 && (
          <>
            {/* メトリクスカード */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <MetricCard
                title="総広告費"
                value={metrics.totalSpend}
                format="currency"
                icon={<CurrencyDollarIcon className="h-5 w-5" />}
              />
              <MetricCard
                title="総インプレッション"
                value={metrics.totalImpressions}
                format="number"
                icon={<ChartBarIcon className="h-5 w-5" />}
              />
              <MetricCard
                title="総クリック数"
                value={metrics.totalClicks}
                format="number"
                icon={<ShoppingCartIcon className="h-5 w-5" />}
              />
              <MetricCard
                title="平均CTR"
                value={metrics.avgCtr}
                format="percentage"
                icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
              />
            </div>

            {/* タブナビゲーション */}
            <div className="mb-6">
              <nav className="flex space-x-4" aria-label="Tabs">
                {(['overview', 'kpi', 'creative', 'comparison'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 font-medium text-sm rounded-md ${
                      activeTab === tab
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'overview' && '概要'}
                    {tab === 'kpi' && 'KPI分析'}
                    {tab === 'creative' && 'クリエイティブ'}
                    {tab === 'comparison' && '比較分析'}
                  </button>
                ))}
              </nav>
            </div>

            {/* タブコンテンツ */}
            {activeTab === 'overview' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">パフォーマンス推移</h2>
                <PerformanceChart data={prepareChartData()} />
              </div>
            )}

            {activeTab === 'kpi' && <KPIDashboard insights={insights} />}

            {activeTab === 'creative' && (
              <CreativePerformance
                insights={insights}
                aggregationPeriod={creativeAggregationPeriod}
              />
            )}

            {activeTab === 'comparison' && <ComparisonDashboard insights={insights} />}

            {/* もっと読み込むボタン */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  もっと読み込む
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
