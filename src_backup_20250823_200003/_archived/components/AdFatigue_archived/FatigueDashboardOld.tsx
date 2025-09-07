import React, { useState, useEffect } from 'react'
import { FatigueScoreCard } from './FatigueScoreCard'
import { FatigueAlert } from './FatigueAlert'
import { FatigueTrend } from './FatigueTrend'
import { useFatigueAnalysis } from '../../hooks/useAdFatigue'
import { useAdFatigueRealSafe as useAdFatigueReal } from '../../hooks/useAdFatigueRealSafe'
// import { useAdFatigueRealSafeDebug as useAdFatigueReal } from '../../hooks/useAdFatigueRealSafeDebug'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface FatigueDashboardProps {
  accountId: string
}

export const FatigueDashboard: React.FC<FatigueDashboardProps> = ({ accountId }) => {
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  const { typeBreakdown, levelBreakdown, criticalAds, recommendedActions } =
    useFatigueAnalysis(accountId)

  // 実際のMeta APIデータから全広告の疲労度分析を取得
  const { error: apiError } = useAdFatigueReal(accountId)

  // 選択された広告の疲労度データ
  const { error: fatigueError } = useAdFatigueReal(accountId, selectedAdId || undefined)

  // エラーをコンソールに出力
  useEffect(() => {
    if (apiError) {
      console.error('API Error in FatigueDashboard:', apiError)
    }
    if (fatigueError) {
      console.error('Fatigue Error in FatigueDashboard:', fatigueError)
    }
  }, [apiError, fatigueError])

  // サンプルデータ（実際のデータがない場合のフォールバック）
  const sampleFatigueData = {
    adId: '123456',
    adName: 'サマーセールキャンペーン - 動画広告A',
    fatigueScore: {
      total: 72,
      breakdown: {
        audience: 85,
        creative: 70,
        algorithm: 45,
      },
      primaryIssue: 'audience' as const,
      status: 'critical' as const,
    },
    metrics: {
      frequency: 3.8,
      firstTimeRatio: 0.28,
      ctrDeclineRate: 0.32,
      cpmIncreaseRate: 0.42,
    },
  }

  const sampleTrendData = [
    {
      date: '2024-01-15',
      totalScore: 25,
      audienceScore: 30,
      creativeScore: 20,
      algorithmScore: 25,
      frequency: 2.1,
      ctr: 0.025,
      cpm: 450,
      firstTimeRatio: 0.65,
    },
    {
      date: '2024-01-16',
      totalScore: 28,
      audienceScore: 35,
      creativeScore: 22,
      algorithmScore: 26,
      frequency: 2.3,
      ctr: 0.024,
      cpm: 460,
      firstTimeRatio: 0.62,
    },
    {
      date: '2024-01-17',
      totalScore: 35,
      audienceScore: 45,
      creativeScore: 28,
      algorithmScore: 30,
      frequency: 2.6,
      ctr: 0.022,
      cpm: 480,
      firstTimeRatio: 0.58,
    },
    {
      date: '2024-01-18',
      totalScore: 42,
      audienceScore: 55,
      creativeScore: 35,
      algorithmScore: 32,
      frequency: 2.9,
      ctr: 0.02,
      cpm: 510,
      firstTimeRatio: 0.52,
    },
    {
      date: '2024-01-19',
      totalScore: 55,
      audienceScore: 68,
      creativeScore: 50,
      algorithmScore: 38,
      frequency: 3.2,
      ctr: 0.018,
      cpm: 550,
      firstTimeRatio: 0.45,
    },
    {
      date: '2024-01-20',
      totalScore: 65,
      audienceScore: 78,
      creativeScore: 62,
      algorithmScore: 42,
      frequency: 3.5,
      ctr: 0.015,
      cpm: 600,
      firstTimeRatio: 0.35,
    },
    {
      date: '2024-01-21',
      totalScore: 72,
      audienceScore: 85,
      creativeScore: 70,
      algorithmScore: 45,
      frequency: 3.8,
      ctr: 0.012,
      cpm: 650,
      firstTimeRatio: 0.28,
    },
  ]

  // サマリーカード
  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )

  // エラーメッセージを表示
  if (apiError) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              疲労度分析機能は現在デモモードで動作しています。
              <br />
              実際のデータを使用するには、Convexサーバーの設定が必要です。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">広告疲労度分析ダッシュボード</h2>
            <p className="text-sm text-gray-500 mt-1">
              広告の疲労度を3つの観点から分析し、最適な対応策を提案します
            </p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            全広告を分析
          </button>
        </div>
      </div>

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="分析済み広告数"
          value={(criticalAds || []).length || 24}
          icon={ChartBarIcon}
          color="bg-indigo-500"
        />
        <SummaryCard
          title="危険域の広告"
          value={levelBreakdown?.critical?.count || 3}
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
        />
        <SummaryCard
          title="警告域の広告"
          value={levelBreakdown?.warning?.count || 5}
          icon={InformationCircleIcon}
          color="bg-orange-500"
        />
        <SummaryCard
          title="健全な広告"
          value={levelBreakdown?.healthy?.count || 16}
          icon={CheckCircleIcon}
          color="bg-green-500"
        />
      </div>

      {/* アラート */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">アクティブなアラート</h3>
        <FatigueAlert
          adName="サマーセールキャンペーン - 動画広告A"
          level="critical"
          primaryIssue="オーディエンス疲労"
          recommendedAction="オーディエンスの飽和が深刻です。新しいターゲティングセグメントの追加、またはキャンペーンの一時停止を検討してください。"
          metrics={{
            frequency: 3.8,
            ctrDeclineRate: 0.32,
            firstTimeRatio: 0.28,
          }}
          onDismiss={() => console.log('Alert dismissed')}
          onTakeAction={() => console.log('Take action')}
        />
        <FatigueAlert
          adName="新商品プロモーション - カルーセル広告B"
          level="warning"
          primaryIssue="クリエイティブ疲労"
          recommendedAction="クリエイティブのパフォーマンスが低下傾向です。A/Bテストで新しいバリエーションを試してください。"
          metrics={{
            ctrDeclineRate: 0.28,
            cpmIncreaseRate: 0.3,
          }}
          onDismiss={() => console.log('Alert dismissed')}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 疲労度スコアカード */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">広告別疲労度スコア</h3>
          <FatigueScoreCard
            adName={sampleFatigueData.adName}
            fatigueScore={sampleFatigueData.fatigueScore}
            metrics={sampleFatigueData.metrics}
            onViewDetails={() => setSelectedAdId(sampleFatigueData.adId)}
          />
        </div>

        {/* トレンドグラフ */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">疲労度トレンド</h3>
          <FatigueTrend data={sampleTrendData} showMetrics={true} height={400} />
        </div>
      </div>

      {/* 推奨アクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">推奨アクション一覧</h3>
        <div className="space-y-4">
          {(recommendedActions || []).slice(0, 5).map((action, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                    action?.fatigueLevel === 'critical'
                      ? 'bg-red-500'
                      : action?.fatigueLevel === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  }`}
                >
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{action?.adName || '広告名なし'}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {action?.recommendedAction || '推奨アクションなし'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>スコア: {action?.totalScore || 'N/A'}</span>
                  <span>
                    フリークエンシー:{' '}
                    {action?.metrics?.frequency ? action.metrics.frequency.toFixed(1) : 'N/A'}
                  </span>
                  <span>
                    CTR低下:{' '}
                    {action?.metrics?.ctrDeclineRate
                      ? (action.metrics.ctrDeclineRate * 100).toFixed(0)
                      : '0'}
                    %
                  </span>
                </div>
              </div>
              <button className="flex-shrink-0 px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                詳細
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 疲労タイプ別分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">オーディエンス疲労</h4>
          <div className="text-3xl font-bold text-pink-600">
            {typeBreakdown?.audience?.count || 8}
          </div>
          <p className="text-sm text-gray-500 mt-1">フリークエンシー過多による疲労</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">平均フリークエンシー</span>
              <span className="font-medium">3.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">新規リーチ率</span>
              <span className="font-medium">35%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">クリエイティブ疲労</h4>
          <div className="text-3xl font-bold text-blue-600">
            {typeBreakdown?.creative?.count || 6}
          </div>
          <p className="text-sm text-gray-500 mt-1">CTR低下による疲労</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">平均CTR低下率</span>
              <span className="font-medium">22%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">エンゲージメント低下</span>
              <span className="font-medium">18%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">アルゴリズム疲労</h4>
          <div className="text-3xl font-bold text-green-600">
            {typeBreakdown?.algorithm?.count || 3}
          </div>
          <p className="text-sm text-gray-500 mt-1">配信効率の悪化による疲労</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">平均CPM上昇率</span>
              <span className="font-medium">28%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">配信量低下</span>
              <span className="font-medium">15%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
