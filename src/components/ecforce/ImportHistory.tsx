import React, { useState, useEffect } from 'react'
import { Clock, FileText, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { ImportHistoryManager, ImportHistory } from '../../utils/import-history'

export const ImportHistoryComponent: React.FC = () => {
  const [history, setHistory] = useState<ImportHistory[]>([])
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const loaded = ImportHistoryManager.getHistory()
    setHistory(loaded)
  }

  const handleDelete = (id: string) => {
    ImportHistoryManager.deleteHistory(id)
    loadHistory()
    setShowConfirmDelete(null)
  }

  const handleClearAll = () => {
    if (window.confirm('すべてのインポート履歴を削除しますか？')) {
      ImportHistoryManager.clearHistory()
      loadHistory()
    }
  }

  const stats = ImportHistoryManager.getHistoryStats()

  const getStatusIcon = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusText = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success':
        return '成功'
      case 'error':
        return 'エラー'
      case 'partial':
        return '一部成功'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">インポート履歴がありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">インポート統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600">総インポート数</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalImports}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">成功</p>
            <p className="text-2xl font-semibold text-green-600">{stats.successfulImports}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">失敗</p>
            <p className="text-2xl font-semibold text-red-600">{stats.failedImports}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">総レコード数</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stats.totalRecords.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">成功率</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.successRate}%</p>
          </div>
        </div>
      </div>

      {/* 履歴テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">インポート履歴</h3>
          {history.length > 0 && (
            <button onClick={handleClearAll} className="text-sm text-red-600 hover:text-red-800">
              すべて削除
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ファイル名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  インポート日時
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  レコード数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  重複
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ファイルサイズ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(item.status)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{item.filename}</span>
                    </div>
                    {item.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(item.importDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.totalProcessed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="text-gray-900">{item.duplicatesFound}</span>
                    {item.duplicatesSkipped > 0 && (
                      <span className="text-yellow-600 ml-1">
                        ({item.duplicatesSkipped}スキップ)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatFileSize(item.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {showConfirmDelete === item.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(null)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConfirmDelete(item.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
