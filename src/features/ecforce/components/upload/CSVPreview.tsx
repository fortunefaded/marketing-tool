import React from 'react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface CSVPreviewProps {
  headers: string[]
  rows: any[]
  dateRange?: { startDate: string; endDate: string; uniqueDates: string[] }
  duplicates?: string[]
  totalRows?: number
  filteredRows?: number
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({
  headers,
  rows,
  dateRange,
  duplicates = [],
  totalRows,
  filteredRows,
}) => {
  if (!headers.length || !rows.length) {
    return null
  }

  // デバイス=合計のレコードのみフィルタリング（プレビュー用）
  const filteredRowsFromPreview = rows.filter((row) => row['デバイス'] === '合計')

  // 非表示にするヘッダー（削除されたフィールド）
  const hiddenHeaders = [
    '期間',
    'デバイス',
    'CV（アップセル）',
    'CV（サンクスクロスセル）',
    'オファー成功率（アップセル）',
    'オファー成功率（サンクスクロスセル）',
  ]

  // 表示用ヘッダーをフィルタリング
  const visibleHeaders = headers.filter((h) => !hiddenHeaders.includes(h))

  return (
    <div className="mt-6 space-y-4">
      {/* デバッグ用：CSV生データ表示 */}
      <div className="rounded-lg bg-yellow-50 p-4 border-2 border-yellow-200">
        <h3 className="text-sm font-medium text-yellow-900 mb-2">
          🔍 CSV デバッグ情報（保存前の生データ）
        </h3>
        <div className="text-xs space-y-2">
          <div>
            <strong>Headers:</strong>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(headers, null, 2)}
            </pre>
          </div>
          <div>
            <strong>First 3 rows (raw data):</strong>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(rows.slice(0, 3), null, 2)}
            </pre>
          </div>
          <div>
            <strong>Filtered rows (デバイス=合計):</strong>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(filteredRowsFromPreview.slice(0, 2), null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-900">データプレビュー</h3>
        <div className="mt-2 text-sm text-blue-700">
          {dateRange && (
            <div className="mb-2">
              <p>
                データ期間:
                <span className="font-medium ml-1">
                  {dateRange.startDate === dateRange.endDate
                    ? dateRange.startDate
                    : `${dateRange.startDate} 〜 ${dateRange.endDate}`}
                </span>
                <span className="ml-2 text-xs text-blue-600">(CSVから自動抽出)</span>
              </p>
              {dateRange.uniqueDates.length > 1 && (
                <p className="text-xs">
                  日付数: <span className="font-medium">{dateRange.uniqueDates.length}日分</span>(
                  {dateRange.uniqueDates.slice(0, 3).join(', ')}
                  {dateRange.uniqueDates.length > 3 ? '...' : ''})
                </p>
              )}
            </div>
          )}
          <p>
            全レコード数: <span className="font-medium">{totalRows || rows.length}</span>
          </p>
          <p>
            処理対象レコード数（デバイス=合計）:{' '}
            <span className="font-medium">{filteredRows || filteredRowsFromPreview.length}</span>
          </p>
          <p className="text-blue-600">
            プレビュー表示: <span className="font-medium">最大10件</span>
          </p>
          {duplicates.length > 0 && (
            <p className="text-orange-700">
              重複レコード: <span className="font-medium">{duplicates.length}件</span>
            </p>
          )}
        </div>
      </div>

      {filteredRowsFromPreview.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状態
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    日付
                  </th>
                  {visibleHeaders
                    .filter((h) => h !== '日付')
                    .map((header) => (
                      <th
                        key={header}
                        className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRowsFromPreview.map((row, index) => {
                  const isDuplicate = duplicates.includes(row['広告主別'])
                  return (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-3 py-4">
                        {isDuplicate ? (
                          <XCircleIcon className="h-5 w-5 text-orange-500" title="重複" />
                        ) : (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" title="新規" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {(() => {
                          // 日付フィールドを優先、なければ期間フィールドから抽出
                          const dateValue = row['日付'] || row['期間']
                          if (dateValue) {
                            const dateStr = String(dateValue).trim()
                            if (row['日付']) {
                              // 日付フィールドの場合: "2025/08/01" → "2025-08-01"
                              return dateStr.replace(/\//g, '-')
                            } else {
                              // 期間フィールドの場合: "2025-09-09 00:00:00 - 2025-09-09 23:59:59" → "2025-09-09"
                              const dateOnly = dateStr.split(' ')[0]
                              return dateOnly.replace(/\//g, '-')
                            }
                          }
                          return '-'
                        })()}
                      </td>
                      {visibleHeaders
                        .filter((h) => h !== '日付')
                        .map((header) => (
                          <td
                            key={header}
                            className="whitespace-nowrap px-3 py-4 text-sm text-gray-900"
                          >
                            {row[header] || '-'}
                          </td>
                        ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredRowsFromPreview.length === 0 && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            処理対象のレコードが見つかりません。「デバイス」列が「合計」のレコードのみが処理されます。
          </p>
        </div>
      )}
    </div>
  )
}
