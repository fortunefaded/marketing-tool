import React, { useState, useEffect } from 'react'
import { FatigueScoreCard } from './FatigueScoreCard'
import { FatigueAlert } from './FatigueAlert'
import { FatigueTrend } from './FatigueTrend'
import { useAdFatigueMonitored } from '../../hooks/useAdFatigueMonitored'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import { logger } from '../../utils/logger'

interface FatigueDashboardEnhancedProps {
  accountId: string
}

export const FatigueDashboardEnhanced: React.FC<FatigueDashboardEnhancedProps> = ({ accountId }) => {
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  
  // 監視機能付きフックを使用
  const { data: allAdsData, isLoading, error, isUsingMockData, refetch } = useAdFatigueMonitored(accountId)
  const { data: selectedAdData } = useAdFatigueMonitored(accountId, selectedAdId || undefined)

  // 統計情報の計算
  const stats = React.useMemo(() => {
    const critical = allAdsData.filter(ad => ad.fatigueScore.status === 'critical').length
    const warning = allAdsData.filter(ad => ad.fatigueScore.status === 'warning').length
    const caution = allAdsData.filter(ad => ad.fatigueScore.status === 'caution').length
    const healthy = allAdsData.filter(ad => ad.fatigueScore.status === 'healthy').length
    
    return {
      total: allAdsData.length,
      critical,
      warning,
      caution,
      healthy,
      avgFrequency: allAdsData.reduce((sum, ad) => sum + ad.metrics.frequency, 0) / (allAdsData.length || 1),
      avgFatigueScore: allAdsData.reduce((sum, ad) => sum + ad.fatigueScore.total, 0) / (allAdsData.length || 1)
    }
  }, [allAdsData])

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

  // エラー表示
  if (error && !isUsingMockData) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              データの取得中にエラーが発生しました。
              <br />
              {error.message}
            </p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              再試行
            </button>
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
          <div className="flex items-center gap-3">
            {isUsingMockData && (
              <div className="flex items-center text-sm text-amber-600">
                <CloudIcon className="h-4 w-4 mr-1" />
                デモデータ
              </div>
            )}
            <button 
              onClick={refetch}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  データを更新
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && allAdsData.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">データを読み込んでいます...</p>
          </div>
        </div>
      )}

      {/* データがある場合の表示 */}
      {(!isLoading || allAdsData.length > 0) && (
        <>
          {/* サマリー統計 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard
              title="分析済み広告数"
              value={stats.total}
              icon={ChartBarIcon}
              color="bg-indigo-500"
            />
            <SummaryCard
              title="危険域の広告"
              value={stats.critical}
              icon={ExclamationTriangleIcon}
              color="bg-red-500"
            />
            <SummaryCard
              title="警告域の広告"
              value={stats.warning}
              icon={InformationCircleIcon}
              color="bg-orange-500"
            />
            <SummaryCard
              title="健全な広告"
              value={stats.healthy}
              icon={CheckCircleIcon}
              color="bg-green-500"
            />
          </div>

          {/* アラート */}
          {allAdsData
            .filter(ad => ad.fatigueScore.status === 'critical' || ad.fatigueScore.status === 'warning')
            .slice(0, 2)
            .map((ad, index) => (
              <FatigueAlert
                key={ad.adId}
                adName={ad.adName}
                level={ad.fatigueScore.status}
                primaryIssue={ad.fatigueScore.primaryIssue === 'audience' ? 'オーディエンス疲労' : 
                             ad.fatigueScore.primaryIssue === 'creative' ? 'クリエイティブ疲労' : 
                             'アルゴリズム疲労'}
                recommendedAction={ad.recommendedAction}
                metrics={{
                  frequency: ad.metrics.frequency,
                  ctrDeclineRate: ad.metrics.ctrDeclineRate,
                  firstTimeRatio: ad.metrics.firstTimeRatio,
                  cpmIncreaseRate: ad.metrics.cpmIncreaseRate
                }}
                onDismiss={() => logger.info('Alert dismissed', { adId: ad.adId })}
                onTakeAction={() => {
                  logger.info('Take action clicked', { adId: ad.adId })
                  setSelectedAdId(ad.adId)
                }}
              />
            ))}

          {/* 広告リスト */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">広告別疲労度スコア</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {allAdsData.map(ad => (
                <div
                  key={ad.adId}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedAdId(ad.adId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{ad.adName}</h4>
                      <p className="text-xs text-gray-500 mt-1">{ad.campaignName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {ad.fatigueScore.total}
                        </div>
                        <div className={`text-xs font-medium ${
                          ad.fatigueScore.status === 'critical' ? 'text-red-600' :
                          ad.fatigueScore.status === 'warning' ? 'text-orange-600' :
                          ad.fatigueScore.status === 'caution' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {ad.fatigueScore.status === 'critical' ? '危険' :
                           ad.fatigueScore.status === 'warning' ? '警告' :
                           ad.fatigueScore.status === 'caution' ? '注意' :
                           '健全'}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        ad.fatigueScore.status === 'critical' ? 'bg-red-500' :
                        ad.fatigueScore.status === 'warning' ? 'bg-orange-500' :
                        ad.fatigueScore.status === 'caution' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 選択された広告の詳細 */}
          {selectedAdId && selectedAdData?.[0] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FatigueScoreCard
                adName={selectedAdData[0].adName}
                fatigueScore={{
                  total: selectedAdData[0].fatigueScore.total,
                  breakdown: selectedAdData[0].fatigueScore.breakdown,
                  primaryIssue: selectedAdData[0].fatigueScore.primaryIssue,
                  status: selectedAdData[0].fatigueScore.status
                }}
                metrics={{
                  frequency: selectedAdData[0].metrics.frequency,
                  firstTimeRatio: selectedAdData[0].metrics.firstTimeRatio,
                  ctrDeclineRate: selectedAdData[0].metrics.ctrDeclineRate,
                  cpmIncreaseRate: selectedAdData[0].metrics.cpmIncreaseRate
                }}
                onViewDetails={() => logger.info('View details clicked', { adId: selectedAdId })}
              />
              
              {/* トレンドチャート（仮データ） */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">疲労度トレンド</h3>
                <p className="text-sm text-gray-500">
                  時系列データは今後実装予定です
                </p>
              </div>
            </div>
          )}

          {/* 疲労タイプ別分析 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">オーディエンス疲労</h4>
              <div className="text-3xl font-bold text-pink-600">
                {allAdsData.filter(ad => ad.fatigueScore.primaryIssue === 'audience').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">フリークエンシー過多による疲労</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">平均フリークエンシー</span>
                  <span className="font-medium">{stats.avgFrequency.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">クリエイティブ疲労</h4>
              <div className="text-3xl font-bold text-blue-600">
                {allAdsData.filter(ad => ad.fatigueScore.primaryIssue === 'creative').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">CTR低下による疲労</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">アルゴリズム疲労</h4>
              <div className="text-3xl font-bold text-green-600">
                {allAdsData.filter(ad => ad.fatigueScore.primaryIssue === 'algorithm').length}
              </div>
              <p className="text-sm text-gray-500 mt-1">配信効率の悪化による疲労</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}