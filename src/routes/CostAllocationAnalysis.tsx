import { useState } from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { useVibeLogger } from '../hooks/useVibeLogger'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import DataTable, { Column } from '../components/DataTable'

export default function CostAllocationAnalysis() {
  const logger = useVibeLogger('CostAllocationAnalysis')
  const [selectedPeriod] = useState('2024/08/15 〜 2025/08/14')
  const [selectedMetric, setSelectedMetric] = useState<'cv' | 'cvr'>('cv')
  const [selectedSimulation, setSelectedSimulation] =
    useState('生産性から予算配分可能な広告コストを推測する')

  // Chart data for cumulative contribution
  const chartData = [
    { percentage: 0, cumulative: 0 },
    { percentage: 10, cumulative: 35 },
    { percentage: 20, cumulative: 42 },
    { percentage: 30, cumulative: 60 },
    { percentage: 40, cumulative: 90 },
    { percentage: 50, cumulative: 92 },
    { percentage: 60, cumulative: 94 },
    { percentage: 70, cumulative: 96 },
    { percentage: 80, cumulative: 98 },
    { percentage: 90, cumulative: 100 },
    { percentage: 100, cumulative: 100 },
  ]

  const columns: Column[] = [
    { key: 'media', label: '媒体種別', sortable: true, width: 'w-48' },
    { key: 'performer', label: '表示回数', sortable: true, align: 'right' },
    { key: 'clicks', label: 'クリック数', sortable: true, align: 'right' },
    { key: 'cv', label: 'CV（合計）', sortable: true, align: 'right' },
    { key: 'cvr', label: 'CVR（合計）', sortable: true, align: 'right' },
    { key: 'productivity', label: '生産性（再配分CV）', sortable: true, align: 'right' },
    { key: 'contribution', label: '生産性（再配分売上）', sortable: true, align: 'right' },
    { key: 'cost', label: '広告コスト', sortable: true, align: 'right' },
  ]

  const tableData = [
    {
      media: '合計',
      performer: '218,485,456',
      clicks: '491,162',
      cv: '13,747',
      cvr: '2.80%',
      productivity: '-',
      contribution: '-',
      cost: '¥29,253,895',
      _highlight: 'summary',
    },
    {
      media: 'LINE広告',
      performer: '755,999',
      clicks: '240,389',
      cv: '4,573',
      cvr: '1.90%',
      productivity: '312.87%',
      contribution: '343.42%',
      cost: '¥2,976,899',
    },
    {
      media: 'Yahoo!スポンサードサーチ',
      performer: '632,998',
      clicks: '54,956',
      cv: '2,050',
      cvr: '3.73%',
      productivity: '295.49%',
      contribution: '304.99%',
      cost: '¥1,231,400',
    },
    {
      media: 'GoogleAds',
      performer: '37,670,228',
      clicks: '189,905',
      cv: '6,988',
      cvr: '3.68%',
      productivity: '213.24%',
      contribution: '217.41%',
      cost: '¥7,022,853',
    },
    {
      media: 'アフィリエイト1',
      performer: '508,197',
      clicks: '226',
      cv: '3',
      cvr: '1.33%',
      productivity: '52.94%',
      contribution: '-',
      cost: '¥50,820',
    },
    {
      media: 'testtest',
      performer: '508,197',
      clicks: '3',
      cv: '2',
      cvr: '66.67%',
      productivity: '35.29%',
      contribution: '-',
      cost: '¥50,820',
    },
    {
      media: 'Yahoo!リスティング',
      performer: '17,770,492',
      clicks: '1,436',
      cv: '36',
      cvr: '2.51%',
      productivity: '17.18%',
      contribution: '-',
      cost: '¥1,805,695',
    },
    {
      media: 'Facebook',
      performer: '26,196,721',
      clicks: '916',
      cv: '38',
      cvr: '4.15%',
      productivity: '8.93%',
      contribution: '-',
      cost: '¥2,654,098',
    },
    {
      media: 'LINE',
      performer: '32,655,738',
      clicks: '2,591',
      cv: '23',
      cvr: '1.82%',
      productivity: '6.79%',
      contribution: '-',
      cost: '¥2,282,623',
    },
    {
      media: '[未登録]',
      performer: '105,852,461',
      clicks: '1,387',
      cv: '33',
      cvr: '2.38%',
      productivity: '5.20%',
      contribution: '-',
      cost: '¥10,585,244',
    },
    {
      media: 'アフィリエイト2',
      performer: '5,081,967',
      clicks: '9',
      cv: '1',
      cvr: '11.11%',
      productivity: '4.02%',
      contribution: '-',
      cost: '¥508,197',
    },
    {
      media: 'Facebook(instagram)',
      performer: '131,148',
      clicks: '1',
      cv: '-',
      cvr: '-',
      productivity: '-',
      contribution: '-',
      cost: '¥13,115',
    },
    {
      media: 'ハウスメルマガ',
      performer: '114,754',
      clicks: '25',
      cv: '-',
      cvr: '-',
      productivity: '-',
      contribution: '-',
      cost: '¥11,475',
    },
    {
      media: 'AdverTimes（アドタイ',
      performer: '98,361',
      clicks: '2',
      cv: '-',
      cvr: '-',
      productivity: '-',
      contribution: '-',
      cost: '¥9,836',
    },
    {
      media: 'メルマガ',
      performer: '508,197',
      clicks: '646',
      cv: '-',
      cvr: '-',
      productivity: '-',
      contribution: '-',
      cost: '¥50,820',
    },
  ]

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    logger.action('テーブルソート', { key, direction })
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">コストアロケーション分析</h1>
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
                広告
              </button>
              <span className="text-gray-400">&gt;</span>
              <button className="text-gray-600 hover:text-gray-900">
                コストアロケーション分析
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Cost Effectiveness Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">予算を見直せる広告は？</h2>

          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm text-gray-600">表示：</span>
            <button
              onClick={() => setSelectedMetric('cv')}
              className={`px-3 py-1 text-sm rounded ${
                selectedMetric === 'cv'
                  ? 'bg-[#f6d856] text-gray-800'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              再配分CV
            </button>
            <button
              onClick={() => setSelectedMetric('cvr')}
              className={`px-3 py-1 text-sm rounded ${
                selectedMetric === 'cvr'
                  ? 'bg-[#f6d856] text-gray-800'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              再配分売上
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="percentage"
                  tickFormatter={(value) => `${value}%`}
                  ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  labelFormatter={(label) => `コスト割合: ${label}%`}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#f6d856"
                  strokeWidth={3}
                  dot={{ fill: '#f6d856', r: 5 }}
                  name="再配分CV割合"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-right text-xs text-gray-500 mt-2">コスト割合</div>
        </div>

        {/* Simulation Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-4">シミュレーションタイプ</span>
            <select
              value={selectedSimulation}
              onChange={(e) => setSelectedSimulation(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="生産性から予算配分可能な広告コストを推測する">
                生産性から予算配分可能な広告コストを推測する
              </option>
              <option value="他のシミュレーション">他のシミュレーション</option>
            </select>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-600">
            ※多くまで試算した結果であり、獲得・間接をあす明記されるものではありません。ご了承ください。
          </p>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm">
                <input type="radio" name="display" value="all" defaultChecked className="mr-1" />
                生産性
              </label>
              <label className="text-sm">
                <input type="radio" name="display" value="split" className="mr-1" />
                %以下を
              </label>
              <label className="text-sm">
                %削除すると、他の広告に割り振れる広告コストは...
                <input
                  type="text"
                  className="ml-2 w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="¥"
                />
              </label>
            </div>
            <button className="px-4 py-1 text-sm bg-[#f6d856] text-gray-800 rounded hover:bg-[#e5c945]">
              試算
            </button>
          </div>

          <DataTable
            columns={columns}
            data={tableData}
            onSort={handleSort}
            className="cost-allocation-table"
          />

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">計14件（1～14件）</span>
            <button className="text-sm text-[#f6d856] hover:underline">1</button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>© Oxxx Co., Ltd. All Rights Reserved.</span>
          <a href="#" className="text-[#f6d856] hover:underline">
            プライバシーポリシー
          </a>
          <a href="#" className="text-[#f6d856] hover:underline">
            利用規約約款等
          </a>
        </div>
      </div>
    </div>
  )
}
