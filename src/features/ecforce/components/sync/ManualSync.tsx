import React, { useState } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import {
  PlayIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const ManualSync: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'downloading' | 'uploading' | 'success' | 'error'>(
    'idle'
  )
  const [message, setMessage] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')

  // 最新のインポート履歴を取得
  const latestImport = useQuery(api.ecforce.getImportHistory, { limit: 1 })

  // 同期後のデータを取得
  const latestData = useQuery(
    api.ecforce.getPerformanceData,
    syncResult?.importId ? { limit: 10 } : 'skip'
  )

  // Convexのテスト同期mutationを使用
  const runTestSync = useMutation(api.ecforceTestSync.runTestSync)

  const handleManualSync = async () => {
    setIsRunning(true)
    setStatus('downloading')
    setMessage('ECForceからCSVファイルをダウンロード中...')
    setProgress(25)

    try {
      // 実際のAPIサーバーを呼び出す（開発環境用）
      const useRealSync = true // 本番フラグ

      if (useRealSync) {
        // 実際のECForce同期を実行
        const response = await fetch('/api/ecforce/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'manual-sync',
            uploadToConvex: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`同期に失敗しました: ${response.statusText}`)
        }

        setStatus('uploading')
        setMessage('Convexデータベースにアップロード中...')
        setProgress(75)

        const result = await response.json()

        if (result.success) {
          setStatus('success')
          setMessage(`同期が完了しました！ ${result.recordsProcessed || 0}件のデータを処理しました`)
          setProgress(100)
          setSyncResult({ ...result, importId: `manual_${Date.now()}` })

          // 通知を表示
          showSyncNotification(
            `✅ 同期が完了しました！\n${result.recordsProcessed || 0}件のデータを処理しました`
          )

          // 3秒後にデータを再取得
          setTimeout(() => {
            window.location.reload()
          }, 3000)
        } else {
          throw new Error(result.error || '同期処理でエラーが発生しました')
        }
      } else {
        // テストモード（Convexのmutationを実行）
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setStatus('uploading')
        setMessage('Convexデータベースにアップロード中...')
        setProgress(75)

        const result = await runTestSync()

        if (result.success) {
          setStatus('success')
          setMessage(`同期が完了しました！ ${result.recordsProcessed || 0}件のデータを処理しました`)
          setProgress(100)
          setSyncResult(result)

          // 通知を表示
          showSyncNotification(
            `✅ 同期が完了しました！\n${result.recordsProcessed || 0}件のデータを処理しました`
          )
        } else {
          throw new Error('同期処理でエラーが発生しました')
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '予期しないエラーが発生しました')
      setProgress(0)

      // エラー通知を表示
      showSyncNotification(
        `❌ 同期エラー\n${error instanceof Error ? error.message : '予期しないエラーが発生しました'}`,
        true
      )
    } finally {
      setIsRunning(false)

      // 3秒後にステータスをリセット
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
        setProgress(0)
      }, 5000)
    }
  }

  // 通知を表示する関数
  const showSyncNotification = (msg: string, isError = false) => {
    setNotificationMessage(msg)
    setShowNotification(true)

    // 音声通知（可能な場合）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ECForce同期', {
        body: msg.replace(/[✅❌]/g, ''),
        icon: isError ? '❌' : '✅',
      })
    }

    // 5秒後に通知を非表示
    setTimeout(() => {
      setShowNotification(false)
    }, 5000)
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'downloading':
        return <ArrowDownTrayIcon className="h-5 w-5 animate-pulse" />
      case 'uploading':
        return <ArrowUpTrayIcon className="h-5 w-5 animate-pulse" />
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <PlayIcon className="h-5 w-5" />
    }
  }

  const getButtonClass = () => {
    const baseClass =
      'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2'

    switch (status) {
      case 'success':
        return `${baseClass} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`
      case 'error':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`
      case 'downloading':
      case 'uploading':
        return `${baseClass} bg-blue-600 text-white cursor-not-allowed opacity-75`
      default:
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`
    }
  }

  const formatLastImportTime = () => {
    if (!latestImport?.imports?.[0]) {
      return '履歴なし'
    }

    const lastImport = latestImport.imports[0]
    const date = lastImport.completedAt || lastImport.startedAt
    return format(new Date(date), 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow relative">
      {/* 通知バナー */}
      {showNotification && (
        <div className="absolute top-0 left-0 right-0 z-50 animate-slide-down">
          <div
            className={`mx-4 mt-4 rounded-lg px-4 py-3 shadow-lg ${
              notificationMessage.includes('❌')
                ? 'bg-red-100 border-red-500'
                : notificationMessage.includes('🗑️')
                  ? 'bg-yellow-100 border-yellow-500'
                  : 'bg-green-100 border-green-500'
            } border`}
          >
            <div className="flex items-center">
              <BellAlertIcon className="h-5 w-5 mr-2" />
              <span className="whitespace-pre-line text-sm font-medium">{notificationMessage}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">手動同期</h3>
        <p className="mt-1 text-sm text-gray-500">
          今すぐECForceからデータを取得してConvexデータベースに反映します
        </p>
      </div>

      {/* 実行ボタンとステータス */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button onClick={handleManualSync} disabled={isRunning} className={getButtonClass()}>
            {getStatusIcon()}
            <span className="ml-2">{isRunning ? '処理中...' : '今すぐ同期'}</span>
          </button>

          {/* 最終実行時刻 */}
          <div className="text-sm text-gray-500">最終実行: {formatLastImportTime()}</div>
        </div>

        {/* 進捗バー */}
        {isRunning && (
          <div className="w-full">
            <div className="mb-2 flex justify-between text-xs text-gray-600">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ステータスメッセージ */}
        {!isRunning && message && (
          <div
            className={`rounded-md p-3 ${
              status === 'success'
                ? 'bg-green-50 text-green-800'
                : status === 'error'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-blue-50 text-blue-800'
            }`}
          >
            <div className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2 text-sm">{message}</span>
            </div>
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-700">手動同期について</h4>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-gray-600">
          <li>昨日のデータを自動的に取得します</li>
          <li>処理には数分かかる場合があります</li>
          <li>重複データは新しいデータで上書きされます</li>
          <li>エラーが発生した場合は、インポート履歴で詳細を確認できます</li>
        </ul>
      </div>

      {/* 取得したデータの表示 */}
      {syncResult && latestData?.data && latestData.data.length > 0 && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h4 className="text-sm font-medium text-gray-900 mb-4">取得したデータ（最新10件）</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    日付
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    広告主
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    受注金額
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    売上金額
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    CV(受注)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    CV(決済)
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    CVR(受注)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {latestData.data.map((row: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {row.dataDate ? format(new Date(row.dataDate), 'MM/dd', { locale: ja }) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{row.advertiser || '-'}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {row.orderAmount ? `¥${row.orderAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {row.salesAmount ? `¥${row.salesAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {row.cvOrder || 0}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {row.cvPayment || 0}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {row.cvrOrder ? `${(row.cvrOrder * 100).toFixed(2)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-500">インポートID: {syncResult.importId}</div>
        </div>
      )}
    </div>
  )
}
