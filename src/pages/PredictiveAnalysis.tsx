import React, { useState } from 'react'
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react'
import { SalesPrediction } from '../components/predictions/SalesPrediction'
import { ChurnPrediction } from '../components/predictions/ChurnPrediction'
import { useECForceOrders } from '../hooks/useECForceOrders'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export const PredictiveAnalysis: React.FC = () => {
  const { orders, loading, error } = useECForceOrders()
  const [activeTab, setActiveTab] = useState<'sales' | 'churn'>('sales')

  if (loading) {
    return <LoadingSpinner fullScreen message="予測分析データを読み込み中..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">予測分析にはデータが必要です</p>
          <p className="text-sm text-gray-500 mt-2">
            EC Forceデータをインポートしてください
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="h-8 w-8 mr-3 text-indigo-600" />
            予測分析
          </h1>
          <p className="text-gray-600 mt-2">
            機械学習モデルを使用した売上予測と顧客離脱リスク分析
          </p>
        </div>

        {/* タブ */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('sales')}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'sales'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <TrendingUp className="h-4 w-4 inline-block mr-2" />
                売上予測
              </button>
              <button
                onClick={() => setActiveTab('churn')}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'churn'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                チャーン予測
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="space-y-6">
          {activeTab === 'sales' ? (
            <SalesPrediction orders={orders} predictionDays={30} />
          ) : (
            <ChurnPrediction orders={orders} />
          )}
        </div>
      </div>
    </div>
  )
}