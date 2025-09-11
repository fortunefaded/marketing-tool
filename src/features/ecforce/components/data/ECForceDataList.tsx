import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import {
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

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

  // 異常値の検出
  const hasAbnormalCvr = useMemo(() => {
    if (!activeData?.data) return false
    return activeData.data.some(
      (record: any) =>
        record.cvrOrder > 1 || record.cvrPayment > 1 || record.offerRateThanksUpsell > 1
    )
  }, [activeData])

  // CVR修正処理
  const handleFixCvr = async () => {
    setIsFixing(true)
    try {
      const result = await fixCvrValues()
      setFixResult(result)
      // キャッシュをクリアして再取得
      localStorage.removeItem(CACHE_KEY)
      setCachedDataState(null)
      setTimeout(() => {
        setFixResult(null)
      }, 5000)
    } catch (error) {
      console.error('CVR修正エラー:', error)
    } finally {
      setIsFixing(false)
    }
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

  // フィルター・ソート済みデータ
  const filteredAndSortedData = useMemo(() => {
    if (!activeData?.data) return []

    let filtered = [...activeData.data]

    // フィルタリング
    if (selectedAdvertiser) {
      filtered = filtered.filter((record) => record.advertiser === selectedAdvertiser)
    }
    if (startDate) {
      filtered = filtered.filter((record) => record.dataDate >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter((record) => record.dataDate <= endDate)
    }

    // ソート
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      } else {
        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      }
    })

    return filtered
  }, [activeData, selectedAdvertiser, startDate, endDate, sortField, sortDirection])

  // 合計値の計算
  const totals = useMemo(() => {
    if (!filteredAndSortedData.length) {
      return {
        orderAmount: 0,
        salesAmount: 0,
        accessCount: 0,
        cvOrder: 0,
        cvPayment: 0,
        cvThanksUpsell: 0,
        avgCvrOrder: 0,
        avgCvrPayment: 0,
        avgOfferRate: 0,
      }
    }

    const sum = filteredAndSortedData.reduce(
      (acc, record) => {
        acc.orderAmount += record.orderAmount
        acc.salesAmount += record.salesAmount
        acc.accessCount += record.accessCount
        acc.cvOrder += record.cvOrder
        acc.cvPayment += record.cvPayment
        acc.cvThanksUpsell += record.cvThanksUpsell
        return acc
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

      {/* 統計情報 */}
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
          </div>
        </div>
      </div>

      {/* データテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAndSortedData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">データが見つかりません</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    アクセス数
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
                    onClick={() => handleSort('cvrOrder')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CVR(受注)
                      <SortIcon field="cvrOrder" />
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
                    onClick={() => handleSort('cvrPayment')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      CVR(決済)
                      <SortIcon field="cvrPayment" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    サンクスアップセル
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    オファー成功率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* 合計行 */}
                <tr className="bg-blue-50 font-bold border-b-2 border-blue-200 sticky top-[37px] z-10">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">合計</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900">
                    {filteredAndSortedData.length}件
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatNumber(totals.orderAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatNumber(totals.salesAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatNumber(totals.accessCount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {totals.cvOrder}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatPercent(totals.avgCvrOrder)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {totals.cvPayment}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatPercent(totals.avgCvrPayment)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {totals.cvThanksUpsell}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-900 text-right">
                    {formatPercent(totals.avgOfferRate)}
                  </td>
                </tr>
                {/* データ行 */}
                {filteredAndSortedData.map((record, index) => (
                  <tr key={`${record._id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.dataDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.advertiser}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatNumber(record.orderAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatNumber(record.salesAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatNumber(record.accessCount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {record.cvOrder}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatPercent(record.cvrOrder)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {record.cvPayment}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatPercent(record.cvrPayment)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {record.cvThanksUpsell}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatPercent(record.offerRateThanksUpsell)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
