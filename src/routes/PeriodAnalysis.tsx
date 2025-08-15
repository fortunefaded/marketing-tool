import { useState } from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { useVibeLogger } from '../hooks/useVibeLogger'
import PeriodChart from '../components/PeriodChart'
import DataTable, { Column } from '../components/DataTable'

export default function PeriodAnalysis() {
  const logger = useVibeLogger('PeriodAnalysis')
  const [selectedPeriod] = useState('2024/08/15 〜 2025/08/14')
  const [graphType, setGraphType] = useState<'click' | 'view'>('click')
  const [selectedSeries, setSelectedSeries] = useState<string[]>([
    '広告クリック/GoogleAds/指名/ブランド・・・',
    '広告クリック/GoogleAds/非指名/施み関・・・',
  ])

  // Generate mock data for the chart
  const generateChartData = () => {
    const data = []
    const startDate = new Date('2024-08-15')

    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      const dateStr = date.toISOString().split('T')[0]
      const baseValue = Math.random() * 10000

      data.push({
        date: dateStr,
        googleAds1: Math.floor(baseValue + Math.random() * 5000),
        googleAds2: Math.floor(baseValue * 0.8 + Math.random() * 3000),
        googleAds3: Math.floor(baseValue * 0.6 + Math.random() * 2000),
        yahoo: Math.floor(baseValue * 0.4 + Math.random() * 1500),
        line1: Math.floor(baseValue * 0.3 + Math.random() * 1000),
        line2: Math.floor(baseValue * 0.25 + Math.random() * 800),
        affiliate: Math.floor(baseValue * 0.2 + Math.random() * 500),
        natural: Math.floor(baseValue * 0.15 + Math.random() * 300),
        google: Math.floor(baseValue * 0.1 + Math.random() * 200),
      })
    }

    // Add some spikes
    data[120].googleAds1 = 30000
    data[180].googleAds2 = 25000
    data[240].googleAds1 = 28000

    return data
  }

  const chartData = generateChartData()

  const chartSeries = [
    { dataKey: 'googleAds1', name: '広告クリック/GoogleAds/指名/ブランド・・・', color: '#f6d856' },
    { dataKey: 'googleAds2', name: '広告クリック/GoogleAds/非指名/施み関・・・', color: '#4ECDC4' },
    {
      dataKey: 'googleAds3',
      name: '広告クリック/GoogleAds/オーディエンス・・・',
      color: '#45B7D1',
    },
    { dataKey: 'yahoo', name: '広告クリック/Yahoo!スポンサードサーチ・・・', color: '#10b981' },
    { dataKey: 'line1', name: '広告クリック/LINE広告/オーディエンス・・・', color: '#8b5cf6' },
    { dataKey: 'line2', name: '広告クリック/LINE広告/類似配信/コンバー・・・', color: '#14b8a6' },
    { dataKey: 'affiliate', name: '広告クリック/アフィリエイト（A8）/[未・・・', color: '#f97316' },
    { dataKey: 'natural', name: '広告クリック/[自社媒体] メールマガジン・・・', color: '#6366f1' },
    { dataKey: 'google', name: '自然検索/Google', color: '#ec4899' },
    { dataKey: 'googleAds4', name: '広告クリック/GoogleAds/指名/商品名・・・', color: '#84cc16' },
  ]

  const activeChartSeries = chartSeries.filter((s) => selectedSeries.includes(s.name))

  const columns: Column[] = [
    { key: 'period', label: '期間', sortable: true },
    { key: 'clickVolume', label: '表示回数', sortable: true, align: 'right' },
    { key: 'clickCount', label: 'クリック/流入回数', sortable: true, align: 'right' },
    { key: 'cvCount', label: 'CV（会計）', sortable: true, align: 'right' },
    { key: 'cvr', label: 'CVR（会計）', sortable: true, align: 'right' },
    { key: 'cpa', label: 'CPA', sortable: true, align: 'right' },
    { key: 'initialContact', label: '初回接触', sortable: true, align: 'right' },
    { key: 'adCost', label: '広告コスト', sortable: true, align: 'right' },
    { key: 'roas', label: 'ROAS', sortable: true, align: 'right' },
  ]

  const tableData = [
    {
      period: '合計',
      clickVolume: '218,485,456',
      clickCount: '604,551',
      cvCount: '5,285',
      cvr: '0.87%',
      cpa: '¥5,535',
      initialContact: '4,302',
      adCost: '¥29,253,895',
      roas: '35.33%',
      _highlight: 'summary',
    },
    {
      period: '2024/08/15 (木)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/16 (金)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/17 (土)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/18 (日)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/19 (月)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/20 (火)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
    {
      period: '2024/08/21 (水)',
      clickVolume: '-',
      clickCount: '-',
      cvCount: '-',
      cvr: '-',
      cpa: '-',
      initialContact: '-',
      adCost: '-',
      roas: '-',
    },
  ]

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    logger.action('テーブルソート', { key, direction })
  }

  const toggleSeries = (seriesName: string) => {
    setSelectedSeries((prev) => {
      if (prev.includes(seriesName)) {
        return prev.filter((s) => s !== seriesName)
      } else {
        return [...prev, seriesName]
      }
    })
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">期間分析</h1>
              <span className="text-sm text-gray-500">集計軸：アドエビス項目で集計</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm">{selectedPeriod}</span>
              </button>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <nav className="flex items-center space-x-2 text-sm">
              <button className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                全トラフィック
              </button>
              <span className="text-gray-400">&gt;</span>
              <button className="text-gray-600 hover:text-gray-900">期間分析</button>
            </nav>

            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">
                期間別グラフ
                <select
                  className="ml-2 text-sm border-b border-gray-300 pb-1 focus:outline-none"
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value as 'click' | 'view')}
                >
                  <option value="click">グラフを非表示</option>
                  <option value="view">グラフを表示</option>
                </select>
              </label>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">指標</label>
                <select className="text-sm border-b border-gray-300 pb-1 focus:outline-none">
                  <option>クリック/流入回数</option>
                  <option>CV（会計）</option>
                  <option>CVR（会計）</option>
                </select>
              </div>

              <button className="text-sm text-[#f6d856] hover:underline">指標を追加</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-gray-700">クリック/流入回数</h2>
              <div className="flex items-center space-x-2 text-xs">
                <button className="px-2 py-1 bg-gray-100 rounded">日</button>
                <button className="px-2 py-1 hover:bg-gray-100 rounded">月</button>
                <button className="px-2 py-1 hover:bg-gray-100 rounded">曜日</button>
                <button className="px-2 py-1 hover:bg-gray-100 rounded">時間帯</button>
                <button className="px-2 py-1 hover:bg-gray-100 rounded">月日</button>
              </div>
            </div>
          </div>

          <div className="h-64">
            <PeriodChart data={chartData} series={activeChartSeries} height={250} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              グラフの表示項目{' '}
              <button className="text-[#f6d856] hover:underline ml-1">項目を変更</button>
            </div>

            <div className="flex flex-wrap gap-2">
              {chartSeries.map((series) => (
                <button
                  key={series.dataKey}
                  onClick={() => toggleSeries(series.name)}
                  className={`flex items-center space-x-1 px-2 py-1 text-xs rounded border ${
                    selectedSeries.includes(series.name)
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-white border-gray-200 opacity-50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="truncate max-w-[150px]">{series.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <DataTable
            columns={columns}
            data={tableData}
            onSort={handleSort}
            className="period-analysis-table"
          />
        </div>
      </div>
    </div>
  )
}
