/**
 * InstagramMetricsExtractor.tsx
 * APIレスポンスからInstagram関連のメトリクスを抽出して表示するコンポーネント
 */

import React from 'react'

/**
 * APIレスポンスからInstagram関連のメトリクスを抽出
 */
export function extractInstagramMetrics(insight: any) {
  console.log('🔍 InstagramMetricsExtractor - 入力データ:', {
    hasInsight: !!insight,
    insightKeys: insight ? Object.keys(insight).slice(0, 20) : [],
    actions: insight?.actions,
    publisher_platform: insight?.publisher_platform,
  })
  
  if (!insight) return null

  const metrics: any = {
    // 基本メトリクス
    platform: insight.publisher_platform,
    impressions: insight.impressions,
    reach: insight.reach,
    spend: insight.spend,
    
    // Instagram アクション
    actions: {},
    uniqueActions: {},
    costPerAction: {},
    
    // 動画メトリクス
    videoMetrics: {},
    
    // プラットフォーム別データ
    platformData: null,
    
    // 計算メトリクス
    calculated: {}
  }

  // actions配列からInstagram関連を抽出
  if (insight.actions && Array.isArray(insight.actions)) {
    console.log('📝 actions配列を処理中:', insight.actions.length, '個のアクション')
    
    // Meta APIで提供されるInstagram関連アクションタイプ
    const instagramActionTypes = [
      // Instagramオーガニックアクション
      'onsite_conversion.post_save', // 投稿の保存
      'post_save', // 投稿の保存（簡略形）
      'ig_save', // Instagram保存
      'instagram_save', // Instagram保存
      'onsite_conversion.ig_save',
      
      // プロフィール関連
      'profile_visit', // プロフィール訪問
      'ig_profile_visit',
      'instagram_profile_visit',
      'onsite_conversion.ig_profile_visit',
      
      // フォロー関連
      'follow', // フォロー
      'ig_follow',
      'instagram_follow',
      'onsite_conversion.follow',
      
      // エンゲージメント
      'comment', // コメント
      'ig_comment',
      'post_comment',
      'like', // いいね
      'ig_like',
      'post_like',
      'share', // シェア
      'ig_share',
      'post_share',
      
      // ストーリーズ関連
      'story_view',
      'ig_story_view',
      'story_reply',
      'ig_story_reply',
      
      // Reels関連
      'reel_play',
      'ig_reel_play',
      'reel_save',
      'ig_reel_save',
      
      // ショッピング関連
      'product_tag_click',
      'ig_product_tag_click',
      'shopping_tag_click',
      
      // DM関連
      'direct_message',
      'ig_direct_message',
      'message_send',
      
      // その他のInstagramアクション
      'ig_app_install',
      'instagram_app_install',
      'ig_video_view',
      'instagram_video_view',
      'ig_reach',
      'instagram_reach'
    ]
    
    insight.actions.forEach((action: any) => {
      const actionType = action.action_type?.toLowerCase() || ''
      const originalType = action.action_type || ''
      
      // 完全一致チェック（大文字小文字を無視）
      const isInstagramAction = instagramActionTypes.some(type => 
        actionType === type.toLowerCase()
      )
      
      // 部分一致チェック
      const hasInstagramKeyword = 
        actionType.includes('instagram') ||
        actionType.includes('ig_') ||
        actionType.includes('ig.') ||
        actionType.includes('onsite_conversion.post_save') ||
        actionType.includes('onsite_conversion.ig') ||
        actionType.includes('profile') ||
        actionType.includes('follow') ||
        actionType.includes('save') ||
        actionType.includes('reel') ||
        actionType.includes('story')
      
      if (isInstagramAction || hasInstagramKeyword) {
        // オリジナルのaction_typeを保持
        metrics.actions[originalType] = action.value
        console.log('✅ Instagramアクション検出:', originalType, '=', action.value)
        
        // 特定のアクションをわかりやすい名前でも保存
        if (actionType.includes('post_save') || actionType.includes('ig_save')) {
          metrics.actions['saves'] = action.value
        }
        if (actionType.includes('profile') && actionType.includes('visit')) {
          metrics.actions['profile_visits'] = action.value
        }
        if (actionType.includes('follow')) {
          metrics.actions['follows'] = action.value
        }
      }
    })
    
    // すべてのactionsをログ出力（デバッグ用）
    console.log('📄 すべてのactions:', insight.actions.map((a: any) => `${a.action_type}=${a.value}`))
  } else {
    console.log('⚠️ actions配列が見つかりません')
  }

  // unique_actions配列から抽出
  if (insight.unique_actions && Array.isArray(insight.unique_actions)) {
    insight.unique_actions.forEach((action: any) => {
      if (action.action_type?.includes('instagram') || 
          action.action_type?.includes('profile') ||
          action.action_type?.includes('follow')) {
        metrics.uniqueActions[action.action_type] = action.value
      }
    })
  }

  // cost_per_action_typeから抽出
  if (insight.cost_per_action_type && Array.isArray(insight.cost_per_action_type)) {
    insight.cost_per_action_type.forEach((cost: any) => {
      if (cost.action_type?.includes('instagram') || 
          cost.action_type?.includes('profile') ||
          cost.action_type?.includes('follow')) {
        metrics.costPerAction[cost.action_type] = cost.value
      }
    })
  }

  // 動画メトリクスの抽出
  const videoFields = [
    'video_play_actions',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p95_watched_actions',
    'video_p100_watched_actions',
    'video_avg_time_watched_actions',
    'video_continuous_2_sec_watched_actions',
    'video_10_sec_watched_actions',
    'video_15_sec_watched_actions',
    'video_30_sec_watched_actions'
  ]

  videoFields.forEach(field => {
    if (insight[field]) {
      if (Array.isArray(insight[field])) {
        insight[field].forEach((item: any) => {
          metrics.videoMetrics[`${field}_${item.action_type}`] = item.value
        })
      } else {
        metrics.videoMetrics[field] = insight[field]
      }
    }
  })

  // プラットフォーム別データ（複数の場所をチェック）
  if (insight.breakdowns?.publisher_platform?.instagram) {
    metrics.platformData = insight.breakdowns.publisher_platform.instagram
    console.log('✅ breakdownsからInstagramデータ検出')
  } else if (insight.publisher_platform === 'instagram') {
    metrics.platformData = {
      platform: 'instagram',
      impressions: insight.impressions,
      reach: insight.reach,
      spend: insight.spend
    }
    console.log('✅ publisher_platformがinstagram')
  } else if (insight.publisher_platform?.includes('instagram')) {
    metrics.platformData = { platform: insight.publisher_platform }
    console.log('✅ publisher_platformにinstagramが含まれる:', insight.publisher_platform)
  }

  // 計算メトリクス
  // プロフィール訪問率
  const profileVisits = metrics.actions.profile_visits || 
                       metrics.actions['onsite_conversion.ig_profile_visit'] || 
                       metrics.actions['ig_profile_visit'] || 0
  
  if (profileVisits && insight.impressions) {
    metrics.calculated.profileVisitRate = 
      (profileVisits / insight.impressions * 100).toFixed(2)
  }

  // フォロー率
  const follows = metrics.actions.follows || 
                  metrics.actions['onsite_conversion.follow'] || 
                  metrics.actions['ig_follow'] || 0
                  
  if (follows && insight.reach) {
    metrics.calculated.followRate = 
      (follows / insight.reach * 100).toFixed(2)
  }

  // エンゲージメント率の計算
  const saves = metrics.actions.saves || 
                metrics.actions['onsite_conversion.post_save'] || 
                metrics.actions['post_save'] || 
                metrics.actions['ig_save'] || 0
                
  const likes = metrics.actions.likes || 
                metrics.actions['post_like'] || 
                metrics.actions['ig_like'] || 0
                
  const comments = metrics.actions.comments || 
                   metrics.actions['post_comment'] || 
                   metrics.actions['ig_comment'] || 0
                   
  const shares = metrics.actions.shares || 
                 metrics.actions['post_share'] || 
                 metrics.actions['ig_share'] || 0
  
  const engagementActions = [likes, comments, saves, shares]
  const totalEngagement = engagementActions.reduce((sum, val) => sum + val, 0)
  
  // 個別のメトリクスも保存
  if (saves > 0) metrics.calculated.saves = saves
  if (likes > 0) metrics.calculated.likes = likes
  if (comments > 0) metrics.calculated.comments = comments
  if (shares > 0) metrics.calculated.shares = shares
  
  if (totalEngagement > 0 && insight.reach) {
    metrics.calculated.engagementRate = 
      (totalEngagement / insight.reach * 100).toFixed(2)
  }

  console.log('📊 抽出結果:', {
    actionsCount: Object.keys(metrics.actions).length,
    videoMetricsCount: Object.keys(metrics.videoMetrics).length,
    hasPlatformData: !!metrics.platformData,
    calculatedMetrics: metrics.calculated
  })
  
  return metrics
}

/**
 * Instagram メトリクス表示コンポーネント
 */
export function InstagramMetricsDisplay({ insight }: { insight: any }) {
  const metrics = extractInstagramMetrics(insight)
  
  if (!metrics) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Instagram関連メトリクスが見つかりません</p>
      </div>
    )
  }

  const hasInstagramData = 
    Object.keys(metrics.actions).length > 0 ||
    Object.keys(metrics.videoMetrics).length > 0 ||
    metrics.platformData

  if (!hasInstagramData) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">この広告にはInstagram関連データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* サマリーセクション */}
      {Object.keys(metrics.calculated).length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
            </svg>
            Instagram パフォーマンスサマリー
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {metrics.calculated.profileVisitRate && (
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">プロフィール訪問率</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.calculated.profileVisitRate}%
                </p>
              </div>
            )}
            {metrics.calculated.followRate && (
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">フォロー率</p>
                <p className="text-2xl font-bold text-pink-600">
                  {metrics.calculated.followRate}%
                </p>
              </div>
            )}
            {metrics.calculated.engagementRate && (
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">エンゲージメント率</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {metrics.calculated.engagementRate}%
                </p>
              </div>
            )}
          </div>
          
          {/* エンゲージメント詳細 */}
          {(metrics.calculated.saves > 0 || metrics.calculated.likes > 0 || 
            metrics.calculated.comments > 0 || metrics.calculated.shares > 0) && (
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {metrics.calculated.saves > 0 && (
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-xs text-gray-600">保存</p>
                  <p className="text-lg font-bold text-purple-700">
                    {metrics.calculated.saves.toLocaleString()}
                  </p>
                </div>
              )}
              {metrics.calculated.likes > 0 && (
                <div className="bg-pink-50 p-2 rounded">
                  <p className="text-xs text-gray-600">いいね</p>
                  <p className="text-lg font-bold text-pink-700">
                    {metrics.calculated.likes.toLocaleString()}
                  </p>
                </div>
              )}
              {metrics.calculated.comments > 0 && (
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-xs text-gray-600">コメント</p>
                  <p className="text-lg font-bold text-blue-700">
                    {metrics.calculated.comments.toLocaleString()}
                  </p>
                </div>
              )}
              {metrics.calculated.shares > 0 && (
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-gray-600">シェア</p>
                  <p className="text-lg font-bold text-green-700">
                    {metrics.calculated.shares.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instagram アクション詳細 */}
      {Object.keys(metrics.actions).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Instagram アクション詳細
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクションタイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    値
                  </th>
                  {Object.keys(metrics.costPerAction).length > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      コスト単価
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(metrics.actions).map(([key, value]) => {
                  // アクションタイプを読みやすく変換
                  let displayName = key
                  
                  // onsite_conversion.を削除
                  if (displayName.toLowerCase().startsWith('onsite_conversion.')) {
                    displayName = displayName.substring(18)
                  }
                  
                  // 特定のアクションタイプをわかりやすい名前に変換
                  const nameMap: { [key: string]: string } = {
                    'post_save': '投稿の保存',
                    'ig_save': '保存',
                    'saves': '保存数',
                    'profile_visits': 'プロフィール訪問',
                    'ig_profile_visit': 'プロフィール訪問',
                    'follows': 'フォロー',
                    'ig_follow': 'フォロー',
                    'likes': 'いいね',
                    'post_like': 'いいね',
                    'comments': 'コメント',
                    'post_comment': 'コメント',
                    'shares': 'シェア',
                    'post_share': 'シェア',
                    'story_view': 'ストーリーズ表示',
                    'reel_play': 'Reels再生',
                  }
                  
                  const friendlyName = nameMap[displayName.toLowerCase()] || 
                                      displayName.replace(/_/g, ' ').replace(/\./g, ' ')
                  
                  return (
                    <tr key={key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          <div className="font-medium">{friendlyName}</div>
                          <div className="text-xs text-gray-500">{key}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </td>
                      {Object.keys(metrics.costPerAction).length > 0 && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {metrics.costPerAction[key] 
                            ? `¥${parseFloat(metrics.costPerAction[key]).toFixed(2)}`
                            : '-'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 動画/Reelsメトリクス */}
      {Object.keys(metrics.videoMetrics).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            動画/Reels メトリクス
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(metrics.videoMetrics).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  {key.replace(/_/g, ' ').replace('actions', '')}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プラットフォーム固有データ */}
      {metrics.platformData && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Instagram プラットフォーム固有データ
          </h3>
          <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(metrics.platformData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}