/**
 * 新しいMeta API実装のテストコンポーネント
 */

import { useInsights } from '../../hooks/core/useInsights'
import { useMetaApiCore } from '../../hooks/core/useMetaData'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { vibe } from '@/lib/vibelogger'

export function NewMetaApiTest() {
  const { isInitialized, error: initError } = useMetaApiCore()
  
  // テスト用のインサイトデータ取得
  const { data, loading, error, refetch } = useInsights({
    level: 'ad',
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    fields: ['ad_id', 'ad_name', 'impressions', 'clicks', 'spend']
  }, {
    enabled: false // 初期化が完了するまで無効化
  })

  // API統計情報を取得
  const stats = null // apiCore is currently null during migration

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">新しいMeta API実装テスト</h1>
      
      {/* 初期化状態 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">初期化状態</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isInitialized ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : initError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
            <span>
              {isInitialized ? '初期化完了' : initError ? `初期化エラー: ${initError.message}` : '初期化中...'}
            </span>
          </div>
        </div>
      </div>

      {/* API統計 */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">API統計</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      )}

      {/* データ取得結果 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">インサイトデータ取得テスト</h2>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>データ取得中...</span>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>エラー: {error.message}</span>
            </div>
            <pre className="text-xs overflow-auto bg-red-50 p-2 rounded">
              {JSON.stringify(error, null, 2)}
            </pre>
            <button 
              onClick={refetch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              再試行
            </button>
          </div>
        ) : data ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>成功: {data.length}件のデータを取得</span>
            </div>
            <div className="max-h-96 overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(data.slice(0, 5), null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div>データなし</div>
        )}
      </div>

      {/* デバッグ情報 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">デバッグ情報</h2>
        <div className="space-y-2 text-sm">
          <button 
            onClick={() => {
              const stats = (window as any).__metaApiStats?.()
              vibe.debug('API統計情報', { stats })
              alert('API統計情報をVibeloggerに出力しました')
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            API統計をコンソールに出力
          </button>
          <button 
            onClick={() => {
              vibe.warn('clearCache method is not available during migration')
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            キャッシュクリア
          </button>
        </div>
      </div>
    </div>
  )
}