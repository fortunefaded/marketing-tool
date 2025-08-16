import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useVibeLogger } from '../hooks/useVibeLogger'
import MetricCard, { MetricData } from '../components/MetricCard'
import { CalendarIcon, ChevronDownIcon, ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const logger = useVibeLogger('Dashboard')

  const campaigns = useQuery(api.campaigns.list, {})
  const tasks = useQuery(api.tasks.list, {})

  const activeCampaigns = campaigns?.filter((c) => c.status === 'active').length ?? 0
  const pendingTasks = tasks?.filter((t) => t.status === 'pending').length ?? 0
  const completedTasks = tasks?.filter((t) => t.status === 'completed').length ?? 0
  const totalTasks = tasks?.length ?? 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  useEffect(() => {
    if (campaigns && tasks) {
      logger.info('ダッシュボード統計情報を取得しました', {
        キャンペーン総数: campaigns.length,
        アクティブキャンペーン数: activeCampaigns,
        タスク総数: totalTasks,
        保留中タスク数: pendingTasks,
        完了タスク数: completedTasks,
        完了率: `${completionRate}%`,
      })
    } else {
      logger.debug('統計情報を読み込み中...')
    }
  }, [
    campaigns,
    tasks,
    logger,
    activeCampaigns,
    pendingTasks,
    completedTasks,
    totalTasks,
    completionRate,
  ])

  const metrics: MetricData[] = [
    {
      label: 'すべてのCV',
      value: 2279,
      format: 'number',
      unit: '件',
      comparison: {
        value: 2279,
        period: '表示見込み',
      },
    },
    {
      label: 'CV（会員登録）',
      value: 0,
      format: 'number',
      unit: '件',
      comparison: {
        value: 0,
        period: '表示見込み：0件',
      },
    },
    {
      label: 'CV ()',
      value: 0,
      format: 'number',
      unit: '件',
      comparison: {
        value: 0,
        period: '表示見込み：0件',
      },
    },
    {
      label: 'クリック数',
      value: 78929,
      format: 'number',
      unit: '件',
      comparison: {
        value: 78929,
        period: '表示見込み',
      },
      progressBar: {
        value: 80,
        max: 100,
        label: '対目標',
      },
      status: 'good',
    },
    {
      label: '広告コスト',
      value: 0,
      format: 'currency',
      comparison: {
        value: 0,
        period: '表示見込み：¥0',
      },
      progressBar: {
        value: 0,
        max: 100,
        label: '対目標',
      },
      status: 'bad',
    },
    {
      label: 'CPA（会員登録）',
      value: 0,
      format: 'currency',
      comparison: {
        value: 0,
        period: '表示見込み：¥0',
      },
      progressBar: {
        value: 0,
        max: 100,
        label: '対目標',
      },
      status: 'bad',
    },
    {
      label: 'CV ()',
      value: 0,
      format: 'number',
      unit: '件',
      comparison: {
        value: 0,
        period: '表示見込み：0件',
      },
      progressBar: {
        value: 0,
        max: 100,
        label: '対目標',
      },
      status: 'bad',
    },
  ]

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-6">{formattedDate}の運送状況は？</h1>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm">目標と比較する</span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>

              <select className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>2024年10月分</option>
                <option>2024年9月分</option>
                <option>2024年8月分</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              data={metric}
              onClick={() => logger.action('メトリックカードクリック', { metric: metric.label })}
            />
          ))}
        </div>

        {/* Meta広告ダッシュボードへのクイックアクセス */}
        <div className="mb-8">
          <Link
            to="/meta-dashboard"
            className="block bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <ChartBarIcon className="h-10 w-10" />
                <div>
                  <h3 className="text-lg font-bold">Meta広告ダッシュボード</h3>
                  <p className="text-sm text-blue-100">リアルタイム分析・比較分析・アラート機能を確認</p>
                </div>
              </div>
              <ArrowRightIcon className="h-6 w-6" />
            </div>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{formattedDate}の推移は？</h2>
            <a href="#" className="text-sm text-[#f6d856] hover:underline">
              現体ここに成果指標を確認
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 text-sm">
                    <span className="w-2 h-2 bg-[#f6d856] rounded-full"></span>
                    <span>すべてのCV</span>
                  </button>
                </div>
                <span className="text-gray-400">対</span>
                <select className="text-sm border-b border-gray-300 pb-1 focus:outline-none">
                  <option>CV（会員登録）</option>
                  <option>クリック数</option>
                </select>
              </div>
            </div>

            <div className="h-64 flex items-center justify-center">
              <div className="w-full h-full relative">
                <svg className="w-full h-full">
                  <line x1="0" y1="100%" x2="100%" y2="20%" stroke="#f6d856" strokeWidth="2" />
                  <circle cx="10%" cy="80%" r="4" fill="#f6d856" />
                  <circle cx="20%" cy="70%" r="4" fill="#f6d856" />
                  <circle cx="30%" cy="60%" r="4" fill="#f6d856" />
                  <circle cx="40%" cy="50%" r="4" fill="#f6d856" />
                  <circle cx="50%" cy="40%" r="4" fill="#f6d856" />
                  <circle cx="60%" cy="35%" r="4" fill="#f6d856" />
                  <circle cx="70%" cy="30%" r="4" fill="#f6d856" />
                  <circle cx="80%" cy="25%" r="4" fill="#f6d856" />
                  <circle cx="90%" cy="20%" r="4" fill="#f6d856" />
                </svg>
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <div className="text-xs text-gray-500">10/1(火) から 10/31(木) までの推移</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {formattedDate}の着地数に前月より大きく変化がある媒体は？
          </h3>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
              <span className="text-2xl">📈</span>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">GoogleAds</span>は、
                  <span className="text-green-600 font-bold">前月より+1,204件</span>
                  での着地でした。
                </p>
              </div>
              <button className="text-sm text-[#f6d856] hover:underline">変化した要因を探す</button>
            </div>

            <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded">
              <span className="text-2xl">📉</span>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">前月よりマイナスで着地する媒体はありません。</span>
                </p>
              </div>
              <button className="text-sm text-[#f6d856] hover:underline">その他の変化を確認</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
