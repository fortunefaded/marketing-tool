import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import {
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Id } from '../../../../../convex/_generated/dataModel'

// キャッシュキー
const CACHE_KEY = 'ecforce_performance_data'
const CACHE_DURATION = 5 * 60 * 1000 // 5分

// キャッシュからデータを取得
const getCachedData = () => {
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null

  const { data, timestamp } = JSON.parse(cached)
  const now = Date.now()

  // キャッシュの有効期限をチェック
  if (now - timestamp > CACHE_DURATION) {
    localStorage.removeItem(CACHE_KEY)
    return null
  }

  return data
}

// キャッシュにデータを保存
const setCachedData = (data: any) => {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  )
}

type SortField =
  | 'dataDate'
  | 'advertiser'
  | 'orderAmount'
  | 'salesAmount'
  | 'cvOrder'
  | 'cvPayment'
  | 'cvrOrder'
  | 'cvrPayment'
type SortDirection = 'asc' | 'desc'

export const ECForceDataList: React.FC = () => {
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('dataDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [cachedData, setCachedDataState] = useState<any>(null)
  const [fixResult, setFixResult] = useState<any>(null)
  const [isFixing, setIsFixing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<Id<'ecforcePerformance'>>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Convexからデータ取得
  const performanceData = useQuery(
    api.ecforce.getPerformanceDataByDate,
    cachedData
      ? 'skip'
      : {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          advertiser: selectedAdvertiser || undefined,
        }
  )

  const advertisers = useQuery(api.ecforce.getAdvertisers, cachedData ? 'skip' : undefined)
  const fixCvrValues = useMutation(api.ecforce.fixCvrValues)
  const deleteData = useMutation(api.ecforce.deletePerformanceDataById)
  const deleteMultipleData = useMutation(api.ecforce.deleteMultiplePerformanceData)

  // 初回ロード時にキャッシュをチェック
  useEffect(() => {
    const cached = getCachedData()
    if (cached) {
      setCachedDataState(cached)
    }
  }, [])

  // データが取得できたらキャッシュに保存
  useEffect(() => {
    if (performanceData && advertisers) {
      const dataToCache = { performanceData, advertisers }
      setCachedData(dataToCache)
      setCachedDataState(dataToCache)
    }
  }, [performanceData, advertisers])

  // 使用するデータ（キャッシュまたは新規取得）
  const activeData = cachedData?.performanceData || performanceData
  const activeAdvertisers = cachedData?.advertisers || advertisers

  // CVR異常値の検出
  const hasAbnormalCvr = useMemo(() => {
    if (!activeData?.data) return false
    return activeData.data.some(
      (item: any) => item.cvrOrder > 1 || item.cvrPayment > 1 || item.offerRateThanksUpsell > 1
    )
  }, [activeData])

  // CVR修正処理
  const handleFixCvr = async () => {
    setIsFixing(true)
    try {
      const result = await fixCvrValues()
      setFixResult(result)
      // キャッシュをクリアして再読み込み
      localStorage.removeItem(CACHE_KEY)
      setCachedDataState(null)
    } catch (error) {
      console.error('CVR修正エラー:', error)
    } finally {
      setIsFixing(false)
    }
  }

  // 削除処理
  const handleDelete = async (id: Id<'ecforcePerformance'>) => {
    if (!confirm('このデータを削除しますか？')) return

    try {
      await deleteData({ id })
      // キャッシュをクリアして再読み込み
      localStorage.removeItem(CACHE_KEY)
      setCachedDataState(null)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  // 複数削除処理
  const handleMultipleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMultipleData({ ids: Array.from(selectedIds) })
      // キャッシュをクリアして再読み込み
      localStorage.removeItem(CACHE_KEY)
      setCachedDataState(null)
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  // チェックボックス選択
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedData.map((item) => item._id)))
    }
  }

  const handleSelectOne = (id: Id<'ecforcePerformance'>) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // フィルタリングとソート
  const filteredAndSortedData = useMemo(() => {
    if (!activeData?.data) return []

    let filtered = [...activeData.data]

    // 日付範囲フィルタ
    if (startDate) {
      filtered = filtered.filter((item) => item.dataDate >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((item) => item.dataDate <= endDate)
    }

    // 広告主フィルタ
    if (selectedAdvertiser) {
      filtered = filtered.filter((item) => item.advertiser === selectedAdvertiser)
    }

    // ソート
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue)
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [activeData, startDate, endDate, selectedAdvertiser, sortField, sortDirection])

  // 合計値の計算
  const totals = useMemo(() => {
    const sum = filteredAndSortedData.reduce(
      (acc, item) => {
        return {
          orderAmount: acc.orderAmount + (item.orderAmount || 0),
          salesAmount: acc.salesAmount + (item.salesAmount || 0),
          accessCount: acc.accessCount + (item.accessCount || 0),
          cvOrder: acc.cvOrder + (item.cvOrder || 0),
          cvPayment: acc.cvPayment + (item.cvPayment || 0),
          cvThanksUpsell: acc.cvThanksUpsell + (item.cvThanksUpsell || 0),
        }
      },
      {
        orderAmount: 0,
        salesAmount: 0,
        accessCount: 0,
        cvOrder: 0,
        cvPayment: 0,
        cvThanksUpsell: 0,
      }
    )

    // 平均CVRを計算
    const avgCvrOrder = sum.accessCount > 0 ? sum.cvOrder / sum.accessCount : 0
    const avgCvrPayment = sum.accessCount > 0 ? sum.cvPayment / sum.accessCount : 0
    const avgOfferRate = sum.cvOrder > 0 ? sum.cvThanksUpsell / sum.cvOrder : 0

    return {
      ...sum,
      avgCvrOrder,
      avgCvrPayment,
      avgOfferRate,
    }
  }, [filteredAndSortedData])

  // 数値フォーマット
  const formatNumber = (value: number) => {
    return value.toLocaleString('ja-JP')
  }

  // パーセンテージフォーマット
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  // ソートアイコン
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 text-blue-600" />
    )
  }

  if (!activeData && !cachedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* CVR異常値の警告 */}
      {hasAbnormalCvr && !fixResult && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  CVRデータに異常値が検出されました
                </h3>
                <p className="text-sm text-red-600 mt-1">
                  CVRが100%を超えるデータが存在します。データ形式の不整合の可能性があります。
                </p>
              </div>
            </div>
            <button
              onClick={handleFixCvr}
              disabled={isFixing}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFixing ? '修正中...' : 'データを修正'}
            </button>
          </div>
        </div>
      )}

      {/* 修正結果の表示 */}
      {fixResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-800">データ修正完了</h3>
              <p className="text-sm text-green-600 mt-1">
                {fixResult.message}（総レコード数: {fixResult.totalRecords}件）
              </p>
            </div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
          {cachedData && <span className="text-xs text-gray-500">(キャッシュ使用中)</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 広告主選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">広告主</label>
            <select
              value={selectedAdvertiser}
              onChange={(e) => setSelectedAdvertiser(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              {activeAdvertisers?.map((advertiser) => (
                <option key={advertiser} value={advertiser}>
                  {advertiser}
                </option>
              ))}
            </select>
          </div>

          {/* 開始日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* 終了日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* クリアボタン */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSelectedAdvertiser('')
                setStartDate('')
                setEndDate('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              クリア
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(CACHE_KEY)
                setCachedDataState(null)
              }}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
            >
              更新
            </button>
          </div>
        </div>
      </div>

      {/* 統計情報と削除ボタン */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="text-sm text-gray-600">表示中:</span>
              <span className="ml-2 font-bold text-blue-600">{filteredAndSortedData.length}件</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">総レコード:</span>
              <span className="ml-2 font-bold">{activeData?.totalRecords || 0}件</span>
            </div>
            {selectedIds.size > 0 && (
              <div>
                <span className="text-sm text-gray-600">選択中:</span>
                <span className="ml-2 font-bold text-red-600">{selectedIds.size}件</span>
              </div>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              選択したデータを削除
            </button>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowDeleteConfirm(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pb-4 pt-5 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    データを削除しますか？
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      選択した{selectedIds.size}件のデータを削除します。この操作は取り消せません。
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleMultipleDelete}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isDeleting ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* データテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSortedData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">データが見つかりません</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-center bg-gray-50">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredAndSortedData.length &&
                        filteredAndSortedData.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('dataDate')}
                  >
                    <div className="flex items-center gap-1">
                      日付
                      <SortIcon field="dataDate" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('advertiser')}
                  >
                    <div className="flex items-center gap-1">
                      広告主
                      <SortIcon field="advertiser" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('orderAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      受注金額
                      <SortIcon field="orderAmount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('salesAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      売上金額
                      <SortIcon field="salesAmount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('cvOrder')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CV(受注)
                      <SortIcon field="cvOrder" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('cvPayment')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CV(決済)
                      <SortIcon field="cvPayment" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('cvrOrder')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CVR(受注)
                      <SortIcon field="cvrOrder" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-gray-50"
                    onClick={() => handleSort('cvrPayment')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CVR(決済)
                      <SortIcon field="cvrPayment" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.map((item) => (
                  <tr
                    key={item._id}
                    className={selectedIds.has(item._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item._id)}
                        onChange={() => handleSelectOne(item._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.dataDate}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.advertiser}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      ¥{formatNumber(item.orderAmount || 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      ¥{formatNumber(item.salesAmount || 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {item.cvOrder || 0}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {item.cvPayment || 0}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatPercent(item.cvrOrder || 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                      {formatPercent(item.cvrPayment || 0)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-600 hover:text-red-900"
                        title="削除"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 sticky bottom-0">
                <tr>
                  <td className="px-3 py-2"></td>
                  <td colSpan={2} className="px-4 py-2 text-sm font-bold text-gray-900">
                    合計
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    ¥{formatNumber(totals.orderAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    ¥{formatNumber(totals.salesAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    {totals.cvOrder}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    {totals.cvPayment}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    {formatPercent(totals.avgCvrOrder)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                    {formatPercent(totals.avgCvrPayment)}
                  </td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
