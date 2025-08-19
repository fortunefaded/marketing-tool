import React, { useState, useEffect } from 'react'
import { Link, Filter } from 'lucide-react'
import { ECForceOrder } from '../types/ecforce'
import { AddToFavoriteButton } from '../components/favorites/AddToFavoriteButton'
import { useMemoryOptimization } from '../hooks/useMemoryOptimization'
import { useECForceData } from '../hooks/useECForceData'
import { AdvancedFilter } from '../components/filters/AdvancedFilter'
import { ROASAnalysis } from '../components/integrated/ROASAnalysis'
import { CohortAnalysis } from '../components/integrated/CohortAnalysis'
import { RFMAnalysis } from '../components/integrated/RFMAnalysis'
import { BasketAnalysis } from '../components/integrated/BasketAnalysis'
import { LTVAnalysis } from '../components/integrated/LTVAnalysis'
import { CrossChannelKPIs } from '../components/integrated/CrossChannelKPIs'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export const IntegratedDashboard: React.FC = () => {
  console.log('IntegratedDashboard component rendering')
  const [activeTab, setActiveTab] = useState<'overview' | 'roas' | 'cohort' | 'rfm' | 'basket' | 'ltv'>('overview')
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filteredOrders, setFilteredOrders] = useState<ECForceOrder[]>([])
  
  // ConvexからECForceデータを取得
  const { orders: ecforceOrders, isLoading: ordersLoading } = useECForceData()
  
  // フィルター適用時の処理
  useEffect(() => {
    setFilteredOrders(ecforceOrders)
  }, [ecforceOrders])
  
  // Meta広告データ（モック）
  const [metaAdData] = useState({
    campaigns: [
      {
        id: '1',
        name: 'ナハト製品キャンペーン',
        spend: 150000,
        impressions: 500000,
        clicks: 5000,
        conversions: 150,
        dateRange: '2025/08/01 - 2025/08/10'
      },
      {
        id: '2',
        name: 'インハウス限定オファー',
        spend: 200000,
        impressions: 600000,
        clicks: 6000,
        conversions: 180,
        dateRange: '2025/08/01 - 2025/08/10'
      }
    ],
    totalSpend: 350000,
    totalConversions: 330
  })

  // タブ切り替え時のローディングアニメーション
  const handleTabChange = (tab: typeof activeTab) => {
    setIsTabLoading(true)
    setActiveTab(tab)
    
    // タブ内容の描画完了を待つ
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsTabLoading(false)
      }, 100)
    })
  }

  const tabs = [
    { id: 'overview', name: '統合概要', description: 'クロスチャネルKPI' },
    { id: 'roas', name: 'ROAS分析', description: '広告費用対効果' },
    { id: 'cohort', name: 'コホート分析', description: '顧客の時系列行動' },
    { id: 'rfm', name: 'RFM分析', description: '顧客セグメント' },
    { id: 'basket', name: 'バスケット分析', description: '商品の関連性' },
    { id: 'ltv', name: 'LTV分析', description: '顧客生涯価値' }
  ]

  // デバッグ用に最初にシンプルな表示
  if (!ecforceOrders) {
    return <div>Loading initial data...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Link className="mr-3 h-8 w-8 text-indigo-600" />
              統合分析ダッシュボード
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Meta広告とEC Forceデータを統合した高度な分析
            </p>
          </div>
          <AddToFavoriteButton
            analysisName={`統合分析ダッシュボード - ${tabs.find(t => t.id === activeTab)?.name || '統合概要'}`}
            analysisType={activeTab === 'roas' ? 'roas' : activeTab === 'cohort' ? 'cohort' : activeTab === 'rfm' ? 'rfm' : activeTab === 'basket' ? 'basket' : activeTab === 'ltv' ? 'ltv' : 'custom'}
            route={`/integrated-dashboard#${activeTab}`}
            description={tabs.find(t => t.id === activeTab)?.description}
            filters={{ activeTab, showAdvancedFilter }}
          />
        </div>
      </div>

      {/* フィルターボタン */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
        >
          <Filter className="h-4 w-4 mr-2" />
          高度なフィルター
        </button>
      </div>
      
      {/* 高度なフィルター */}
      {showAdvancedFilter && (
        <div className="mb-6">
          <AdvancedFilter
            orders={ecforceOrders}
            onFilterChange={setFilteredOrders}
            onClose={() => setShowAdvancedFilter(false)}
          />
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div>{tab.name}</div>
              <div className="text-xs font-normal">{tab.description}</div>
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツエリア */}
      <div className="mt-6">
        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" message="データを読み込んでいます..." />
          </div>
        ) : isTabLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="medium" message="分析を準備しています..." />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <CrossChannelKPIs
                ecforceOrders={filteredOrders}
                metaAdData={metaAdData}
              />
            )}
            
            {activeTab === 'roas' && (
              <ROASAnalysis
                ecforceOrders={filteredOrders}
                metaAdData={metaAdData}
              />
            )}
            
            {activeTab === 'cohort' && (
              <CohortAnalysis orders={filteredOrders} />
            )}
            
            {activeTab === 'rfm' && (
              <RFMAnalysis orders={filteredOrders} />
            )}
            
            {activeTab === 'basket' && (
              <BasketAnalysis orders={filteredOrders} />
            )}
            
            {activeTab === 'ltv' && (
              <LTVAnalysis orders={filteredOrders} />
            )}
          </>
        )}
      </div>
    </div>
  )
}