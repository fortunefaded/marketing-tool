import React, { useState } from 'react'
import { CalendarIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CustomFilterPanel, type FilterState } from '../filters/CustomFilterPanel'
import { Transition } from '@headlessui/react'

interface DashboardLayoutWithFiltersProps {
  children: React.ReactNode
  title?: string
  showDateRange?: boolean
  showFilters?: boolean
  className?: string
  isLoading?: boolean
  error?: string
  onFiltersChange?: (filters: FilterState) => void
  campaignOptions?: Array<{ id: string; name: string }>
}

export const DashboardLayoutWithFilters: React.FC<DashboardLayoutWithFiltersProps> = ({
  children,
  title,
  showDateRange = false,
  showFilters = false,
  className = '',
  isLoading = false,
  error = null,
  onFiltersChange,
  campaignOptions = [],
}) => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const activeFilterCount = Object.keys(filters).filter(
    (key) => {
      const value = filters[key as keyof FilterState]
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object') return Object.keys(value).length > 0
      return value !== undefined
    }
  ).length

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
    <div className={`dashboard-layout ${className}`}>
      <div className="flex">
        {/* Filter Panel */}
        <Transition
          show={isFilterPanelOpen}
          enter="transition-all duration-300"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition-all duration-300"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <div className="fixed inset-y-0 left-0 z-40 w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto lg:relative lg:translate-x-0">
            <div className="relative h-full">
            <button
              onClick={() => setIsFilterPanelOpen(false)}
              className="absolute top-4 right-4 lg:hidden"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
            <div className="p-6">
              <CustomFilterPanel
                filters={filters}
                onChange={handleFiltersChange}
                campaignOptions={campaignOptions}
                showPresets={true}
              />
            </div>
            </div>
          </div>
        </Transition>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="grid gap-6 p-6">
            {/* Header Section */}
            {(title || showDateRange || showFilters) && (
              <div className="dashboard-header bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}

                  <div className="flex flex-col sm:flex-row gap-4">
                    {showDateRange && (
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">
                          {filters.dateRange 
                            ? `${filters.dateRange.start} - ${filters.dateRange.end}`
                            : '期間を選択'
                          }
                        </span>
                      </div>
                    )}

                    {showFilters && (
                      <button
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 relative"
                      >
                        <FunnelIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">フィルター</span>
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="dashboard-content">{children}</div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {isFilterPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30 lg:hidden"
          onClick={() => setIsFilterPanelOpen(false)}
        />
      )}
    </div>
  )
}