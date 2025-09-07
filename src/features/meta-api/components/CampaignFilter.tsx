/**
 * CampaignFilter
 * キャンペーン、広告セット、広告を選択的にフィルターするコンポーネント
 */

import React, { useState } from 'react'
import type { AdPerformanceData } from '../../../docs/design/meta-api-data-aggregation/interfaces'

interface CampaignFilterProps {
  data: AdPerformanceData[] | any[]
  onFilter: (filteredData: any[]) => void
  className?: string
}

export function CampaignFilter({ data, onFilter, className = '' }: CampaignFilterProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  // データから一意のキャンペーンと広告セットを抽出
  const { campaigns, adSets } = React.useMemo(() => {
    if (!Array.isArray(data)) return { campaigns: [], adSets: [] }

    const campaignMap = new Map<string, string>()
    const adSetMap = new Map<string, string>()

    data.forEach((item: any) => {
      if (item.campaign_id && item.campaign_name) {
        campaignMap.set(item.campaign_id, item.campaign_name)
      }
      if (item.adset_id && item.adset_name) {
        adSetMap.set(item.adset_id, item.adset_name)
      }
    })

    return {
      campaigns: Array.from(campaignMap.entries()).map(([id, name]) => ({ id, name })),
      adSets: Array.from(adSetMap.entries()).map(([id, name]) => ({ id, name })),
    }
  }, [data])

  // フィルタリング処理
  const applyFilters = () => {
    if (!Array.isArray(data)) {
      onFilter([])
      return
    }

    let filtered = [...data]

    // キャンペーンフィルター
    if (selectedCampaigns.size > 0) {
      filtered = filtered.filter((item: any) => selectedCampaigns.has(item.campaign_id))
    }

    // 広告セットフィルター
    if (selectedAdSets.size > 0) {
      filtered = filtered.filter((item: any) => selectedAdSets.has(item.adset_id))
    }

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item: any) =>
          item.ad_name?.toLowerCase().includes(term) ||
          item.campaign_name?.toLowerCase().includes(term) ||
          item.adset_name?.toLowerCase().includes(term)
      )
    }

    onFilter(filtered)
  }

  // フィルターが変更されたら自動適用
  React.useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaigns, selectedAdSets, searchTerm])

  const handleCampaignToggle = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns)
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId)
    } else {
      newSelected.add(campaignId)
    }
    setSelectedCampaigns(newSelected)
  }

  const handleAdSetToggle = (adSetId: string) => {
    const newSelected = new Set(selectedAdSets)
    if (newSelected.has(adSetId)) {
      newSelected.delete(adSetId)
    } else {
      newSelected.add(adSetId)
    }
    setSelectedAdSets(newSelected)
  }

  const clearFilters = () => {
    setSelectedCampaigns(new Set())
    setSelectedAdSets(new Set())
    setSearchTerm('')
  }

  const activeFilterCount = selectedCampaigns.size + selectedAdSets.size + (searchTerm ? 1 : 0)

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">フィルター</h3>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {activeFilterCount}個のフィルター
            </span>
            <button onClick={clearFilters} className="text-sm text-gray-600 hover:text-gray-900">
              クリア
            </button>
          </div>
        )}
      </div>

      {/* 検索ボックス */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="広告名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 詳細フィルター - 常時表示 */}
      <div className="space-y-4 mt-4">
        {/* キャンペーン選択 */}
        {campaigns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              キャンペーン ({selectedCampaigns.size}/{campaigns.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
              {campaigns.map(({ id, name }) => (
                <label
                  key={id}
                  className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.has(id)}
                    onChange={() => handleCampaignToggle(id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 truncate" title={name}>
                    {name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 広告セット選択 */}
        {adSets.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              広告セット ({selectedAdSets.size}/{adSets.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
              {adSets.map(({ id, name }) => (
                <label
                  key={id}
                  className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedAdSets.has(id)}
                    onChange={() => handleAdSetToggle(id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 truncate" title={name}>
                    {name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
