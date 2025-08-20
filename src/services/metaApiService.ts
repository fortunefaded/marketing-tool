import { MetaDataParser } from '../utils/metaDataParser'

import { ConvexClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
}

export interface MetaCampaignData {
  id: string
  name: string
  status: string
  objective: string
  dailyBudget: number
  lifetimeBudget?: number
  spend?: number
  created_time: string
  updated_time: string
}

export interface MetaAdSetData {
  id: string
  name: string
  campaign_id: string
  status: string
  daily_budget: string | null
  lifetime_budget: string | null
  optimization_goal: string
  billing_event: string
  bid_amount: string
  created_time: string
  updated_time: string
}

export interface MetaAdData {
  id: string
  name: string
  adset_id: string
  campaign_id: string
  status: string
  creative: {
    id: string
    name: string
    title: string
    body: string
    image_url: string
  }
  created_time: string
  updated_time: string
}

export interface MetaInsightsData {
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  frequency: string
  cpm: string
  cpc: string
  ctr: string

  // 主要コンバージョンメトリクス
  conversions?: string
  conversion_value?: string
  cost_per_conversion?: string
  roas?: string

  // 詳細コンバージョンデータ
  purchase_conversions?: number
  website_purchase_conversions?: number
  offsite_conversions?: number
  omni_purchase_conversions?: number

  purchase_value?: number
  website_purchase_value?: number
  offsite_conversion_value?: number
  omni_purchase_value?: number

  purchase_cpa?: number
  website_purchase_cpa?: number
  offsite_conversion_cpa?: number

  purchase_roas_value?: number
  website_purchase_roas_value?: number

  // 生データ（デバッグ用）
  actions_raw?: any[]
  action_values_raw?: any[]
  cost_per_action_type_raw?: any[]
  purchase_roas_raw?: any
  website_purchase_roas_raw?: any
  parser_debug?: any

  // キャンペーン情報
  campaign_id?: string
  campaign_name?: string
  // 広告セット情報
  adset_id?: string
  adset_name?: string
  // 広告情報
  ad_id?: string
  ad_name?: string
  // クリエイティブ情報
  creative_id?: string
  creative_name?: string
  creative_type?: string
  creative_url?: string
  thumbnail_url?: string
  video_url?: string
  video_id?: string
  carousel_cards?: Array<{
    name: string
    description: string
    image_url: string
    link: string
  }>
  [key: string]: string | Array<any> | number | undefined
}

export interface MetaApiFilter {
  campaignIds?: string[]
  adSetIds?: string[]
  adIds?: string[]
  dateRange?: {
    since: string
    until: string
  }
  status?: string[]
}

export interface MetaInsightsOptions {
  level: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange?: {
    since: string
    until: string
  }
  datePreset?: string
  fields?: string[]
  metrics?: string[]
  breakdowns?: string[]
  filtering?: any[]
  limit?: number
  after?: string
  time_increment?: string
}

export interface MetaBatchRequest {
  method: string
  relative_url: string
  body?: string
}

export class MetaApiError extends Error {
  code: string
  statusCode?: number
  details?: any

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message)
    this.name = 'MetaApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class MetaApiService {
  private config: MetaApiConfig
  private baseUrl: string
  private requestCount: number = 0
  private lastRequestTime: number = 0
  private readonly MIN_REQUEST_INTERVAL = 100 // 100ms間隔
  private cachedDateLimit: { maxMonths: number; oldestDate: string } | null = null
  private detectingDateLimit: boolean = false
  private convexClient?: ConvexClient

  constructor(config: MetaApiConfig, convexClient?: ConvexClient) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || 'v23.0',
    }
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`
    this.convexClient = convexClient
  }

  // レート制限対応のための待機
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest
      console.log(`レート制限対応: ${waitTime}ms待機`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  // 指数バックオフでリトライ
  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error
        }

        // レート制限エラーの場合はより長く待機
        const isRateLimit = error.statusCode === 429 || error.code === 'RATE_LIMIT'
        const baseDelay = isRateLimit ? 5000 : 1000 // レート制限なら5秒、その他1秒
        const delay = baseDelay * Math.pow(2, attempt - 1) // 指数バックオフ

        console.log(`リトライ ${attempt}/${maxRetries}: ${delay}ms待機 (${error.message})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    throw new Error('Max retries exceeded')
  }

  getConfig(): MetaApiConfig {
    return this.config
  }

  // Meta APIの日付制限を動的に検出
  async detectDateLimit(): Promise<{ maxMonths: number; oldestDate: string }> {
    // キャッシュがあれば返す
    if (this.cachedDateLimit) {
      console.log('キャッシュされた日付制限を使用:', this.cachedDateLimit)
      return this.cachedDateLimit
    }

    // 既に検出中の場合は待機
    if (this.detectingDateLimit) {
      console.log('日付制限の検出が既に進行中です。待機中...')
      // 最大10秒待機
      for (let i = 0; i < 100; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        if (this.cachedDateLimit) {
          return this.cachedDateLimit
        }
      }
    }

    this.detectingDateLimit = true
    console.log('Meta APIの日付制限を検出中...')

    let maxMonths = 37 // デフォルトは37ヶ月

    // 二分探索で実際の制限を見つける
    let low = 1
    let high = 36 // 安全のため36ヶ月から開始

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const testDate = new Date()
      testDate.setDate(1) // 月初に設定
      testDate.setMonth(testDate.getMonth() - mid)
      testDate.setDate(1) // 再度月初に設定（月跨ぎの問題を回避）

      const testDateStr = testDate.toISOString().split('T')[0]

      try {
        // 1日分だけテスト取得（リトライなしで高速化）
        await this.apiCall(`/act_${this.config.accountId}/insights`, {
          fields: 'spend',
          level: 'account',
          limit: 1,
          time_range: JSON.stringify({
            since: testDateStr,
            until: testDateStr,
          }),
        })

        // 成功したら、もっと古い日付を試す
        maxMonths = mid
        // 成功したので、もっと古い日付を試す
        low = mid + 1
      } catch (error: any) {
        // エラーコード3018は日付制限エラー
        const isDateLimitError =
          error.code === 3018 ||
          error.code === '3018' ||
          error.details?.error?.code === 3018 ||
          error.message?.includes('37 months') ||
          error.message?.includes('beyond')

        if (isDateLimitError) {
          // 失敗したら、もっと新しい日付を試す
          high = mid - 1
        } else {
          // その他のエラーは無視して続行
          console.warn('日付制限検出中のエラー:', error.message)
          break
        }
      }
    }

    // 正しい日付を計算（月末の日付調整を考慮）
    const correctOldestDate = new Date()
    correctOldestDate.setMonth(correctOldestDate.getMonth() - maxMonths + 1) // 1ヶ月分の余裕を持たせる
    correctOldestDate.setDate(1) // 月初に設定して日付の問題を回避
    console.log(
      `Meta APIの実際の制限: 過去${maxMonths}ヶ月まで (${correctOldestDate.toISOString().split('T')[0]}以降)`
    )

    // 結果をキャッシュ
    this.cachedDateLimit = {
      maxMonths,
      oldestDate: correctOldestDate.toISOString().split('T')[0],
    }

    this.detectingDateLimit = false
    return this.cachedDateLimit
  }

  // 認証
  async validateAccessToken(): Promise<boolean> {
    try {
      const response = await this.apiCall('/debug_token', {
        input_token: this.config.accessToken,
        access_token: this.config.accessToken,
      })

      return response.data?.is_valid === true
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw error
      }
      throw new MetaApiError(
        'Failed to validate access token',
        'VALIDATION_ERROR',
        undefined,
        error
      )
    }
  }

  // 権限の確認
  async checkPermissions(): Promise<{ permission: string; status: string }[]> {
    try {
      const response = await this.apiCall('/me/permissions')
      return response.data || []
    } catch (error) {
      throw new MetaApiError(
        'Failed to check permissions',
        'PERMISSION_CHECK_ERROR',
        undefined,
        error
      )
    }
  }

  // アカウント情報の確認
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.apiCall(`/act_${this.config.accountId}`, {
        fields: 'id,name,currency,timezone_name,account_status',
      })
      return response
    } catch (error) {
      console.error('Failed to get account info:', error)
      throw error
    }
  }

  // キャンペーンデータ取得
  async getCampaigns(
    filter?: MetaApiFilter & { limit?: number; after?: string }
  ): Promise<MetaCampaignData[]> {
    const params: any = {
      fields:
        'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,insights{spend}',
      limit: filter?.limit || 100,
    }

    console.log('Getting campaigns for account:', `act_${this.config.accountId}`)

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.campaignIds) {
      params.filtering = JSON.stringify([
        {
          field: 'id',
          operator: 'IN',
          value: filter.campaignIds,
        },
      ])
    }

    if (filter?.dateRange) {
      params.time_range = JSON.stringify({
        since: filter.dateRange.since,
        until: filter.dateRange.until,
      })
    }

    if (filter?.status) {
      params.filtering = JSON.stringify([
        {
          field: 'status',
          operator: 'IN',
          value: filter.status,
        },
      ])
    }

    try {
      const response = await this.apiCall(`/act_${this.config.accountId}/campaigns`, params)

      // APIレスポンスの形式を確認
      console.log('Campaigns API Response:', {
        hasData: !!response.data,
        isArray: Array.isArray(response),
        dataIsArray: Array.isArray(response.data),
        responseKeys: Object.keys(response),
        sampleResponse: response.data ? response.data[0] : response[0],
      })

      // レスポンスが配列か、dataプロパティを持つオブジェクトかを判定
      const campaigns = Array.isArray(response) ? response : response.data || []

      return campaigns.map((campaign: any) => ({
        ...campaign,
        dailyBudget: parseFloat(campaign.daily_budget || '0'),
        lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : undefined,
        spend: campaign.insights?.data?.[0]?.spend
          ? parseFloat(campaign.insights.data[0].spend)
          : 0,
      }))
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      throw error
    }
  }

  // 広告セットデータ取得
  async getAdSets(
    filter?: MetaApiFilter & { limit?: number; after?: string }
  ): Promise<MetaAdSetData[]> {
    const params: any = {
      fields:
        'id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,created_time,updated_time',
      limit: filter?.limit || 100,
    }

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.adSetIds) {
      params.filtering = JSON.stringify([
        {
          field: 'id',
          operator: 'IN',
          value: filter.adSetIds,
        },
      ])
    }

    if (filter?.campaignIds) {
      params.filtering = JSON.stringify([
        {
          field: 'campaign_id',
          operator: 'IN',
          value: filter.campaignIds,
        },
      ])
    }

    const response = await this.apiCall(`/act_${this.config.accountId}/adsets`, params)
    return Array.isArray(response) ? response : response.data || []
  }

  // 広告データ取得
  async getAds(filter?: MetaApiFilter & { limit?: number; after?: string }): Promise<MetaAdData[]> {
    const params: any = {
      fields:
        'id,name,adset_id,campaign_id,status,creative{id,name,title,body,image_url},created_time,updated_time',
      limit: filter?.limit || 100,
    }

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.adIds) {
      params.filtering = JSON.stringify([
        {
          field: 'id',
          operator: 'IN',
          value: filter.adIds,
        },
      ])
    }

    const response = await this.apiCall(`/act_${this.config.accountId}/ads`, params)
    return Array.isArray(response) ? response : response.data || []
  }

  // 広告クリエイティブの詳細取得
  async getAdCreatives(adIds: string[]): Promise<any[]> {
    if (!adIds.length) return []

    const creatives = []
    for (const adId of adIds) {
      try {
        const adData = await this.apiCall(`/${adId}`, {
          fields:
            'id,name,creative{id,name,title,body,image_url,video_id,thumbnail_url,object_type,link_url,object_story_spec,asset_feed_spec,image_hash,effective_object_story_id}',
        })

        console.log(`Ad Creative API Response for ${adId}:`, {
          ad_id: adData.id,
          ad_name: adData.name,
          creative: {
            id: adData.creative?.id,
            name: adData.creative?.name,
            video_id: adData.creative?.video_id,
            image_url: adData.creative?.image_url,
            thumbnail_url: adData.creative?.thumbnail_url,
            object_type: adData.creative?.object_type,
            effective_object_story_id: adData.creative?.effective_object_story_id,
          },
        })

        if (adData.creative) {
          // クリエイティブタイプを判定
          let creativeType = 'text'
          if (adData.creative.video_id) {
            creativeType = 'video'
          } else if (adData.creative.image_url) {
            creativeType = 'image'
          } else if (adData.creative.object_type === 'SHARE') {
            creativeType = 'carousel'
          }

          // カルーセルの場合、追加情報を取得
          let carouselCards = []
          if (creativeType === 'carousel' && adData.creative.object_story_spec) {
            const storySpec = adData.creative.object_story_spec
            if (storySpec.link_data && storySpec.link_data.child_attachments) {
              carouselCards = storySpec.link_data.child_attachments.map((card: any) => {
                // より高画質な画像URLを取得
                let imageUrl = card.picture || ''
                if (card.image_hash) {
                  imageUrl = `https://scontent.xx.fbcdn.net/v/t45.1600-4/${card.image_hash}_n.jpg`
                }

                return {
                  name: card.name || '',
                  description: card.description || '',
                  image_url: imageUrl,
                  link: card.link || '',
                }
              })
            }
          }

          // ビデオ情報の取得
          let videoThumbnail = adData.creative.thumbnail_url
          let videoUrl = null
          let actualVideoId = adData.creative.video_id

          if (creativeType === 'video') {
            // effective_object_story_idがある場合、そこから動画情報を取得
            if (adData.creative.effective_object_story_id) {
              try {
                const storyData = await this.apiCall(
                  `/${adData.creative.effective_object_story_id}`,
                  {
                    fields: 'attachments{media{source,image{src}},type,url,subattachments}',
                  }
                )

                console.log(
                  `Story data for ${adData.creative.effective_object_story_id}:`,
                  storyData
                )

                if (storyData.attachments && storyData.attachments.data) {
                  for (const attachment of storyData.attachments.data) {
                    if (attachment.media) {
                      // 動画URLを取得
                      if (attachment.media.source) {
                        videoUrl = attachment.media.source
                        console.log('Found video source from story:', videoUrl)
                      }
                      // サムネイルを取得
                      if (attachment.media.image && attachment.media.image.src) {
                        videoThumbnail = attachment.media.image.src
                      }
                    }
                    // URLから動画IDを抽出
                    if (attachment.url && attachment.url.includes('/videos/')) {
                      const match = attachment.url.match(/\/videos\/(\d+)/)
                      if (match) {
                        actualVideoId = match[1]
                        console.log('Extracted video ID from story URL:', actualVideoId)
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn(
                  `Failed to get story data for ${adData.creative.effective_object_story_id}:`,
                  error
                )
              }
            }

            // video_idから直接動画情報を取得
            if (actualVideoId && !videoUrl) {
              try {
                const videoData = await this.apiCall(`/${actualVideoId}`, {
                  fields: 'id,thumbnails,source,permalink_url,embeddable,format,from,description',
                })

                console.log(`Video data for ${actualVideoId}:`, {
                  id: videoData.id,
                  has_source: !!videoData.source,
                  has_permalink: !!videoData.permalink_url,
                  format_count: videoData.format?.length || 0,
                })

                // より高画質なサムネイルを選択
                if (
                  videoData.thumbnails &&
                  videoData.thumbnails.data &&
                  videoData.thumbnails.data.length > 0
                ) {
                  // 最も高解像度のサムネイルを選択
                  const sortedThumbnails = videoData.thumbnails.data.sort(
                    (a: any, b: any) => b.width * b.height - a.width * a.height
                  )
                  videoThumbnail = sortedThumbnails[0].uri
                }

                // 動画のソースURL - 複数のオプションを試す
                // 1. 直接のsource URL（最も信頼性が高い）
                if (videoData.source) {
                  videoUrl = videoData.source
                  console.log('Using direct source URL:', videoUrl)
                }

                // 2. フォーマット情報から直接URLを取得
                if (!videoUrl && videoData.format && Array.isArray(videoData.format)) {
                  // HD版を優先、なければネイティブ版
                  const preferredFormats = ['hd', 'sd', 'native']
                  for (const formatType of preferredFormats) {
                    const format = videoData.format.find((f: any) => f.filter === formatType)
                    if (format && format.embed_html) {
                      // embed_htmlからvideo URLを抽出
                      const srcMatch = format.embed_html.match(/src="([^"]+)"/)
                      if (srcMatch) {
                        videoUrl = srcMatch[1]
                        console.log(`Extracted video URL from ${formatType} format:`, videoUrl)
                        break
                      }
                    }
                  }
                }

                // 3. 動画IDのみを保存（クライアント側で処理）
                if (!videoUrl) {
                  // 動画IDを直接渡す（クライアント側でFacebookの埋め込みプレーヤーを使用）
                  actualVideoId = videoData.id
                  console.log(
                    'No direct video URL found, will use video ID for embed:',
                    actualVideoId
                  )
                }
              } catch (error) {
                console.warn(`Failed to get video data for ${actualVideoId}:`, error)
              }
            }
          }

          // 画像の高画質版を取得
          let highQualityImageUrl = adData.creative.image_url
          if (creativeType === 'image' && adData.creative.image_hash) {
            // Facebookの高画質画像URLパターン
            highQualityImageUrl = `https://scontent.xx.fbcdn.net/v/t45.1600-4/${adData.creative.image_hash}_n.jpg`
          }

          const creativeData = {
            ad_id: adData.id,
            ad_name: adData.name,
            creative_id: adData.creative.id,
            creative_name: adData.creative.name || adData.creative.title || adData.name,
            creative_type: creativeType,
            title: adData.creative.title,
            body: adData.creative.body,
            image_url: highQualityImageUrl || adData.creative.image_url,
            video_id: actualVideoId, // 実際の動画ID
            video_url: videoUrl, // 動画の直接URL（あれば）
            thumbnail_url: videoThumbnail || highQualityImageUrl || adData.creative.image_url,
            link_url: adData.creative.link_url,
            carousel_cards: carouselCards,
          }

          // 詳細なデバッグログ
          console.log(`Creative Data Debug for ${adData.id}:`, {
            creative_type: creativeType,
            video_id: actualVideoId,
            original_video_id: adData.creative.video_id,
            video_url: videoUrl,
            thumbnail_url: videoThumbnail,
            effective_object_story_id: adData.creative.effective_object_story_id,
            has_video: !!actualVideoId,
            has_video_url: !!videoUrl,
          })

          creatives.push(creativeData)
        }
      } catch (error) {
        // デバッグモードでのみエラーログを出力
        const debugMode = localStorage.getItem('meta_sync_settings')
          ? JSON.parse(localStorage.getItem('meta_sync_settings') || '{}').debugMode
          : false

        if (debugMode) {
          console.warn(`Failed to get creative for ad ${adId}:`, error)
        }
      }
    }

    return creatives
  }

  // インサイトデータ取得
  async getInsights(options: MetaInsightsOptions): Promise<MetaInsightsData[]> {
    // コンバージョン、ROAS、CPAを含む包括的なメトリクス
    const defaultMetrics = [
      // 基本フィールド
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'ctr',

      // コンバージョン関連（重要：正しいフィールド名）
      'actions', // すべてのアクション
      'action_values', // アクションの価値
      'conversions', // コンバージョン数
      'conversion_values', // コンバージョン価値
      'cost_per_action_type', // アクションタイプ別CPA
      'cost_per_conversion', // CPA
      'website_purchases', // ウェブサイト購入
      'purchase_roas', // 購入ROAS（配列形式）
      'website_purchase_roas', // ウェブサイト購入ROAS（配列形式）

      // アトリビューション設定
      'inline_link_clicks',
      'outbound_clicks',
      'landing_page_views',
      'omni_purchase',
      'purchase',
    ]

    // レベルに応じて追加フィールドを決定
    let additionalFields: string[] = []
    if (options.level === 'campaign') {
      additionalFields = ['campaign_id', 'campaign_name']
    } else if (options.level === 'adset') {
      additionalFields = ['campaign_id', 'campaign_name', 'adset_id', 'adset_name']
    } else if (options.level === 'ad') {
      additionalFields = [
        'campaign_id',
        'campaign_name',
        'adset_id',
        'adset_name',
        'ad_id',
        'ad_name',
      ]
    }

    const fields = options.fields
      ? options.fields
      : [...(options.metrics || defaultMetrics), ...additionalFields]
    const params: any = {
      fields: fields.join(','),
      level: options.level,
      limit: Math.min(options.limit || 25, 25), // API制限を考慮した小さなバッチサイズ

      // アトリビューションウィンドウの設定（重要）
      use_unified_attribution_setting: true,
      action_attribution_windows: [
        '1d_click',
        '7d_click',
        '28d_click',
        '1d_view',
        '7d_view',
        '28d_view',
      ].join(','),

      // アクションブレークダウンを追加
      action_breakdowns: 'action_type',
    }

    console.log(`getInsights called with level: ${options.level}, fields: ${fields.join(',')}`)

    if (options.datePreset) {
      params.date_preset = options.datePreset
    } else if (options.dateRange && options.dateRange.since && options.dateRange.until) {
      params.time_range = JSON.stringify({
        since: options.dateRange.since,
        until: options.dateRange.until,
      })
    } else {
      // デフォルトの日付範囲（過去30日）を設定
      const defaultDateRange = {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0],
      }
      params.time_range = JSON.stringify(defaultDateRange)
      console.warn(
        '日付範囲が指定されていないため、デフォルトの過去30日を使用します',
        options.dateRange
      )
    }

    if (options.after) {
      params.after = options.after
    }

    if (options.breakdowns) {
      params.breakdowns = options.breakdowns.join(',')
    }

    if (options.time_increment) {
      params.time_increment = options.time_increment
    }

    if (options.filtering) {
      params.filtering = JSON.stringify(options.filtering)
    }

    let endpoint = `/act_${this.config.accountId}/insights`

    const response = await this.retryWithBackoff(async () => {
      await this.rateLimit()
      return await this.apiCall(endpoint, params)
    })
    const data = Array.isArray(response) ? response : response.data || []

    // データ確認とデバッグログ
    if (data.length > 0) {
      console.log(`${options.level}レベルデータ取得: ${data.length}件`)
      const sample = data[0]
      console.log('サンプルデータ:', {
        date_start: sample.date_start,
        spend: sample.spend,
        impressions: sample.impressions,
        clicks: sample.clicks,
        actions: sample.actions,
        action_values: sample.action_values,
        cost_per_action_type: sample.cost_per_action_type,
        purchase_roas: sample.purchase_roas,
        website_purchase_roas: sample.website_purchase_roas,
        conversions: sample.conversions,
      })
    }

    // データを統一フォーマットに変換（MetaDataParserを使用）
    return data.map((insight: any) => {
      // MetaDataParserを使用してコンバージョンデータを解析
      const parsedData = MetaDataParser.parseInsightData(insight)

      // 従来の個別抽出も保持（詳細分析用）
      const extractActionValue = (actions: any[], actionType: string) => {
        if (!Array.isArray(actions)) return 0
        const action = actions.find((a) => a.action_type === actionType)
        return action ? parseFloat(action.value || '0') : 0
      }

      const extractActionValues = (actionValues: any[], actionType: string) => {
        if (!Array.isArray(actionValues)) return 0
        const actionValue = actionValues.find((a) => a.action_type === actionType)
        return actionValue ? parseFloat(actionValue.value || '0') : 0
      }

      const extractCostPerAction = (costPerActions: any[], actionType: string) => {
        if (!Array.isArray(costPerActions)) return 0
        const costAction = costPerActions.find((a) => a.action_type === actionType)
        return costAction ? parseFloat(costAction.value || '0') : 0
      }

      // 個別のコンバージョンタイプ
      const purchases = extractActionValue(insight.actions, 'purchase')
      const offsite_conversions = extractActionValue(insight.actions, 'offsite_conversion')
      const website_purchases = extractActionValue(insight.actions, 'website_purchase')
      const omni_purchases = extractActionValue(insight.actions, 'omni_purchase')

      const purchaseValue = extractActionValues(insight.action_values, 'purchase')
      const website_purchase_value = extractActionValues(insight.action_values, 'website_purchase')
      const offsite_conversion_value = extractActionValues(
        insight.action_values,
        'offsite_conversion'
      )
      const omni_purchase_value = extractActionValues(insight.action_values, 'omni_purchase')

      const purchaseCPA = extractCostPerAction(insight.cost_per_action_type, 'purchase')
      const website_purchase_cpa = extractCostPerAction(
        insight.cost_per_action_type,
        'website_purchase'
      )
      const offsite_conversion_cpa = extractCostPerAction(
        insight.cost_per_action_type,
        'offsite_conversion'
      )

      // MetaDataParserの結果を使用（優先）
      const totalConversions = parsedData.conversions
      const totalConversionValue = parsedData.conversionValue
      const totalCPA = parsedData.cpa
      const totalROAS = parsedData.roas

      // コンバージョンデータのデバッグログ（データがある場合のみ）
      if (totalConversions > 0 || parsedData.debug.hasActions) {
        console.log('コンバージョンデータ解析結果:', {
          date: insight.date_start,
          ad_id: insight.ad_id,
          totalConversions,
          totalConversionValue,
          totalCPA,
          totalROAS,
          purchases,
          website_purchases,
          offsite_conversions,
          debug: parsedData.debug,
        })
      }

      return {
        // 新しいインターフェースのフィールド名
        date_start: insight.date_start,
        date_stop: insight.date_stop,
        impressions: insight.impressions,
        clicks: insight.clicks,
        spend: insight.spend,
        reach: insight.reach,
        frequency: insight.frequency,
        cpm: insight.cpm,
        cpc: insight.cpc,
        ctr: insight.ctr,

        // 抽出されたコンバージョンデータ
        conversions: totalConversions.toString(),
        conversion_value: totalConversionValue.toString(),
        cost_per_conversion: totalCPA.toString(),
        roas: totalROAS.toString(),

        // 詳細なコンバージョンデータ（デバッグ用）
        purchase_conversions: purchases,
        website_purchase_conversions: website_purchases,
        offsite_conversions: offsite_conversions,
        omni_purchase_conversions: omni_purchases,

        purchase_value: purchaseValue,
        website_purchase_value: website_purchase_value,
        offsite_conversion_value: offsite_conversion_value,
        omni_purchase_value: omni_purchase_value,

        purchase_cpa: purchaseCPA,
        website_purchase_cpa: website_purchase_cpa,
        offsite_conversion_cpa: offsite_conversion_cpa,

        purchase_roas_value: purchases,
        website_purchase_roas_value: website_purchases,

        // 生データも保持（デバッグ用）
        actions_raw: insight.actions,
        action_values_raw: insight.action_values,
        cost_per_action_type_raw: insight.cost_per_action_type,
        purchase_roas_raw: insight.purchase_roas,
        website_purchase_roas_raw: insight.website_purchase_roas,

        // MetaDataParserのデバッグ情報
        parser_debug: parsedData.debug,

        // キャンペーン・広告セット・広告情報
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        adset_id: insight.adset_id,
        adset_name: insight.adset_name,
        ad_id: insight.ad_id,
        ad_name: insight.ad_name,

        // クリエイティブ情報（もし含まれていれば）
        creative_id: insight.creative_id,
        creative_name: insight.creative_name,
        video_id: insight.video_id,
        video_url: insight.video_url,

        // 古いフィールド名も保持（後方互換性）
        dateStart: insight.date_start,
        dateStop: insight.date_stop,
        campaignName: insight.campaign_name,
        campaignId: insight.campaign_id,
        conversionValue: totalConversionValue,
        costPerConversion: totalCPA,
      }
    })
  }

  // Convexにデータを保存
  async saveInsightsToConvex(insights: MetaInsightsData[]): Promise<void> {
    if (!this.convexClient) {
      console.warn('Convex client not initialized, skipping save to Convex')
      return
    }

    try {
      // データを変換して保存
      const transformedInsights = insights.map((insight) => ({
        // 基本情報
        accountId: this.config.accountId,
        date_start: insight.date_start,
        date_stop: insight.date_stop || insight.date_start,

        // キャンペーン情報
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,

        // 広告情報
        ad_id: insight.ad_id,
        ad_name: insight.ad_name,

        // クリエイティブ情報
        creative_id: insight.creative_id,
        creative_name: insight.creative_name,
        creative_type: insight.creative_type,
        thumbnail_url: insight.thumbnail_url,
        video_url: insight.video_url,
        carousel_cards: insight.carousel_cards,

        // パフォーマンスメトリクス
        impressions: Number(insight.impressions) || 0,
        clicks: Number(insight.clicks) || 0,
        spend: Number(insight.spend) || 0,
        reach: Number(insight.reach) || 0,
        frequency: Number(insight.frequency) || 0,
        cpc: Number(insight.cpc) || 0,
        cpm: Number(insight.cpm) || 0,
        ctr: Number(insight.ctr) || 0,

        // コンバージョンメトリクス
        conversions: Number(insight.conversions) || 0,
        conversion_rate: Number(insight.cvr) || 0,
        cost_per_conversion: Number(insight.cpa) || 0,

        // 互換性フィールド
        dateStart: insight.date_start,
        dateStop: insight.date_stop || insight.date_start,
        campaignId: insight.campaign_id,
        campaignName: insight.campaign_name,
        adId: insight.ad_id,
        adName: insight.ad_name,
      }))

      // バッチで保存
      const batchSize = 100
      for (let i = 0; i < transformedInsights.length; i += batchSize) {
        const batch = transformedInsights.slice(i, i + batchSize)
        await this.convexClient.mutation(api.metaInsights.importInsights, {
          insights: batch,
          strategy: 'merge' as const,
        })
      }

      console.log(`Saved ${transformedInsights.length} insights to Convex`)
    } catch (error) {
      console.error('Error saving insights to Convex:', error)
      throw error
    }
  }

  // 同期ステータスをConvexに保存
  async saveSyncStatusToConvex(status: {
    lastFullSync?: string
    lastIncrementalSync?: string
    totalRecords?: number
    earliestDate?: string
    latestDate?: string
  }): Promise<void> {
    if (!this.convexClient) {
      console.warn('Convex client not initialized, skipping sync status save')
      return
    }

    try {
      await this.convexClient.mutation(api.metaInsights.saveSyncStatus, {
        accountId: this.config.accountId,
        ...status,
      })
    } catch (error) {
      console.error('Error saving sync status to Convex:', error)
      throw error
    }
  }

  // getInsightsのラッパー（Convex保存付き）
  async getInsightsWithConvexSave(
    startDate?: string,
    endDate?: string,
    options: {
      level?: 'account' | 'campaign' | 'adset' | 'ad'
      limit?: number
      fields?: string[]
      timeIncrement?: number | 'monthly'
      filtering?: any[]
      breakdowns?: string[]
    } = {}
  ): Promise<MetaInsightsData[]> {
    const insights = await this.getInsights({
      level: options.level || 'ad',
      dateRange: {
        since: startDate || '',
        until: endDate || '',
      },
      fields: options.fields,
      metrics: options.fields, // Map fields to metrics for backward compatibility
      breakdowns: options.breakdowns,
      filtering: options.filtering,
      limit: options.limit,
      time_increment: options.timeIncrement ? String(options.timeIncrement) : undefined,
    })

    // Convexに保存
    if (this.convexClient && insights.length > 0) {
      await this.saveInsightsToConvex(insights)

      // 同期ステータスを更新
      const dates = insights.map((i) => i.date_start).sort()
      await this.saveSyncStatusToConvex({
        lastIncrementalSync: new Date().toISOString(),
        totalRecords: insights.length,
        earliestDate: dates[0],
        latestDate: dates[dates.length - 1],
      })
    }

    return insights
  }

  // バッチリクエスト
  async batch(requests: MetaBatchRequest[]): Promise<any[]> {
    const batch = requests.map((req) => ({
      method: req.method,
      relative_url: req.relative_url,
      body: req.body,
    }))

    const params = {
      batch: JSON.stringify(batch),
      access_token: this.config.accessToken,
    }

    const response = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      body: new URLSearchParams(params),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new MetaApiError(
        error.error?.message || 'Batch request failed',
        'BATCH_ERROR',
        response.status,
        error
      )
    }

    return await response.json()
  }

  // データ変換
  transformCampaignData(apiData: any): any {
    const transformed: any = {
      id: apiData.id,
      name: apiData.name,
      status: apiData.status,
      objective: apiData.objective,
      dailyBudget: apiData.daily_budget ? parseFloat(apiData.daily_budget) : null,
      lifetimeBudget: apiData.lifetime_budget ? parseFloat(apiData.lifetime_budget) : null,
      createdTime: apiData.created_time,
      updatedTime: apiData.updated_time,
    }

    if (apiData.insights?.data?.[0]) {
      const insights = apiData.insights.data[0]
      transformed.metrics = this.transformNumericFields(insights)
    }

    return transformed
  }

  transformNumericFields(data: any): any {
    const transformed: any = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && !isNaN(Number(value))) {
        transformed[key] = Number(value)
      } else {
        transformed[key] = value
      }
    }

    return transformed
  }

  // Private methods
  private async apiCall(endpoint: string, params?: any): Promise<any> {
    try {
      // デバッグモードでのみ詳細ログを出力
      const debugMode = localStorage.getItem('meta_sync_settings')
        ? JSON.parse(localStorage.getItem('meta_sync_settings') || '{}').debugMode
        : false

      if (debugMode) {
        console.log(`Meta API Call #${this.requestCount + 1} - ${endpoint}`)
      }

      const url = new URL(`${this.baseUrl}${endpoint}`)

      if (params) {
        Object.keys(params).forEach((key) => {
          url.searchParams.append(key, params[key])
        })
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()

        // デバッグモードでのみ詳細エラーログを出力
        const debugMode = localStorage.getItem('meta_sync_settings')
          ? JSON.parse(localStorage.getItem('meta_sync_settings') || '{}').debugMode
          : false

        if (debugMode) {
          console.error('Meta API Error Response:', {
            endpoint,
            fullUrl: url.toString(),
            status: response.status,
            statusText: response.statusText,
            error,
            accountId: this.config.accountId,
            apiVersion: this.config.apiVersion,
            requestParams: params,
          })
        }

        const errorCode = this.getErrorCode(response.status, error)

        throw new MetaApiError(
          error.error?.message || 'API request failed',
          errorCode,
          response.status,
          error
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw error
      }

      throw new MetaApiError('Network error', 'NETWORK_ERROR', undefined, error)
    }
  }

  private getErrorCode(status: number, _error: any): string {
    if (status === 401) {
      return 'AUTH_ERROR'
    }
    if (status === 429) {
      return 'RATE_LIMIT'
    }
    if (status === 403) {
      return 'PERMISSION_ERROR'
    }
    if (status >= 500) {
      return 'SERVER_ERROR'
    }

    return 'API_ERROR'
  }

  // 包括的なインサイトデータを取得
  async getComprehensiveInsights(dateRange: {
    since: string
    until: string
  }): Promise<MetaInsightsData[]> {
    const fields = [
      // 基本情報
      'ad_id',
      'ad_name',
      'adset_id',
      'adset_name',
      'campaign_id',
      'campaign_name',
      // パフォーマンスメトリクス
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpp',
      'cpc',
      'ctr',
      // コンバージョン
      'conversions',
      'conversion_values',
      'cost_per_conversion',
      'purchase_roas',
      // 動画メトリクス（権限エラー回避）
      'video_play_actions',
      'video_30_sec_watched_actions',
      'video_avg_time_watched_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions',
      // エンゲージメント
      'engagement_rate_ranking',
      'quality_ranking',
      'conversion_rate_ranking',
    ]

    try {
      const insights = await this.getInsights({
        level: 'ad',
        fields,
        dateRange,
        breakdowns: ['age', 'gender', 'placement', 'device_platform'],
        time_increment: 'all_days',
      })
      return insights
    } catch (error) {
      console.error('包括的インサイト取得エラー:', error)
      // フィールドを減らしてリトライ
      const basicFields = fields.slice(0, 16) // 基本フィールドのみ
      return await this.getInsights({
        level: 'ad',
        fields: basicFields,
        dateRange,
        time_increment: 'all_days',
      })
    }
  }

  // 拡張クリエイティブ情報を取得
  async getEnhancedCreatives(adIds: string[]): Promise<any[]> {
    const creatives: any[] = []
    const batchSize = 50 // バッチサイズ

    for (let i = 0; i < adIds.length; i += batchSize) {
      const batch = adIds.slice(i, i + batchSize)
      const requests: MetaBatchRequest[] = batch.map((adId) => ({
        method: 'GET',
        relative_url: `/${adId}?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,object_type,link_url,call_to_action_type,effective_object_story_id,object_story_spec{page_id,link_data{link,message,name,description,child_attachments{link,name,description,picture,call_to_action{type,value{link}}}},video_data{video_id,title,message,call_to_action{type,value{link}}}},asset_feed_spec{images,videos,bodies,titles,descriptions,ad_formats}},targeting{age_min,age_max,genders,geo_locations{countries,cities,regions},interests,behaviors,custom_audiences}`,
      }))

      try {
        const responses = await this.batch(requests)
        const validResponses = responses.filter((r: any) => r.code === 200).map((r: any) => r.body)
        creatives.push(...validResponses)
      } catch (error) {
        console.error('クリエイティブ取得エラー:', error)
        // 個別に取得を試みる
        for (const adId of batch) {
          try {
            const ad = await this.apiCall(`/${adId}`, {
              fields: 'id,name,status,creative{id,name,title,body,image_url,thumbnail_url}',
            })
            creatives.push(ad)
          } catch (individualError) {
            console.warn(`広告 ${adId} の取得失敗:`, individualError)
          }
        }
      }
    }

    return creatives
  }

  // アカウントレベルのメトリクスを取得
  async getAccountLevelMetrics(dateRange: { since: string; until: string }): Promise<any> {
    try {
      const response = await this.apiCall(`/act_${this.config.accountId}/insights`, {
        fields: [
          'spend',
          'impressions',
          'clicks',
          'actions',
          'action_values',
          'cost_per_action_type',
          'website_purchase_roas',
        ].join(','),
        level: 'account',
        breakdowns: 'publisher_platform,platform_position',
        time_range: JSON.stringify(dateRange),
        limit: 1000,
      })

      return response
    } catch (error) {
      console.error('アカウントレベルメトリクス取得エラー:', error)
      // 基本的なメトリクスのみで再試行
      return await this.apiCall(`/act_${this.config.accountId}/insights`, {
        fields: 'spend,impressions,clicks',
        level: 'account',
        time_range: JSON.stringify(dateRange),
      })
    }
  }

  // 動画パフォーマンスデータを取得
  async getVideoPerformanceData(
    adIds: string[],
    dateRange?: { since: string; until: string }
  ): Promise<any[]> {
    const videoData: any[] = []

    // デフォルトの日付範囲（過去30日）
    const defaultDateRange = {
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0],
    }

    const timeRange = dateRange || defaultDateRange

    for (const adId of adIds) {
      try {
        const insights = await this.apiCall(`/${adId}/insights`, {
          fields: [
            'video_play_actions',
            'video_thruplay_watched_actions',
            'video_p25_watched_actions',
            'video_p50_watched_actions',
            'video_p75_watched_actions',
            'video_p95_watched_actions',
            'video_p100_watched_actions',
            'video_avg_time_watched_actions',
            'video_play_curve_actions',
          ].join(','),
          time_increment: 'all_days',
          time_range: JSON.stringify(timeRange),
        })

        if (insights.data && insights.data.length > 0) {
          videoData.push({ adId, ...insights.data[0] })
        }
      } catch (error) {
        console.warn(`動画データ取得エラー (広告 ${adId}):`, error)
      }
    }

    return videoData
  }
}
