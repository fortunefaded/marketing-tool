import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ImportDetails } from './ImportDetails'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/solid'
import { ECForceImport } from '../../types'

export const ImportHistory: React.FC = () => {
  const [selectedImport, setSelectedImport] = useState<ECForceImport | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const historyResult = useQuery(api.ecforce.getImportHistory, {
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'partial':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return '成功'
      case 'failed':
        return '失敗'
      case 'partial':
        return '部分的'
      case 'processing':
        return '処理中'
      default:
        return status
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual':
        return '手動'
      case 'scheduled':
        return '自動'
      default:
        return source
    }
  }

  if (!historyResult) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    )
  }

  const { imports, total, hasMore } = historyResult
  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <div className="space-y-4">
        {/* フィルター */}
        <div className="flex items-center space-x-4">
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
            ステータス:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value="success">成功</option>
            <option value="partial">部分的</option>
            <option value="failed">失敗</option>
            <option value="processing">処理中</option>
          </select>
        </div>

        {/* テーブル */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  データ対象日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ファイル名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ソース
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  処理結果
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  実行日時
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">詳細</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    インポート履歴がありません
                  </td>
                </tr>
              ) : (
                imports.map((importRecord) => (
                  <tr key={importRecord.importId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(importRecord.status)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {getStatusLabel(importRecord.status)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {importRecord.dataDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="truncate max-w-xs" title={importRecord.fileName}>
                        {importRecord.fileName || '-'}
                      </div>
                      {importRecord.fileSize && (
                        <div className="text-xs text-gray-500">
                          {(importRecord.fileSize / 1024).toFixed(2)} KB
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {getSourceLabel(importRecord.source)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>
                          成功: {importRecord.successRows}/{importRecord.filteredRows}
                        </div>
                        {importRecord.duplicateRows > 0 && (
                          <div className="text-xs text-orange-600">
                            重複: {importRecord.duplicateRows}
                          </div>
                        )}
                        {importRecord.errorRows > 0 && (
                          <div className="text-xs text-red-600">
                            エラー: {importRecord.errorRows}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {format(new Date(importRecord.startedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      {importRecord.completedAt && (
                        <div className="text-xs">
                          所要時間:{' '}
                          {Math.round((importRecord.completedAt - importRecord.startedAt) / 1000)}秒
                        </div>
                      )}
                    </td>
                    <td className="relative whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedImport(importRecord as ECForceImport)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                前へ
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  全 <span className="font-medium">{total}</span> 件中{' '}
                  <span className="font-medium">{page * pageSize + 1}</span> -{' '}
                  <span className="font-medium">{Math.min((page + 1) * pageSize, total)}</span>{' '}
                  件を表示
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(page - 2 + i, totalPages - 1))
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                    className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    次へ
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedImport && (
        <ImportDetails importData={selectedImport} onClose={() => setSelectedImport(null)} />
      )}
    </>
  )
}
