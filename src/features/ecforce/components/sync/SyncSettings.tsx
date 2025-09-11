import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

export const SyncSettings: React.FC = () => {
  const config = useQuery(api.ecforce.getSyncConfig)
  const updateConfig = useMutation(api.ecforce.updateSyncConfig)

  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState('daily')
  const [time, setTime] = useState('06:00')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setFrequency(config.schedule.frequency)
      setTime(config.schedule.time)
    }
  }, [config])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      await updateConfig({
        enabled,
        schedule: {
          frequency,
          time,
          timezone: 'Asia/Tokyo',
        },
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('設定保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getNextRunTime = () => {
    if (!enabled || !config?.schedule.nextRun) {
      return null
    }
    return format(new Date(config.schedule.nextRun), 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  const getLastRunTime = () => {
    if (!config?.schedule.lastRun) {
      return '未実行'
    }
    return format(new Date(config.schedule.lastRun), 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  return (
    <div className="space-y-6">
      {/* 自動同期設定 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">自動同期設定</h3>
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">タイムゾーン: Asia/Tokyo</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* 有効/無効 */}
          <div className="flex items-center justify-between">
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              自動同期を有効にする
            </label>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${enabled ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* 頻度設定 */}
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
              同期頻度
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={!enabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
            >
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </select>
          </div>

          {/* 時刻設定 */}
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              実行時刻
            </label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!enabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">日本時間（JST）で設定してください</p>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : saveSuccess ? (
              <>
                <CheckIcon className="mr-2 h-4 w-4" />
                保存しました
              </>
            ) : (
              '設定を保存'
            )}
          </button>
        </div>
      </div>

      {/* 実行ステータス */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">実行ステータス</h3>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-sm font-medium text-gray-500">最終実行日時</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{getLastRunTime()}</dd>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-sm font-medium text-gray-500">次回実行予定</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {enabled ? getNextRunTime() || '計算中...' : '無効'}
            </dd>
          </div>
        </dl>
      </div>

      {/* 注意事項 */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-900">注意事項</h4>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
          <li>自動同期を有効にすると、指定した時刻にECForceからデータを自動取得します</li>
          <li>CSVファイルは事前に指定されたディレクトリに配置しておく必要があります</li>
          <li>同期処理中はシステムに負荷がかかる可能性があります</li>
          <li>エラーが発生した場合は、インポート履歴で詳細を確認できます</li>
        </ul>
      </div>
    </div>
  )
}
