import React from 'react'

interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'chart' | 'table'
  rows?: number
  className?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  rows = 1,
  className = '',
}) => {
  const baseClass = 'animate-pulse bg-gray-200 rounded'

  if (type === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass} h-4 w-full`}></div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className={`${baseClass} p-6 ${className}`}>
        <div className="space-y-3">
          <div className={`${baseClass} bg-gray-300 h-4 w-1/3`}></div>
          <div className={`${baseClass} bg-gray-300 h-8 w-1/2`}></div>
          <div className={`${baseClass} bg-gray-300 h-3 w-2/3`}></div>
        </div>
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className={`${baseClass} ${className}`} style={{ height: '320px' }}>
        <div className="p-4 h-full flex items-end justify-around">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`${baseClass} bg-gray-300 w-12`}
              style={{ height: `${Math.random() * 60 + 20}%` }}
            ></div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={className}>
        <div className={`${baseClass} h-10 mb-2`}></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass} h-12 mb-1`}></div>
        ))}
      </div>
    )
  }

  return null
}

// KPIカード用のスケルトン
export const KPICardSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonLoader key={i} type="card" />
    ))}
  </div>
)

// グラフ用のスケルトン
export const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <SkeletonLoader type="text" className="w-1/4 mb-4" />
    <SkeletonLoader type="chart" />
  </div>
)

// テーブル用のスケルトン
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <SkeletonLoader type="text" className="w-1/4 mb-4" />
    <SkeletonLoader type="table" rows={rows} />
  </div>
)
