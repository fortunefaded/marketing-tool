import { useEffect, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface DebugInfo {
  dateRange: string
  apiRequest: {
    since: string
    until: string
    startISO: string
    endISO: string
  }
  apiResponse: {
    dataCount: number
    totalSpend: number
    maxImpressions: number
    maxImpressionsAd: string
    top5Ads: Array<{
      name: string
      impressions: number
      spend: number
    }>
  }
  timestamp: string
}

export function DateRangeDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    // ログを監視
    const originalLog = console.log
    const capturedLogs: string[] = []

    console.log = function (...args: any[]) {
      originalLog.apply(console, args)

      const logStr = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')

      // APIリクエスト・レスポンスのログをキャプチャ
      if (
        logStr.includes('Meta API Request') ||
        logStr.includes('Meta API Response') ||
        logStr.includes('日付範囲設定')
      ) {
        capturedLogs.push(logStr)

        // 最新のAPI情報を解析
        try {
          if (logStr.includes('Meta API Request')) {
            const match = logStr.match(/\{[\s\S]*\}/)
            if (match) {
              const data = JSON.parse(match[0])
              setDebugInfo(
                (prev) =>
                  ({
                    ...prev,
                    dateRange: data.dateRange || '',
                    apiRequest: {
                      since: data.timeRange?.since || '',
                      until: data.timeRange?.until || '',
                      startISO: data.debugDateInfo?.startDate?.iso || '',
                      endISO: data.debugDateInfo?.endDate?.iso || '',
                    },
                    timestamp: new Date().toLocaleTimeString('ja-JP'),
                  }) as DebugInfo
              )
            }
          }

          if (logStr.includes('Meta API Response')) {
            const match = logStr.match(/\{[\s\S]*\}/)
            if (match) {
              const data = JSON.parse(match[0])

              // 最大インプレッションを持つ広告を探す
              let maxImpressions = 0
              let maxImpressionsAd = ''
              const top5Ads: any[] = []

              if (data.firstItem) {
                // ログにfirstItemがある場合の処理
                maxImpressions = parseInt(data.firstItem.impressions || '0')
                maxImpressionsAd = data.firstItem.ad_name || ''
              }

              setDebugInfo(
                (prev) =>
                  ({
                    ...prev!,
                    apiResponse: {
                      dataCount: data.dataCount || 0,
                      totalSpend: data.totalSpend || 0,
                      maxImpressions,
                      maxImpressionsAd,
                      top5Ads,
                    },
                  }) as DebugInfo
              )
            }
          }
        } catch (e) {
          console.error('デバッグ情報の解析エラー:', e)
        }

        setLogs(capturedLogs.slice(-10)) // 最新10件のみ保持
      }
    }

    return () => {
      console.log = originalLog
    }
  }, [])

  // グローバル関数として公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).getDebugInfo = () => (debugInfo(window as any).getDebugLogs = () => logs)
    }
  }, [debugInfo, logs])

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-purple-700"
        >
          <span className="text-sm font-medium">デバッグ情報</span>
          <ChevronUpIcon className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[600px] overflow-hidden">
      <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">日付範囲デバッグ情報</h3>
        <button onClick={() => setIsExpanded(false)} className="hover:bg-purple-700 p-1 rounded">
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[500px]">
        {debugInfo ? (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <div className="text-xs text-gray-500">最終更新: {debugInfo.timestamp}</div>
              <div className="text-sm font-medium mt-1">
                選択: <span className="text-purple-600">{debugInfo.dateRange}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📅 APIリクエスト範囲</h4>
              <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                <div>
                  開始:{' '}
                  <span className="font-mono text-blue-600">{debugInfo.apiRequest.since}</span>
                </div>
                <div>
                  終了:{' '}
                  <span className="font-mono text-blue-600">{debugInfo.apiRequest.until}</span>
                </div>
                <div className="text-gray-500 mt-1">
                  <div>ISO開始: {debugInfo.apiRequest.startISO}</div>
                  <div>ISO終了: {debugInfo.apiRequest.endISO}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 APIレスポンス概要</h4>
              <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>データ件数:</span>
                  <span className="font-semibold">{debugInfo.apiResponse.dataCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span>合計広告費:</span>
                  <span className="font-semibold">
                    ¥{debugInfo.apiResponse.totalSpend.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>最大インプレッション:</span>
                  <span className="font-semibold text-red-600">
                    {debugInfo.apiResponse.maxImpressions.toLocaleString()}
                  </span>
                </div>
                {debugInfo.apiResponse.maxImpressionsAd && (
                  <div className="text-gray-600 text-xs mt-1">
                    広告: {debugInfo.apiResponse.maxImpressionsAd.substring(0, 30)}...
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">🔍 問題の診断</h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                {debugInfo.apiResponse.maxImpressions < 80594 ? (
                  <div className="text-yellow-800">
                    ⚠️ 最大インプレッション({debugInfo.apiResponse.maxImpressions.toLocaleString()}
                    )が 実際の値(80,594)より小さいです。
                    <br />
                    考えられる原因:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>日付範囲が正しくない</li>
                      <li>データの一部が取得できていない</li>
                      <li>フィルタリングの問題</li>
                    </ul>
                  </div>
                ) : (
                  <div className="text-green-700">✅ データが正しく取得されています</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 最新ログ</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-2 text-xs font-mono max-h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1 text-xs break-all">
                    {log.substring(0, 200)}...
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-2">
              <button
                onClick={() => {
                  console.log('=== FULL DEBUG INFO ===')
                  console.log(debugInfo)
                  console.log('=== ALL LOGS ===')
                  logs.forEach((log) => console.log(log))
                }}
                className="w-full bg-gray-600 text-white text-xs py-1 px-2 rounded hover:bg-gray-700"
              >
                コンソールに詳細を出力
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center py-4">
            日付範囲を変更するとデバッグ情報が表示されます
          </div>
        )}
      </div>
    </div>
  )
}
