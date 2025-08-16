import React from 'react'
import { Flask, AlertCircle } from 'lucide-react'
import { ABTestAnalysis } from '../components/abtesting/ABTestAnalysis'
import { useECForceOrders } from '../hooks/useECForceOrders'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export const ABTestingAnalysis: React.FC = () => {
  const { orders, loading, error } = useECForceOrders()

  if (loading) {
    return <LoadingSpinner fullScreen message="A/Bテストデータを読み込み中..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Flask className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">A/Bテスト分析にはデータが必要です</p>
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
            <Flask className="h-8 w-8 mr-3 text-indigo-600" />
            A/Bテスト分析
          </h1>
          <p className="text-gray-600 mt-2">
            オファー、広告主、ランディングページの効果を統計的に分析
          </p>
        </div>

        {/* A/Bテスト分析コンポーネント */}
        <ABTestAnalysis orders={orders} />
      </div>
    </div>
  )
}