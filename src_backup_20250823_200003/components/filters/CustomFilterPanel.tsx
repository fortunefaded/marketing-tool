import React, { useState, useMemo } from 'react'
import { FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { Transition } from '@headlessui/react'

export interface FilterState {
  dateRange?: {
    start: string
    end: string
  }
  campaigns?: string[]
  status?: string[]
  objectives?: string[]
  metrics?: {
    minSpend?: number
    maxSpend?: number
    minRoas?: number
    maxRoas?: number
    minCtr?: number
    maxCtr?: number
  }
}

interface CustomFilterPanelProps {
  filters?: FilterState
  onChange?: (filters: FilterState) => void
  campaignOptions?: Array<{ id: string; name: string }>
  showPresets?: boolean
  className?: string
}

interface FilterSection {
  key: string
  title: string
  isExpanded: boolean
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'アクティブ' },
  { value: 'PAUSED', label: '一時停止' },
  { value: 'DELETED', label: '削除済み' },
]

const OBJECTIVE_OPTIONS = [
  { value: 'CONVERSIONS', label: 'コンバージョン' },
  { value: 'TRAFFIC', label: 'トラフィック' },
  { value: 'BRAND_AWARENESS', label: 'ブランド認知' },
  { value: 'REACH', label: 'リーチ' },
  { value: 'ENGAGEMENT', label: 'エンゲージメント' },
]

const PRESET_FILTERS = [
  {
    name: '高パフォーマンス',
    filters: {
      metrics: { minRoas: 3.0 },
      status: ['ACTIVE'],
    },
  },
  {
    name: '低パフォーマンス',
    filters: {
      metrics: { maxRoas: 1.0 },
      status: ['ACTIVE'],
    },
  },
  {
    name: '今月',
    filters: {
      dateRange: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    },
  },
  {
    name: '先月',
    filters: {
      dateRange: {
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
          .toISOString()
          .split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
          .toISOString()
          .split('T')[0],
      },
    },
  },
]

export const CustomFilterPanel: React.FC<CustomFilterPanelProps> = ({
  filters = {},
  onChange,
  campaignOptions = [],
  showPresets = false,
  className = '',
}) => {
  const [sections, setSections] = useState<FilterSection[]>([
    { key: 'date', title: '期間', isExpanded: true },
    { key: 'campaigns', title: 'キャンペーン', isExpanded: true },
    { key: 'status', title: 'ステータス', isExpanded: true },
    { key: 'objectives', title: '目的', isExpanded: true },
    { key: 'performance', title: 'パフォーマンス', isExpanded: true },
  ])

  const toggleSection = (key: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.key === key ? { ...section, isExpanded: !section.isExpanded } : section
      )
    )
  }

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    // Remove empty arrays and objects
    Object.keys(updatedFilters).forEach((key) => {
      const value = updatedFilters[key as keyof FilterState]
      if (Array.isArray(value) && value.length === 0) {
        delete updatedFilters[key as keyof FilterState]
      }
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        delete updatedFilters[key as keyof FilterState]
      }
    })
    onChange?.(updatedFilters)
  }

  const clearFilters = () => {
    onChange?.({})
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateRange) count++
    if (filters.campaigns?.length) count++
    if (filters.status?.length) count++
    if (filters.objectives?.length) count++
    if (filters.metrics && Object.keys(filters.metrics).length > 0) count++
    return count
  }, [filters])

  const selectedCampaignCount = filters.campaigns?.length || 0

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
            {activeFilterCount > 0 && (
              <span
                data-testid="active-filter-count"
                className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">
              フィルターをクリア
            </button>
          )}
        </div>
      </div>

      {/* Presets */}
      {showPresets && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">プリセット</h4>
          <div className="flex flex-wrap gap-2">
            {PRESET_FILTERS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleFilterChange(preset.filters)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200">
        {/* Date Range */}
        <div className="px-6 py-4">
          <button
            onClick={() => toggleSection('date')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">期間</h4>
            {sections.find((s) => s.key === 'date')?.isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <Transition
            show={sections.find((s) => s.key === 'date')?.isExpanded || false}
            enter="transition-all duration-200"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-96"
            leave="transition-all duration-200"
            leaveFrom="opacity-100 max-h-96"
            leaveTo="opacity-0 max-h-0"
          >
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="start-date" className="block text-xs font-medium text-gray-700">
                  開始日
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      dateRange: {
                        ...filters.dateRange,
                        start: e.target.value,
                        end: filters.dateRange?.end || '',
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-xs font-medium text-gray-700">
                  終了日
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      dateRange: {
                        start: filters.dateRange?.start || '',
                        end: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </Transition>
        </div>

        {/* Campaigns */}
        {campaignOptions.length > 0 && (
          <div className="px-6 py-4">
            <button
              onClick={() => toggleSection('campaigns')}
              className="w-full flex items-center justify-between text-left"
            >
              <h4 className="text-sm font-medium text-gray-900">
                キャンペーン
                {selectedCampaignCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    {selectedCampaignCount}件選択中
                  </span>
                )}
              </h4>
              {sections.find((s) => s.key === 'campaigns')?.isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
            <Transition
              show={sections.find((s) => s.key === 'campaigns')?.isExpanded || false}
              enter="transition-all duration-200"
              enterFrom="opacity-0 max-h-0"
              enterTo="opacity-100 max-h-96"
              leave="transition-all duration-200"
              leaveFrom="opacity-100 max-h-96"
              leaveTo="opacity-0 max-h-0"
            >
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {campaignOptions.map((campaign) => (
                  <label key={campaign.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.campaigns?.includes(campaign.id) || false}
                      onChange={(e) => {
                        const newCampaigns = e.target.checked
                          ? [...(filters.campaigns || []), campaign.id]
                          : filters.campaigns?.filter((id) => id !== campaign.id) || []
                        handleFilterChange({ campaigns: newCampaigns })
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{campaign.name}</span>
                  </label>
                ))}
              </div>
            </Transition>
          </div>
        )}

        {/* Status */}
        <div className="px-6 py-4">
          <button
            onClick={() => toggleSection('status')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">ステータス</h4>
            {sections.find((s) => s.key === 'status')?.isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <Transition
            show={sections.find((s) => s.key === 'status')?.isExpanded || false}
            enter="transition-all duration-200"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-96"
            leave="transition-all duration-200"
            leaveFrom="opacity-100 max-h-96"
            leaveTo="opacity-0 max-h-0"
          >
            <div className="mt-4 space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(option.value) || false}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? [...(filters.status || []), option.value]
                        : filters.status?.filter((s) => s !== option.value) || []
                      handleFilterChange({ status: newStatus })
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </Transition>
        </div>

        {/* Objectives */}
        <div className="px-6 py-4">
          <button
            onClick={() => toggleSection('objectives')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">目的</h4>
            {sections.find((s) => s.key === 'objectives')?.isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <Transition
            show={sections.find((s) => s.key === 'objectives')?.isExpanded || false}
            enter="transition-all duration-200"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-96"
            leave="transition-all duration-200"
            leaveFrom="opacity-100 max-h-96"
            leaveTo="opacity-0 max-h-0"
          >
            <div className="mt-4 space-y-2">
              {OBJECTIVE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.objectives?.includes(option.value) || false}
                    onChange={(e) => {
                      const newObjectives = e.target.checked
                        ? [...(filters.objectives || []), option.value]
                        : filters.objectives?.filter((o) => o !== option.value) || []
                      handleFilterChange({ objectives: newObjectives })
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </Transition>
        </div>

        {/* Performance Metrics */}
        <div className="px-6 py-4">
          <button
            onClick={() => toggleSection('performance')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">パフォーマンス</h4>
            {sections.find((s) => s.key === 'performance')?.isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <Transition
            show={sections.find((s) => s.key === 'performance')?.isExpanded || false}
            enter="transition-all duration-200"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-96"
            leave="transition-all duration-200"
            leaveFrom="opacity-100 max-h-96"
            leaveTo="opacity-0 max-h-0"
          >
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="min-spend" className="block text-xs font-medium text-gray-700">
                    最小広告費
                  </label>
                  <input
                    type="number"
                    id="min-spend"
                    value={filters.metrics?.minSpend || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        metrics: {
                          ...filters.metrics,
                          minSpend: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="max-spend" className="block text-xs font-medium text-gray-700">
                    最大広告費
                  </label>
                  <input
                    type="number"
                    id="max-spend"
                    value={filters.metrics?.maxSpend || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        metrics: {
                          ...filters.metrics,
                          maxSpend: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="min-roas" className="block text-xs font-medium text-gray-700">
                    最小ROAS
                  </label>
                  <input
                    type="number"
                    id="min-roas"
                    step="0.1"
                    value={filters.metrics?.minRoas || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        metrics: {
                          ...filters.metrics,
                          minRoas: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="max-roas" className="block text-xs font-medium text-gray-700">
                    最大ROAS
                  </label>
                  <input
                    type="number"
                    id="max-roas"
                    step="0.1"
                    value={filters.metrics?.maxRoas || ''}
                    onChange={(e) =>
                      handleFilterChange({
                        metrics: {
                          ...filters.metrics,
                          maxRoas: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  )
}
