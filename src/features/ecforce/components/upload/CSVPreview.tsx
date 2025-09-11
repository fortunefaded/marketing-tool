import React from 'react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface CSVPreviewProps {
  headers: string[]
  rows: any[]
  dataDate: string
  duplicates?: string[]
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({
  headers,
  rows,
  dataDate,
  duplicates = [],
}) => {
  if (!headers.length || !rows.length) {
    return null
  }

  // デバイス=合計のレコードのみフィルタリング
  const filteredRows = rows.filter((row) => row['デバイス'] === '合計')

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-900">データプレビュー</h3>
        <div className="mt-2 text-sm text-blue-700">
          <p>
            データ対象日: <span className="font-medium">{dataDate}</span>
          </p>
          <p>
            全レコード数: <span className="font-medium">{rows.length}</span>
          </p>
          <p>
            処理対象レコード数（デバイス=合計）:{' '}
            <span className="font-medium">{filteredRows.length}</span>
          </p>
          {duplicates.length > 0 && (
            <p className="text-orange-700">
              重複レコード: <span className="font-medium">{duplicates.length}件</span>
            </p>
          )}
        </div>
      </div>

      {filteredRows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状態
                  </th>
                  {headers
                    .filter((h) => h !== '期間' && h !== 'デバイス')
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
                {filteredRows.slice(0, 5).map((row, index) => {
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
                      {headers
                        .filter((h) => h !== '期間' && h !== 'デバイス')
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
          {filteredRows.length > 5 && (
            <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500">
              他 {filteredRows.length - 5} 件のレコード
            </div>
          )}
        </div>
      )}

      {filteredRows.length === 0 && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            処理対象のレコードが見つかりません。「デバイス」列が「合計」のレコードのみが処理されます。
          </p>
        </div>
      )}
    </div>
  )
}
