import React from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface UploadProgressProps {
  progress: number
  processedRows: number
  totalRows: number
  successRows: number
  errorRows: number
  duplicateRows: number
  errors?: Array<{ row: number; message: string }>
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  processedRows,
  totalRows,
  successRows,
  errorRows,
  duplicateRows,
  errors = [],
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">アップロード進捗</h3>
          {progress === 100 && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
        </div>

        <div className="mt-4">
          <div className="relative">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>処理中...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">処理済み</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {processedRows}/{totalRows}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">成功</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">{successRows}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">重複</p>
            <p className="mt-1 text-2xl font-semibold text-orange-600">{duplicateRows}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">エラー</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{errorRows}</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-4">
          <h4 className="text-sm font-medium text-red-900">エラー詳細</h4>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.slice(0, 5).map((error, index) => (
              <li key={index}>
                行 {error.row}: {error.message}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="text-red-500">他 {errors.length - 5} 件のエラー</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
