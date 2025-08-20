/* eslint-env browser */
import React, { useState, useEffect } from 'react'
import { localDB } from '../../services/localDataStore'
import { storageManager } from '../../services/localStorageManager'
import {
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface StorageInfo {
  used: number
  quota: number
  percentage: number
  counts: {
    creatives: number
    insights: number
    campaigns: number
    total: number
  }
}

export const DataManagement: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null)

  // ストレージ情報を取得
  const loadStorageInfo = async () => {
    try {
      const info = await localDB.getStorageInfo()
      setStorageInfo(info)

      // 最後のクリーンアップ時刻を取得
      const cleanupTime = storageManager.getSettings<number>('lastCleanup')
      if (cleanupTime) {
        setLastCleanup(new Date(cleanupTime))
      }
    } catch (error) {
      console.error('ストレージ情報の取得に失敗:', error)
    }
  }

  useEffect(() => {
    loadStorageInfo()
  }, [])

  // キャッシュクリア
  const handleClearCache = async () => {
    if (!confirm('ローカルキャッシュをすべて削除しますか？この操作は取り消せません。')) {
      return
    }

    setLoading(true)
    try {
      // IndexedDBをクリア
      await localDB.delete()
      await localDB.open()

      // LocalStorage/SessionStorageをクリア
      storageManager.clearAll()

      alert('キャッシュをクリアしました')
      await loadStorageInfo()
    } catch (error) {
      console.error('キャッシュのクリアに失敗:', error)
      alert('キャッシュのクリアに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 古いデータのクリーンアップ
  const handleCleanup = async () => {
    setLoading(true)
    try {
      await localDB.cleanup(30) // 30日以上前のデータを削除
      storageManager.saveSettings('lastCleanup', Date.now())

      alert('古いデータをクリーンアップしました')
      await loadStorageInfo()
      setLastCleanup(new Date())
    } catch (error) {
      console.error('クリーンアップに失敗:', error)
      alert('クリーンアップに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // データエクスポート
  const handleExport = async () => {
    setLoading(true)
    try {
      const allData = await localDB.exportAllData()
      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `marketing_data_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('エクスポートに失敗:', error)
      alert('データのエクスポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // データインポート
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!confirm('既存のデータが上書きされる可能性があります。続行しますか？')) {
        return
      }

      await localDB.importData(data)
      alert('データをインポートしました')
      await loadStorageInfo()
    } catch (error) {
      console.error('インポートに失敗:', error)
      alert('データのインポートに失敗しました。ファイル形式を確認してください。')
    } finally {
      setLoading(false)
      event.target.value = '' // inputをリセット
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">ローカルデータ管理</h2>

      {/* ストレージ情報 */}
      {storageInfo && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CircleStackIcon className="h-5 w-5 mr-2" />
            ストレージ使用状況
          </h3>

          <div className="space-y-4">
            {/* 使用量バー */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>使用容量</span>
                <span>
                  {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storageInfo.percentage > 80
                      ? 'bg-red-600'
                      : storageInfo.percentage > 60
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                使用率: {storageInfo.percentage.toFixed(1)}%
              </p>
            </div>

            {/* データ件数 */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-gray-600">クリエイティブ</p>
                <p className="text-lg font-semibold">
                  {storageInfo.counts.creatives.toLocaleString()}件
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-gray-600">インサイト</p>
                <p className="text-lg font-semibold">
                  {storageInfo.counts.insights.toLocaleString()}件
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-gray-600">キャンペーン</p>
                <p className="text-lg font-semibold">
                  {storageInfo.counts.campaigns.toLocaleString()}件
                </p>
              </div>
            </div>

            {/* 警告 */}
            {storageInfo.percentage > 80 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">ストレージ容量が不足しています</p>
                  <p>古いデータをクリーンアップするか、不要なデータを削除してください。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 最終クリーンアップ */}
      {lastCleanup && (
        <div className="mb-6 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-800">
            最終クリーンアップ: {lastCleanup.toLocaleDateString('ja-JP')}{' '}
            {lastCleanup.toLocaleTimeString('ja-JP')}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleCleanup}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ClockIcon className="h-5 w-5" />
          古いデータをクリーンアップ
        </button>

        <button
          onClick={handleClearCache}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon className="h-5 w-5" />
          すべてのキャッシュをクリア
        </button>

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          データをエクスポート
        </button>

        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 cursor-pointer">
          <ArrowUpTrayIcon className="h-5 w-5" />
          データをインポート
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            処理中...
          </div>
        </div>
      )}
    </div>
  )
}
