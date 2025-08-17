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
import { MetricCard } from '../components/metrics/MetricCard'
import { PerformanceChart } from '../components/charts/PerformanceChart'

export const MetaDashboardReal: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => new MetaAccountManager())
  const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' })
  
  // データ状態
  const [campaigns, setCampaigns] = useState<MetaCampaignData[]>([])
  const [insights, setInsights] = useState<MetaInsightsData[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<DataSyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' })
  // const [dateRange, setDateRange] = useState({
  //   start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  //   end: new Date().toISOString().split('T')[0]
  // })

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
    
    const service = manager.getActiveApiService()
    if (service) {
      setApiService(service)
      
      // キャッシュがない場合のみ初回データロード
      if (cachedData.length === 0) {
        loadData(service, false, 'initial')
      }
    }
  }, [manager, navigate])

  const loadData = async (service: MetaApiService, isUpdate: boolean = false, syncType: 'initial' | 'incremental' | 'full' = 'incremental') => {
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
      let dateOptions: any = {}
      let missingRanges: Array<{start: string, end: string}> = []
      
      if (syncType === 'full') {
        // 全同期：過去5年間すべて
        const until = new Date().toISOString().split('T')[0]
        const since = new Date()
        since.setFullYear(since.getFullYear() - 5) // 5年前に変更
        const sinceStr = since.toISOString().split('T')[0]
        
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
        console.log(`全同期モード(過去5年): ${missingRanges.length}ヶ月に分割`, sinceStr, 'から', until)
      } else if (syncType === 'incremental') {
        // 増分同期：欠損期間のみ
        const until = new Date().toISOString().split('T')[0]
        const since = lastUpdateTime ? 
          lastUpdateTime.toISOString().split('T')[0] :
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30日前
        
        missingRanges = MetaDataCache.findMissingDateRanges(accountId, since, until)
        console.log('増分同期モード:', missingRanges.length, '個の欠損期間を検出')
      } else {
        // 初回ロード：最近30日間
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
            limit: 500
          })
          
          allNewData.push(...rangeData)
          console.log(`期間 ${i + 1} 完了: ${rangeData.length}件 (累計: ${allNewData.length}件)`)
          
          // 進捗更新
          const progressPercent = Math.round(((i + 1) / missingRanges.length) * 80) + 10 // 10-90%の範囲
          setLoadingProgress({ 
            current: progressPercent, 
            total: 100, 
            message: `${i + 1}/${missingRanges.length} 期間完了 (累計: ${allNewData.length}件)` 
          })
          
          // API負荷軽減のための待機（最後のリクエスト以外）
          if (i < missingRanges.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)) // 0.5秒待機
          }
          
        } catch (rangeError) {
          console.error(`期間 ${range.start}-${range.end} の取得エラー:`, rangeError)
          // エラーがあっても続行
        }
      }
      
      console.log(`全期間のデータ取得完了: ${allNewData.length}件`)
      
      // キャッシュされたデータとマージ
      const cachedData = MetaDataCache.getInsights(accountId)
      const mergedData = MetaDataCache.mergeInsights(cachedData, allNewData)
      
      // キャッシュに保存
      MetaDataCache.saveInsights(accountId, mergedData)
      MetaDataCache.updateDateRange(accountId, mergedData)
      
      // UIを更新
      setInsights(mergedData)
      
      // キャンペーンデータは後で非同期取得（メインデータをブロックしない）
      console.log('メインデータ取得完了、キャンペーンデータはバックグラウンドで取得中...')
      
      // バックグラウンドでキャンペーンデータを取得
      setTimeout(async () => {
        try {
          console.log('キャンペーンデータの取得を開始...')
          const campaignInsights = await service.getInsights({
            level: 'campaign',
            datePreset: 'last_30d', // 短い期間でテスト
            fields: [
              'campaign_name',
              'campaign_id',
              'spend',
              'impressions',
              'clicks',
              'reach'
            ],
            limit: 50 // 小さなバッチサイズ
          })
          console.log(`キャンペーンインサイト取得完了: ${campaignInsights.length}件`)
        } catch (campaignError: any) {
          console.warn('キャンペーンデータの取得に失敗しました:', campaignError.message)
        }
      }, 2000) // 2秒後に実行
      
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
      setIsInitialLoad(false)
      
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
    if (apiService) {
      loadData(apiService, true, 'incremental')
    }
  }
  
  // 全同期機能
  const handleFullSync = async () => {
    if (!apiService) return
    
    if (!window.confirm('過去5年間のデータを全同期しますか？\nこの処理には数分かかる場合があります。')) {
      return
    }
    
    setIsSyncing(true)
    setSyncProgress({ current: 0, total: 100, message: '全同期を開始しています(過去5年間)...' })
    
    try {
      await loadData(apiService, false, 'full')
      setSyncProgress({ current: 100, total: 100, message: '全同期完了! 過去5年間のデータを取得しました。' })
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
      MetaDataCache.clearAccountCache(accountId)
      setInsights([])
      setSyncStatus(MetaDataCache.getSyncStatus(accountId))
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
      const date = insight.dateStart || new Date().toISOString().split('T')[0]
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 mb-4">データを読み込んでいます...</p>
          {loadingProgress.total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
              />
            </div>
          )}
          {loadingProgress.message && (
            <p className="text-sm text-gray-500">
              {loadingProgress.message} ({loadingProgress.current}/{loadingProgress.total})
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
                </div>
              )}
              
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
        
        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
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
      </div>
    </div>
  )
}