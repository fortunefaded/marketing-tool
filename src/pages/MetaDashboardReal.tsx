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
  
  // データ状態
  const [campaigns, setCampaigns] = useState<MetaCampaignData[]>([])
  const [insights, setInsights] = useState<MetaInsightsData[]>([])
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

  const loadData = async (service: MetaApiService) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // キャンペーンデータの取得
      const campaignsData = await service.getCampaigns({ limit: 50 })
      setCampaigns(campaignsData)

      // インサイトデータの取得
      const insightsData = await service.getInsights({
        level: 'account',
        datePreset: 'last_30d',
        fields: [
          'spend',
          'impressions',
          'clicks',
          'conversions',
          'cpm',
          'cpc',
          'ctr'
        ]
      })
      setInsights(insightsData)
      
    } catch (err: any) {
      console.error('Failed to load data:', err)
      
      // 権限エラーの場合はより分かりやすいメッセージを表示
      if (err.code === 200 || err.message?.includes('ads_management') || err.message?.includes('ads_read')) {
        setError(
          '広告データへのアクセス権限がありません。' +
          'Graph API Explorerで「ads_read」と「ads_management」権限を追加して新しいトークンを生成してください。'
        )
      } else {
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (apiService) {
      loadData(apiService)
    }
  }

  // 集計データの計算
  const calculateMetrics = () => {
    const totalSpend = insights.reduce((sum, insight) => sum + Number(insight.spend || 0), 0)
    const totalImpressions = insights.reduce((sum, insight) => sum + Number(insight.impressions || 0), 0)
    const totalClicks = insights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0)
    const totalConversions = insights.reduce((sum, insight) => sum + Number(insight.conversions || 0), 0)
    
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    
    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      ctr,
      conversionRate,
      cpc
    }
  }

  const metrics = calculateMetrics()

  // チャートデータの準備
  const prepareChartData = () => {
    // 日付ごとにデータを集計
    const dataByDate = new Map<string, { cost: number; impressions: number; clicks: number; conversions: number }>()
    
    insights.forEach(insight => {
      const date = insight.dateStart || new Date().toISOString().split('T')[0]
      const existing = dataByDate.get(date) || { cost: 0, impressions: 0, clicks: 0, conversions: 0 }
      
      dataByDate.set(date, {
        cost: existing.cost + Number(insight.spend || 0),
        impressions: existing.impressions + Number(insight.impressions || 0),
        clicks: existing.clicks + Number(insight.clicks || 0),
        conversions: existing.conversions + Number(insight.conversions || 0)
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
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                更新
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
            title="コンバージョン"
            value={metrics.totalConversions}
            format="number"
            icon={<ShoppingCartIcon className="h-5 w-5 text-gray-400" />}
          />
        </div>
        
        {/* 追加メトリクス */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">CTR (クリック率)</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{metrics.ctr.toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">CVR (コンバージョン率)</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{metrics.conversionRate.toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">CPC (クリック単価)</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">¥{metrics.cpc.toFixed(0)}</div>
          </div>
        </div>

        {/* パフォーマンスチャート */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            パフォーマンス推移
          </h2>
          <PerformanceChart
            data={prepareChartData()}
            metrics={['cost', 'clicks', 'conversions']}
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