import React, { useState, useEffect } from 'react'
import { Search, Filter, X, Save } from 'lucide-react'
import { ECForceOrder } from '@/types'
import { logger } from '../../utils/logger'
import { useFilterPresetsConvex } from '../../hooks/useFilterPresetsConvex'

export interface FilterCriteria {
  searchQuery: string
  dateRange: {
    start: Date | null
    end: Date | null
  }
  priceRange: {
    min: number | null
    max: number | null
  }
  customerType: 'all' | 'new' | 'returning' | 'subscriber'
  offerTypes: string[]
  advertisers: string[]
  products: string[]
  orderStatus: 'all' | 'active_subscription' | 'inactive_subscription'
}

export interface FilterPreset {
  id: string
  name: string
  criteria: FilterCriteria
}

interface AdvancedFilterProps {
  orders: ECForceOrder[]
  onFilterChange: (filteredOrders: ECForceOrder[]) => void
  onClose?: () => void
}

const defaultCriteria: FilterCriteria = {
  searchQuery: '',
  dateRange: { start: null, end: null },
  priceRange: { min: null, max: null },
  customerType: 'all',
  offerTypes: [],
  advertisers: [],
  products: [],
  orderStatus: 'all',
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  orders,
  onFilterChange,
  onClose,
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>(defaultCriteria)
  // Convexフックを使用
  const {
    presets,
    loading: presetsLoading,
    savePreset: savePresetToConvex,
  } = useFilterPresetsConvex()
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [presetName, setPresetName] = useState('')

  // 利用可能なオプションを抽出
  const availableOptions = React.useMemo(() => {
    const offers = new Set<string>()
    const advertisers = new Set<string>()
    const products = new Set<string>()

    orders.forEach((order) => {
      if (order.購入オファー) offers.add(order.購入オファー)
      if (order.広告主名) advertisers.add(order.広告主名)
      order.購入商品?.forEach((product) => products.add(product))
    })

    return {
      offers: Array.from(offers).sort(),
      advertisers: Array.from(advertisers).sort(),
      products: Array.from(products).sort(),
    }
  }, [orders])

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...orders]

    // 検索クエリ
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.受注番号.toLowerCase().includes(query) ||
          order.顧客番号.toLowerCase().includes(query) ||
          order.メールアドレス.toLowerCase().includes(query) ||
          order.購入商品?.some((p) => p.toLowerCase().includes(query))
      )
    }

    // 日付範囲
    if (criteria.dateRange.start || criteria.dateRange.end) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.受注日)
        if (criteria.dateRange.start && orderDate < criteria.dateRange.start) return false
        if (criteria.dateRange.end && orderDate > criteria.dateRange.end) return false
        return true
      })
    }

    // 価格範囲
    if (criteria.priceRange.min !== null || criteria.priceRange.max !== null) {
      filtered = filtered.filter((order) => {
        if (criteria.priceRange.min !== null && order.小計 < criteria.priceRange.min) return false
        if (criteria.priceRange.max !== null && order.小計 > criteria.priceRange.max) return false
        return true
      })
    }

    // 顧客タイプ
    if (criteria.customerType !== 'all') {
      const customerPurchaseCounts = new Map<string, number>()
      orders.forEach((order) => {
        const count = customerPurchaseCounts.get(order.顧客番号) || 0
        customerPurchaseCounts.set(order.顧客番号, count + 1)
      })

      filtered = filtered.filter((order) => {
        const purchaseCount = customerPurchaseCounts.get(order.顧客番号) || 0
        switch (criteria.customerType) {
          case 'new':
            return purchaseCount === 1
          case 'returning':
            return purchaseCount > 1 && order.定期ステータス !== '有効'
          case 'subscriber':
            return order.定期ステータス === '有効'
          default:
            return true
        }
      })
    }

    // オファータイプ
    if (criteria.offerTypes.length > 0) {
      filtered = filtered.filter((order) => criteria.offerTypes.includes(order.購入オファー || ''))
    }

    // 広告主
    if (criteria.advertisers.length > 0) {
      filtered = filtered.filter((order) => criteria.advertisers.includes(order.広告主名 || ''))
    }

    // 商品
    if (criteria.products.length > 0) {
      filtered = filtered.filter((order) =>
        order.購入商品?.some((product) => criteria.products.includes(product))
      )
    }

    // 注文ステータス
    if (criteria.orderStatus !== 'all') {
      filtered = filtered.filter((order) => {
        if (criteria.orderStatus === 'active_subscription') {
          return order.定期ステータス === '有効'
        } else if (criteria.orderStatus === 'inactive_subscription') {
          return order.定期ステータス !== '有効'
        }
        return true
      })
    }

    onFilterChange(filtered)
  }, [criteria, orders, onFilterChange])

  // プリセットの保存
  const savePreset = async () => {
    if (!presetName.trim()) return

    try {
      await savePresetToConvex(presetName, criteria)
      setShowPresetModal(false)
      setPresetName('')
    } catch (error) {
      logger.error('プリセットの保存に失敗しました:', error)
    }
  }

  // プリセットの読み込み
  const loadPreset = (preset: FilterPreset) => {
    setCriteria(preset.criteria)
  }

  // プリセットの削除
  // const deletePreset = (id: string) => {
  //   const updatedPresets = presets.filter(p => p.id !== id)
  //   setPresets(updatedPresets)
  //   localStorage.setItem('filter_presets', JSON.stringify(updatedPresets))
  // }

  // Convexフックがプリセットを自動的に読み込むため、この処理は不要

  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          高度なフィルター
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={criteria.searchQuery}
            onChange={(e) => setCriteria({ ...criteria, searchQuery: e.target.value })}
            placeholder="受注番号、顧客番号、メールアドレス、商品名で検索"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* フィルター条件 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 日付範囲 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">日付範囲</label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              data-testid="start-date-input"
              value={formatDateForInput(criteria.dateRange.start)}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  dateRange: {
                    ...criteria.dateRange,
                    start: e.target.value ? new Date(e.target.value) : null,
                  },
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="date"
              data-testid="end-date-input"
              value={formatDateForInput(criteria.dateRange.end)}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  dateRange: {
                    ...criteria.dateRange,
                    end: e.target.value ? new Date(e.target.value) : null,
                  },
                })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 価格範囲 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">価格範囲</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={criteria.priceRange.min || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  priceRange: {
                    ...criteria.priceRange,
                    min: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              placeholder="最小"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="number"
              value={criteria.priceRange.max || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  priceRange: {
                    ...criteria.priceRange,
                    max: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              placeholder="最大"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 顧客タイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">顧客タイプ</label>
          <select
            data-testid="customer-type-select"
            value={criteria.customerType}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                customerType: e.target.value as FilterCriteria['customerType'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">すべて</option>
            <option value="new">新規顧客</option>
            <option value="returning">リピーター</option>
            <option value="subscriber">定期購入者</option>
          </select>
        </div>

        {/* 注文ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">定期ステータス</label>
          <select
            data-testid="order-status-select"
            value={criteria.orderStatus}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                orderStatus: e.target.value as FilterCriteria['orderStatus'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">すべて</option>
            <option value="active_subscription">定期有効</option>
            <option value="inactive_subscription">定期無効</option>
          </select>
        </div>
      </div>

      {/* マルチセレクト */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* オファー */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">オファー</label>
          <select
            multiple
            value={criteria.offerTypes}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                offerTypes: Array.from(e.target.selectedOptions, (option) => option.value),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            size={4}
          >
            {availableOptions.offers.map((offer) => (
              <option key={offer} value={offer}>
                {offer}
              </option>
            ))}
          </select>
        </div>

        {/* 広告主 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">広告主</label>
          <select
            multiple
            value={criteria.advertisers}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                advertisers: Array.from(e.target.selectedOptions, (option) => option.value),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            size={4}
          >
            {availableOptions.advertisers.map((advertiser) => (
              <option key={advertiser} value={advertiser}>
                {advertiser}
              </option>
            ))}
          </select>
        </div>

        {/* 商品 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">商品</label>
          <select
            multiple
            value={criteria.products}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                products: Array.from(e.target.selectedOptions, (option) => option.value),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            size={4}
          >
            {availableOptions.products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setCriteria(defaultCriteria)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            リセット
          </button>
          <button
            onClick={() => setShowPresetModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Save className="h-4 w-4 mr-1" />
            プリセット保存
          </button>
        </div>

        {/* プリセット選択 */}
        {!presetsLoading && presets.length > 0 && (
          <div className="relative">
            <select
              onChange={(e) => {
                const preset = presets.find((p) => p.id === e.target.value)
                if (preset) loadPreset(preset)
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">プリセットを選択</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* プリセット保存モーダル */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">プリセットの保存</h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="プリセット名を入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={savePreset}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
