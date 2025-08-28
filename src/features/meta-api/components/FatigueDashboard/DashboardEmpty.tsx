/**
 * DashboardEmpty.tsx
 * データがない場合の表示コンポーネント
 */

import React from 'react'

interface DashboardEmptyProps {
  hasSourceData: boolean
  isFiltered: boolean
  onClearFilters?: () => void
  onRefresh?: () => void
  selectedAccountId: string | null
  isLoadingAccounts: boolean
}

export const DashboardEmpty: React.FC<DashboardEmptyProps> = ({
  hasSourceData,
  isFiltered,
  onClearFilters,
  onRefresh,
  selectedAccountId,
  isLoadingAccounts
}) => {
  // アカウントが選択されていない場合
  if (!selectedAccountId && !isLoadingAccounts) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-lg font-medium mb-2">アカウントを選択してください</p>
        <p className="text-sm">広告疲労度データを表示するには、Meta広告アカウントを選択してください。</p>
      </div>
    )
  }

  // フィルター適用後にデータがない場合
  if (isFiltered && hasSourceData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              フィルター条件に該当するデータがありません
            </h3>
            <p className="text-yellow-700">
              現在のフィルター設定では、表示可能なデータがありません。
              フィルター条件を調整するか、リセットしてください。
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              フィルターをリセット
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              データを再取得
            </button>
          )}
        </div>
      </div>
    )
  }

  // データが全くない場合
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          広告データがありません
        </h3>
        <p className="text-gray-600 mb-4">
          このアカウントには表示可能な広告データがありません。
        </p>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            データを取得
          </button>
        )}
      </div>
    </div>
  )
}