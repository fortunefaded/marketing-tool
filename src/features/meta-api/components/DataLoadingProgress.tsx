import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface DataLoadingProgressProps {
  progress: {
    loaded: number
    hasMore: boolean
    isAutoFetching: boolean
  }
}

export function DataLoadingProgress({ progress }: DataLoadingProgressProps) {
  // データがないか、完了していて自動取得もしていない場合は表示しない
  if (!progress.isAutoFetching && !progress.hasMore && progress.loaded === 0) return null
  
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {progress.isAutoFetching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          )}
          <span className="text-sm font-medium text-blue-700">
            {progress.loaded}件のデータを取得済み
          </span>
        </div>
        
        {progress.hasMore && (
          <span className="text-xs text-blue-600">
            {progress.isAutoFetching ? 'データを自動取得中...' : '取得完了'}
          </span>
        )}
      </div>
      
      {progress.isAutoFetching && (
        <div className="mt-2">
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 animate-pulse"
              style={{ width: '100%' }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-1">
            レート制限を回避しながら段階的にデータを取得しています
          </p>
        </div>
      )}
    </div>
  )
}