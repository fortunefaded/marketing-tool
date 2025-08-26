import React, { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CreativeTable, Creative } from '../components/creatives/CreativeTable'
import { AddToFavoriteButton } from '../components/favorites/AddToFavoriteButton'
import { useVibeLogger } from '../hooks/useVibeLogger'
import { 
  PhotoIcon,
  VideoCameraIcon,
  ViewColumnsIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

export default function Creatives() {
  const logger = useVibeLogger({
    componentName: 'Creatives',
    trackRenders: true,
  })

  const [selectedCreatives, setSelectedCreatives] = useState<string[]>([])

  // Convexからクリエイティブデータを取得
  const creativesData = useQuery(api.creatives.getCreativePerformanceByPeriod, {
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
    period: 'daily'
  })

  // データを整形してCreativeTable用の形式に変換
  const creatives: Creative[] = useMemo(() => {
    if (!creativesData) return []

    return creativesData.map(item => ({
      id: item.id,
      name: item.name || 'Untitled Creative',
      type: item.type as Creative['type'],
      campaignName: item.campaignName || 'Unknown Campaign',
      status: item.status as Creative['status'] || 'ACTIVE',
      thumbnailUrl: item.thumbnailUrl,
      videoUrl: item.videoUrl,
      // メトリクス
      impressions: item.metrics.impressions || 0,
      clicks: item.metrics.clicks || 0,
      conversions: item.metrics.conversions || 0,
      spend: item.metrics.spend || 0,
      revenue: item.metrics.revenue || 0,
      ctr: item.metrics.ctr || 0,
      cpc: item.metrics.cpc || 0,
      cpa: item.metrics.cpa || 0,
      roas: item.metrics.roas || 0,
      frequency: 0, // TODO: frequencyデータを追加
      cpm: item.metrics.impressions > 0 ? (item.metrics.spend / item.metrics.impressions) * 1000 : 0,
      // 広告疲労度（ダミーデータ - 実際の実装では計算ロジックを追加）
      fatigueScore: Math.floor(Math.random() * 100),
      creativeFatigue: Math.floor(Math.random() * 100),
      audienceFatigue: Math.floor(Math.random() * 100),
      algorithmFatigue: Math.floor(Math.random() * 100),
      // 日付
      startDate: '2024-01-01',
      endDate: new Date().toISOString().split('T')[0]
    }))
  }, [creativesData])

  const handleCreativeClick = (creative: Creative) => {
    logger.action('クリエイティブ詳細クリック', {
      creativeId: creative.id,
      creativeName: creative.name,
      type: creative.type
    })
    // TODO: クリエイティブ詳細モーダルを開く
  }

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedCreatives(selectedIds)
    logger.action('クリエイティブ選択変更', {
      selectedCount: selectedIds.length,
      selectedIds
    })
  }

  const handleSort = (column: string) => {
    logger.action('クリエイティブテーブルソート', { column })
  }

  // 統計情報
  const stats = useMemo(() => {
    const total = creatives.length
    const typeStats = {
      IMAGE: creatives.filter(c => c.type === 'IMAGE').length,
      VIDEO: creatives.filter(c => c.type === 'VIDEO').length,
      CAROUSEL: creatives.filter(c => c.type === 'CAROUSEL').length,
      TEXT: creatives.filter(c => c.type === 'TEXT').length
    }
    const statusStats = {
      ACTIVE: creatives.filter(c => c.status === 'ACTIVE').length,
      PAUSED: creatives.filter(c => c.status === 'PAUSED').length,
      ARCHIVED: creatives.filter(c => c.status === 'ARCHIVED').length
    }
    const totalSpend = creatives.reduce((sum, c) => sum + c.spend, 0)
    const totalRevenue = creatives.reduce((sum, c) => sum + c.revenue, 0)
    const avgRoas = total > 0 ? totalRevenue / totalSpend : 0

    return {
      total,
      typeStats,
      statusStats,
      totalSpend,
      totalRevenue,
      avgRoas
    }
  }, [creatives])

  const isLoading = creativesData === undefined

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">クリエイティブ（テーブル）</h1>
            <p className="mt-2 text-sm text-gray-600">
              全クリエイティブの統計データとパフォーマンス指標
            </p>
          </div>
          <AddToFavoriteButton
            analysisName="クリエイティブテーブル"
            analysisType="creatives"
            route="/creatives"
            description="全クリエイティブの詳細な統計データとパフォーマンス分析"
          />
        </div>
      </div>

      {/* 統計カード */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 総数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PhotoIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総クリエイティブ数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}件</p>
              </div>
            </div>
          </div>

          {/* タイプ別統計 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <VideoCameraIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">タイプ別</p>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">画像:</span>
                <span className="font-medium">{stats.typeStats.IMAGE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">動画:</span>
                <span className="font-medium">{stats.typeStats.VIDEO}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">カルーセル:</span>
                <span className="font-medium">{stats.typeStats.CAROUSEL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">テキスト:</span>
                <span className="font-medium">{stats.typeStats.TEXT}</span>
              </div>
            </div>
          </div>

          {/* 消化金額 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ViewColumnsIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総消化金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{new Intl.NumberFormat('ja-JP').format(Math.round(stats.totalSpend))}
                </p>
              </div>
            </div>
          </div>

          {/* 平均ROAS */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均ROAS</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgRoas.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 選択中のクリエイティブ情報 */}
      {selectedCreatives.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-sm font-medium text-blue-900">
                {selectedCreatives.length}件のクリエイティブが選択されています
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                一括編集
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                エクスポート
              </button>
              <button 
                onClick={() => setSelectedCreatives([])}
                className="text-sm text-gray-600 hover:text-gray-500 font-medium"
              >
                選択解除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メインテーブル */}
      <CreativeTable
        creatives={creatives}
        onRowClick={handleCreativeClick}
        onSort={handleSort}
        onSelectionChange={handleSelectionChange}
        selectable={true}
        isLoading={isLoading}
        className="w-full"
      />

      {/* フッター情報 */}
      {!isLoading && creatives.length > 0 && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          データ期間: 2024年1月1日 〜 {new Date().toLocaleDateString('ja-JP')} |
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      )}
    </div>
  )
}