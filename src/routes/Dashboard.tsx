import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useVibeLogger } from '../hooks/useVibeLogger'
import MetricCard, { MetricData } from '../components/MetricCard'

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

  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')

  const metrics: MetricData[] = [
    {
      label: '広告コスト',
      value: 972486,
      format: 'currency',
      trend: 'up',
      comparison: {
        value: 2.5,
        period: '表示見込み',
      },
      status: 'normal',
    },
    {
      label: 'すべてのCV',
      value: 2008,
      format: 'number',
      unit: '件',
      trend: 'up',
      comparison: {
        value: 12.5,
        period: '表示見込み',
      },
      status: 'good',
    },
    {
      label: 'CV（リード）',
      value: 230,
      format: 'number',
      unit: '件',
      trend: 'up',
      comparison: {
        value: 8.3,
        period: '表示見込み',
      },
      status: 'good',
    },
    {
      label: 'CV（Mリード）',
      value: 178,
      format: 'number',
      unit: '件',
      trend: 'down',
      comparison: {
        value: -3.2,
        period: '表示見込み',
      },
      status: 'bad',
    },
    {
      label: 'すべての売上総額',
      value: 0,
      format: 'currency',
      trend: 'neutral',
      comparison: {
        value: 0,
        period: '表示見込み',
      },
      status: 'bad',
    },
    {
      label: 'すべてのROAS',
      value: 0.0,
      format: 'percentage',
      trend: 'neutral',
      comparison: {
        value: 0,
        period: '表示見込み',
      },
      status: 'bad',
    },
    {
      label: '流入数',
      value: 68572,
      format: 'number',
      unit: '件',
      trend: 'up',
      comparison: {
        value: 5.4,
        period: '表示見込み',
      },
      status: 'over',
    },
  ]

  const today = new Date()
  const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月`

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{formattedDate}の運用状況は？</h1>

        <div className="flex items-center space-x-4 mb-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <span className="text-sm">日付と比較する</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">期間：今月（2025/08/01 ～ 2025/08/13）</option>
            <option value="week">期間：今週</option>
            <option value="month">期間：今月</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            data={metric}
            onClick={() => logger.action('メトリックカードクリック', { metric: metric.label })}
          />
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{formattedDate}の推移は？</h2>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <button className="flex items-center space-x-2 text-sm font-medium text-red-600 pb-2 border-b-2 border-red-600">
                <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                <span>すべてのCV</span>
              </button>
              <button className="flex items-center space-x-2 text-sm font-medium text-gray-500 pb-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                <span>CV（Mリード）</span>
              </button>
            </div>

            <select className="text-sm px-3 py-1 border border-gray-300 rounded-md">
              <option>流入数</option>
              <option>クリック数</option>
              <option>コスト</option>
            </select>
          </div>

          <div className="h-64 flex items-center justify-center text-gray-400 border border-gray-200 rounded">
            [チャートエリア - 実装予定]
          </div>
        </div>
      </div>

      <div className="text-right text-xs text-gray-500 mt-8">現体ここに成果を確認</div>
    </div>
  )
}
