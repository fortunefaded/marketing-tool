import { useState } from 'react'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import DataTable, { Column } from '../components/DataTable'
import { useVibeLogger } from '../hooks/useVibeLogger'

export default function LandingPageAnalysis() {
  const logger = useVibeLogger('LandingPageAnalysis')
  const [selectedPeriod] = useState('2024/08/15 〜 2025/08/14')
  const [currentPage, setCurrentPage] = useState(1)

  const columns: Column[] = [
    { key: 'landingPageUrl', label: 'ランディングページURL', sortable: true, width: 'w-96' },
    { key: 'clickCount', label: 'クリック/流入回数', sortable: true, align: 'right' },
    { key: 'cvCount', label: 'CV（合計）', sortable: true, align: 'right' },
    { key: 'cvRate', label: 'CVR（合計）', sortable: true, align: 'right' },
    { key: 'bounceRate', label: '開接効果\n開接効果（合計）', sortable: true, align: 'right' },
    { key: 'assistCV', label: '再配分CV', sortable: true, align: 'right' },
  ]

  const mockData = [
    {
      landingPageUrl: '合計',
      clickCount: '604,551',
      cvCount: '5,285',
      cvRate: '0.87%',
      bounceRate: '3,965',
      assistCV: '4,545.37',
      _highlight: 'summary',
    },
    {
      landingPageUrl: 'ec.example.ne.jp/campaign/',
      clickCount: '37,559',
      cvCount: '1,892',
      cvRate: '5.04%',
      bounceRate: '1,208',
      assistCV: '1,597.90',
    },
    {
      landingPageUrl: 'ec.example.ne.jp/product/',
      clickCount: '59,802',
      cvCount: '1,291',
      cvRate: '2.16%',
      bounceRate: '668',
      assistCV: '1,070.80',
    },
    {
      landingPageUrl: '',
      clickCount: '381,179',
      cvCount: '614',
      cvRate: '0.16%',
      bounceRate: '319',
      assistCV: '290.89',
    },
    {
      landingPageUrl: 'aaa.com/',
      clickCount: '27,073',
      cvCount: '612',
      cvRate: '2.26%',
      bounceRate: '860',
      assistCV: '811.22',
    },
    {
      landingPageUrl: 'aaa.com/purchase',
      clickCount: '12,098',
      cvCount: '539',
      cvRate: '4.46%',
      bounceRate: '103',
      assistCV: '393.00',
    },
    {
      landingPageUrl: 'ebis.ne.jp/',
      clickCount: '5,080',
      cvCount: '55',
      cvRate: '1.08%',
      bounceRate: '151',
      assistCV: '67.25',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/btob_ac',
      clickCount: '1,035',
      cvCount: '35',
      cvRate: '3.38%',
      bounceRate: '18',
      assistCV: '27.75',
    },
    {
      landingPageUrl: 'xxx.aaa.com/how-to-',
      clickCount: '17,606',
      cvCount: '30',
      cvRate: '0.17%',
      bounceRate: '72',
      assistCV: '55.28',
    },
    {
      landingPageUrl: 'xxx.aaa.com/healthc',
      clickCount: '15,257',
      cvCount: '26',
      cvRate: '0.17%',
      bounceRate: '59',
      assistCV: '16.05',
    },
    {
      landingPageUrl: 'xxx.aaa.com/how-to-',
      clickCount: '20,298',
      cvCount: '24',
      cvRate: '0.12%',
      bounceRate: '65',
      assistCV: '54.12',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/lpform/',
      clickCount: '338',
      cvCount: '20',
      cvRate: '5.92%',
      bounceRate: '2',
      assistCV: '9.33',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/seminar',
      clickCount: '325',
      cvCount: '16',
      cvRate: '4.92%',
      bounceRate: '13',
      assistCV: '10.17',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/d2c_ad',
      clickCount: '510',
      cvCount: '13',
      cvRate: '2.55%',
      bounceRate: '14',
      assistCV: '9.17',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/seminar',
      clickCount: '94',
      cvCount: '12',
      cvRate: '12.77%',
      bounceRate: '27',
      assistCV: '10.53',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/ec_adeb',
      clickCount: '298',
      cvCount: '10',
      cvRate: '3.36%',
      bounceRate: '8',
      assistCV: '10.12',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/data_an',
      clickCount: '512',
      cvCount: '9',
      cvRate: '1.76%',
      bounceRate: '14',
      assistCV: '8.26',
    },
    {
      landingPageUrl: 'go.ebis.ne.jp/seminar',
      clickCount: '257',
      cvCount: '9',
      cvRate: '3.50%',
      bounceRate: '10',
      assistCV: '5.70',
    },
  ]

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    logger.action('テーブルソート', { key, direction })
  }

  const totalPages = 4
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">ランディングページ分析</h1>
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
              <button className="text-gray-600 hover:text-gray-900">ランディングページ分析</button>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">計672件（1～200件）</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`p-1 ${currentPage === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'} rounded`}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>

                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === num
                        ? 'bg-[#f6d856] text-gray-800'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-1 ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'} rounded`}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm">
          <DataTable
            columns={columns}
            data={mockData}
            onSort={handleSort}
            className="landing-page-table"
          />
        </div>
      </div>
    </div>
  )
}
