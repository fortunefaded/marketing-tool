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
import { MetricCard } from '../components/metrics/MetricCard'
import { PerformanceChart } from '../components/charts/PerformanceChart'

export const MetaDashboardReal: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => new MetaAccountManager())
  const [apiService, setApiService] = useState<MetaApiService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // データ状態
  const [campaigns, setCampaigns] = useState<MetaCampaignData[]>([])
  const [insights, setInsights] = useState<MetaInsightsData[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
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
    
    const service = manager.getActiveApiService()
    if (service) {
      setApiService(service)
      loadData(service)
    }
  }, [manager, navigate])

  const loadData = async (service: MetaApiService, isUpdate: boolean = false) => {
    setIsLoading(true)
    if (!isUpdate) {
      setError(null) // 初回ロード時のみエラーをクリア
    }
    
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
      if (isUpdate && lastUpdateTime) {
        // 更新時：最後の更新から今日まで
        const since = lastUpdateTime.toISOString().split('T')[0]
        const until = new Date().toISOString().split('T')[0]
        dateOptions = {
          dateRange: { since, until }
        }
        console.log('更新データを取得:', since, 'から', until)
      } else {
        // 初回ロード：過去2年間のデータ
        const until = new Date()
        const since = new Date()
        since.setFullYear(since.getFullYear() - 2) // 2年前
        
        dateOptions = {
          dateRange: {
            since: since.toISOString().split('T')[0],
            until: until.toISOString().split('T')[0]
          }
        }
        console.log('過去2年間のデータを取得:', dateOptions.dateRange.since, 'から', dateOptions.dateRange.until)
      }
      
      // インサイトデータの取得（日別）
      const insightsData = await service.getInsights({
        level: 'account',
        ...dateOptions,
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
        time_increment: '1', // 1日単位で集計
        limit: 1000
      })
      console.log(`インサイトデータ取得完了: ${insightsData.length}件`)
      
      if (isUpdate && insights.length > 0) {
        // 更新時：既存データとマージ
        const existingDates = new Set(insights.map(i => i.dateStart))
        const newData = insightsData.filter(i => !existingDates.has(i.dateStart))
        setInsights([...insights, ...newData])
        console.log(`新規データ${newData.length}件を追加`)
      } else {
        setInsights(insightsData)
      }
      
      // キャンペーン別のインサイトデータも取得（オプションアル）
      try {
        const campaignInsights = await service.getInsights({
          level: 'campaign',
          ...dateOptions,
          fields: [
            'campaign_name',
            'campaign_id',
            'spend',
            'impressions',
            'clicks',
            'reach',
            'cpm',
            'cpc',
            'ctr'
          ],
          time_increment: '1', // キャンペーン別も日毎に取得
          limit: 1000
        })
        console.log(`キャンペーンインサイト取得完了: ${campaignInsights.length}件`)
      } catch (campaignError) {
        console.warn('キャンペーンインサイトの取得に失敗しましたが、メインデータは取得できました:', campaignError)
      }
      
      setLastUpdateTime(new Date())
      setIsInitialLoad(false)
      
    } catch (err: any) {
      console.error('Failed to load data:', err)
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        details: err.details,
        statusCode: err.statusCode
      })
      
      // データが一部取得できている場合はエラーを表示しない
      if (insights.length > 0) {
        console.warn('一部データの取得に失敗しましたが、メインデータは表示できます')
        return // エラーを表示せずに終了
      }
      
      // 権限エラーの場合はより分かりやすいメッセージを表示
      if (err.code === 200 || err.code === 'PERMISSION_ERROR' || err.details?.error?.code === 200 || err.message?.includes('ads_management') || err.message?.includes('ads_read')) {
        const accountInfo = manager.getActiveAccount()
        setError(
          `広告データへのアクセス権限がありません。\n` +
          `アカウント: ${accountInfo?.fullAccountId || 'Unknown'}\n` +
          `Graph API Explorerで「ads_read」と「ads_management」権限を追加して新しいトークンを生成してください。\n` +
          `エラー詳細: ${err.message || 'No details available'}`
        )
      } else {
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    } finally {
      setIsLoading(false)
      // データが正常に取得できた場合はエラーをクリア
      if (insights.length > 0) {
        setError(null)
      }
    }
  }

  const handleRefresh = () => {
    if (apiService) {
      loadData(apiService, true) // 更新フラグをtrueに
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
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">データを読み込んでいます...</p>
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
              {lastUpdateTime && (
                <span className="text-sm text-gray-500">
                  最終更新: {lastUpdateTime.toLocaleString('ja-JP')}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isInitialLoad ? 'データをロード' : '最新データを取得'}
              </button>
              <a
                href="/meta-api-setup"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                アカウント管理
              </a>
            </div>
          </div>
        </div>

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