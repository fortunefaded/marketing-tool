import React, { useState, useEffect } from 'react'
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics'
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts'
import { RealtimeMetricCard } from '../components/realtime/RealtimeMetricCard'
import { RealtimeChart } from '../components/realtime/RealtimeChart'
import { AlertsPanel } from '../components/realtime/AlertsPanel'
import { ConnectionStatus } from '../components/realtime/ConnectionStatus'
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

export const RealtimeDashboard: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [alertFilter, setAlertFilter] = useState<string>('all')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const {
    metrics,
    isConnected,
    status,
    lastUpdate,
    error,
    connect,
    disconnect,
    resetMetrics
  } = useRealtimeMetrics({
    autoConnect: true
  })

  const {
    alerts,
    unreadCount,
    acknowledgeAlert,
    dismissAlert,
    clearAll
  } = useRealtimeAlerts({
    playSound: soundEnabled,
    severityFilter: alertFilter === 'all' ? undefined : [alertFilter as any]
  })

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
              <h1 className="text-2xl font-bold">リアルタイムダッシュボード</h1>
              <p className="text-sm text-gray-400">ライブデータ監視と即時アラート</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 接続状態 */}
              <ConnectionStatus status={status} />
              
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

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">接続エラー</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

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
          <RealtimeMetricCard
            title="売上"
            value={metrics.revenue}
            format="currency"
            icon={<CurrencyYenIcon className="h-6 w-6" />}
            trend={12.5}
          />
          <RealtimeMetricCard
            title="注文数"
            value={metrics.orders}
            format="number"
            icon={<ShoppingCartIcon className="h-6 w-6" />}
            trend={8.3}
          />
          <RealtimeMetricCard
            title="訪問者数"
            value={metrics.visitors}
            format="number"
            icon={<UserGroupIcon className="h-6 w-6" />}
            trend={-2.1}
          />
          <RealtimeMetricCard
            title="コンバージョン率"
            value={metrics.conversionRate}
            format="percentage"
            icon={<ChartBarIcon className="h-6 w-6" />}
            trend={0.5}
          />
          <RealtimeMetricCard
            title="平均注文額"
            value={metrics.averageOrderValue}
            format="currency"
            icon={<CurrencyYenIcon className="h-6 w-6" />}
            trend={4.2}
          />
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
            <RealtimeChart
              title="売上推移"
              dataKey="revenue"
              color="#10b981"
              testId="realtime-revenue-chart"
            />
            <RealtimeChart
              title="注文数推移"
              dataKey="orders"
              color="#3b82f6"
              testId="realtime-orders-chart"
            />
            <RealtimeChart
              title="訪問者数推移"
              dataKey="visitors"
              color="#f59e0b"
              testId="realtime-visitors-chart"
            />
          </div>

          {/* アラートパネル */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <BellIcon className="h-5 w-5 mr-2" />
                  アラート
                  {unreadCount > 0 && (
                    <span 
                      className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full"
                      data-testid="alert-badge"
                    >
                      {unreadCount}
                    </span>
                  )}
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
              
              <AlertsPanel
                alerts={alerts}
                onAcknowledge={acknowledgeAlert}
                onDismiss={dismissAlert}
                onClearAll={clearAll}
              />
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