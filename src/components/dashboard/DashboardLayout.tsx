import React from 'react'
import { CalendarIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  showDateRange?: boolean
  showFilters?: boolean
  className?: string
  isLoading?: boolean
  error?: string
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  showDateRange = false,
  showFilters = false,
  className = '',
  isLoading = false,
  error = null,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-layout grid gap-6 p-6 ${className}`}>
      {/* Header Section */}
      {(title || showDateRange || showFilters) && (
        <div className="dashboard-header bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}

            <div className="flex flex-col sm:flex-row gap-4">
              {showDateRange && (
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">期間を選択</span>
                </div>
              )}

              {showFilters && (
                <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                  <FunnelIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">フィルター</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-content">{children}</div>
    </div>
  )
}
