/**
 * PerformanceFilter
 * パフォーマンス指標に基づくフィルタリングコンポーネント
 */

import { useState, useEffect } from 'react'
import { getSafeMetrics, normalizeDataArray } from '../utils/safe-data-access'

interface PerformanceFilterProps {
  data: any[]
  onFilter: (filteredData: any[]) => void
  className?: string
}

interface FilterCriteria {
  ctr: { min?: number; max?: number }
  cpm: { min?: number; max?: number }
  spend: { min?: number; max?: number }
  impressions: { min?: number; max?: number }
  conversions: { min?: number; max?: number }
  roas: { min?: number; max?: number }
}

export function PerformanceFilter({ data, onFilter, className = '' }: PerformanceFilterProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>({
    ctr: {},
    cpm: {},
    spend: {},
    impressions: {},
    conversions: {},
    roas: {}
  })
  const [showPresets, setShowPresets] = useState(false)

  // プリセットフィルター
  const presets = [
    {
      name: '高パフォーマンス',
      description: 'CTR > 2%, ROAS > 3',
      criteria: {
        ctr: { min: 2 },
        roas: { min: 3 }
      }
    },
    {
      name: '低パフォーマンス',
      description: 'CTR < 0.5%, 高CPM',
      criteria: {
        ctr: { max: 0.5 },
        cpm: { min: 5000 }
      }
    },
    {
      name: '高支出',
      description: '支出 > 10,000円',
      criteria: {
        spend: { min: 10000 }
      }
    },
    {
      name: '低インプレッション',
      description: 'インプレッション < 1,000',
      criteria: {
        impressions: { max: 1000 }
      }
    }
  ]

  // フィルタリング処理
  const applyFilters = () => {
    // データを正規化して安全に処理
    const normalizedData = normalizeDataArray(data)
    
    if (normalizedData.length === 0) {
      onFilter([])
      return
    }

    let filtered = normalizedData.filter((item) => {
      // 安全にメトリクスを取得
      const metrics = getSafeMetrics(item)
      
      // CTRフィルター
      if (criteria.ctr.min !== undefined && metrics.ctr < criteria.ctr.min) return false
      if (criteria.ctr.max !== undefined && metrics.ctr > criteria.ctr.max) return false
      
      // CPMフィルター
      if (criteria.cpm.min !== undefined && metrics.cpm < criteria.cpm.min) return false
      if (criteria.cpm.max !== undefined && metrics.cpm > criteria.cpm.max) return false
      
      // 支出フィルター
      if (criteria.spend.min !== undefined && metrics.spend < criteria.spend.min) return false
      if (criteria.spend.max !== undefined && metrics.spend > criteria.spend.max) return false
      
      // インプレッションフィルター
      if (criteria.impressions.min !== undefined && metrics.impressions < criteria.impressions.min) return false
      if (criteria.impressions.max !== undefined && metrics.impressions > criteria.impressions.max) return false
      
      // コンバージョンフィルター
      if (criteria.conversions.min !== undefined && metrics.conversions < criteria.conversions.min) return false
      if (criteria.conversions.max !== undefined && metrics.conversions > criteria.conversions.max) return false
      
      // ROASフィルター
      if (criteria.roas.min !== undefined && metrics.roas < criteria.roas.min) return false
      if (criteria.roas.max !== undefined && metrics.roas > criteria.roas.max) return false
      
      return true
    })

    onFilter(filtered)
  }

  // フィルターが変更されたら自動適用
  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria, data])

  const handleInputChange = (metric: keyof FilterCriteria, type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value)
    setCriteria(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [type]: numValue
      }
    }))
  }

  const applyPreset = (presetCriteria: any) => {
    setCriteria({
      ctr: presetCriteria.ctr || {},
      cpm: presetCriteria.cpm || {},
      spend: presetCriteria.spend || {},
      impressions: presetCriteria.impressions || {},
      conversions: presetCriteria.conversions || {},
      roas: presetCriteria.roas || {}
    })
  }

  const clearFilters = () => {
    setCriteria({
      ctr: {},
      cpm: {},
      spend: {},
      impressions: {},
      conversions: {},
      roas: {}
    })
  }

  // アクティブなフィルター数をカウント
  const activeFilterCount = Object.values(criteria).reduce((count, metric) => {
    if (metric.min !== undefined || metric.max !== undefined) return count + 1
    return count
  }, 0)

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">パフォーマンスフィルター</h3>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {activeFilterCount}個の条件
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              クリア
            </button>
          </div>
        )}
      </div>

      {/* プリセットボタン */}
      <div className="mb-4">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          プリセット {showPresets ? '▼' : '▶'}
        </button>
        
        {showPresets && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.criteria)}
                className="text-left p-2 border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="text-sm font-medium">{preset.name}</div>
                <div className="text-xs text-gray-600">{preset.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 数値入力フィールド */}
      <div className="space-y-3">
        {/* CTR */}
        <div>
          <label className="text-sm font-medium text-gray-700">CTR (%)</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              placeholder="最小"
              value={criteria.ctr.min ?? ''}
              onChange={(e) => handleInputChange('ctr', 'min', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="0.1"
            />
            <span className="text-gray-500">～</span>
            <input
              type="number"
              placeholder="最大"
              value={criteria.ctr.max ?? ''}
              onChange={(e) => handleInputChange('ctr', 'max', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="0.1"
            />
          </div>
        </div>

        {/* CPM */}
        <div>
          <label className="text-sm font-medium text-gray-700">CPM (円)</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              placeholder="最小"
              value={criteria.cpm.min ?? ''}
              onChange={(e) => handleInputChange('cpm', 'min', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="100"
            />
            <span className="text-gray-500">～</span>
            <input
              type="number"
              placeholder="最大"
              value={criteria.cpm.max ?? ''}
              onChange={(e) => handleInputChange('cpm', 'max', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="100"
            />
          </div>
        </div>

        {/* 支出 */}
        <div>
          <label className="text-sm font-medium text-gray-700">支出 (円)</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              placeholder="最小"
              value={criteria.spend.min ?? ''}
              onChange={(e) => handleInputChange('spend', 'min', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="1000"
            />
            <span className="text-gray-500">～</span>
            <input
              type="number"
              placeholder="最大"
              value={criteria.spend.max ?? ''}
              onChange={(e) => handleInputChange('spend', 'max', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="1000"
            />
          </div>
        </div>

        {/* インプレッション */}
        <div>
          <label className="text-sm font-medium text-gray-700">インプレッション</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              placeholder="最小"
              value={criteria.impressions.min ?? ''}
              onChange={(e) => handleInputChange('impressions', 'min', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="1000"
            />
            <span className="text-gray-500">～</span>
            <input
              type="number"
              placeholder="最大"
              value={criteria.impressions.max ?? ''}
              onChange={(e) => handleInputChange('impressions', 'max', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="1000"
            />
          </div>
        </div>

        {/* ROAS */}
        <div>
          <label className="text-sm font-medium text-gray-700">ROAS</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              placeholder="最小"
              value={criteria.roas.min ?? ''}
              onChange={(e) => handleInputChange('roas', 'min', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="0.5"
            />
            <span className="text-gray-500">～</span>
            <input
              type="number"
              placeholder="最大"
              value={criteria.roas.max ?? ''}
              onChange={(e) => handleInputChange('roas', 'max', e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              step="0.5"
            />
          </div>
        </div>
      </div>
    </div>
  )
}