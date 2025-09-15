/**
 * insight-fetcher.ts
 * Meta Ads APIからインサイトを正しく取得するためのユーティリティクラス
 */

export interface InsightRequest {
  adId?: string
  accountId?: string
  accessToken: string
  dateRange: {
    since: string
    until: string
  }
  timeIncrement?: boolean
  fields?: string[]
}

export interface ApiErrorInfo {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

export interface InsightResponse {
  success: boolean
  data?: any[]
  error?: ApiErrorInfo
  requestedFields?: string[]
  returnedFields?: string[]
  missingFields?: string[]
}

/**
 * Meta Ads APIインサイト取得クラス
 */
export class InsightFetcher {
  /**
   * 広告レベルのインサイトを取得（最も詳細なデータ）
   */
  static async fetchAdInsights(request: InsightRequest): Promise<InsightResponse> {
    const { adId, accessToken, dateRange, timeIncrement = true, fields = [] } = request

    if (!adId) {
      return {
        success: false,
        error: {
          message: '広告IDが必要です',
          type: 'OAuthException',
          code: 100,
        },
      }
    }

    // 広告レベルで取得可能なフィールドを定義
    const adLevelFields = [
      // 基本メトリクス
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'ctr',
      'cpc',
      'cpm',

      // 品質指標（広告レベルでのみ取得可能）
      'quality_ranking',
      'engagement_rate_ranking',
      'conversion_rate_ranking',

      // リンク関連（詳細データ）
      'inline_link_clicks',
      'inline_link_click_ctr',
      'unique_inline_link_clicks',
      'outbound_clicks',

      // エンゲージメント詳細
      'actions',
      'action_values',
      'unique_actions',
      'cost_per_action_type',

      // 動画メトリクス（動画広告の場合）
      'video_play_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions',

      // コンバージョン
      'conversions',
      'conversion_values',
      'cost_per_conversion',
    ]

    const requestFields = fields.length > 0 ? fields : adLevelFields
    const url = `https://graph.facebook.com/v23.0/${adId}/insights`

    const params = new URLSearchParams({
      access_token: accessToken,
      time_range: JSON.stringify({
        since: dateRange.since,
        until: dateRange.until,
      }),
      fields: requestFields.join(','),
      level: 'ad',
    })

    if (timeIncrement) {
      params.append('time_increment', '1')
    }

    console.log('📊 広告レベルAPIリクエスト:', {
      url,
      adId,
      requestedFields: requestFields,
      timeIncrement,
      dateRange,
    })

    try {
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      if (data.error) {
        console.error('❌ Meta API エラー:', data.error)
        return {
          success: false,
          error: data.error,
          requestedFields: requestFields,
        }
      }

      const returnedFields = data.data?.[0] ? Object.keys(data.data[0]) : []
      const missingFields = requestFields.filter((field) => !returnedFields.includes(field))

      console.log('✅ 広告レベルAPI成功:', {
        取得データ数: data.data?.length || 0,
        要求フィールド数: requestFields.length,
        取得フィールド数: returnedFields.length,
        欠損フィールド数: missingFields.length,
        欠損フィールド: missingFields,
      })

      return {
        success: true,
        data: data.data,
        requestedFields: requestFields,
        returnedFields,
        missingFields,
      }
    } catch (error) {
      console.error('🚨 ネットワークエラー:', error)
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '不明なエラー',
          type: 'NetworkError',
          code: 0,
        },
      }
    }
  }

  /**
   * アカウントレベルのインサイトを取得（集計データ）
   */
  static async fetchAccountInsights(request: InsightRequest): Promise<InsightResponse> {
    const { accountId, accessToken, dateRange, fields = [] } = request

    if (!accountId) {
      return {
        success: false,
        error: {
          message: 'アカウントIDが必要です',
          type: 'OAuthException',
          code: 100,
        },
      }
    }

    // アカウントレベルで取得可能なフィールド（集計データのみ）
    const accountLevelFields = [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'ctr',
      'cpc',
      'cpm',
      'actions',
      'conversions',
    ]

    const requestFields = fields.length > 0 ? fields : accountLevelFields
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    const url = `https://graph.facebook.com/v23.0/${formattedAccountId}/insights`

    const params = new URLSearchParams({
      access_token: accessToken,
      time_range: JSON.stringify({
        since: dateRange.since,
        until: dateRange.until,
      }),
      fields: requestFields.join(','),
      level: 'account',
    })

    console.log('📈 アカウントレベルAPIリクエスト:', {
      url,
      accountId: formattedAccountId,
      requestedFields: requestFields,
    })

    try {
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()

      if (data.error) {
        console.error('❌ アカウントレベルAPI エラー:', data.error)
        return {
          success: false,
          error: data.error,
        }
      }

      return {
        success: true,
        data: data.data,
        requestedFields: requestFields,
        returnedFields: data.data?.[0] ? Object.keys(data.data[0]) : [],
      }
    } catch (error) {
      console.error('🚨 アカウントAPIネットワークエラー:', error)
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '不明なエラー',
          type: 'NetworkError',
          code: 0,
        },
      }
    }
  }

  /**
   * フィールドの可用性をテスト
   */
  static async checkFieldAvailability(
    adId: string,
    accessToken: string,
    fields: string[]
  ): Promise<Record<string, boolean>> {
    const testRequest: InsightRequest = {
      adId,
      accessToken,
      dateRange: {
        since: '2024-01-01',
        until: '2024-01-02',
      },
      timeIncrement: false,
      fields,
    }

    const response = await this.fetchAdInsights(testRequest)
    const availability: Record<string, boolean> = {}

    for (const field of fields) {
      availability[field] = response.returnedFields?.includes(field) || false
    }

    return availability
  }

  /**
   * APIエラーの詳細分析
   */
  static analyzeApiError(error: ApiErrorInfo): string {
    switch (error.code) {
      case 100:
        return `無効なパラメータ: ${error.message}`
      case 200:
        return `権限エラー: ${error.message}`
      case 190:
        return `アクセストークンエラー: ${error.message}`
      case 17:
        return `ユーザーリクエスト制限: ${error.message}`
      case 613:
        return `APIコール制限に達しました: ${error.message}`
      default:
        return `Meta APIエラー (${error.code}): ${error.message}`
    }
  }

  /**
   * フィールドが取得できない理由を推定
   */
  static diagnoseFieldUnavailability(
    fieldName: string,
    impressions: number = 0,
    adType?: string
  ): string {
    // 品質指標の場合
    if (
      ['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'].includes(fieldName)
    ) {
      if (impressions < 500) {
        return '500インプレッション以上で利用可能になります'
      }
      return '権限不足またはアカウント設定に問題がある可能性があります'
    }

    // 動画メトリクスの場合
    if (fieldName.includes('video_')) {
      if (adType && !adType.includes('VIDEO')) {
        return 'このフィールドは動画広告でのみ利用可能です'
      }
      return '動画データが不足しています'
    }

    // リンククリック系の場合
    if (fieldName.includes('link_click')) {
      return 'リンク付きの広告でのみ利用可能です'
    }

    return 'データが利用できません（権限またはデータ不足）'
  }
}
