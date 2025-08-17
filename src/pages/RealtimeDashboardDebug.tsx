import React, { useState, useEffect } from 'react'
import { 
  CurrencyYenIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  ArrowsPointingOutIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const RealtimeDashboardDebug: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [alertFilter, setAlertFilter] = useState<string>('all')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // ダミーデータ
  const metrics = {
    revenue: 150000,
    orders: 320,
    visitors: 8500,
    conversionRate: 3.76,
    averageOrderValue: 468.75
  }

  const isConnected = false
  const status = 'disconnected' as const
  const lastUpdate = new Date()
  const error = null
  const connect = () => Promise.resolve()
  const disconnect = () => {}
  const resetMetrics = () => {}

  const alerts: any[] = []
  const unreadCount = 0
  const acknowledgeAlert = () => {}
  const dismissAlert = () => {}
  const clearAll = () => {}

  // 全画面切り替え
  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    setFullscreen(!fullscreen)
  }

  // 全画面イベントリスナー
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleReset = () => {
    setShowResetConfirm(true)
  }

  const confirmReset = () => {
    resetMetrics()
    setShowResetConfirm(false)
  }

  return (
    <div 
      data-testid="realtime-dashboard"
      className={`min-h-screen bg-gray-900 text-white ${fullscreen ? 'fullscreen' : ''}`}
    >
      {/* ヘッダー */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold">リアルタイムダッシュボード（デバッグ版）</h1>
              <p className="text-sm text-gray-400">ライブデータ監視と即時アラート</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 接続状態 */}
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                <span className="text-sm text-gray-300">切断中</span>
              </div>
              
              {/* 設定 */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="mr-2"
                    aria-label="自動更新"
                  />
                  <span className="text-sm">自動更新</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="mr-2"
                    aria-label="アラート音"
                  />
                  <SpeakerWaveIcon className="h-4 w-4" />
                </label>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-700 rounded"
                  aria-label="全画面表示"
                >
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 再接続ボタン */}
        {!isConnected && (
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={connect}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              再接続
            </button>
          </div>
        )}

        {/* メトリクスカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400">
                <CurrencyYenIcon className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">売上</h3>
            <p className="text-2xl font-bold">¥{metrics.revenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400">
                <ShoppingCartIcon className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">注文数</h3>
            <p className="text-2xl font-bold">{metrics.orders.toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400">
                <UserGroupIcon className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">訪問者数</h3>
            <p className="text-2xl font-bold">{metrics.visitors.toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400">
                <ChartBarIcon className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">コンバージョン率</h3>
            <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400">
                <CurrencyYenIcon className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">平均注文額</h3>
            <p className="text-2xl font-bold">¥{Math.round(metrics.averageOrderValue).toLocaleString()}</p>
          </div>
        </div>

        {/* 最終更新とリセット */}
        <div className="flex items-center justify-between mb-6 text-sm text-gray-400">
          <div>
            {lastUpdate && (
              <span>
                最終更新: {format(lastUpdate, 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
              </span>
            )}
          </div>
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-white transition-colors"
          >
            リセット
          </button>
        </div>

        {/* チャートとアラート */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* リアルタイムチャート */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">売上推移</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                チャートプレースホルダー
              </div>
            </div>
          </div>

          {/* アラートパネル */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <BellIcon className="h-5 w-5 mr-2" />
                  アラート
                </h2>
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value)}
                  className="bg-gray-700 text-sm rounded px-2 py-1"
                  aria-label="アラートフィルター"
                >
                  <option value="all">すべて</option>
                  <option value="critical">重大</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              
              <div className="text-center py-8 text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>アラートはありません</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* リセット確認ダイアログ */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-4">メトリクスをリセットしますか？</h3>
            <p className="text-gray-400 mb-6">
              すべてのメトリクスがゼロにリセットされます。この操作は取り消せません。
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                キャンセル
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}