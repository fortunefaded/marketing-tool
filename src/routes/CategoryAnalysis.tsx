import { useState } from 'react'
import { CalendarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import DataTable, { Column } from '../components/DataTable'
import { useVibeLogger } from '../hooks/useVibeLogger'
import { calculateTotals } from '../utils/calculateTotals'

// interface CategoryData {
//   category: string
//   subCategory: string
//   details: string
//   clicks: number
//   uniqueClicks: number
//   cvRegistrations: number
//   cvRate: number
//   ctr: number
//   cpa: number
//   roas: number
//   cost: number
// }

export default function CategoryAnalysis() {
  const logger = useVibeLogger('CategoryAnalysis')
  const [selectedPeriod] = useState('2024/06/19 〜 2025/06/14')

  const columns: Column[] = [
    { key: 'category', label: '媒体', sortable: true, width: 'w-24' },
    { key: 'subCategory', label: '媒体キャンペーン', sortable: true, width: 'w-32' },
    { key: 'details', label: '表示回数', sortable: true, align: 'right' },
    { key: 'clicks', label: 'クリック数', sortable: true, align: 'right' },
    { key: 'uniquePv', label: '画PV', sortable: true, align: 'right' },
    { key: 'directContribution', label: '総寄与時間', sortable: true, align: 'right' },
    { key: 'purchaseCount', label: '購入数', sortable: true, align: 'right' },
    { key: 'purchaseUsers', label: 'CV', sortable: true, align: 'right' },
    { key: 'sampleCv19', label: 'サンプルCV19', sortable: true, align: 'right' },
    { key: 'cv', label: 'CV（会計）', sortable: true, align: 'right' },
    { key: 'cvr', label: 'CVR（会計）', sortable: true, align: 'right' },
    { key: 'cost', label: '広告コスト', sortable: true, align: 'right' },
  ]

  const rawData = [
    {
      category: 'GoogleAds',
      subCategory: '指名',
      details: '1,852,147',
      clicks: '135,603',
      uniquePv: '',
      directContribution: '',
      purchaseCount: '291',
      purchaseUsers: '5,064',
      sampleCv19: '',
      cv: '5,355',
      cvr: '3.95%',
      cost: '¥2,336,011',
    },
    {
      category: 'LINE広告',
      subCategory: 'オーディエンス',
      details: '345,270',
      clicks: '88,433',
      uniquePv: '',
      directContribution: '',
      purchaseCount: '203',
      purchaseUsers: '3,127',
      sampleCv19: '',
      cv: '3,330',
      cvr: '3.77%',
      cost: '¥1,362,019',
    },
    {
      category: 'Yahoo!スポンサードサーチ',
      subCategory: '指名',
      details: '632,998',
      clicks: '54,956',
      uniquePv: '',
      directContribution: '',
      purchaseCount: '110',
      purchaseUsers: '1,940',
      sampleCv19: '',
      cv: '2,050',
      cvr: '3.73%',
      cost: '¥1,231,400',
    },
    {
      category: 'GoogleAds',
      subCategory: 'オーディエンス',
      details: '792,247',
      clicks: '43,940',
      uniquePv: '',
      directContribution: '',
      purchaseCount: '',
      purchaseUsers: '1,399',
      sampleCv19: '',
      cv: '1,399',
      cvr: '3.18%',
      cost: '¥763,989',
    },
    {
      category: 'LINE広告',
      subCategory: '類似配信',
      details: '410,729',
      clicks: '151,956',
      uniquePv: '',
      directContribution: '',
      purchaseCount: '',
      purchaseUsers: '1,243',
      sampleCv19: '',
      cv: '1,243',
      cvr: '0.82%',
      cost: '¥1,594,880',
    },
  ]

  // Calculate totals and prepend to data
  const totals = calculateTotals(rawData)
  const mockData = [totals, ...rawData]

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    logger.action('テーブルソート', { key, direction })
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <nav className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">広告</span>
                <span className="text-gray-400">&gt;</span>
                <span className="font-medium text-gray-900">カテゴリ分析</span>
              </nav>
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

            <div className="text-sm text-gray-600">集計軸：媒体項目で集計</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">ドリルアップ↑</span>
              <nav className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">配信先 / </span>
                <span className="text-gray-500">インバウンドを細分化 / </span>
                <span className="font-medium text-gray-900">広告タイプ</span>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">計42件（11～40件）</span>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-gray-200 rounded">前</button>
                <span className="text-sm">1</span>
                <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                  2
                </button>
                <button className="px-3 py-1 text-sm bg-gray-200 rounded">次</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Bubble Chart Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">設置を4分類した時の施策評価は？</h2>
            <button className="text-sm text-[#f6d856] hover:underline">グラフを非表示</button>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">縦軸：</span>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>CV（合計）</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">対</span>
              <span className="text-sm text-gray-600">横軸：</span>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>CVR（合計）</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">：</span>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>CV（合計）+CVR（合計）</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Chart Column */}
            <div>
              <div className="relative h-64 border border-gray-200 rounded">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {/* Quadrant A */}
                  <div className="border-r border-b border-gray-200 bg-blue-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">A</span>
                  </div>
                  {/* Quadrant B */}
                  <div className="border-b border-gray-200 bg-green-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">B</span>
                  </div>
                  {/* Quadrant C */}
                  <div className="border-r border-gray-200 bg-orange-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">C</span>
                  </div>
                  {/* Quadrant D */}
                  <div className="bg-red-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-300">D</span>
                  </div>
                </div>

                {/* Data points */}
                <div className="absolute inset-0">
                  <div className="absolute" style={{ top: '75%', left: '15%' }}>
                    <div className="w-12 h-12 bg-gray-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '60%', left: '35%' }}>
                    <div className="w-10 h-10 bg-yellow-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '45%', left: '20%' }}>
                    <div className="w-16 h-16 bg-green-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '30%', left: '70%' }}>
                    <div className="w-8 h-8 bg-blue-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '85%', left: '55%' }}>
                    <div className="w-6 h-6 bg-purple-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '65%', left: '85%' }}>
                    <div className="w-10 h-10 bg-red-400 rounded-full opacity-60"></div>
                  </div>
                  <div className="absolute" style={{ top: '25%', left: '45%' }}>
                    <div className="w-14 h-14 bg-orange-400 rounded-full opacity-60"></div>
                  </div>
                </div>

                {/* Axis labels */}
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-500 -mb-5">
                  CVR（合計）（%）
                </div>
                <div className="absolute top-0 bottom-0 left-0 text-xs text-gray-500 -ml-16 flex items-center">
                  <span className="transform -rotate-90">CV（合計）</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-6 text-xs">
                  <span className="text-gray-600">計27件（1～27件）</span>
                  <button className="text-[#f6d856] hover:underline">1</button>
                </div>

                <div className="text-xs text-gray-600">
                  <button className="text-[#f6d856] hover:underline">設定を変更</button>
                </div>
              </div>
            </div>

            {/* Legend Column */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">グラフの表示項目</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>LINE広告/オーディエンスセグメント</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span>GoogleAds/オーディエンス ターゲット</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span>GoogleAds/指名</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span>Yahoo!スポンサードサーチ/指名</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span>LINE広告/類似配信</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>[自社媒体] メールマガジン[未登録]</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span>アフィリエイト/[未登録]（未登録）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                  <span>Facebook/既存顧客</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                  <span>[未登録]/[未登録]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <DataTable columns={columns} data={mockData} onSort={handleSort} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span>計27件（1～27件）</span>
            <button className="ml-4 text-[#f6d856] hover:underline">1</button>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#f6d856] text-gray-800 rounded hover:bg-[#e5c945]">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span className="text-sm">CSVをエクスポート</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <span>© Oxxx Co., Ltd. All Rights Reserved.</span>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-[#f6d856] hover:underline">
              プライバシーポリシー
            </a>
            <a href="#" className="text-[#f6d856] hover:underline">
              利用規約約款等
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
