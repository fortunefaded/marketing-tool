import React, { useState, useEffect } from 'react'
import {
  CogIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useSyncSettingsConvex } from '../../hooks/useSyncSettingsConvex'
import { logger } from '../../utils/logger'

interface SyncSettingsProps {
  accountId?: string
  onSettingsChange?: (settings: SyncSettingsData) => void
}

export interface SyncSettingsData {
  autoSync: boolean
  syncInterval: 'manual' | 'hourly' | 'daily' | 'weekly'
  debugMode: boolean
  retentionDays: number
  excludeTestCampaigns: boolean
  maxMonths?: number
  limitPerRequest?: number
  skipCreatives?: boolean
}

const PRESET_OPTIONS = [
  { label: '1週間', days: 7, description: 'テスト用（最小）' },
  { label: '1ヶ月', days: 30, description: '開発用' },
  { label: '3ヶ月', days: 90, description: '四半期分析' },
  { label: '6ヶ月', days: 180, description: '半期分析' },
  { label: '1年', days: 365, description: '年次分析' },
  { label: '2年', days: 730, description: '長期分析' },
  { label: '3年（推奨）', days: 1095, description: 'Meta APIの最大期間' },
]

export const SyncSettings: React.FC<SyncSettingsProps> = ({ accountId, onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  // Convexフックを使用
  const {
    settings,
    updateSetting,
    resetSettings,
  } = useSyncSettingsConvex(accountId || '')

  useEffect(() => {
    // 設定が変更されたらコールバックを呼ぶ
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  // updateSettingの非同期ラッパー
  const handleUpdateSetting = async <K extends keyof SyncSettingsData>(key: K, value: SyncSettingsData[K]) => {
    try {
      await updateSetting(key, value)
    } catch (error) {
      logger.error('設定の更新に失敗しました:', error)
    }
  }

  const handleResetSettings = async () => {
    try {
      await resetSettings()
    } catch (error) {
      logger.error('設定のリセットに失敗しました:', error)
    }
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900">同期設定</h3>
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
                      {PRESET_OPTIONS.map((option) => (
                        <button
                          key={option.days}
                          onClick={() => handleUpdateSetting('retentionDays', option.days)}
                          className={`px-3 py-2 text-sm rounded-md border ${
                            settings.retentionDays === option.days
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
                      <label className="text-xs text-gray-600">カスタム期間（日数）:</label>
                      <input
                        type="number"
                        min="1"
                        max="1095"
                        step="1"
                        value={settings.retentionDays}
                        onChange={(e) =>
                          handleUpdateSetting('retentionDays', parseInt(e.target.value) || 30)
                        }
                        className="ml-2 w-20 px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.autoSync}
                        onChange={(e) => handleUpdateSetting('autoSync', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        自動同期を有効にする
                      </span>
                    </label>

                    {settings.autoSync && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          同期間隔
                        </label>
                        <select
                          value={settings.syncInterval}
                          onChange={(e) => handleUpdateSetting('syncInterval', e.target.value as any)}
                          className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="manual">手動</option>
                          <option value="hourly">毎時</option>
                          <option value="daily">毎日</option>
                          <option value="weekly">毎週</option>
                        </select>
                      </div>
                    )}
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.excludeTestCampaigns}
                        onChange={(e) => handleUpdateSetting('excludeTestCampaigns', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        テストキャンペーンを除外
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.debugMode}
                        onChange={(e) => handleUpdateSetting('debugMode', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        デバッグモード（詳細ログ出力）
                      </span>
                    </label>
                  </div>

                  {/* 警告メッセージ */}
                  {settings.retentionDays < 30 && (
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
                  onClick={handleResetSettings}
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