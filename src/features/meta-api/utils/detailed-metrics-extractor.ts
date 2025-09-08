/**
 * detailed-metrics-extractor.ts
 * APIレスポンスから詳細メトリクスを抽出し、不足データを補完する
 */

export interface ExtractedMetric {
  value: any
  source: 'direct' | 'actions' | 'calculated' | 'unavailable'
  isEstimated: boolean
  confidence?: 'high' | 'medium' | 'low'
}

/**
 * 段階的なフォールバック戦略でメトリクス値を取得
 */
export function getMetricValue(fieldName: string, insight: any): ExtractedMetric {
  // 1. 直接フィールドを確認
  if (insight[fieldName] !== undefined && insight[fieldName] !== null) {
    return { 
      value: insight[fieldName], 
      source: 'direct', 
      isEstimated: false,
      confidence: 'high'
    }
  }

  // 2. actions配列から探す
  const actionMapping: Record<string, string[]> = {
    'inline_link_clicks': ['link_click', 'website_clicks', 'offsite_conversion.link_click'],
    'outbound_clicks': ['outbound_clicks', 'offsite_conversion'],
    'profile_visits': ['profile_visits', 'profile_views', 'onsite_conversion.ig_profile_visit'],
    'video_views': ['video_view', 'video_play', 'video_play_actions'],
    'post_saves': ['post_save', 'onsite_conversion.post_save', 'ig_save'],
    'post_engagement': ['post_engagement', 'onsite_conversion.post_engagement'],
    'post_reactions': ['post_reaction', 'post_like', 'likes']
  }

  if (actionMapping[fieldName] && insight.actions) {
    for (const actionType of actionMapping[fieldName]) {
      const action = insight.actions.find((a: any) => 
        a.action_type?.toLowerCase() === actionType.toLowerCase()
      )
      if (action?.value) {
        return { 
          value: parseFloat(action.value), 
          source: 'actions', 
          isEstimated: true,
          confidence: 'high'
        }
      }
    }
  }

  // 3. 計算可能な場合は計算
  const calculatedValue = calculateIfPossible(fieldName, insight)
  if (calculatedValue !== null) {
    return calculatedValue
  }

  // 4. デフォルト値
  return { 
    value: null, 
    source: 'unavailable', 
    isEstimated: false 
  }
}

/**
 * 計算可能なメトリクスを計算
 */
function calculateIfPossible(fieldName: string, insight: any): ExtractedMetric | null {
  const impressions = parseFloat(insight.impressions || '0')
  const clicks = parseFloat(insight.clicks || '0')
  const reach = parseFloat(insight.reach || '0')
  
  // CTR系の計算
  if (fieldName === 'inline_link_click_ctr' && insight.actions && impressions > 0) {
    const linkClicks = insight.actions.find((a: any) => 
      a.action_type === 'link_click' || a.action_type === 'website_clicks'
    )
    if (linkClicks?.value) {
      const ctr = (parseFloat(linkClicks.value) / impressions * 100)
      return {
        value: ctr.toFixed(2) + '%',
        source: 'calculated',
        isEstimated: true,
        confidence: 'medium'
      }
    }
  }

  // エンゲージメント率の計算
  if (fieldName === 'engagement_rate' && insight.actions && reach > 0) {
    const engagementActions = ['post_engagement', 'post_reaction', 'post_save', 'post_comment']
    let totalEngagement = 0
    
    for (const actionType of engagementActions) {
      const action = insight.actions.find((a: any) => 
        a.action_type?.toLowerCase().includes(actionType.toLowerCase())
      )
      if (action?.value) {
        totalEngagement += parseFloat(action.value)
      }
    }
    
    if (totalEngagement > 0) {
      return {
        value: (totalEngagement / reach * 100).toFixed(2) + '%',
        source: 'calculated',
        isEstimated: true,
        confidence: 'medium'
      }
    }
  }

  // プロフィール訪問率の計算
  if (fieldName === 'profile_visit_rate' && insight.actions && impressions > 0) {
    const profileVisits = insight.actions.find((a: any) => 
      a.action_type?.includes('profile')
    )
    if (profileVisits?.value) {
      return {
        value: (parseFloat(profileVisits.value) / impressions * 100).toFixed(2) + '%',
        source: 'calculated',
        isEstimated: true,
        confidence: 'medium'
      }
    }
  }

  return null
}

/**
 * APIレスポンスから詳細メトリクスを抽出
 */
export function extractDetailedMetrics(insight: any) {
  const metrics: Record<string, ExtractedMetric> = {}

  // 重要なメトリクスを抽出
  const importantFields = [
    // 品質指標
    'quality_ranking',
    'engagement_rate_ranking',
    'conversion_rate_ranking',
    
    // リンク関連
    'inline_link_clicks',
    'inline_link_click_ctr',
    'unique_inline_link_clicks',
    'outbound_clicks',
    
    // エンゲージメント
    'profile_visits',
    'profile_visit_rate',
    'engagement_rate',
    'post_saves',
    'post_engagement',
    'post_reactions',
    
    // 動画関連
    'video_views',
    'video_play_actions',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p100_watched_actions'
  ]

  for (const field of importantFields) {
    metrics[field] = getMetricValue(field, insight)
  }

  // actions配列の詳細分析
  if (insight.actions) {
    metrics._actions_analysis = analyzeActions(insight.actions)
  }

  return metrics
}

/**
 * actions配列を詳細分析
 */
function analyzeActions(actions: any[]): ExtractedMetric {
  const analysis = {
    totalActions: actions.length,
    actionTypes: actions.map(a => a.action_type),
    instagramActions: actions.filter(a => 
      a.action_type?.toLowerCase().includes('instagram') ||
      a.action_type?.toLowerCase().includes('ig_') ||
      a.action_type?.toLowerCase().includes('onsite_conversion')
    ),
    engagementActions: actions.filter(a =>
      a.action_type?.toLowerCase().includes('engagement') ||
      a.action_type?.toLowerCase().includes('reaction') ||
      a.action_type?.toLowerCase().includes('save') ||
      a.action_type?.toLowerCase().includes('comment')
    ),
    conversionActions: actions.filter(a =>
      a.action_type?.toLowerCase().includes('conversion') ||
      a.action_type?.toLowerCase().includes('purchase')
    )
  }

  return {
    value: analysis,
    source: 'calculated',
    isEstimated: false,
    confidence: 'high'
  }
}

/**
 * メトリクスの信頼性スコアを計算
 */
export function calculateReliabilityScore(metrics: Record<string, ExtractedMetric>): {
  score: number // 0-100
  breakdown: {
    directData: number
    calculatedData: number
    missingData: number
  }
} {
  const totalMetrics = Object.keys(metrics).length
  let directCount = 0
  let calculatedCount = 0
  let missingCount = 0

  for (const metric of Object.values(metrics)) {
    switch (metric.source) {
      case 'direct':
        directCount++
        break
      case 'actions':
      case 'calculated':
        calculatedCount++
        break
      case 'unavailable':
        missingCount++
        break
    }
  }

  const score = Math.round(
    (directCount * 100 + calculatedCount * 70 + missingCount * 0) / totalMetrics
  )

  return {
    score,
    breakdown: {
      directData: directCount,
      calculatedData: calculatedCount,
      missingData: missingCount
    }
  }
}