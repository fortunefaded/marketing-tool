/**
 * api-diagnostics.ts
 * Meta Ads APIの診断ツール - 取得可能なフィールドとエラーを検証
 */

export interface FieldTestResult {
  fieldName: string
  category: string
  status: 'success' | 'error' | 'partial'
  value?: any
  error?: string
  alternative?: string
  recommendation?: string
}

export interface ApiDiagnosticsResult {
  summary: {
    totalTests: number
    successfulTests: number
    failedTests: number
    partialTests: number
    successRate: number
  }
  results: FieldTestResult[]
  recommendations: string[]
}

/**
 * フィールドグループを定義
 */
const FIELD_GROUPS = {
  basic: {
    name: '基本メトリクス',
    fields: ['impressions', 'clicks', 'spend', 'reach', 'frequency', 'ctr', 'cpc', 'cpm']
  },
  quality: {
    name: '品質評価指標',
    fields: ['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking']
  },
  links: {
    name: 'リンク詳細',
    fields: ['inline_link_clicks', 'inline_link_click_ctr', 'unique_inline_link_clicks', 'outbound_clicks']
  },
  video: {
    name: '動画メトリクス',
    fields: ['video_play_actions', 'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions']
  },
  actions: {
    name: 'アクション系',
    fields: ['actions', 'action_values', 'unique_actions', 'cost_per_action_type']
  },
  conversions: {
    name: 'コンバージョン',
    fields: ['conversions', 'conversion_values', 'cost_per_conversion']
  }
}

/**
 * フィールドグループをテスト
 */
async function testFieldGroup(
  groupName: string,
  fields: string[],
  accessToken: string,
  adId: string
): Promise<FieldTestResult[]> {
  const group = FIELD_GROUPS[groupName as keyof typeof FIELD_GROUPS]
  const results: FieldTestResult[] = []

  try {
    const url = `https://graph.facebook.com/v23.0/${adId}/insights`
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: fields.join(','),
      level: 'ad',
      limit: '1'
    })

    const response = await fetch(`${url}?${params}`)
    const data = await response.json()

    if (data.error) {
      // API全体のエラー
      for (const field of fields) {
        results.push({
          fieldName: field,
          category: group.name,
          status: 'error',
          error: data.error.message,
          recommendation: 'APIアクセストークンや権限を確認してください'
        })
      }
    } else if (data.data && data.data.length > 0) {
      const insight = data.data[0]
      
      // 各フィールドの状態をチェック
      for (const field of fields) {
        if (insight[field] !== undefined && insight[field] !== null) {
          results.push({
            fieldName: field,
            category: group.name,
            status: 'success',
            value: insight[field]
          })
        } else {
          // フィールドが存在しない場合の分析
          let recommendation = ''
          let alternative = ''

          if (field.includes('quality') || field.includes('ranking')) {
            const impressions = parseInt(insight.impressions || '0')
            recommendation = impressions < 500 
              ? '500インプレッション以上で利用可能になります'
              : '権限不足またはAPIバージョンの問題の可能性があります'
          }

          if (field.includes('video') && !insight.creative_media_type?.includes('VIDEO')) {
            recommendation = 'このフィールドは動画広告でのみ利用可能です'
          }

          if (field === 'inline_link_clicks' && insight.actions) {
            const linkClick = insight.actions.find((a: any) => a.action_type === 'link_click')
            if (linkClick) {
              alternative = `actions配列のlink_clickから取得可能: ${linkClick.value}`
              recommendation = 'actions配列を使用してデータを取得してください'
            }
          }

          results.push({
            fieldName: field,
            category: group.name,
            status: alternative ? 'partial' : 'error',
            error: 'フィールドがレスポンスに含まれていません',
            alternative,
            recommendation
          })
        }
      }
    } else {
      // データが存在しない
      for (const field of fields) {
        results.push({
          fieldName: field,
          category: group.name,
          status: 'error',
          error: 'データが存在しません',
          recommendation: '広告ID、日付範囲、または権限を確認してください'
        })
      }
    }
  } catch (error) {
    // ネットワークエラーなど
    for (const field of fields) {
      results.push({
        fieldName: field,
        category: group.name,
        status: 'error',
        error: error instanceof Error ? error.message : '不明なエラー',
        recommendation: 'ネットワーク接続またはAPIエンドポイントを確認してください'
      })
    }
  }

  return results
}

/**
 * Meta APIの能力を包括的にテスト
 */
export async function testMetaAPICapabilities(
  accessToken: string,
  adId: string,
  options: {
    testGroups?: (keyof typeof FIELD_GROUPS)[]
    includeRecommendations?: boolean
  } = {}
): Promise<ApiDiagnosticsResult> {
  const {
    testGroups = Object.keys(FIELD_GROUPS) as (keyof typeof FIELD_GROUPS)[],
    includeRecommendations = true
  } = options

  console.log('🔍 Meta API診断を開始中...', { adId, testGroups })

  const allResults: FieldTestResult[] = []
  const recommendations: string[] = []

  // 各フィールドグループをテスト
  for (const groupName of testGroups) {
    const group = FIELD_GROUPS[groupName]
    console.log(`📋 テスト中: ${group.name}`)
    
    const groupResults = await testFieldGroup(
      groupName,
      group.fields,
      accessToken,
      adId
    )
    
    allResults.push(...groupResults)
  }

  // サマリーを計算
  const successfulTests = allResults.filter(r => r.status === 'success').length
  const failedTests = allResults.filter(r => r.status === 'error').length
  const partialTests = allResults.filter(r => r.status === 'partial').length
  const totalTests = allResults.length
  const successRate = Math.round((successfulTests / totalTests) * 100)

  // 推奨事項を生成
  if (includeRecommendations) {
    // 品質指標の推奨事項
    const qualityErrors = allResults.filter(r => 
      r.category === '品質評価指標' && r.status === 'error'
    )
    if (qualityErrors.length > 0) {
      recommendations.push('品質評価指標を取得するには、広告が500インプレッション以上必要です')
    }

    // アクション系の推奨事項
    const actionPartials = allResults.filter(r => 
      r.status === 'partial' && r.alternative?.includes('actions')
    )
    if (actionPartials.length > 0) {
      recommendations.push('一部のメトリクスは actions 配列から代替データを取得できます')
    }

    // 動画メトリクスの推奨事項
    const videoErrors = allResults.filter(r => 
      r.category === '動画メトリクス' && r.status === 'error'
    )
    if (videoErrors.length > 0) {
      recommendations.push('動画メトリクスは動画広告でのみ利用可能です')
    }

    // 全体的な推奨事項
    if (successRate < 70) {
      recommendations.push('APIアクセストークンの権限を見直すことをお勧めします')
      recommendations.push('Meta Business アカウントの設定を確認してください')
    }
  }

  const result: ApiDiagnosticsResult = {
    summary: {
      totalTests,
      successfulTests,
      failedTests,
      partialTests,
      successRate
    },
    results: allResults,
    recommendations
  }

  // 結果をテーブル形式でコンソールに出力
  console.table(allResults.map(r => ({
    フィールド: r.fieldName,
    カテゴリ: r.category,
    ステータス: r.status,
    値: r.value || r.error || r.alternative || '',
    推奨事項: r.recommendation || ''
  })))

  console.log(`📊 診断完了: ${successRate}% (${successfulTests}/${totalTests} 成功)`)
  
  if (recommendations.length > 0) {
    console.log('💡 推奨事項:')
    recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`))
  }

  return result
}

/**
 * 特定の広告の診断を実行（簡易版）
 */
export async function quickDiagnoseAd(
  accessToken: string,
  adId: string
): Promise<{
  canGetBasicMetrics: boolean
  canGetQualityRankings: boolean
  canGetDetailedActions: boolean
  availableAlternatives: string[]
}> {
  const result = await testMetaAPICapabilities(accessToken, adId, {
    testGroups: ['basic', 'quality', 'actions'],
    includeRecommendations: false
  })

  const basicSuccess = result.results
    .filter(r => r.category === '基本メトリクス')
    .every(r => r.status === 'success')

  const qualitySuccess = result.results
    .filter(r => r.category === '品質評価指標')
    .some(r => r.status === 'success')

  const actionsSuccess = result.results
    .filter(r => r.category === 'アクション系')
    .some(r => r.status === 'success')

  const availableAlternatives = result.results
    .filter(r => r.status === 'partial' && r.alternative)
    .map(r => r.alternative!)

  return {
    canGetBasicMetrics: basicSuccess,
    canGetQualityRankings: qualitySuccess,
    canGetDetailedActions: actionsSuccess,
    availableAlternatives
  }
}