import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react'
import { ECForceOrder } from '../../types/ecforce'

interface ComparisonData {
  period1: {
    label: string
    orders: ECForceOrder[]
  }
  period2: {
    label: string
    orders: ECForceOrder[]
  }
}

interface ComparisonViewProps {
  data: ComparisonData
}

interface ComparisonMetric {
  name: string
  period1Value: number
  period2Value: number
  difference: number
  changeRate: number
  unit?: string
}

type ComparisonType = 'period' | 'segment' | 'channel' | 'product'
type ChartType = 'bar' | 'line' | 'radar'

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('period')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['売上', '注文数', '平均単価'])
  const [showFilters, setShowFilters] = useState(false)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState({ product: '', channel: '' })

  // メトリクス計算
  const metrics = useMemo(() => {
    const period1Orders = filter.product
      ? data.period1.orders.filter(o => o.購入商品.some(p => p.includes(filter.product)))
      : data.period1.orders
    
    const period2Orders = filter.product
      ? data.period2.orders.filter(o => o.購入商品.some(p => p.includes(filter.product)))
      : data.period2.orders

    const period1Revenue = period1Orders.reduce((sum, o) => sum + o.小計, 0)
    const period2Revenue = period2Orders.reduce((sum, o) => sum + o.小計, 0)
    const period1Count = period1Orders.length
    const period2Count = period2Orders.length
    const period1AvgPrice = period1Count > 0 ? period1Revenue / period1Count : 0
    const period2AvgPrice = period2Count > 0 ? period2Revenue / period2Count : 0
    
    // 顧客関連メトリクス
    const period1Customers = new Set(period1Orders.map(o => o.顧客番号)).size
    const period2Customers = new Set(period2Orders.map(o => o.顧客番号)).size
    
    // CVR（仮想的な訪問者数から計算）
    const period1Visitors = Math.round(period1Count / 0.02) // 仮のCVR 2%
    const period2Visitors = Math.round(period2Count / 0.02)
    const period1CVR = period1Visitors > 0 ? (period1Count / period1Visitors) * 100 : 0
    const period2CVR = period2Visitors > 0 ? (period2Count / period2Visitors) * 100 : 0
    
    // LTV（簡易計算）
    const period1LTV = period1Customers > 0 ? period1Revenue / period1Customers * 3 : 0 // 3回購入想定
    const period2LTV = period2Customers > 0 ? period2Revenue / period2Customers * 3 : 0

    const metricsData: ComparisonMetric[] = [
      {
        name: '売上',
        period1Value: period1Revenue,
        period2Value: period2Revenue,
        difference: period1Revenue - period2Revenue,
        changeRate: period2Revenue > 0 ? ((period1Revenue - period2Revenue) / period2Revenue) * 100 : 0,
        unit: '¥'
      },
      {
        name: '注文数',
        period1Value: period1Count,
        period2Value: period2Count,
        difference: period1Count - period2Count,
        changeRate: period2Count > 0 ? ((period1Count - period2Count) / period2Count) * 100 : 0,
        unit: '件'
      },
      {
        name: '平均単価',
        period1Value: period1AvgPrice,
        period2Value: period2AvgPrice,
        difference: period1AvgPrice - period2AvgPrice,
        changeRate: period2AvgPrice > 0 ? ((period1AvgPrice - period2AvgPrice) / period2AvgPrice) * 100 : 0,
        unit: '¥'
      },
      {
        name: '顧客数',
        period1Value: period1Customers,
        period2Value: period2Customers,
        difference: period1Customers - period2Customers,
        changeRate: period2Customers > 0 ? ((period1Customers - period2Customers) / period2Customers) * 100 : 0,
        unit: '人'
      },
      {
        name: 'CVR',
        period1Value: period1CVR,
        period2Value: period2CVR,
        difference: period1CVR - period2CVR,
        changeRate: period2CVR > 0 ? ((period1CVR - period2CVR) / period2CVR) * 100 : 0,
        unit: '%'
      },
      {
        name: 'LTV',
        period1Value: period1LTV,
        period2Value: period2LTV,
        difference: period1LTV - period2LTV,
        changeRate: period2LTV > 0 ? ((period1LTV - period2LTV) / period2LTV) * 100 : 0,
        unit: '¥'
      }
    ]

    return metricsData
  }, [data, filter])

  // セグメント比較データ
  const segmentData = useMemo(() => {
    if (comparisonType !== 'segment') return []

    const newCustomers1 = data.period1.orders.filter(o => o.顧客購入回数 === 1)
    const existingCustomers1 = data.period1.orders.filter(o => o.顧客購入回数 > 1)

    return [
      {
        segment: '新規顧客',
        売上: newCustomers1.reduce((sum, o) => sum + o.小計, 0),
        注文数: newCustomers1.length,
        平均単価: newCustomers1.length > 0 
          ? newCustomers1.reduce((sum, o) => sum + o.小計, 0) / newCustomers1.length 
          : 0
      },
      {
        segment: '既存顧客',
        売上: existingCustomers1.reduce((sum, o) => sum + o.小計, 0),
        注文数: existingCustomers1.length,
        平均単価: existingCustomers1.length > 0
          ? existingCustomers1.reduce((sum, o) => sum + o.小計, 0) / existingCustomers1.length
          : 0
      }
    ]
  }, [data, comparisonType])

  // アニメーション効果
  useEffect(() => {
    const targetValues: Record<string, number> = {}
    metrics.forEach(metric => {
      targetValues[`${metric.name}-period1`] = metric.period1Value
      targetValues[`${metric.name}-period2`] = metric.period2Value
    })

    const animationDuration = 1500
    const steps = 60
    const stepDuration = animationDuration / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeProgress = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      const newValues: Record<string, number> = {}
      Object.entries(targetValues).forEach(([key, target]) => {
        newValues[key] = target * easeProgress
      })
      
      setAnimatedValues(newValues)

      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [metrics])

  // グラフデータ準備
  const chartData = selectedMetrics.map(metricName => {
    const metric = metrics.find(m => m.name === metricName)
    if (!metric) return null
    
    return {
      metric: metricName,
      [data.period1.label]: metric.period1Value,
      [data.period2.label]: metric.period2Value
    }
  }).filter(Boolean)

  // レーダーチャート用データ
  const radarData = selectedMetrics.map(metricName => {
    const metric = metrics.find(m => m.name === metricName)
    if (!metric) return null
    
    const maxValue = Math.max(metric.period1Value, metric.period2Value)
    return {
      metric: metricName,
      [data.period1.label]: maxValue > 0 ? (metric.period1Value / maxValue) * 100 : 0,
      [data.period2.label]: maxValue > 0 ? (metric.period2Value / maxValue) * 100 : 0
    }
  }).filter(Boolean)

  // インサイト生成
  const insights = useMemo(() => {
    const insights: string[] = []
    
    metrics.forEach(metric => {
      if (metric.changeRate > 20) {
        insights.push(`${metric.name}が${metric.changeRate.toFixed(1)}%増加しています`)
      } else if (metric.changeRate < -20) {
        insights.push(`${metric.name}が${Math.abs(metric.changeRate).toFixed(1)}%減少しています`)
      }
    })

    if (metrics[0].changeRate > 0 && metrics[2].changeRate > 0) {
      insights.push('売上と平均単価が向上しています')
    }

    return insights
  }, [metrics])

  // エクスポート処理
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting comparison report in ${format} format`)
    // 実際のエクスポート処理はここに実装
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">比較分析</h2>
          
          <div className="flex items-center gap-4">
            {/* 比較タイプ選択 */}
            <div>
              <label htmlFor="comparison-type" className="sr-only">比較タイプ</label>
              <select
                id="comparison-type"
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as ComparisonType)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="period">期間比較</option>
                <option value="segment">セグメント比較</option>
                <option value="channel">チャネル比較</option>
                <option value="product">商品比較</option>
              </select>
            </div>

            {/* 期間変更ボタン */}
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Calendar className="h-4 w-4 mr-2" />
              期間を変更
            </button>

            {/* フィルターボタン */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              フィルター
            </button>
          </div>
        </div>

        {/* 期間表示 */}
        <div className="flex items-center gap-4 text-lg">
          <span className="font-semibold text-gray-700">{data.period1.label}</span>
          <span className="text-gray-500">vs</span>
          <span className="font-semibold text-gray-700">{data.period2.label}</span>
        </div>
      </div>

      {/* 主要KPI比較 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.slice(0, 3).map(metric => (
          <div key={metric.name} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{metric.name}</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">{data.period1.label}</p>
                <p 
                  className="text-2xl font-bold text-gray-900"
                  data-testid={`animated-value-${metric.name === '売上' ? 'revenue' : metric.name}`}
                >
                  {metric.unit === '¥' ? '¥' : ''}
                  {(animatedValues[`${metric.name}-period1`] || 0).toLocaleString(undefined, {
                    maximumFractionDigits: metric.unit === '%' ? 1 : 0
                  })}
                  {metric.unit === '%' ? '%' : ''}
                  {metric.unit === '件' ? '件' : ''}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400">{data.period2.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.unit === '¥' ? '¥' : ''}
                  {metric.period2Value.toLocaleString(undefined, {
                    maximumFractionDigits: metric.unit === '%' ? 1 : 0
                  })}
                  {metric.unit === '%' ? '%' : ''}
                  {metric.unit === '件' ? '件' : ''}
                </p>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className={`flex items-center ${metric.changeRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.changeRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  <span className="font-semibold">
                    {metric.changeRate >= 0 ? '+' : ''}{metric.changeRate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {metric.changeRate >= 0 ? '+' : ''}
                  {metric.unit === '¥' ? '¥' : ''}
                  {metric.difference.toLocaleString(undefined, {
                    maximumFractionDigits: metric.unit === '%' ? 1 : 0
                  })}
                  {metric.unit === '%' ? '%' : ''}
                  {metric.unit === '件' ? '件' : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* グラフ表示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {comparisonType === 'segment' ? 'セグメント比較' : '比較グラフ'}
          </h3>
          
          <div className="flex items-center gap-4">
            {/* グラフタイプ選択 */}
            <label htmlFor="chart-type" className="text-sm text-gray-700">グラフタイプ</label>
            <select
              id="chart-type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="bar">棒グラフ</option>
              <option value="line">折れ線グラフ</option>
              <option value="radar">レーダーチャート</option>
            </select>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={comparisonType === 'segment' ? segmentData : chartData} data-testid="bar-chart-comparison">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={comparisonType === 'segment' ? 'segment' : 'metric'} />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                {comparisonType === 'segment' ? (
                  <>
                    <Bar dataKey="売上" fill="#4F46E5" />
                    <Bar dataKey="注文数" fill="#10B981" />
                  </>
                ) : (
                  <>
                    <Bar dataKey={data.period1.label} fill="#4F46E5" />
                    <Bar dataKey={data.period2.label} fill="#10B981" />
                  </>
                )}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} data-testid="line-chart-comparison">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey={data.period1.label} stroke="#4F46E5" strokeWidth={2} />
                <Line type="monotone" dataKey={data.period2.label} stroke="#10B981" strokeWidth={2} />
              </LineChart>
            ) : (
              <RadarChart data={radarData} data-testid="radar-chart-comparison">
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name={data.period1.label} dataKey={data.period1.label} stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
                <Radar name={data.period2.label} dataKey={data.period2.label} stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 詳細比較テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">詳細比較</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  指標
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期間1
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期間2
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  差分
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  変化率
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric, index) => (
                <tr key={metric.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {metric.unit === '¥' ? '¥' : ''}
                    {metric.period1Value.toLocaleString(undefined, {
                      maximumFractionDigits: metric.unit === '%' ? 1 : 0
                    })}
                    {metric.unit === '%' ? '%' : ''}
                    {metric.unit === '件' ? '件' : ''}
                    {metric.unit === '人' ? '人' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {metric.unit === '¥' ? '¥' : ''}
                    {metric.period2Value.toLocaleString(undefined, {
                      maximumFractionDigits: metric.unit === '%' ? 1 : 0
                    })}
                    {metric.unit === '%' ? '%' : ''}
                    {metric.unit === '件' ? '件' : ''}
                    {metric.unit === '人' ? '人' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={metric.changeRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {metric.changeRate >= 0 ? '+' : ''}
                      {metric.unit === '¥' ? '¥' : ''}
                      {metric.difference.toLocaleString(undefined, {
                        maximumFractionDigits: metric.unit === '%' ? 1 : 0
                      })}
                      {metric.unit === '%' ? '%' : ''}
                      {metric.unit === '件' ? '件' : ''}
                      {metric.unit === '人' ? '人' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={metric.changeRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {metric.changeRate >= 0 ? '+' : ''}{metric.changeRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 指標選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          指標を選択
        </h3>
        <div className="flex flex-wrap gap-3" data-testid="multi-metric-comparison">
          {['売上', '注文数', '平均単価', 'CVR', 'LTV'].map(metricName => (
            <label key={metricName} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metricName)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMetrics([...selectedMetrics, metricName])
                  } else {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metricName))
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">{metricName}</span>
            </label>
          ))}
        </div>
      </div>

      {/* インサイト */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
          インサイト
        </h3>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-3 flex-shrink-0" />
              <span className="text-gray-700">{insight}</span>
            </li>
          ))}
        </ul>
        
        <div className="mt-6">
          <h4 className="font-semibold text-gray-900 mb-2">推奨アクション</h4>
          <ul className="space-y-2">
            {metrics[0].changeRate > 20 && (
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-green-600 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">好調な商品の在庫を確保し、販売機会を最大化</span>
              </li>
            )}
            {metrics[2].changeRate > 10 && (
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-green-600 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                <span className="text-gray-700">アップセル施策が成功している可能性があります。継続を推奨</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* エクスポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">エクスポート</h3>
        <div className="flex gap-4">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            比較レポート（PDF）
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            詳細データ（Excel）
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            サマリー（CSV）
          </button>
        </div>
      </div>

      {/* フィルターパネル */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">フィルター</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="product-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  商品
                </label>
                <input
                  id="product-filter"
                  type="text"
                  value={filter.product}
                  onChange={(e) => setFilter({ ...filter, product: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="商品名を入力"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowFilters(false)
                  // フィルター適用処理
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                適用
              </button>
            </div>
            {filter.product && (
              <div className="mt-4 text-sm text-gray-600">
                フィルター適用中
              </div>
            )}
          </div>
        </div>
      )}

      {/* 期間選択モーダル */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">比較期間を選択</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">プリセット期間</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    前月比
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    前年同月比
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    前四半期比
                  </button>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">カスタム期間</h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="period1-start" className="block text-sm text-gray-600 mb-1">期間1開始日</label>
                    <input
                      id="period1-start"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="period1-end" className="block text-sm text-gray-600 mb-1">期間1終了日</label>
                    <input
                      id="period1-end"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPeriodModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}