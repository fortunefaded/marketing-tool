import React, { useState } from 'react'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export interface SyncPeriodOption {
  label: string
  value: number
  description: string
  days: number
}

const SYNC_PERIODS: SyncPeriodOption[] = [
  { label: '1週間', value: 0.25, description: 'テスト用（集小）', days: 7 },
  { label: '1ヶ月', value: 1, description: '開発用', days: 30 },
  { label: '3ヶ月', value: 3, description: '四半期分析', days: 90 },
  { label: '6ヶ月', value: 6, description: '半期分析', days: 180 },
  { label: '1年', value: 12, description: '年次分析', days: 365 },
  { label: '2年', value: 24, description: '長期分析', days: 730 },
  { label: '3年（推奨）', value: 36, description: 'Meta APIの最大期間', days: 1095 },
]

interface SyncPeriodDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (months: number, options: {
    autoSync: boolean
    testMode: boolean
    debugMode: boolean
  }) => void
  defaultMonths?: number
}

export const SyncPeriodDialog: React.FC<SyncPeriodDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultMonths = 1,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultMonths)
  const [autoSync, setAutoSync] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedPeriod, {
      autoSync,
      testMode,
      debugMode,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">同期設定</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                同期期間
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SYNC_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      selectedPeriod === period.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{period.label}</div>
                    <div className="text-sm text-gray-500">{period.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">自動期間を有効にする</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">テストキャンペーンを除外</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">デバッグモード（詳細ログ出力）</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 flex items-center"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              同期を開始
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}