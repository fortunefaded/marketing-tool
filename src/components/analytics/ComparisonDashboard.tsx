import React, { useState, useMemo } from 'react'
import { MetaInsightsData } from '../../services/metaApiService'
import { FunnelIcon } from '@heroicons/react/24/outline'

interface ComparisonDashboardProps {
  insights: MetaInsightsData[]
}

type ComparisonType = 'campaign' | 'period' | 'creative_type'
type MetricType =
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'conversions'
  | 'ctr'
  | 'cpc'
  | 'cpa'
  | 'roas'

interface ComparisonData {
  name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

export const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({ insights }) => {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('campaign')
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend')

  // キャンペーン別に集計
  const campaignData = useMemo(() => {
    const dataMap = new Map<string, ComparisonData>()

    insights.forEach((insight) => {
      const key = insight.campaign_name || 'Unknown Campaign'
      const existing = dataMap.get(key) || {
        name: key,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      }

      existing.spend += Number(insight.spend || 0)
      existing.impressions += Number(insight.impressions || 0)
      existing.clicks += Number(insight.clicks || 0)
      existing.conversions += Number(insight.conversions || 0)

      dataMap.set(key, existing)
    })

    // メトリクスを計算
    return Array.from(dataMap.values()).map((data) => ({
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
      roas: data.spend > 0 ? ((data.conversions * 10000) / data.spend) * 100 : 0, // 仮: 1CV = 10,000円
    }))
  }, [insights])

  // 期間別に集計（週単位）
  const periodData = useMemo(() => {
    const dataMap = new Map<string, ComparisonData>()

    insights.forEach((insight) => {
      const date = new Date(insight.date_start)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toISOString().split('T')[0]

      const existing = dataMap.get(key) || {
        name: key,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      }

      existing.spend += Number(insight.spend || 0)
      existing.impressions += Number(insight.impressions || 0)
      existing.clicks += Number(insight.clicks || 0)
      existing.conversions += Number(insight.conversions || 0)

      dataMap.set(key, existing)
    })

    return Array.from(dataMap.values())
      .map((data) => ({
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
        roas: data.spend > 0 ? ((data.conversions * 10000) / data.spend) * 100 : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [insights])

  // クリエイティブタイプ別に集計
  const creativeTypeData = useMemo(() => {
    const dataMap = new Map<string, ComparisonData>()
    const types = ['image', 'video', 'carousel', 'text']

    types.forEach((type) => {
      dataMap.set(type, {
        name:
          type === 'image'
            ? '画像'
            : type === 'video'
              ? '動画'
              : type === 'carousel'
                ? 'カルーセル'
                : 'テキスト',
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      })
    })

    insights.forEach((insight) => {
      const type = insight.creative_type || 'text'
      const data = dataMap.get(type)
      if (data) {
        data.spend += Number(insight.spend || 0)
        data.impressions += Number(insight.impressions || 0)
        data.clicks += Number(insight.clicks || 0)
        data.conversions += Number(insight.conversions || 0)
      }
    })

    return Array.from(dataMap.values()).map((data) => ({
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
      roas: data.spend > 0 ? ((data.conversions * 10000) / data.spend) * 100 : 0,
    }))
  }, [insights])

  const getCurrentData = () => {
    switch (comparisonType) {
      case 'campaign':
        return campaignData
      case 'period':
        return periodData
      case 'creative_type':
        return creativeTypeData
      default:
        return campaignData
    }
  }

  const formatValue = (value: number, metric: MetricType) => {
    switch (metric) {
      case 'spend':
      case 'cpc':
      case 'cpa':
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY',
          minimumFractionDigits: 0,
        }).format(value)
      case 'ctr':
      case 'roas':
        return `${value.toFixed(2)}%`
      default:
        return new Intl.NumberFormat('ja-JP').format(Math.round(value))
    }
  }

  const data = getCurrentData()
  const sortedData = [...data].sort((a, b) => b[selectedMetric] - a[selectedMetric])
  const maxValue = Math.max(...data.map((d) => d[selectedMetric]))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">比較分析</h2>

        {/* 比較タイプ選択 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setComparisonType('campaign')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              comparisonType === 'campaign'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            キャンペーン別
          </button>
          <button
            onClick={() => setComparisonType('period')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              comparisonType === 'period'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            期間別
          </button>
          <button
            onClick={() => setComparisonType('creative_type')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              comparisonType === 'creative_type'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            クリエイティブ種別
          </button>
        </div>

        {/* メトリック選択 */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="spend">費用</option>
            <option value="impressions">インプレッション</option>
            <option value="clicks">クリック数</option>
            <option value="conversions">コンバージョン</option>
            <option value="ctr">CTR</option>
            <option value="cpc">CPC</option>
            <option value="cpa">CPA</option>
            <option value="roas">ROAS</option>
          </select>
        </div>
      </div>

      {/* 比較チャート */}
      <div className="space-y-4">
        {sortedData.map((item, index) => {
          const percentage = maxValue > 0 ? (item[selectedMetric] / maxValue) * 100 : 0
          const isTop = index === 0

          return (
            <div key={item.name} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  {isTop && (
                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                      TOP
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatValue(item[selectedMetric], selectedMetric)}
                </span>
              </div>

              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${
                    isTop ? 'bg-green-500' : 'bg-blue-500'
                  } transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* サブメトリクス */}
              <div className="mt-2 grid grid-cols-4 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">費用:</span> {formatValue(item.spend, 'spend')}
                </div>
                <div>
                  <span className="font-medium">CTR:</span> {item.ctr.toFixed(2)}%
                </div>
                <div>
                  <span className="font-medium">CPC:</span> {formatValue(item.cpc, 'cpc')}
                </div>
                <div>
                  <span className="font-medium">ROAS:</span> {item.roas.toFixed(0)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* サマリー */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">最高値</p>
            <p className="text-lg font-semibold text-green-600">
              {sortedData[0] && formatValue(sortedData[0][selectedMetric], selectedMetric)}
            </p>
            <p className="text-xs text-gray-500">{sortedData[0]?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">平均値</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatValue(
                data.reduce((sum, d) => sum + d[selectedMetric], 0) / data.length,
                selectedMetric
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
