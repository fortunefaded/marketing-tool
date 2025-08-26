import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { 
  UserCircleIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChartBarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { MetaAccount } from '@/types'
import { SimpleAccountStore } from '@/features/meta-api/account/account-store'
import { useAdFatigue } from '@/features/meta-api/hooks/useAdFatigue'

interface CreativeData {
  creative_type?: string
  type?: string // for backward compatibility
  video_url?: string
  thumbnail_url?: string
  thumbnailUrl?: string // for backward compatibility
  image_url?: string
  imageUrl?: string // for backward compatibility
  creative_name?: string
  title?: string
  body?: string
  callToAction?: string
  carousel_cards?: Array<{
    image_url?: string
    video_url?: string
    name?: string
    description?: string
  }>
}

interface CreativePhoneMockupProps {
  creative: CreativeData
  fatigueScore?: number
}

// スマートフォンモックアップコンポーネント
const CreativePhoneMockup = ({ creative, fatigueScore = 0 }: CreativePhoneMockupProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const getFatigueIndicatorColor = () => {
    if (fatigueScore >= 80) return 'bg-red-500'
    if (fatigueScore >= 60) return 'bg-orange-500'
    if (fatigueScore >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="relative inline-block">
      {/* スマートフォンフレーム */}
      <div className="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl">
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl"></div>
        
        {/* スクリーン */}
        <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ width: '300px', height: '600px' }}>
          {/* ステータスバー */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-white z-10 flex items-center justify-between px-6 pt-2">
            <span className="text-xs font-semibold">9:41</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-gray-800 rounded-sm"></div>
              <div className="w-3 h-2 bg-gray-800 rounded-sm"></div>
              <div className="w-5 h-2 bg-gray-800 rounded-sm"></div>
            </div>
          </div>

          {/* アプリヘッダー */}
          <div className="absolute top-12 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-4 z-10">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
              <div>
                <div className="text-xs font-semibold">広告主名</div>
                <div className="text-xs text-gray-500">スポンサー</div>
              </div>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="pt-24 h-full bg-gray-50">
            {/* クリエイティブ表示 */}
            <div className="relative bg-black" style={{ height: '250px' }}>
              {creative?.type === 'video' ? (
                <div className="relative w-full h-full">
                  <img 
                    src={creative.thumbnailUrl || '/api/placeholder/300/250'} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  {/* 動画コントロール */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 bg-white bg-opacity-80 rounded-full flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <PauseIcon className="h-6 w-6 text-gray-900" />
                      ) : (
                        <PlayIcon className="h-6 w-6 text-gray-900 ml-0.5" />
                      )}
                    </button>
                  </div>
                  {/* 音声コントロール */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center"
                  >
                    {isMuted ? (
                      <SpeakerXMarkIcon className="h-4 w-4 text-gray-900" />
                    ) : (
                      <SpeakerWaveIcon className="h-4 w-4 text-gray-900" />
                    )}
                  </button>
                </div>
              ) : (
                <img 
                  src={creative?.imageUrl || '/api/placeholder/300/250'} 
                  alt="Ad creative" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* 広告テキスト */}
            <div className="bg-white p-3">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {creative?.title || '夏のキャンペーン開催中！'}
              </h3>
              <p className="text-xs text-gray-700 mb-2">
                {creative?.body || '期間限定の特別価格でお得にご購入いただけます。'}
              </p>
              <button className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium">
                {creative?.callToAction || '詳細を見る'}
              </button>
            </div>

            {/* エンゲージメントバー */}
            <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-1 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-xs">128</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-xs">24</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 疲労度インジケーター */}
        {fatigueScore > 0 && (
          <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center z-20">
            <div className={`w-10 h-10 rounded-full ${getFatigueIndicatorColor()} flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">{fatigueScore}</span>
            </div>
          </div>
        )}
      </div>

      {/* 疲労度レベル表示 */}
      {fatigueScore > 0 && (
        <div className="mt-2 text-center">
          <div className="text-xs text-gray-600">疲労度スコア</div>
          <div className={`text-sm font-semibold ${
            fatigueScore >= 80 ? 'text-red-600' :
            fatigueScore >= 60 ? 'text-orange-600' :
            fatigueScore >= 40 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {fatigueScore >= 80 ? '危険' :
             fatigueScore >= 60 ? '警告' :
             fatigueScore >= 40 ? '注意' :
             '健全'}
          </div>
        </div>
      )}
    </div>
  )
}

interface FatigueMetrics {
  spend?: number
  impressions?: number
  clicks?: number
  ctr?: number
  frequency?: number
  cpm?: number
}

interface FatigueScoreCardProps {
  fatigueScore: number
  metrics: FatigueMetrics
}

// 疲労度スコアカード
const FatigueScoreCard = ({ fatigueScore, metrics }: FatigueScoreCardProps) => {
  const getSignalColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon }
    if (score >= 60) return { bg: 'bg-orange-100', text: 'text-orange-800', icon: ExclamationTriangleIcon }
    if (score >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: InformationCircleIcon }
    return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon }
  }

  const signalColor = getSignalColor(fatigueScore)
  const SignalIcon = signalColor.icon

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* ステータスバッジ */}
      <div className="flex justify-end mb-3">
        <div className={`inline-flex items-center px-2 py-1 rounded-full ${signalColor.bg} ${signalColor.text}`}>
          <SignalIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">
            {fatigueScore >= 80 ? '危険' :
             fatigueScore >= 60 ? '警告' :
             fatigueScore >= 40 ? '注意' : '健全'}
          </span>
        </div>
      </div>

      {/* 総合スコア */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-gray-900">{fatigueScore}</div>
        <div className="text-sm text-gray-600">総合疲労度スコア</div>
      </div>

      {/* メトリクス */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">フリークエンシー</span>
          <span className="font-medium">{metrics?.frequency?.toFixed(1) || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">CTR</span>
          <span className="font-medium">{metrics?.ctr?.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  )
}

interface VideoMetrics extends FatigueMetrics {
  video_views?: number
  video_completion_rate?: number
  video_avg_watch_time?: number
  engagement_rate?: number
}

interface VideoFatigueAnalysisProps {
  metrics: VideoMetrics
  fatigueScore?: number
}

// 動画分析コンポーネント
const VideoFatigueAnalysis = ({ metrics, fatigueScore = 0 }: VideoFatigueAnalysisProps) => {
  const getPerformanceLevel = (metric: string, value: number) => {
    switch (metric) {
      case 'completionRate':
        return value >= 0.7 ? 'good' : value >= 0.5 ? 'warning' : 'poor'
      case 'soundOnRate':
        return value >= 0.6 ? 'good' : value >= 0.4 ? 'warning' : 'poor'
      default:
        return 'warning'
    }
  }

  const getColorClass = (level: string) => {
    switch (level) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'  
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const completionLevel = getPerformanceLevel('completionRate', metrics.video_completion_rate || 0.65)
  const soundLevel = getPerformanceLevel('soundOnRate', 0.45) // soundOnRate not in metrics

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <PlayIcon className="h-5 w-5 mr-2" />
          動画パフォーマンス分析
        </h3>
        {fatigueScore > 60 && (
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">疲労度注意</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 完了率 */}
        <div className={`rounded-lg border p-3 ${getColorClass(completionLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChartBarIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">完了率</span>
            </div>
            <span className="text-lg font-bold">
              {((metrics.video_completion_rate || 0.65) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 音声ON率 */}
        <div className={`rounded-lg border p-3 ${getColorClass(soundLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">音声ON率</span>
            </div>
            <span className="text-lg font-bold">
              {(((metrics as any).soundOnRate || 0.45) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 平均視聴時間 */}
        <div className="rounded-lg border p-3 bg-blue-50 border-blue-200 text-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">平均視聴時間</span>
            </div>
            <span className="text-lg font-bold">{(metrics as any).averageWatchTime || 12}s</span>
          </div>
        </div>

        {/* エンゲージメント率 */}
        <div className="rounded-lg border p-3 bg-purple-50 border-purple-200 text-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">エンゲージメント</span>
            </div>
            <span className="text-lg font-bold">{((metrics.engagement_rate || 0.025) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const OldestFatigueDashboard: React.FC = () => {
  const convex = useConvex()
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<MetaAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アカウント情報の読み込み
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const accountStore = new SimpleAccountStore(convex)
      const accountsList = await accountStore.getAccounts()
      setAccounts(accountsList)

      const active = await accountStore.getActiveAccount()
      setActiveAccount(active || (accountsList.length > 0 ? accountsList[0] : null))
    } catch (err) {
      console.error('Failed to load accounts:', err)
      setError('アカウント情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountChange = async (accountId: string) => {
    try {
      setError(null)
      const accountStore = new SimpleAccountStore(convex)
      await accountStore.setActiveAccount(accountId)
      const newActive = accounts.find(acc => acc.accountId === accountId)
      if (newActive) {
        setActiveAccount(newActive)
      }
    } catch (err) {
      console.error('Failed to change account:', err)
      setError('アカウントの切り替えに失敗しました')
    }
  }

  // ローディング・エラー・空状態の処理（省略：OldFatigueDashboardと同様）
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">アカウント情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">エラー</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadAccounts}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 m-4 text-center">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Metaアカウントが登録されていません</h3>
        <p className="text-gray-500 mb-6">
          広告疲労度分析を開始するには、まずMetaアカウントを接続してください。
        </p>
        <a
          href="/meta-api-setup"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Metaアカウントを接続
        </a>
      </div>
    )
  }

  if (!activeAccount) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">アカウントを選択してください</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <button
              key={account.accountId}
              onClick={() => handleAccountChange(account.accountId)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center mb-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                <h3 className="font-medium text-gray-900">{account.name}</h3>
              </div>
              <p className="text-sm text-gray-500">ID: {account.accountId}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return <OldestFatigueDashboardMain accountId={activeAccount.accountId} accounts={accounts} activeAccount={activeAccount} onAccountChange={handleAccountChange} />
}

// メインダッシュボード
const OldestFatigueDashboardMain: React.FC<{
  accountId: string
  accounts: MetaAccount[]
  activeAccount: MetaAccount
  onAccountChange: (accountId: string) => void
}> = ({ accountId, accounts, activeAccount, onAccountChange }) => {
  const { data: allAdsData, isLoading, error, refetch } = useAdFatigue(accountId)

  // サンプルデータ
  const sampleCreative = {
    type: 'video' as const,
    thumbnailUrl: '/api/placeholder/300/250',
    title: '夏のキャンペーン開催中！',
    body: '期間限定の特別価格でお得にご購入いただけます。今すぐチェック！',
    callToAction: '詳細を見る'
  }

  const sampleVideoMetrics: VideoMetrics = {
    video_views: 15420,
    video_completion_rate: 0.65,
    video_avg_watch_time: 12,
    engagement_rate: 0.025,
    spend: 1000,
    impressions: 50000,
    clicks: 600,
    ctr: 1.2,
    frequency: 3.8,
    cpm: 20
  }

  // 統計情報
  const stats = React.useMemo(() => {
    const critical = allAdsData.filter(ad => ad.score < 50).length
    const warning = allAdsData.filter(ad => ad.score >= 50 && ad.score < 70).length
    const caution = allAdsData.filter(ad => ad.score >= 70 && ad.score < 85).length
    const healthy = allAdsData.filter(ad => ad.score >= 85).length
    
    return {
      total: allAdsData.length,
      critical,
      warning, 
      caution,
      healthy
    }
  }, [allAdsData])

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Ad Fatigue Dashboard (Original)</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                <select
                  value={activeAccount.accountId}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className="text-sm border-gray-300 rounded-md"
                >
                  {accounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">データの取得に失敗しました: {error.message}</p>
            </div>
          </div>
        )}

        {/* サマリー統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="総広告数"
            value={stats.total}
            icon={ChartBarIcon}
            color="bg-indigo-500"
          />
          <SummaryCard
            title="健全"
            value={stats.healthy}
            icon={CheckCircleIcon}
            color="bg-green-500"
          />
          <SummaryCard
            title="警告"
            value={stats.warning}
            icon={ExclamationTriangleIcon}
            color="bg-yellow-500"
          />
          <SummaryCard
            title="危険"
            value={stats.critical}
            icon={ExclamationTriangleIcon}
            color="bg-red-500"
          />
        </div>

        {/* メインコンテンツ - スマートフォンモックアップと分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* スマートフォンモックアップ */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex justify-center">
            <CreativePhoneMockup 
              creative={sampleCreative} 
              fatigueScore={72}
            />
          </div>

          {/* 疲労度スコアカード */}
          <div>
            <FatigueScoreCard
              fatigueScore={72}
              metrics={{
                frequency: 3.8,
                ctr: 1.2
              }}
            />
          </div>

          {/* 動画分析 */}
          <div>
            <VideoFatigueAnalysis
              metrics={sampleVideoMetrics}
              fatigueScore={72}
            />
          </div>
        </div>

        {/* データテーブル */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : allAdsData.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">詳細広告分析</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      広告名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      疲労スコア
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      状態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      フリークエンシー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAdsData.map((ad) => (
                    <tr key={ad.adId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.adName || ad.adId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{ad.score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ad.score >= 85 ? 'bg-green-100 text-green-800' :
                          ad.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          ad.score >= 50 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ad.score >= 85 ? '健全' :
                           ad.score >= 70 ? '注意' :
                           ad.score >= 50 ? '警告' : '危険'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.metrics?.frequency?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.metrics?.ctr?.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">データがありません</h3>
            <p className="text-gray-600">
              このアカウントには分析可能な広告データがありません。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}