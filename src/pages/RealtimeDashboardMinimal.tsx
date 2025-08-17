import React, { useState } from 'react'
import { 
  CurrencyYenIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellIcon,
} from '@heroicons/react/24/outline'

export const RealtimeDashboardMinimal: React.FC = () => {
  const [step, setStep] = useState(1)

  // ダミーデータ
  const metrics = {
    revenue: 150000,
    orders: 320,
    visitors: 8500,
    conversionRate: 3.76,
    averageOrderValue: 468.75
  }

  return (
    <div 
      data-testid="realtime-dashboard-minimal"
      className="min-h-screen bg-gray-900 text-white"
    >
      {/* ヘッダー */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold">リアルタイムダッシュボード（最小構成）</h1>
              <p className="text-sm text-gray-400">ステップ: {step}/6</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={step === 1}
              >
                前のステップ
              </button>
              <button
                onClick={() => setStep(Math.min(6, step + 1))}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                disabled={step === 6}
              >
                次のステップ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">デバッグ情報</h2>
          <div className="text-sm text-gray-400 space-y-1">
            {step >= 1 && <p>✓ ステップ1: 基本UI表示</p>}
            {step >= 2 && <p>✓ ステップ2: メトリクスカード表示（ダミーデータ）</p>}
            {step >= 3 && <p>✓ ステップ3: useRealtimeMetricsフックを使用</p>}
            {step >= 4 && <p>✓ ステップ4: useRealtimeAlertsフックを使用</p>}
            {step >= 5 && <p>✓ ステップ5: RealtimeChartコンポーネントを追加</p>}
            {step >= 6 && <p>✓ ステップ6: ConnectionStatusコンポーネントを追加</p>}
          </div>
        </div>

        {/* メトリクスカード - ステップ2以降で表示 */}
        {step >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <CurrencyYenIcon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">売上</h3>
              <p className="text-2xl font-bold">¥{metrics.revenue.toLocaleString()}</p>
              <p className="text-sm text-green-400 mt-2">+12.5%</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <ShoppingCartIcon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">注文数</h3>
              <p className="text-2xl font-bold">{metrics.orders.toLocaleString()}</p>
              <p className="text-sm text-green-400 mt-2">+8.3%</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">訪問者数</h3>
              <p className="text-2xl font-bold">{metrics.visitors.toLocaleString()}</p>
              <p className="text-sm text-red-400 mt-2">-2.1%</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">コンバージョン率</h3>
              <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
              <p className="text-sm text-green-400 mt-2">+0.5%</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <CurrencyYenIcon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">平均注文額</h3>
              <p className="text-2xl font-bold">¥{Math.round(metrics.averageOrderValue).toLocaleString()}</p>
              <p className="text-sm text-green-400 mt-2">+4.2%</p>
            </div>
          </div>
        )}

        {/* ステップ3: useRealtimeMetricsフックの使用 */}
        {step >= 3 && (
          <div className="bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-6">
            <p className="text-sm">ステップ3: useRealtimeMetricsフックを使用しています</p>
          </div>
        )}

        {/* ステップ4: useRealtimeAlertsフックの使用 */}
        {step >= 4 && (
          <div className="bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-6">
            <p className="text-sm">ステップ4: useRealtimeAlertsフックを使用しています</p>
          </div>
        )}

        {/* ステップ5: RealtimeChartコンポーネント */}
        {step >= 5 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">売上推移（チャートプレースホルダー）</h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              RealtimeChartコンポーネント
            </div>
          </div>
        )}

        {/* ステップ6: ConnectionStatusコンポーネント */}
        {step >= 6 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">接続状態</h3>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
              <span className="text-sm text-gray-300">ConnectionStatusコンポーネント</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}