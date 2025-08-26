import React, { useState, useEffect } from 'react'
// TODO: Replace with new data cache implementation
// import { MetaDataCache } from '../../services/metaDataCache'

// Temporary mock implementation
const MetaDataCache = {
  getInsights: (_accountId: string) => [],
  getSyncStatus: (accountId: string) => ({
    accountId,
    lastFullSync: null,
    lastIncrementalSync: null,
    totalRecords: 0,
    dateRange: { earliest: null, latest: null }
  }),
  getDataHistory: (_accountId: string) => []
}
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface DataHistoryViewerProps {
  accountId: string
}

export const DataHistoryViewer: React.FC<DataHistoryViewerProps> = ({ accountId }) => {
  const [history, setHistory] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const dataHistory = MetaDataCache.getDataHistory(accountId)
      setHistory(dataHistory)
    }
  }, [accountId, isOpen])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP')
  }

  const getOperationIcon = (operation: string, beforeCount: number, afterCount: number) => {
    if (operation === 'clear') {
      return <XMarkIcon className="h-5 w-5 text-red-500" />
    }
    if (beforeCount > afterCount * 2 && afterCount < 100) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
    }
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />
  }

  return (
    <div className="relative">
      {/* デバッグボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="データ変更履歴"
      >
        <ClockIcon className="h-6 w-6" />
      </button>

      {/* 履歴パネル */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">データ変更履歴</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-80">
            {history.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">履歴がありません</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {history
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <li key={index} className="p-3 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        {getOperationIcon(item.operation, item.beforeCount, item.afterCount)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.operation === 'save'
                                ? '保存'
                                : item.operation === 'clear'
                                  ? 'クリア'
                                  : item.operation === 'merge'
                                    ? 'マージ'
                                    : item.operation}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(item.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm">
                            <span className="text-gray-600">{item.beforeCount}件</span>
                            <span className="text-gray-400">→</span>
                            <span
                              className={`font-medium ${
                                item.afterCount < item.beforeCount * 0.5
                                  ? 'text-red-600'
                                  : item.afterCount > item.beforeCount
                                    ? 'text-green-600'
                                    : 'text-gray-900'
                              }`}
                            >
                              {item.afterCount}件
                            </span>
                            {item.afterCount < item.beforeCount * 0.5 && item.afterCount < 100 && (
                              <span className="text-xs text-red-600 font-medium">大幅減少！</span>
                            )}
                          </div>
                          {item.source && (
                            <div className="mt-1 text-xs text-gray-400 truncate">{item.source}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              データ数が大幅に減少した場合は、オレンジ色の警告アイコンが表示されます。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
