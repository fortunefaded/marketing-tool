import React from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ECForceImport } from '../../types'

interface ImportDetailsProps {
  importData: ECForceImport
  onClose: () => void
}

export const ImportDetails: React.FC<ImportDetailsProps> = ({ importData, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'partial':
        return 'text-yellow-600 bg-yellow-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return '成功'
      case 'failed':
        return '失敗'
      case 'partial':
        return '部分的成功'
      case 'processing':
        return '処理中'
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">閉じる</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">インポート詳細</h3>

              <div className="mt-6 space-y-4">
                {/* 基本情報 */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">基本情報</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">インポートID</dt>
                      <dd className="mt-1 font-mono text-xs text-gray-900">
                        {importData.importId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">ステータス</dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(importData.status)}`}
                        >
                          {getStatusLabel(importData.status)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">データ対象日</dt>
                      <dd className="mt-1 text-gray-900">{importData.dataDate}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">ソース</dt>
                      <dd className="mt-1 text-gray-900">
                        {importData.source === 'manual' ? '手動アップロード' : '自動同期'}
                      </dd>
                    </div>
                    {importData.fileName && (
                      <div>
                        <dt className="text-gray-500">ファイル名</dt>
                        <dd className="mt-1 text-gray-900 truncate" title={importData.fileName}>
                          {importData.fileName}
                        </dd>
                      </div>
                    )}
                    {importData.fileSize && (
                      <div>
                        <dt className="text-gray-500">ファイルサイズ</dt>
                        <dd className="mt-1 text-gray-900">
                          {(importData.fileSize / 1024).toFixed(2)} KB
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* 処理結果 */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">処理結果</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">全レコード数</dt>
                      <dd className="mt-1 text-gray-900">{importData.totalRows}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">フィルター後</dt>
                      <dd className="mt-1 text-gray-900">{importData.filteredRows}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">処理済み</dt>
                      <dd className="mt-1 text-gray-900">{importData.processedRows}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">成功</dt>
                      <dd className="mt-1 text-green-600 font-medium">{importData.successRows}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">重複</dt>
                      <dd className="mt-1 text-orange-600 font-medium">
                        {importData.duplicateRows}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">エラー</dt>
                      <dd className="mt-1 text-red-600 font-medium">{importData.errorRows}</dd>
                    </div>
                  </dl>
                </div>

                {/* タイミング */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">実行時間</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">開始時刻</dt>
                      <dd className="mt-1 text-gray-900">
                        {format(new Date(importData.startedAt), 'yyyy年MM月dd日 HH:mm:ss', {
                          locale: ja,
                        })}
                      </dd>
                    </div>
                    {importData.completedAt && (
                      <>
                        <div>
                          <dt className="text-gray-500">完了時刻</dt>
                          <dd className="mt-1 text-gray-900">
                            {format(new Date(importData.completedAt), 'yyyy年MM月dd日 HH:mm:ss', {
                              locale: ja,
                            })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">所要時間</dt>
                          <dd className="mt-1 text-gray-900">
                            {Math.round((importData.completedAt - importData.startedAt) / 1000)} 秒
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>

                {/* エラー詳細 */}
                {importData.errors && importData.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-3">
                      エラー詳細（最大100件）
                    </h4>
                    <div className="max-h-48 overflow-y-auto">
                      <ul className="space-y-1 text-sm text-red-700">
                        {importData.errors.map((error, index) => (
                          <li key={index} className="flex">
                            <span className="font-mono text-xs mr-2">行{error.row}:</span>
                            <span className="flex-1">
                              {error.advertiser && `[${error.advertiser}] `}
                              {error.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
