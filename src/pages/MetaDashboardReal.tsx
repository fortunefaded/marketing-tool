import React, { useState, useEffect } from 'react'
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
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { MetaCampaignData, MetaInsightsData } from '../services/metaApiService'
import { MetaDataCache, DataSyncStatus } from '../services/metaDataCache'
import { useECForceData } from '../hooks/useECForceData'
import { MetricCard } from '../components/metrics/MetricCard'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { KPIDashboard } from '../components/analytics/KPIDashboard'
import { CreativePerformance } from '../components/analytics/CreativePerformance'
import { DataHistoryViewer } from '../components/debug/DataHistoryViewer'
import { ComparisonDashboard } from '../components/analytics/ComparisonDashboard'
import { SyncSettings, type SyncSettings as SyncSettingsType } from '../components/settings/SyncSettings'
import { FatigueDashboard } from '../components/AdFatigue/FatigueDashboard'
import { FatigueDashboardErrorBoundary } from '../components/AdFatigue/FatigueDashboardErrorBoundary'

export const MetaDashboardReal: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })
  
  // データ状態
  const [campaigns, setCampaigns] = useState<MetaCampaignData[]>([])
  const [insights, setInsights] = useState<MetaInsightsData[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<DataSyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' })
  const [cacheInfo, setCacheInfo] = useState({ sizeKB: 0, records: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'creative' | 'comparison' | 'fatigue'>('overview')
  const [creativeAggregationPeriod, setCreativeAggregationPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [syncSettings, setSyncSettings] = useState<SyncSettingsType | null>(null)
  
  // ConvexからECForceデータを取得
  const { orders: ecforceOrders } = useECForceData()

  useEffect(() => {
    const activeAccount = manager.getActiveAccount()
    if (!activeAccount) {
      navigate('/meta-api-setup')
      return
    }
    
    // キャッシュされたデータを最初に読み込み
    const cachedData = MetaDataCache.getInsights(activeAccount.accountId)
    const status = MetaDataCache.getSyncStatus(activeAccount.accountId)
    
    if (cachedData.length > 0) {
      setInsights(cachedData)
      setIsLoading(false)
      console.log(`キャッシュデータを表示: ${cachedData.length}件`)
    }
    
    setSyncStatus(status)
    
    // キャッシュ使用量を更新
    const cacheUsage = MetaDataCache.getCacheUsage(activeAccount.accountId)
    setCacheInfo(cacheUsage)
    
    const service = manager.getActiveApiService()
    if (service) {
      setApiService(service)
      
      // 全期間同期が一度も行われていない場合、かつキャッシュが空の場合のみ推奨メッセージを表示
      if ((!status || !status.lastFullSync) && cachedData.length === 0) {
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
          setError(`初回アクセスです。「全同期」ボタンをクリックして過去${maxMonths}ヶ月間のデータを取得することを推奨します。`)
        }, 1000)
      }
      
      // キャッシュがない場合の処理
      if (cachedData.length === 0) {
        // 初回アクセスの場合は自動でデータを取得しない（ユーザーの明示的なアクションを待つ）
        setIsLoading(false)
        console.log('キャッシュが空です。ユーザーのアクションを待機します。')
      } else {
        // キャッシュがある場合は最新データのみ取得（増分更新）
        const today = new Date().toISOString().split('T')[0]
        const lastSync = status.lastIncrementalSync || status.lastFullSync
        if (lastSync) {
          const lastSyncDate = new Date(lastSync).toISOString().split('T')[0]
          if (lastSyncDate < today) {
            // 最後の同期から日付が変わっている場合のみ増分更新
            loadData(service, true, 'incremental')
          }
        }
      }
    }
  }, [manager, navigate])

  const loadData = async (service: MetaApiService, isUpdate: boolean = false, syncType: 'initial' | 'incremental' | 'full' = 'incremental') => {
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
    
    const accountId = manager.getActiveAccount()?.accountId
    if (!accountId) return
    
    try {
      // まず権限を確認
      console.log('Checking permissions...')
      const permissions = await service.checkPermissions()
      console.log('Current permissions:', permissions)
      
      const hasAdsRead = permissions.some(p => p.permission === 'ads_read' && p.status === 'granted')
      const hasAdsManagement = permissions.some(p => p.permission === 'ads_management' && p.status === 'granted')
      
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
          `アカウント ${manager.getActiveAccount()?.fullAccountId} にアクセスできません。\n` +
          `アカウントIDが正しいか、アクセス権限があるか確認してください。`
        )
      }
      // キャンペーンデータの取得
      const campaignsData = await service.getCampaigns({ limit: 50 })
      setCampaigns(campaignsData)

      // 日付範囲の設定
      let missingRanges: Array<{start: string, end: string}> = []
      
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
        
        // 5年間を月単位に分割して取得
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
            end: currentEnd.toISOString().split('T')[0]
          })
          
          currentStart.setMonth(currentStart.getMonth() + 1)
        }
        console.log(`全同期モード(過去${maxMonths}ヶ月): ${missingRanges.length}ヶ月に分割`, sinceStr, 'から', until)
      } else if (syncType === 'incremental') {
        // 増分同期：欠損期間のみ
        const until = new Date().toISOString().split('T')[0]
        const since = lastUpdateTime ? 
          lastUpdateTime.toISOString().split('T')[0] :
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30日前
        
        missingRanges = MetaDataCache.findMissingDateRanges(accountId, since, until)
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
      setLoadingProgress({ current: 3, total: 4, message: `${missingRanges.length}個の期間のデータを取得中...` })
      
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
              until: range.end
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
              'date_stop'
            ],
            time_increment: '1',
            limit: syncSettings?.limitPerRequest || 500
          })
          
          allNewData.push(...rangeData)
          const rangeEndTime = performance.now()
          const rangeDuration = rangeEndTime - rangeStartTime
          console.log(`期間 ${i + 1} 完了: ${rangeData.length}件 (累計: ${allNewData.length}件) - 処理時間: ${(rangeDuration / 1000).toFixed(2)}秒`)
          
          // 10期間ごとに中間キャッシュを保存（データ保護）
          if ((i + 1) % 10 === 0 || i === missingRanges.length - 1) {
            const cachedData = MetaDataCache.getInsights(accountId)
            const partialMerged = MetaDataCache.mergeInsights(cachedData, allNewData)
            MetaDataCache.saveInsights(accountId, partialMerged)
            console.log(`中間キャッシュ保存: ${partialMerged.length}件 (期間 ${i + 1}/${missingRanges.length})`)
          }
          
          // 進捗更新
          const progressPercent = Math.round(((i + 1) / missingRanges.length) * 80) + 10 // 10-90%の範囲
          setLoadingProgress({ 
            current: progressPercent, 
            total: 100, 
            message: `${i + 1}/${missingRanges.length} 期間完了 (累計: ${allNewData.length}件)` 
          })
          
          // 全期間同期の場合は追加の進捗情報
          if (syncType === 'full') {
            setSyncProgress({
              current: Math.round(((i + 1) / missingRanges.length) * 100),
              total: 100,
              message: `${i + 1}/${missingRanges.length} ヶ月分を処理中... (${allNewData.length}件取得済み)`
            })
          }
          
          // API負荷軽減のための待機（最後のリクエスト以外）
          if (i < missingRanges.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)) // 0.5秒待機
          }
          
        } catch (rangeError: any) {
          console.error(`期間 ${range.start}-${range.end} の取得エラー:`, rangeError)
          
          // 37ヶ月制限エラーの場合はスキップ
          if (rangeError.code === 3018 || rangeError.message?.includes('37 months')) {
            console.log(`期間 ${range.start}-${range.end} はMeta APIの37ヶ月制限を超えているためスキップします`)
            
            // 実際に取得可能な最古の日付を記録
            const today = new Date()
            const requestedDate = new Date(range.start)
            const monthsDiff = (today.getFullYear() - requestedDate.getFullYear()) * 12 + 
                             (today.getMonth() - requestedDate.getMonth())
            console.log(`要求した期間は現在から${monthsDiff}ヶ月前です`)
          }
          // その他のエラーでも続行
        }
      }
      
      console.log(`全期間のデータ取得完了: ${allNewData.length}件`)
      
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
              until: range.end
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
              'adset_name'
            ],
            time_increment: '1',
            limit: syncSettings?.limitPerRequest || 500
          })
          
          adLevelData.push(...adData)
          console.log(`広告レベル期間 ${i + 1}/${missingRanges.length} 完了: ${adData.length}件`)
          
          // 進捗更新
          if (syncType === 'full') {
            setSyncProgress({
              current: Math.round(((i + 1) / missingRanges.length) * 50) + 50, // 50-100%
              total: 100,
              message: `広告データ取得中... ${i + 1}/${missingRanges.length} 期間完了`
            })
          }
          
        } catch (error) {
          console.warn(`広告レベルデータ取得エラー (${range.start}-${range.end}):`, error)
        }
      }
      
      // クリエイティブ情報を取得（設定でスキップ可能）
      const uniqueAdIds = [...new Set(adLevelData.map(d => d.ad_id).filter(Boolean))]
      console.log(`${uniqueAdIds.length}個の広告を検出`)
      
      let creatives: any[] = []
      
      if (!syncSettings?.skipCreatives && uniqueAdIds.length > 0) {
        console.log(`${uniqueAdIds.length}個の広告のクリエイティブ情報を取得します...`)
        console.log('広告IDサンプル:', uniqueAdIds.slice(0, 5))
        
        // バッチで処理（一度に50個ずつ）
        const batchSize = 50
        
        for (let i = 0; i < uniqueAdIds.length; i += batchSize) {
          const batch = uniqueAdIds.slice(i, i + batchSize)
          console.log(`クリエイティブ情報取得中: ${i + 1}-${Math.min(i + batchSize, uniqueAdIds.length)}/${uniqueAdIds.length}`)
          
          try {
            const batchCreatives = await service.getAdCreatives(batch)
            creatives.push(...batchCreatives)
            
            // 進捗更新
            if (syncType === 'full') {
              const progress = Math.round(((i + batch.length) / uniqueAdIds.length) * 10) + 90 // 90-100%
              setSyncProgress({
                current: progress,
                total: 100,
                message: `クリエイティブ情報取得中... ${i + batch.length}/${uniqueAdIds.length}`
              })
            }
          } catch (error) {
            console.warn(`バッチ ${i / batchSize + 1} のクリエイティブ取得エラー:`, error)
          }
        }
        
        console.log(`クリエイティブ情報取得完了: ${creatives.length}件`)
        console.log('クリエイティブサンプル:', creatives.slice(0, 2))
        
        // クリエイティブ情報をマージ
        let mergedCount = 0
        let videoCount = 0
        adLevelData.forEach(ad => {
          const creative = creatives.find(c => c.ad_id === ad.ad_id)
          if (creative) {
            ad.creative_id = creative.creative_id
            ad.creative_name = creative.creative_name
            ad.creative_type = creative.creative_type
            ad.thumbnail_url = creative.thumbnail_url || creative.image_url
            ad.video_url = creative.video_url || (creative.video_id ? `https://www.facebook.com/${creative.video_id}` : undefined)
            ad.carousel_cards = creative.carousel_cards
            mergedCount++
            
            if (creative.creative_type === 'video') {
              videoCount++
            }
          }
        })
        console.log(`${mergedCount}件の広告にクリエイティブ情報をマージしました（動画: ${videoCount}件）`)
      } else if (syncSettings?.skipCreatives) {
        console.log('設定によりクリエイティブ情報の取得をスキップしました')
      }
      
      // アカウントレベルと広告レベルのデータをマージ
      const allMergedData = [...allNewData, ...adLevelData]
      
      // キャッシュされたデータとマージ
      const cachedData = MetaDataCache.getInsights(accountId)
      const mergedData = MetaDataCache.mergeInsights(cachedData, allMergedData)
      
      // キャッシュに保存
      MetaDataCache.saveInsights(accountId, mergedData)
      MetaDataCache.updateDateRange(accountId, mergedData)
      
      // UIを更新
      setInsights(mergedData)
      
      // キャッシュ使用量を更新
      const cacheUsage = MetaDataCache.getCacheUsage(accountId)
      setCacheInfo(cacheUsage)
      
      // キャンペーンデータは後で非同期取得（メインデータをブロックしない）
      console.log('メインデータ取得完了、キャンペーンデータはバックグラウンドで取得中...')
      
      // バックグラウンドでキャンペーンデータを取得（初回のみ）
      // 注意: これは追加のデータ取得であり、既存のデータを上書きしません
      if (!isUpdate && syncType === 'initial') {
        // 初回のみ、キャンペーンレベルの追加情報を取得
        console.log('バックグラウンドでキャンペーン情報を取得予定（既存データは保持）')
      }
      
      // 同期ステータスを更新
      const now = new Date().toISOString()
      const statusUpdate: Partial<DataSyncStatus> = {
        totalRecords: mergedData.length
      }
      
      if (syncType === 'full') {
        statusUpdate.lastFullSync = now
      } else {
        statusUpdate.lastIncrementalSync = now
      }
      
      MetaDataCache.saveSyncStatus(accountId, statusUpdate)
      setSyncStatus(MetaDataCache.getSyncStatus(accountId))
      
      setLoadingProgress({ current: 4, total: 4, message: 'データ取得完了!' })
      setLastUpdateTime(new Date())
      
    } catch (err: any) {
      console.error('Failed to load data:', err)
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        details: err.details,
        statusCode: err.statusCode,
        stack: err.stack
      })
      
      // 詳細なエラー情報を構築
      const errorDetails = []
      
      if (err.code) errorDetails.push(`エラーコード: ${err.code}`)
      if (err.statusCode) errorDetails.push(`HTTPステータス: ${err.statusCode}`)
      if (err.message) errorDetails.push(`メッセージ: ${err.message}`)
      
      // Meta APIの詳細エラー情報
      if (err.details?.error) {
        const apiError = err.details.error
        if (apiError.code) errorDetails.push(`APIエラーコード: ${apiError.code}`)
        if (apiError.message) errorDetails.push(`APIメッセージ: ${apiError.message}`)
        if (apiError.error_subcode) errorDetails.push(`サブコード: ${apiError.error_subcode}`)
        if (apiError.type) errorDetails.push(`エラータイプ: ${apiError.type}`)
        if (apiError.fbtrace_id) errorDetails.push(`トレースID: ${apiError.fbtrace_id}`)
      }
      
      // リクエスト情報
      const accountInfo = manager.getActiveAccount()
      if (accountInfo) {
        errorDetails.push(`アカウント: ${accountInfo.fullAccountId}`)
        errorDetails.push(`アカウント名: ${accountInfo.name}`)
      }
      
      // コンテキスト情報
      errorDetails.push(`更新フラグ: ${isUpdate ? 'true' : 'false'}`)
      errorDetails.push(`取得済みデータ数: ${insights.length}件`)
      
      // 権限エラーの場合は特別なメッセージ
      if (err.code === 200 || err.code === 'PERMISSION_ERROR' || err.details?.error?.code === 200 || err.message?.includes('ads_management') || err.message?.includes('ads_read')) {
        setError(
          `権限エラー: 広告データへのアクセス権限がありません。\n\n` +
          `解決方法:\n` +
          `1. Graph API Explorer (https://developers.facebook.com/tools/explorer/) で新しいアクセストークンを生成\n` +
          `2. 必要な権限: ads_read, ads_management, business_management\n` +
          `3. アカウントにBusiness Managerで管理者権限があるか確認\n\n` +
          `詳細情報:\n${errorDetails.join('\n')}`
        )
      } else {
        // 一般的なエラーの場合
        setError(
          `APIエラーが発生しました。\n\n` +
          `詳細情報:\n${errorDetails.join('\n')}\n\n` +
          `解決案:\n` +
          `1. アクセストークンが有効か確認\n` +
          `2. アカウントIDが正しいか確認\n` +
          `3. ネットワーク接続を確認\n` +
          `4. しばらく待ってから再試行（レートリミットの場合）`
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (apiService && insights.length > 0) {
      // データがある場合のみ増分更新
      loadData(apiService, true, 'incremental')
    } else if (apiService) {
      // データがない場合は警告を表示
      setError('データがありません。「全同期」ボタンをクリックしてデータを取得してください。')
    }
  }
  
  // 全同期機能
  const handleFullSync = async () => {
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
    
    if (!window.confirm(`過去${maxMonths}ヶ月間のデータを全同期しますか？\n（Meta APIの制限により${maxMonths}ヶ月以上前のデータは取得できません）\nこの処理には数分かかる場合があります。`)) {
      return
    }
    
    // メモリ使用量（初期）
    if (performance.memory) {
      console.log('初期メモリ使用量:', {
        usedJSHeapSize: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalJSHeapSize: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      })
    }
    
    setIsSyncing(true)
    setSyncProgress({ current: 0, total: 100, message: `全同期を開始しています(過去${maxMonths}ヶ月間)...` })
    
    try {
      await loadData(apiService, false, 'full')
      
      // パフォーマンス計測完了
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log('=== 全期間同期パフォーマンステスト完了 ===')
      console.log('終了時刻:', new Date().toISOString())
      console.log('処理時間:', {
        total: `${(duration / 1000).toFixed(2)}秒`,
        totalMinutes: `${(duration / 1000 / 60).toFixed(2)}分`
      })
      
      // メモリ使用量（最終）
      if (performance.memory) {
        console.log('最終メモリ使用量:', {
          usedJSHeapSize: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          totalJSHeapSize: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
        })
      }
      
      // 取得したデータの統計
      const accountId = manager.getActiveAccount()?.accountId
      if (accountId) {
        const finalData = MetaDataCache.getInsights(accountId)
        const cacheInfo = MetaDataCache.getCacheUsage(accountId)
        console.log('データ統計:', {
          totalRecords: finalData.length,
          cacheSize: `${cacheInfo.sizeKB} KB`,
          averageRecordSize: `${(cacheInfo.sizeKB / finalData.length).toFixed(2)} KB/record`
        })
      }
      
      setSyncProgress({ current: 100, total: 100, message: `全同期完了! 過去${maxMonths}ヶ月間のデータを取得しました。` })
    } catch (error) {
      console.error('全同期エラー:', error)
      setSyncProgress({ current: 0, total: 100, message: '同期に失敗しました' })
    } finally {
      setIsSyncing(false)
      setTimeout(() => {
        setSyncProgress({ current: 0, total: 0, message: '' })
      }, 5000) // 5秒間表示
    }
  }
  
  // キャッシュクリア
  const handleClearCache = () => {
    const accountId = manager.getActiveAccount()?.accountId
    if (accountId && window.confirm('キャッシュされたデータをすべて削除しますか？')) {
      // キャッシュをクリア
      MetaDataCache.clearAccountCache(accountId)
      
      // 状態をリセット
      setInsights([])
      setSyncStatus({
        accountId,
        lastFullSync: null,
        lastIncrementalSync: null,
        totalRecords: 0,
        dateRange: {
          earliest: null,
          latest: null
        }
      })
      setCacheInfo({ sizeKB: 0, records: 0 })
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
          setError(`初回アクセスです。「全同期」ボタンをクリックして過去${maxMonths}ヶ月間のデータを取得することを推奨します。`)
        }, 100)
      }
      
      console.log('キャッシュをクリアしました')
    }
  }

  // 集計データの計算
  const calculateMetrics = () => {
    const totalSpend = insights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0)
    const totalImpressions = insights.reduce((sum, insight) => sum + Number(insight.impressions || 0), 0)
    const totalClicks = insights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0)
    const totalReach = insights.reduce((sum, insight) => sum + Number(insight.reach || 0), 0)
    
    // 平均値の計算
    const avgCtr = insights.length > 0 
      ? insights.reduce((sum, i) => sum + Number(i.ctr || 0), 0) / insights.length 
      : 0
    const avgCpc = insights.length > 0
      ? insights.reduce((sum, i) => sum + Number(i.cpc || 0), 0) / insights.length
      : 0
    const avgCpm = insights.length > 0
      ? insights.reduce((sum, i) => sum + Number(i.cpm || 0), 0) / insights.length
      : 0
    
    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalReach,
      avgCtr,
      avgCpc,
      avgCpm
    }
  }

  const metrics = calculateMetrics()

  // チャートデータの準備
  const prepareChartData = () => {
    // 日付ごとにデータを集計
    const dataByDate = new Map<string, { cost: number; impressions: number; clicks: number; reach: number }>()
    
    insights.forEach(insight => {
      const date = insight.date_start || insight.dateStart || new Date().toISOString().split('T')[0]
      const existing = dataByDate.get(date) || { cost: 0, impressions: 0, clicks: 0, reach: 0 }
      
      dataByDate.set(date, {
        cost: existing.cost + Number(insight.spend || 0),
        impressions: existing.impressions + Number(insight.impressions || 0),
        clicks: existing.clicks + Number(insight.clicks || 0),
        reach: existing.reach + Number(insight.reach || 0)
      })
    })
    
    return Array.from(dataByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data
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
                  width: `${isSyncing 
                    ? syncProgress.current 
                    : (loadingProgress.current / loadingProgress.total) * 100
                  }%` 
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
                Meta広告ダッシュボード
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                リアルタイムデータを表示しています
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {syncStatus && (
                <div className="text-sm text-gray-500">
                  <div>総レコード: {syncStatus.totalRecords.toLocaleString()}件</div>
                  {syncStatus.lastFullSync && (
                    <div>全同期: {new Date(syncStatus.lastFullSync).toLocaleDateString('ja-JP')}</div>
                  )}
                  {syncStatus.dateRange.earliest && syncStatus.dateRange.latest && (
                    <div>期間: {syncStatus.dateRange.earliest} 〜 {syncStatus.dateRange.latest}</div>
                  )}
                  <div>キャッシュ: {cacheInfo.sizeKB}KB ({cacheInfo.records}件)</div>
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

        {/* 同期進捗表示 */}
        {isSyncing && syncProgress.total > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-800">データ同期中</h3>
              <span className="text-sm text-blue-600">{syncProgress.current}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${syncProgress.current}%` }}
              />
            </div>
            <p className="text-sm text-blue-700">{syncProgress.message}</p>
          </div>
        )}
        
        {/* データ減少警告 */}
        {(() => {
          const history = manager.getActiveAccount() ? MetaDataCache.getDataHistory(manager.getActiveAccount()!.accountId) : []
          const recentReduction = history.slice(-5).find(h => 
            h.operation === 'save' && 
            h.beforeCount > 100 && 
            h.afterCount < h.beforeCount * 0.5
          )
          
          if (recentReduction) {
            const timeDiff = Date.now() - new Date(recentReduction.timestamp).getTime()
            const minutesAgo = Math.floor(timeDiff / (1000 * 60))
            
            if (minutesAgo < 30) {
              return (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">データ減少を検出</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {minutesAgo}分前にデータが{recentReduction.beforeCount}件から{recentReduction.afterCount}件に減少しました。
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        ストレージ容量が不足している可能性があります。不要なブラウザキャッシュをクリアするか、
                        全同期を再実行してください。
                      </p>
                    </div>
                  </div>
                </div>
              )
            }
          }
          
          return null
        })()}
        
        {/* エラー表示 */}
        {error && (
          <div className={`mb-6 ${error.includes('初回アクセス') ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-md p-4`}>
            <div className="flex">
              <ExclamationTriangleIcon className={`h-5 w-5 ${error.includes('初回アクセス') ? 'text-blue-400' : 'text-red-400'} mr-3`} />
              <div>
                <h3 className={`text-sm font-medium ${error.includes('初回アクセス') ? 'text-blue-800' : 'text-red-800'}`}>
                  {error.includes('初回アクセス') ? '推奨アクション' : 'エラーが発生しました'}
                </h3>
                <p className={`text-sm ${error.includes('初回アクセス') ? 'text-blue-700' : 'text-red-700'} mt-1`}>{error}</p>
                {error.includes('権限') && (
                  <div className="mt-3">
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200"
                    >
                      Graph API Explorerを開く
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPIカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          <MetricCard
            title="総費用"
            value={metrics.totalSpend}
            format="currency"
            icon={<CurrencyDollarIcon className="h-5 w-5 text-gray-400" />}
          />
          <MetricCard
            title="インプレッション"
            value={metrics.totalImpressions}
            format="number"
            icon={<ChartBarIcon className="h-5 w-5 text-gray-400" />}
          />
          <MetricCard
            title="クリック数"
            value={metrics.totalClicks}
            format="number"
            icon={<ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />}
          />
          <MetricCard
            title="リーチ"
            value={metrics.totalReach}
            format="number"
            icon={<ShoppingCartIcon className="h-5 w-5 text-gray-400" />}
          />
        </div>
        
        {/* 追加メトリクス */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">平均CTR</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{metrics.avgCtr.toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">平均CPC</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">¥{metrics.avgCpc.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">平均CPM</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">¥{metrics.avgCpm.toFixed(0)}</div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kpi'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              KPI分析
            </button>
            <button
              onClick={() => setActiveTab('creative')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'creative'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              クリエイティブ分析
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comparison'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              比較分析
            </button>
            <button
              onClick={() => setActiveTab('fatigue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fatigue'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              疲労度分析
            </button>
          </nav>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'overview' && (
          <>
            {/* パフォーマンスチャート */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                パフォーマンス推移
              </h2>
              <PerformanceChart
                data={prepareChartData()}
                metrics={['cost', 'impressions', 'clicks']}
                height={400}
              />
            </div>

            {/* キャンペーン一覧 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  アクティブキャンペーン
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        キャンペーン名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        目的
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日予算
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        消化額
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            campaign.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.objective}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ¥{(campaign.dailyBudget || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ¥{(campaign.spend || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {campaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    アクティブなキャンペーンがありません
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'kpi' && (
          <KPIDashboard 
            insights={insights}
            ecforceOrders={ecforceOrders}
            conversionValue={10000} // 1CV = 10,000円（後で設定可能にする）
            dateRange={syncStatus?.dateRange}
            showComparison={false}
          />
        )}

        {activeTab === 'creative' && (
          <CreativePerformance 
            insights={insights}
            dateRange={syncStatus?.dateRange ? {
              start: syncStatus.dateRange.earliest || '',
              end: syncStatus.dateRange.latest || ''
            } : undefined}
            aggregationPeriod={creativeAggregationPeriod}
            onPeriodChange={setCreativeAggregationPeriod}
          />
        )}

        {activeTab === 'comparison' && (
          <ComparisonDashboard insights={insights} />
        )}

        {activeTab === 'fatigue' && (
          <FatigueDashboardErrorBoundary>
            <FatigueDashboard 
              accountId={manager.getActiveAccount()?.accountId || 'test-account-001'} 
            />
          </FatigueDashboardErrorBoundary>
        )}
      </div>
      
      {/* デバッグツール（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && manager.getActiveAccount() && (
        <DataHistoryViewer accountId={manager.getActiveAccount()!.accountId} />
      )}
    </div>
  )
}