import { useMemo, useState } from 'react'
// CreativeTable import removed - component not used
import { FatigueData } from '@/types'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline'
import { CreativeDetailModal } from './CreativeDetailModal'
import { normalizeCreativeMediaType } from '../utils/creative-type'

interface CreativeTableTabProps {
  data: FatigueData[]
  insights: any[]
  selectedAccountId: string | null
  isLoading: boolean
}

/**
 * 疲労度ダッシュボード内のクリエイティブテーブルタブ
 * 疲労度データを含むクリエイティブの統計データテーブルを表示
 */
export function CreativeTableTab({
  data,
  insights,
  selectedAccountId: _, // unused
  isLoading,
}: CreativeTableTabProps) {

  // クリエイティブタイプを判定する関数
  const getCreativeType = (insight: any): { type: string; icon: any; color: string } => {
    if (!insight) return { type: 'UNKNOWN', icon: DocumentTextIcon, color: 'text-gray-500' }

    // Meta APIのobject_typeから判定（優先）
    const objectType = insight.creative?.object_type || insight.creative_type || insight.creative_media_type
    const normalizedType = normalizeCreativeMediaType(objectType)

    // 追加の判定ロジック（フォールバック）
    if (normalizedType === 'text') {
      if (insight.video_url || insight.video_id) {
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
      }
      if (insight.image_url || insight.thumbnail_url) {
        return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      }
    }

    // 正規化された値に基づいて判定
    switch (normalizedType) {
      case 'video':
        return { type: 'VIDEO', icon: VideoCameraIcon, color: 'text-purple-600' }
      case 'image':
        return { type: 'IMAGE', icon: PhotoIcon, color: 'text-blue-600' }
      case 'carousel':
        return { type: 'CAROUSEL', icon: ViewColumnsIcon, color: 'text-green-600' }
      default:
        return { type: 'TEXT', icon: DocumentTextIcon, color: 'text-gray-600' }
    }
  }

  // ソート状態管理
  const [sortField, setSortField] = useState<string>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // モーダル状態管理
  const [selectedItem, setSelectedItem] = useState<FatigueData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // insightsをマップ化
  const insightsMap = useMemo(() => {
    const map = new Map()
    if (insights && Array.isArray(insights)) {
      insights.forEach((insight) => {
        if (insight.ad_id) {
          map.set(insight.ad_id, insight)
        }
      })
    }
    return map
  }, [insights])

  // データを拡張してソート
  const sortedData = useMemo(() => {
    console.log('sortedData recalculating:', { sortField, sortDirection, dataLength: data?.length })
    if (!data) return []

    const enrichedData = data.map((item) => {
      const insight = insightsMap.get(item.adId)
      return {
        ...item,
        insight,
        // 計算フィールド
        impressions: item.metrics.impressions || 0,
        clicks: item.metrics.clicks || 0,
        spend: item.metrics.spend || 0,
        conversions: item.metrics.conversions || 0,
        cpa:
          (item.metrics.conversions || 0) > 0
            ? (item.metrics.spend || 0) / (item.metrics.conversions || 1)
            : 0,
        roas:
          insight?.conversion_value && item.metrics.spend > 0
            ? insight.conversion_value / item.metrics.spend
            : 0,
        revenue: insight?.conversion_value || 0,
        // クリエイティブタイプ
        creativeType: getCreativeType(insight).type,
      }
    })

    // ソート処理を分離して確実に実行
    const sortedItems = [...enrichedData].sort((a, b) => {
      let aValue: any, bValue: any

      // フィールド値を取得
      switch (sortField) {
        case 'adName':
          aValue = (a.adName || '').toString().toLowerCase()
          bValue = (b.adName || '').toString().toLowerCase()
          break
        case 'score':
          aValue = Number(a.score) || 0
          bValue = Number(b.score) || 0
          break
        case 'frequency':
          aValue = Number(a.metrics?.frequency) || 0
          bValue = Number(b.metrics?.frequency) || 0
          break
        case 'ctr':
          aValue = Number(a.metrics?.ctr) || 0
          bValue = Number(b.metrics?.ctr) || 0
          break
        case 'unique_ctr':
          aValue = Number(a.metrics?.unique_ctr) || 0
          bValue = Number(b.metrics?.unique_ctr) || 0
          break
        case 'cpm':
          aValue = Number(a.metrics?.cpm) || 0
          bValue = Number(b.metrics?.cpm) || 0
          break
        case 'cpc':
          aValue = Number(a.metrics?.cpc) || 0
          bValue = Number(b.metrics?.cpc) || 0
          break
        case 'impressions':
          aValue = Number(a.impressions) || 0
          bValue = Number(b.impressions) || 0
          break
        case 'clicks':
          aValue = Number(a.clicks) || 0
          bValue = Number(b.clicks) || 0
          break
        case 'spend':
          aValue = Number(a.spend) || 0
          bValue = Number(b.spend) || 0
          break
        case 'conversions':
          aValue = Number(a.conversions) || 0
          bValue = Number(b.conversions) || 0
          break
        case 'cpa':
          aValue = Number(a.cpa) || 0
          bValue = Number(b.cpa) || 0
          break
        case 'revenue':
          aValue = Number(a.revenue) || 0
          bValue = Number(b.revenue) || 0
          break
        case 'roas':
          aValue = Number(a.roas) || 0
          bValue = Number(b.roas) || 0
          break
        case 'creativeType':
          aValue = (a.creativeType || '').toString().toLowerCase()
          bValue = (b.creativeType || '').toString().toLowerCase()
          break
        default:
          aValue = 0
          bValue = 0
      }

      // 文字列の場合
      if (sortField === 'adName' || sortField === 'creativeType') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      }

      // 数値の場合
      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    console.log('sortedData result:', {
      length: sortedItems.length,
      sortField,
      sortDirection,
      firstValue:
        sortedItems[0]?.[sortField as keyof (typeof sortedItems)[0]] ||
        (sortedItems[0]?.metrics as any)?.[sortField] ||
        sortedItems[0]?.score,
      lastValue:
        sortedItems[sortedItems.length - 1]?.[sortField as keyof (typeof sortedItems)[0]] ||
        (sortedItems[sortedItems.length - 1]?.metrics as any)?.[sortField] ||
        sortedItems[sortedItems.length - 1]?.score,
    })

    return sortedItems
  }, [data, insightsMap, sortField, sortDirection])

  const handleSort = (field: string) => {
    console.log('handleSort called:', {
      field,
      currentSortField: sortField,
      currentDirection: sortDirection,
    })

    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
      setSortDirection(newDirection)
      console.log('Same field, toggling direction to:', newDirection)
    } else {
      setSortField(field)
      setSortDirection('desc')
      console.log('New field, setting:', { field, direction: 'desc' })
    }
  }

  const handleViewDetails = (item: any) => {
    const insight = insightsMap.get(item.adId)
    const creativeInfo = getCreativeType(insight)

    console.log('詳細表示:', {
      adId: item.adId,
      adName: item.adName,
      creativeType: creativeInfo.type,
      fatigueScore: item.score,
      metrics: item.metrics,
      insight: insight,
      urls: {
        image: insight?.image_url,
        video: insight?.video_url,
        thumbnail: insight?.thumbnail_url,
      },
    })

    // モーダルを開く
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num))
  const formatCurrency = (num: number) => `¥${formatNumber(num)}`
  const formatPercentage = (num: number) => `${num.toFixed(2)}%`
  const formatDecimal = (num: number, decimals: number = 2) => num.toFixed(decimals)

  console.log('CreativeTableTab rendered:', {
    dataLength: data?.length,
    insightsLength: insights?.length,
    isLoading,
  })

  // 包括的なソート可能テーブル
  return (
    <div className="w-full max-w-none">
      {/* 包括的な統計データテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table
            className="w-full divide-y divide-gray-200 table-fixed"
            style={{ minWidth: '1480px' }}
          >
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('creativeType')}
                >
                  <div className="flex items-center justify-center gap-1">
                    タイプ
                    {sortField === 'creativeType' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '300px' }}
                  onClick={() => handleSort('adName')}
                >
                  <div className="flex items-center justify-center gap-1">
                    クリエイティブ名
                    {sortField === 'adName' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center justify-center gap-1">
                    疲労度
                    {sortField === 'score' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '70px' }}
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Freq
                    {sortField === 'frequency' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '70px' }}
                  onClick={() => handleSort('ctr')}
                >
                  <div className="flex items-center justify-center gap-1">
                    CTR
                    {sortField === 'ctr' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '70px' }}
                  onClick={() => handleSort('unique_ctr')}
                >
                  <div className="flex items-center justify-center gap-1">
                    U-CTR
                    {sortField === 'unique_ctr' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('cpm')}
                >
                  <div className="flex items-center justify-center gap-1">
                    CPM
                    {sortField === 'cpm' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('cpc')}
                >
                  <div className="flex items-center justify-center gap-1">
                    CPC
                    {sortField === 'cpc' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center justify-center gap-1">
                    IMP
                    {sortField === 'impressions' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-center gap-1">
                    クリック
                    {sortField === 'clicks' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-center gap-1">
                    消化金額
                    {sortField === 'spend' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '75px' }}
                  onClick={() => handleSort('conversions')}
                >
                  <div className="flex items-center justify-center gap-1">
                    CV
                    {sortField === 'conversions' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '80px' }}
                  onClick={() => handleSort('cpa')}
                >
                  <div className="flex items-center justify-center gap-1">
                    CPA
                    {sortField === 'cpa' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '100px' }}
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-center gap-1">
                    売上
                    {sortField === 'revenue' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{ width: '75px' }}
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ROAS
                    {sortField === 'roas' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-3 w-3" />
                      ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '90px' }}
                >
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <tr
                  key={`${item.adId}-${index}`}
                  className="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleViewDetails(item)}
                  title="クリックして詳細を表示"
                >
                  {/* クリエイティブタイプ */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {(() => {
                      const insight = insightsMap.get(item.adId)
                      const { type, icon: Icon, color } = getCreativeType(insight)
                      return (
                        <div className="flex flex-col items-center">
                          <Icon className={`h-5 w-5 ${color}`} />
                          <span className="text-xs text-gray-500 mt-1">{type}</span>
                        </div>
                      )
                    })()}
                  </td>

                  {/* クリエイティブ名 */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      title={item.adName || `Creative ${index + 1}`}
                    >
                      {item.adName || `Creative ${index + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 truncate" title={item.adId}>
                      {item.adId}
                    </div>
                  </td>

                  {/* 疲労度スコア */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.score >= 80
                          ? 'bg-red-100 text-red-800'
                          : item.score >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.score}
                    </span>
                  </td>

                  {/* Frequency */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        item.metrics.frequency > 3.5 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }
                    >
                      {formatDecimal(item.metrics.frequency || 0)}
                    </span>
                  </td>

                  {/* CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics.ctr || 0)}
                  </td>

                  {/* Unique CTR */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatPercentage(item.metrics.unique_ctr || 0)}
                  </td>

                  {/* CPM */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics.cpm || 0)}
                  </td>

                  {/* CPC */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.metrics.cpc || 0)}
                  </td>

                  {/* インプレッション */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.impressions)}
                  </td>

                  {/* クリック数 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.clicks)}
                  </td>

                  {/* 消化金額 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    ¥{formatNumber(item.spend)}
                  </td>

                  {/* コンバージョン */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(item.conversions)}
                  </td>

                  {/* CPA */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {item.conversions > 0 ? `¥${formatNumber(item.cpa)}` : '-'}
                  </td>

                  {/* 売上 */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                    {item.revenue > 0 ? `¥${formatNumber(item.revenue)}` : '-'}
                  </td>

                  {/* ROAS */}
                  <td className="px-2 py-3 whitespace-nowrap text-center text-sm">
                    <span
                      className={
                        item.roas >= 3.0
                          ? 'text-green-600 font-medium'
                          : item.roas >= 2.0
                            ? 'text-yellow-600'
                            : item.roas > 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                      }
                    >
                      {item.roas > 0 ? `${formatDecimal(item.roas)}x` : '-'}
                    </span>
                  </td>

                  {/* ステータス */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : item.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* サマリー情報 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">表示件数</p>
              <p className="font-semibold text-gray-900">{sortedData.length}件</p>
            </div>
            <div>
              <p className="text-gray-500">合計インプレッション</p>
              <p className="font-semibold text-gray-900">
                {formatNumber(sortedData.reduce((sum, item) => sum + (item.impressions || 0), 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">合計消化金額</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(sortedData.reduce((sum, item) => sum + (item.spend || 0), 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-500">平均ROAS</p>
              <p className="font-semibold text-gray-900">
                {formatDecimal(
                  sortedData.reduce((sum, item) => sum + (item.roas || 0), 0) / sortedData.length
                )}
                x
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedItem && (
        <CreativeDetailModal
          isOpen={isModalOpen}
          onClose={closeModal}
          item={selectedItem}
          insight={insightsMap.get(selectedItem.adId)}
        />
      )}
    </div>
  )
}
