import React, { useState, useEffect } from 'react'
import { ECForceApiService, ECForceConfig, ECForceOrder, ECForceSalesData } from '../../services/ecforceApiService'
import { MetaInsightsData } from '../../services/metaApiService'
import {
  ShoppingCartIcon,
  CurrencyYenIcon,
  ChartBarIcon,
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface ECForceIntegrationProps {
  metaInsights: MetaInsightsData[]
  dateRange?: { start: string; end: string }
}

interface AttributionResult {
  matched_orders: number
  unmatched_orders: number
  total_revenue: number
  attributed_revenue: number
  true_roas: number
  campaigns: Array<{
    campaign_id: string
    campaign_name: string
    orders: number
    revenue: number
    ad_spend: number
    roas: number
  }>
}

export const ECForceIntegration: React.FC<ECForceIntegrationProps> = ({
  metaInsights,
  dateRange
}) => {
  const [config, setConfig] = useState<ECForceConfig | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<ECForceOrder[]>([])
  console.log('Orders:', orders) // TODO: ordersを使用する実装を追加
  const [salesData, setSalesData] = useState<ECForceSalesData[]>([])
  const [attributionResult, setAttributionResult] = useState<AttributionResult | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  
  // 保存された設定を読み込み
  useEffect(() => {
    const savedConfig = localStorage.getItem('ecforce_config')
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig) as ECForceConfig
      setConfig(parsed)
      setIsConnected(true)
    } else {
      setShowSettings(true)
    }
  }, [])

  // ECForce接続テスト
  const testConnection = async (testConfig: ECForceConfig) => {
    try {
      const service = new ECForceApiService(testConfig)
      await service.getProducts({ limit: 1 })
      return true
    } catch (error) {
      console.error('ECForce connection test failed:', error)
      return false
    }
  }

  // 設定の保存
  const saveConfig = async (newConfig: ECForceConfig) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const isValid = await testConnection(newConfig)
      if (!isValid) {
        throw new Error('ECForce APIへの接続に失敗しました。APIキーとショップIDを確認してください。')
      }
      
      localStorage.setItem('ecforce_config', JSON.stringify(newConfig))
      setConfig(newConfig)
      setIsConnected(true)
      setShowSettings(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 売上データの取得
  const fetchSalesData = async () => {
    if (!config || !dateRange) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const service = new ECForceApiService(config)
      
      // 注文データの取得
      const fetchedOrders = await service.getOrders({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 1000
      })
      setOrders(fetchedOrders)
      
      // 売上サマリーの取得
      const fetchedSales = await service.getSalesSummary({
        startDate: dateRange.start,
        endDate: dateRange.end,
        groupBy: 'day'
      })
      setSalesData(fetchedSales)
      
      // Meta広告データとの紐付け
      await performAttribution(fetchedOrders)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // アトリビューション分析
  const performAttribution = async (ecforceOrders: ECForceOrder[]) => {
    const campaignMap = new Map<string, {
      campaign_id: string
      campaign_name: string
      orders: ECForceOrder[]
      revenue: number
      ad_spend: number
    }>()
    
    let matchedCount = 0
    let unmatchedCount = 0
    let totalRevenue = 0
    let attributedRevenue = 0
    
    // 各注文をキャンペーンに紐付け
    ecforceOrders.forEach(order => {
      totalRevenue += order.total_amount
      
      // Facebook広告経由の注文を特定
      if (order.utm_source === 'facebook' && order.utm_campaign) {
        // キャンペーン名でマッチング
        const matchingInsights = metaInsights.filter(insight => 
          insight.campaign_name?.toLowerCase().includes(order.utm_campaign?.toLowerCase() || '')
        )
        
        if (matchingInsights.length > 0) {
          const insight = matchingInsights[0]
          const campaignId = insight.campaign_id || 'unknown'
          const campaignName = insight.campaign_name || order.utm_campaign
          
          if (!campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, {
              campaign_id: campaignId,
              campaign_name: campaignName,
              orders: [],
              revenue: 0,
              ad_spend: 0
            })
          }
          
          const campaign = campaignMap.get(campaignId)!
          campaign.orders.push(order)
          campaign.revenue += order.total_amount
          
          matchedCount++
          attributedRevenue += order.total_amount
        } else {
          unmatchedCount++
        }
      } else if (order.fbclid) {
        // Facebook Click IDでの紐付け（実装簡略化のため、現在は未対応）
        matchedCount++
        attributedRevenue += order.total_amount
      } else {
        unmatchedCount++
      }
    })
    
    // 各キャンペーンの広告費を集計
    campaignMap.forEach((campaign, campaignId) => {
      const campaignSpend = metaInsights
        .filter(insight => insight.campaign_id === campaignId)
        .reduce((sum, insight) => sum + Number(insight.spend || 0), 0)
      
      campaign.ad_spend = campaignSpend
    })
    
    // 結果を計算
    const campaigns = Array.from(campaignMap.values()).map(campaign => ({
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      orders: campaign.orders.length,
      revenue: campaign.revenue,
      ad_spend: campaign.ad_spend,
      roas: campaign.ad_spend > 0 ? campaign.revenue / campaign.ad_spend : 0
    }))
    
    const totalAdSpend = campaigns.reduce((sum, c) => sum + c.ad_spend, 0)
    
    setAttributionResult({
      matched_orders: matchedCount,
      unmatched_orders: unmatchedCount,
      total_revenue: totalRevenue,
      attributed_revenue: attributedRevenue,
      true_roas: totalAdSpend > 0 ? attributedRevenue / totalAdSpend : 0,
      campaigns: campaigns.sort((a, b) => b.revenue - a.revenue)
    })
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(num)
  }

  if (showSettings || !isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ECForce連携設定</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          saveConfig({
            apiKey: formData.get('apiKey') as string,
            shopId: formData.get('shopId') as string,
            apiEndpoint: formData.get('apiEndpoint') as string || undefined
          })
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <input
                type="password"
                name="apiKey"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="your-ecforce-api-key"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shop ID
              </label>
              <input
                type="text"
                name="shopId"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="your-shop-id"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                API Endpoint (オプション)
              </label>
              <input
                type="url"
                name="apiEndpoint"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="https://api.ecforce.jp/v1"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? '接続中...' : '接続'}
              </button>
              
              {isConnected && (
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 接続状態とアクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
              <ShoppingCartIcon className={`h-6 w-6 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">ECForce連携</h2>
              <p className="text-sm text-gray-500">
                {isConnected ? '接続済み' : '未接続'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={fetchSalesData}
              disabled={isLoading || !dateRange}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              売上データを同期
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              設定
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* 売上サマリー */}
      {salesData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">売上サマリー</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">総売上</p>
                <CurrencyYenIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(salesData.reduce((sum, d) => sum + d.total_sales, 0))}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">注文数</p>
                <ShoppingCartIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {salesData.reduce((sum, d) => sum + d.orders_count, 0).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">平均注文額</p>
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(
                  salesData.reduce((sum, d) => sum + d.total_sales, 0) /
                  salesData.reduce((sum, d) => sum + d.orders_count, 0)
                )}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">新規顧客</p>
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {salesData.reduce((sum, d) => sum + d.new_customers, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* アトリビューション結果 */}
      {attributionResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">アトリビューション分析</h3>
          
          {/* 概要 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">紐付け成功</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {attributionResult.matched_orders}件
              </p>
              <p className="text-sm text-blue-700 mt-1">
                売上: {formatCurrency(attributionResult.attributed_revenue)}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationCircleIcon className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">紐付け失敗</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {attributionResult.unmatched_orders}件
              </p>
              <p className="text-sm text-gray-700 mt-1">
                売上: {formatCurrency(attributionResult.total_revenue - attributionResult.attributed_revenue)}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">真のROAS</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {attributionResult.true_roas.toFixed(2)}x
              </p>
              <p className="text-sm text-green-700 mt-1">
                Meta広告経由の売上 / 広告費
              </p>
            </div>
          </div>
          
          {/* キャンペーン別詳細 */}
          {attributionResult.campaigns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">キャンペーン別パフォーマンス</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        キャンペーン
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        注文数
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        売上
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        広告費
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        ROAS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attributionResult.campaigns.map((campaign) => (
                      <tr key={campaign.campaign_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign.campaign_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {campaign.orders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(campaign.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(campaign.ad_spend)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <span className={`${campaign.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {campaign.roas.toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}