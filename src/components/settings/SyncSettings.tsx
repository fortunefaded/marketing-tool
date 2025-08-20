import React, { useState, useEffect } from 'react'
import { 
  CogIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SyncSettingsProps {
  onSettingsChange?: (settings: SyncSettingsData) => void
}

export interface SyncSettingsData {
  maxMonths: number
  limitPerRequest: number
  skipCreatives: boolean
  debugMode: boolean
}

const DEFAULT_SETTINGS: SyncSettingsData = {
  maxMonths: 37, // フル同期のデフォルト
  limitPerRequest: 500, // 1リクエストあたりの最大件数
  skipCreatives: false, // クリエイティブ取得をスキップ
  debugMode: false // デバッグモード
}

const PRESET_OPTIONS = [
  { label: '1週間', months: 0.25, description: 'テスト用（最小）' },
  { label: '1ヶ月', months: 1, description: '開発用' },
  { label: '3ヶ月', months: 3, description: '四半期分析' },
  { label: '6ヶ月', months: 6, description: '半期分析' },
  { label: '1年', months: 12, description: '年次分析' },
  { label: '2年', months: 24, description: '長期分析' },
  { label: '3年（推奨）', months: 37, description: 'Meta APIの最大期間' },
]

export const SyncSettings: React.FC<SyncSettingsProps> = ({ onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<SyncSettingsData>(() => {
    // LocalStorageから設定を読み込み
    const saved = localStorage.getItem('meta_sync_settings')
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      } catch (e) {
        console.error('設定の読み込みエラー:', e)
      }
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    // 設定を保存
    localStorage.setItem('meta_sync_settings', JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  const updateSetting = <K extends keyof SyncSettingsData>(key: K, value: SyncSettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <>
      {/* 設定ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        title="同期設定"
      >
        <CogIcon className="h-4 w-4 mr-2" />
        同期設定
      </button>

      {/* 設定モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景オーバーレイ */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* モーダルコンテンツ */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    同期設定
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* 期間プリセット */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="inline h-4 w-4 mr-1" />
                      同期期間
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_OPTIONS.map(option => (
                        <button
                          key={option.months}
                          onClick={() => updateSetting('maxMonths', option.months)}
                          className={`px-3 py-2 text-sm rounded-md border ${
                            settings.maxMonths === option.months
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">
                        カスタム期間（月数）:
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="60"
                        step="0.1"
                        value={settings.maxMonths}
                        onChange={(e) => updateSetting('maxMonths', parseFloat(e.target.value) || 1)}
                        className="ml-2 w-20 px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* リクエストあたりの件数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ChartBarIcon className="inline h-4 w-4 mr-1" />
                      1リクエストあたりの最大件数
                    </label>
                    <select
                      value={settings.limitPerRequest}
                      onChange={(e) => updateSetting('limitPerRequest', parseInt(e.target.value))}
                      className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value={50}>50件（高速・テスト用）</option>
                      <option value={100}>100件（開発用）</option>
                      <option value={250}>250件（バランス）</option>
                      <option value={500}>500件（デフォルト）</option>
                      <option value={1000}>1000件（大量データ）</option>
                    </select>
                  </div>

                  {/* オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.skipCreatives}
                        onChange={(e) => updateSetting('skipCreatives', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        クリエイティブ取得をスキップ（高速化）
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.debugMode}
                        onChange={(e) => updateSetting('debugMode', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        デバッグモード（詳細ログ出力）
                      </span>
                    </label>
                  </div>

                  {/* 警告メッセージ */}
                  {settings.maxMonths < 1 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            短期間の同期はテスト用です。本番環境では1ヶ月以上を推奨します。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => {
                    setSettings(DEFAULT_SETTINGS)
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  デフォルトに戻す
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  適用
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}