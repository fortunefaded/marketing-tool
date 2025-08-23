import React, { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface FatigueTrendData {
  date: string
  totalScore: number
  audienceScore: number
  creativeScore: number
  algorithmScore: number
  frequency?: number
  ctr?: number
  cpm?: number
  firstTimeRatio?: number
}

interface FatigueTrendProps {
  data: FatigueTrendData[]
  showMetrics?: boolean
  height?: number
}

export const FatigueTrend: React.FC<FatigueTrendProps> = ({
  data,
  showMetrics = false,
  height = 300,
}) => {
  // 折りたたみ状態の管理
  const [isExpanded, setIsExpanded] = useState(true)
  const [isFrequencyExpanded, setIsFrequencyExpanded] = useState(true)
  const [isPerformanceExpanded, setIsPerformanceExpanded] = useState(true)
  // データの整形
  const chartData = useMemo(() => {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const labels = sortedData.map((d) => format(new Date(d.date), 'M/d', { locale: ja }))

    const datasets = [
      {
        label: '総合スコア',
        data: sortedData.map((d) => d.totalScore),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'オーディエンス',
        data: sortedData.map((d) => d.audienceScore),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        borderDash: [5, 5],
      },
      {
        label: 'クリエイティブ',
        data: sortedData.map((d) => d.creativeScore),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        borderDash: [5, 5],
      },
      {
        label: 'アルゴリズム',
        data: sortedData.map((d) => d.algorithmScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        borderDash: [5, 5],
      },
    ]

    return { labels, datasets }
  }, [data])

  // メトリクスチャートデータ
  const metricsChartData = useMemo(() => {
    if (!showMetrics) return null

    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const labels = sortedData.map((d) => format(new Date(d.date), 'M/d', { locale: ja }))

    return {
      frequency: {
        labels,
        datasets: [
          {
            label: 'フリークエンシー',
            data: sortedData.map((d) => d.frequency || 0),
            borderColor: 'rgb(251, 146, 60)',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      performance: {
        labels,
        datasets: [
          {
            label: 'CTR (%)',
            data: sortedData.map((d) => (d.ctr || 0) * 100),
            borderColor: 'rgb(147, 51, 234)',
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: '新規リーチ率 (%)',
            data: sortedData.map((d) => (d.firstTimeRatio || 0) * 100),
            borderColor: 'rgb(20, 184, 166)',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'CPM (¥)',
            data: sortedData.map((d) => d.cpm || 0),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
    }
  }, [data, showMetrics])

  // チャートオプション
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y.toFixed(0)
            return `${label}: ${value}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: (value: any) => `${value}`,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  // メトリクス用オプション
  const metricsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          callback: (value: any) => `¥${value}`,
        },
      },
    },
  }

  // 危険域の背景を描画
  const dangerZonePlugin = {
    id: 'dangerZone',
    beforeDraw: (chart: any) => {
      const ctx = chart.ctx
      const chartArea = chart.chartArea
      const yScale = chart.scales.y

      // 危険域（70以上）
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'
      ctx.fillRect(
        chartArea.left,
        yScale.getPixelForValue(100),
        chartArea.right - chartArea.left,
        yScale.getPixelForValue(70) - yScale.getPixelForValue(100)
      )

      // 警告域（50-70）
      ctx.fillStyle = 'rgba(251, 146, 60, 0.1)'
      ctx.fillRect(
        chartArea.left,
        yScale.getPixelForValue(70),
        chartArea.right - chartArea.left,
        yScale.getPixelForValue(50) - yScale.getPixelForValue(70)
      )

      // 注意域（30-50）
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)'
      ctx.fillRect(
        chartArea.left,
        yScale.getPixelForValue(50),
        chartArea.right - chartArea.left,
        yScale.getPixelForValue(30) - yScale.getPixelForValue(50)
      )
    },
  }

  return (
    <div className="w-full space-y-6">
      {/* 疲労度スコアグラフ */}
      <div className="w-full">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">疲労度スコアの推移</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
            
            {isExpanded && (
              <>
                <div className="w-full" style={{ height: `${height}px` }}>
                  <Line data={chartData} options={options} plugins={[dangerZonePlugin]} />
                </div>

                {/* 凡例 */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600 border-t pt-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-2"></div>
                    <span>危険域 (70-100)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-2"></div>
                    <span>警告域 (50-70)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                    <span>注意域 (30-50)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                    <span>健全域 (0-30)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* メトリクスグラフ */}
      {showMetrics && metricsChartData && (
        <>
          {/* フリークエンシー */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">フリークエンシーの推移</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFrequencyExpanded(!isFrequencyExpanded)
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isFrequencyExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>
                {isFrequencyExpanded && (
                  <div className="w-full" style={{ height: '250px' }}>
                    <Line data={metricsChartData.frequency} options={metricsOptions} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* パフォーマンスメトリクス */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">エンゲージメント指標</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsPerformanceExpanded(!isPerformanceExpanded)
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isPerformanceExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>
                {isPerformanceExpanded && (
                  <div className="w-full" style={{ height: '250px' }}>
                    <Line data={metricsChartData.performance} options={metricsOptions} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
