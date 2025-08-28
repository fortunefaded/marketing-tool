/**
 * useDataFiltering.ts
 * データフィルタリング機能のフック
 */

import { useMemo, useState, useCallback } from 'react'
import { 
  UnifiedAdData,
  FilterCriteria,
  SortConfig,
  SortField 
} from '../../types'

export interface UseDataFilteringOptions {
  defaultCriteria?: FilterCriteria
  defaultSort?: SortConfig
}

export interface UseDataFilteringResult {
  filteredData: UnifiedAdData[]
  sortedData: UnifiedAdData[]
  criteria: FilterCriteria
  sortConfig: SortConfig
  
  // アクション
  setCriteria: (criteria: FilterCriteria) => void
  updateCriteria: (partial: Partial<FilterCriteria>) => void
  resetCriteria: () => void
  setSort: (config: SortConfig) => void
  
  // 統計
  filterStats: {
    totalCount: number
    filteredCount: number
    hiddenCount: number
    filterActive: boolean
  }
}

/**
 * データフィルタリングフック
 */
export function useDataFiltering(
  data: UnifiedAdData[],
  options: UseDataFilteringOptions = {}
): UseDataFilteringResult {
  const {
    defaultCriteria = {},
    defaultSort = { field: 'fatigueScore', direction: 'desc' }
  } = options

  const [criteria, setCriteria] = useState<FilterCriteria>(defaultCriteria)
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort)

  // フィルタリング処理
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // キャンペーンフィルター
    if (criteria.campaigns && criteria.campaigns.length > 0) {
      filtered = filtered.filter(item => 
        criteria.campaigns!.includes(item.campaign_id || '')
      )
    }

    // 広告セットフィルター
    if (criteria.adsets && criteria.adsets.length > 0) {
      filtered = filtered.filter(item => 
        criteria.adsets!.includes(item.adset_id || '')
      )
    }

    // ステータスフィルター
    if (criteria.status && criteria.status.length > 0) {
      filtered = filtered.filter(item => 
        criteria.status!.includes(item.status || 'healthy')
      )
    }

    // メトリクスフィルター
    if (criteria.metrics) {
      const { metrics } = criteria

      // CTR
      if (metrics.ctr) {
        if (metrics.ctr.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.ctr >= metrics.ctr!.min!)
        }
        if (metrics.ctr.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.ctr <= metrics.ctr!.max!)
        }
      }

      // CPM
      if (metrics.cpm) {
        if (metrics.cpm.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.cpm >= metrics.cpm!.min!)
        }
        if (metrics.cpm.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.cpm <= metrics.cpm!.max!)
        }
      }

      // 支出
      if (metrics.spend) {
        if (metrics.spend.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.spend >= metrics.spend!.min!)
        }
        if (metrics.spend.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.spend <= metrics.spend!.max!)
        }
      }

      // インプレッション
      if (metrics.impressions) {
        if (metrics.impressions.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.impressions >= metrics.impressions!.min!)
        }
        if (metrics.impressions.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.impressions <= metrics.impressions!.max!)
        }
      }

      // コンバージョン
      if (metrics.conversions) {
        if (metrics.conversions.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.conversions >= metrics.conversions!.min!)
        }
        if (metrics.conversions.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.conversions <= metrics.conversions!.max!)
        }
      }

      // ROAS
      if (metrics.roas) {
        if (metrics.roas.min !== undefined) {
          filtered = filtered.filter(item => item.metrics.roas >= metrics.roas!.min!)
        }
        if (metrics.roas.max !== undefined) {
          filtered = filtered.filter(item => item.metrics.roas <= metrics.roas!.max!)
        }
      }
    }

    // 検索フィルター
    if (criteria.search) {
      const searchLower = criteria.search.toLowerCase()
      filtered = filtered.filter(item => 
        item.ad_name.toLowerCase().includes(searchLower) ||
        item.campaign_name?.toLowerCase().includes(searchLower) ||
        item.adset_name?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [data, criteria])

  // ソート処理
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]
    
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortConfig.field) {
        case 'ad_name':
          aValue = a.ad_name
          bValue = b.ad_name
          break
        case 'campaign_name':
          aValue = a.campaign_name || ''
          bValue = b.campaign_name || ''
          break
        case 'fatigueScore':
          aValue = a.fatigueScore || 0
          bValue = b.fatigueScore || 0
          break
        case 'status':
          const statusOrder = { critical: 3, warning: 2, healthy: 1 }
          aValue = statusOrder[a.status || 'healthy']
          bValue = statusOrder[b.status || 'healthy']
          break
        default:
          // メトリクスフィールド
          aValue = a.metrics[sortConfig.field as keyof typeof a.metrics] || 0
          bValue = b.metrics[sortConfig.field as keyof typeof b.metrics] || 0
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    return sorted
  }, [filteredData, sortConfig])

  // 条件を部分更新
  const updateCriteria = useCallback((partial: Partial<FilterCriteria>) => {
    setCriteria(prev => ({ ...prev, ...partial }))
  }, [])

  // 条件をリセット
  const resetCriteria = useCallback(() => {
    setCriteria(defaultCriteria)
  }, [defaultCriteria])

  // ソート設定を更新
  const setSort = useCallback((config: SortConfig) => {
    setSortConfig(config)
  }, [])

  // フィルター統計
  const filterStats = useMemo(() => ({
    totalCount: data.length,
    filteredCount: filteredData.length,
    hiddenCount: data.length - filteredData.length,
    filterActive: Object.keys(criteria).length > 0
  }), [data.length, filteredData.length, criteria])

  return {
    filteredData,
    sortedData,
    criteria,
    sortConfig,
    setCriteria,
    updateCriteria,
    resetCriteria,
    setSort,
    filterStats
  }
}