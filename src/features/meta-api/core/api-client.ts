import { AdInsight } from '../../../types'
import { vibe } from '../../../lib/vibelogger'
import { AccountId, AccessToken } from './branded-types'
import type { 
  EnhancedInsightsOptions, 
  EnhancedPaginatedResult 
} from './types/enhanced-api'
// import type { DebugSession } from '../debug' - 未使用

// ページネーション対応の返り値の型
export interface PaginatedResult {
  data: AdInsight[]
  nextPageUrl: string | null
  hasMore: boolean
  totalCount: number
}

export class SimpleMetaApi {
  private baseUrl = 'https://graph.facebook.com/v23.0'
  private accountId: AccountId
  private token: AccessToken
  
  constructor(token: string, accountId: string) {
    // AccessToken 型への変換と検証
    try {
      this.token = AccessToken.from(token)
    } catch (error) {
      vibe.bad('無効なアクセストークン', { 
        tokenType: typeof token,
        tokenValue: token ? AccessToken.mask(AccessToken.from(token)) : 'undefined/null',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Invalid access token provided to SimpleMetaApi')
    }
    
    // AccountId 型への変換と検証
    try {
      this.accountId = accountId.startsWith('act_') 
        ? AccountId.fromFullId(accountId)
        : AccountId.from(accountId)
    } catch (error) {
      vibe.bad('無効なアカウントID', { 
        accountIdValue: accountId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Invalid account ID provided to SimpleMetaApi')
    }
  }
  
  async getTimeSeriesInsights(options?: EnhancedInsightsOptions): Promise<EnhancedPaginatedResult> {
    console.log('📅 時系列データ取得開始（time_increment=1）')
    const startTime = performance.now()
    const requestTimestamp = new Date()
    
    // Debug session tracing
    const debugSession = options?.debugSession
    
    // Build URL
    const url = new URL(`${this.baseUrl}/${AccountId.toFullId(this.accountId)}/insights`)
    url.searchParams.append('access_token', this.token as string)
    url.searchParams.append('level', 'ad')
    
    // Date range settings
    if (options?.timeRange) {
      url.searchParams.append('time_range', JSON.stringify({
        since: options.timeRange.since,
        until: options.timeRange.until
      }))
    } else {
      url.searchParams.append('date_preset', options?.datePreset || 'last_30d')
    }
    
    // Timezone (default: Asia/Tokyo)
    const timezone = options?.timezone || 'Asia/Tokyo'
    url.searchParams.append('time_zone', timezone)
    
    // Include time fields and currency
    url.searchParams.append('fields', this.getFieldsString(true, true))
    url.searchParams.append('limit', '100')
    
    // Time increment for time series data
    url.searchParams.append('time_increment', '1')
    
    // Attribution settings
    const useUnifiedAttribution = options?.useUnifiedAttribution ?? true
    if (useUnifiedAttribution) {
      url.searchParams.append('use_unified_attribution_setting', 'true')
    }
    
    // Attribution windows (for compatibility)
    const attributionWindows = options?.attributionWindows || ['1d_click', '1d_view']
    url.searchParams.append('action_attribution_windows', JSON.stringify(attributionWindows))
    
    // Force refresh
    if (options?.forceRefresh) {
      url.searchParams.append('_nocache', Date.now().toString())
    }
    
    // Build request params for debugging
    const requestParams = {
      datePreset: options?.datePreset || 'last_30d',
      timezone,
      useUnifiedAttribution,
      attributionWindows,
      fields: this.getFieldsString(true, true)
    }
    
    // Trace API request
    if (debugSession) {
      debugSession.traceApiRequest(url.pathname, requestParams)
    }
    
    try {
      // Fetch data
      const result = await this.fetchPaginatedData(url, {
        maxPages: options?.maxPages,
        onProgress: options?.onProgress
      })
      
      // Extract currency from data
      const currency = options?.currency || 
        result.data[0]?.account_currency || 
        'JPY'
      
      // Calculate processing time
      const processingTime = performance.now() - startTime
      
      // Trace API response
      if (debugSession) {
        debugSession.traceApiResponse(result, processingTime)
      }
      
      // Return enhanced result
      const enhancedResult: EnhancedPaginatedResult = {
        ...result,
        metadata: {
          currency,
          timezone,
          attributionSettings: {
            unified: useUnifiedAttribution,
            windows: attributionWindows
          },
          requestTimestamp,
          processingTime
        }
      }
      
      return enhancedResult
      
    } catch (error) {
      // Trace error
      if (debugSession) {
        debugSession.traceError(error as Error, {
          url: url.pathname,
          params: requestParams
        })
      }
      
      // Enhanced error handling
      if (error instanceof Error) {
        // Rate limit error
        if (error.message.includes('rate limit') || 
            error.message.includes('Too many') ||
            (error as any).code === 4) {
          throw new Error(`Rate limit exceeded. ${error.message}`)
        }
        
        // Authentication error
        if (error.message.includes('OAuth') || 
            error.message.includes('authentication') ||
            error.message.includes('token')) {
          throw new Error(`Authentication failed. ${error.message}`)
        }
      }
      
      throw error
    }
  }

  async getInsights(options: {
    datePreset?: string
    timeRange?: { since: string; until: string }
    forceRefresh?: boolean
    maxPages?: number
    onProgress?: (count: number) => void
    useDailyData?: boolean  // 日別データ取得のオプション（デフォルトはfalse）
  } = {}): Promise<PaginatedResult> {
    const url = new URL(`${this.baseUrl}/${AccountId.toFullId(this.accountId)}/insights`)
    // トークンが文字列であることを確実にする
    url.searchParams.append('access_token', this.token as string)
    url.searchParams.append('level', 'ad')
    
    // 日付範囲設定（カスタム範囲 > プリセット > デフォルト）
    if (options.timeRange) {
      const timeRange = {
        since: options.timeRange.since,
        until: options.timeRange.until
      }
      url.searchParams.append('time_range', JSON.stringify(timeRange))
      
      // タイムゾーンを明示的に指定
      url.searchParams.append('time_zone', 'Asia/Tokyo')
      
      // アトリビューション設定（重要）
      url.searchParams.append('use_unified_attribution_setting', 'true')
      
      console.log('📊 Time range with attribution:', timeRange)
    } else {
      url.searchParams.append('date_preset', options.datePreset || 'last_30d')
    }
    
    // 時系列データ取得のため日付フィールドを含める（通貨フィールドも含める）
    url.searchParams.append('fields', this.getFieldsString(true, true))
    url.searchParams.append('limit', '100')
    
    // Note: breakdownsパラメータは別メソッド（getPlatformBreakdown）で取得
    // time_incrementとbreakdownsは同時使用不可のため分離
    
    // 日別データ設定
    url.searchParams.append('time_increment', '1')
    
    // Note: action_attribution_windows is deprecated in v23.0, using default attribution windows
    
    // データ更新時のキャッシュ回避
    if (options.forceRefresh) {
      url.searchParams.append('_nocache', Date.now().toString())
    }
    
    return this.fetchPaginatedData(url, {
      maxPages: options.maxPages,
      onProgress: options.onProgress
    })
  }
  
  private getFieldsString(includeTimeFields: boolean = false, includeCurrency: boolean = false): string {
    const baseFields = [
      // === 基本的な広告情報 ===
      'ad_id', 'ad_name', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
      
      // === パフォーマンスメトリクス ===
      'impressions', 'reach', 'frequency', 'spend',
      
      // === クリック関連 ===
      'clicks', 'unique_clicks', 'cpc', 'cost_per_unique_click',
      
      // === CTR関連 ===
      'ctr', 'unique_ctr', 
      'inline_link_clicks', 'inline_link_click_ctr',
      'unique_inline_link_clicks',
      'outbound_clicks',
      'website_ctr',
      
      // === コスト関連 ===
      'cpm', 'cpp', 'social_spend',
      
      // === コンバージョン関連 ===
      'actions', 'unique_actions', 'action_values',
      'conversions', 'conversion_values', 
      'cost_per_conversion', 'cost_per_action_type', 'cost_per_unique_action_type',
      
      // === 動画メトリクス (API v23.0) ===
      'video_play_actions',
      'video_p25_watched_actions', 
      'video_p50_watched_actions', 
      'video_p75_watched_actions',
      'video_p100_watched_actions',
      'video_thruplay_watched_actions',
      'video_avg_time_watched_actions',
      'video_continuous_2_sec_watched_actions',
      'video_15_sec_watched_actions',
      'cost_per_thruplay',
      
      // === 品質ランキング (API v23.0) ===
      'quality_ranking',
      'engagement_rate_ranking',
      'conversion_rate_ranking',
      
      // === ROAS関連 ===
      'purchase_roas',
      'website_purchase_roas'
    ]
    
    // 時系列データ用に日付フィールドを追加
    if (includeTimeFields) {
      baseFields.push('date_start', 'date_stop')
    }
    
    // 通貨フィールドを追加
    if (includeCurrency) {
      baseFields.push('account_currency')
    }
    
    return baseFields.join(',')
  }
  
  private async fetchPaginatedData(
    url: URL,
    options?: {
      maxPages?: number,
      onProgress?: (count: number) => void
    }
  ): Promise<PaginatedResult> {
    let allData: AdInsight[] = []
    let nextUrl: string | null = url.toString()
    let pagesProcessed = 0
    const maxPages = options?.maxPages || 1  // デフォルトは1ページのみ
    
    while (nextUrl && pagesProcessed < maxPages) {
      console.log('🚀 Meta API リクエスト開始:', {
        endpoint: new URL(nextUrl).pathname,
        params: new URL(nextUrl).search.replace(String(this.token), 'TOKEN_HIDDEN'),
        currentCount: allData.length,
        tokenType: typeof this.token,
        tokenLength: this.token ? String(this.token).length : 0,
        fullUrl: nextUrl.replace(String(this.token), 'TOKEN_HIDDEN')
      })
      
      vibe.debug('Meta API リクエスト', {
        endpoint: new URL(nextUrl).pathname,
        params: new URL(nextUrl).search.replace(String(this.token), 'TOKEN_HIDDEN'),
        currentCount: allData.length,
        tokenType: typeof this.token,
        tokenLength: this.token ? String(this.token).length : 0
      })
      
      try {
        console.log('⏳ リクエスト送信中...')
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒タイムアウト
        
        const response = await fetch(nextUrl, { 
          signal: controller.signal 
        })
        clearTimeout(timeoutId)
        
        console.log('📨 レスポンス受信:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })
        
        const responseData: any = await response.json()
        
        if (!response.ok) {
          vibe.bad('Meta API エラーレスポンス', {
            response: responseData,
            status: response.status,
            url: nextUrl.replace(String(this.token), 'TOKEN_HIDDEN'),
            tokenType: typeof this.token
          })
          
          // Meta APIエラーの詳細
          if (responseData.error) {
            const error = responseData.error
            const errorMessage = error.message || `Meta API Error: ${error.type || 'Unknown'}`
            const errorDetails = {
              code: error.code,
              type: error.type,
              error_subcode: error.error_subcode,
              fbtrace_id: error.fbtrace_id,
              status: response.status
            }
            
            vibe.bad('Meta API 詳細エラー情報', errorDetails)
            
            // レート制限エラーの処理
            if (error.code === 4 || error.code === 17 || error.code === 32 || 
                error.message?.toLowerCase().includes('rate limit') ||
                error.message?.toLowerCase().includes('too many calls')) {
              
              // リトライ可能なレート制限エラー
              const retryAfter = this.extractRetryAfter(responseData)
              throw Object.assign(new Error(`Rate limit exceeded. Retry after ${retryAfter}s`), {
                code: 'RATE_LIMIT',
                retryAfter,
                originalError: error
              })
            }
            
            // その他のエラー
            throw Object.assign(new Error(`${errorMessage} (Code: ${error.code || response.status})`), {
              code: error.code,
              originalError: error
            })
          }
          
          throw new Error(`API Error: ${response.status} - ${response.statusText}`)
        }
        
        const insights = responseData.data || []
        
        // 広告セット情報のデバッグログを追加
        console.log('🔍 Meta API 生レスポンス確認:', {
          sampleInsight: insights[0],
          adsetFields: insights.length > 0 ? {
            adset_id: insights[0]?.adset_id,
            adset_name: insights[0]?.adset_name,
            hasAdsetId: !!insights[0]?.adset_id,
            hasAdsetName: !!insights[0]?.adset_name
          } : null
        })
        
        vibe.debug('Meta API 生レスポンス確認', {
          sampleInsight: insights[0],
          adsetFields: insights.length > 0 ? {
            adset_id: insights[0]?.adset_id,
            adset_name: insights[0]?.adset_name,
            hasAdsetId: !!insights[0]?.adset_id,
            hasAdsetName: !!insights[0]?.adset_name
          } : null
        })
        
        const processedInsights = insights.map((insight: any) => this.processInsightData(insight))
        allData.push(...processedInsights)
        
        // ページング処理
        nextUrl = responseData.paging?.next || null
        
        vibe.debug('Meta API ページ取得完了', {
          pageCount: insights.length,
          totalCount: allData.length,
          hasNext: !!nextUrl
        })
        
        // 進捗コールバック
        if (options?.onProgress) {
          options.onProgress(allData.length)
        }
        
        pagesProcessed++
        
        // レート制限対策：ページ間に待機時間を設定
        if (nextUrl && pagesProcessed < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2秒待機
        }
        
      } catch (error: any) {
        console.error('❌ Meta API リクエスト失敗:', {
          error: error.message,
          stack: error.stack,
          url: nextUrl?.replace(String(this.token), 'TOKEN_HIDDEN') || 'unknown',
          currentDataCount: allData.length
        })
        
        // レート制限エラーでも、既に取得したデータがある場合は返す
        if ((error.code === 'RATE_LIMIT' || error.code === 4) && allData.length > 0) {
          vibe.warn(`レート制限に達しました。${allData.length}件のデータを返します。`)
          console.log(`⚠️ 部分的なデータ取得: ${allData.length}件`)
          return {
            data: allData,
            nextPageUrl: null,
            hasMore: false,
            totalCount: allData.length
          }
        }
        
        vibe.bad('Meta API リクエスト失敗', error)
        throw error
      }
    }
    
    vibe.good('Meta API 全データ取得成功', {
      totalCount: allData.length,
      type: 'ads'
    })
    
    console.log('🎯 最終的な返却データ:', {
      totalCount: allData.length,
      firstItem: allData[0],
      lastItem: allData[allData.length - 1]
    })
    
    return {
      data: allData,
      nextPageUrl: nextUrl,
      hasMore: !!nextUrl,
      totalCount: allData.length
    }
  }
  
  private processInsightData(insight: any): AdInsight {
    // actionsフィールドからInstagram特有のメトリクスを抽出
    const actions = insight.actions || []
    const profileViews = this.extractActionValue(actions, 'onsite_conversion.view_profile')
    const likes = this.extractActionValue(actions, 'like')
    const comments = this.extractActionValue(actions, 'comment')
    const shares = this.extractActionValue(actions, 'share')
    const saves = this.extractActionValue(actions, 'post_save')
    
    // コンバージョンデータの抽出
    const conversions = this.extractActionValue(actions, 'purchase') || 
                       this.extractActionValue(actions, 'offsite_conversion.fb_pixel_purchase') ||
                       this.validateNumeric(insight.conversions)
    
    // エンゲージメント率計算（いいね+コメント+保存+シェア）÷リーチ×100
    const totalEngagement = likes + comments + shares + saves
    const reach = this.validateNumeric(insight.reach)
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0
    
    // 広告セット情報の処理前後をデバッグ
    console.log('🔄 広告セット情報処理:', {
      originalAdsetId: insight.adset_id,
      originalAdsetName: insight.adset_name,
      processedAdsetId: insight.adset_id || '',
      processedAdsetName: insight.adset_name || 'Unknown Adset',
      adId: insight.ad_id
    })
    
    vibe.debug('広告セット情報処理', {
      originalAdsetId: insight.adset_id,
      originalAdsetName: insight.adset_name,
      processedAdsetId: insight.adset_id || '',
      processedAdsetName: insight.adset_name || 'Unknown Adset',
      adId: insight.ad_id
    })

    return {
      ...insight,
      // 基本メトリクスの数値変換（精度を保持）
      ad_id: insight.ad_id,
      ad_name: insight.ad_name || 'Unnamed Ad',
      campaign_id: insight.campaign_id || '',
      campaign_name: insight.campaign_name || 'Unknown Campaign',
      adset_id: insight.adset_id || '',
      adset_name: insight.adset_name || 'Unknown Adset',
      impressions: this.validateNumeric(insight.impressions),
      reach: reach,
      frequency: this.validateNumeric(insight.frequency, 2), // 小数点2位まで保持
      clicks: this.validateNumeric(insight.clicks),
      unique_clicks: this.validateNumeric(insight.unique_clicks || insight.clicks), // fallback
      ctr: this.validateNumeric(insight.ctr, 4), // CTRは小数点4位まで保持
      unique_ctr: this.validateNumeric(insight.unique_ctr || insight.ctr, 4), // fallback
      unique_inline_link_click_ctr: this.validateNumeric(insight.unique_inline_link_click_ctr, 4),
      cpm: this.validateNumeric(insight.cpm, 2), // CPMは小数点2位まで保持
      cpc: this.validateNumeric(insight.cpc, 2),
      spend: this.validateNumeric(insight.spend, 2), // 支出は小数点2位まで保持
      conversions: conversions,
      
      // Instagram特有のメトリクス
      instagram_metrics: {
        profile_views: profileViews,
        likes: likes,
        comments: comments,
        shares: shares,
        saves: saves,
        engagement_rate: engagementRate,
        publisher_platform: insight.publisher_platform || 'unknown'
      },
      
      // プラットフォーム別ブレークダウンデータ
      breakdowns: insight.breakdowns || null
    }
  }
  
  private extractActionValue(actions: any[], actionType: string): number {
    const action = actions.find(a => a.action_type === actionType)
    return action ? this.validateNumeric(action.value) : 0
  }
  
  private validateNumeric(value: string | number | undefined, decimals?: number): number {
    if (value === undefined || value === null || value === '') {
      return 0
    }
    
    const num = parseFloat(String(value))
    if (isNaN(num)) {
      vibe.warn('数値変換エラー', { value, type: typeof value })
      return 0
    }
    
    // 指定された小数点桁数で四捨五入
    if (decimals !== undefined) {
      return parseFloat(num.toFixed(decimals))
    }
    
    return num
  }
  
  
  /**
   * 時系列データ取得用メソッド（データ更新で使用）
   * time_increment=1で日別データを取得し、date_start/stopを含める
   */

  /**
   * プラットフォーム別ブレークダウンデータを取得（クリエイティブ詳細分析で使用）
   * time_incrementなしで、breakdownsパラメータを使用
   */
  async getPlatformBreakdown(options?: {
    datePreset?: string
    dateStart?: string
    dateStop?: string
  }): Promise<{ [adId: string]: any }> {
    console.log('🔄 プラットフォーム別ブレークダウンデータ取得開始')
    
    const url = new URL(`${this.baseUrl}/insights`)
    url.searchParams.append('access_token', String(this.token))
    url.searchParams.append('level', 'ad')
    
    // 日付範囲の設定
    if (options?.datePreset) {
      url.searchParams.append('date_preset', options.datePreset)
    } else if (options?.dateStart && options?.dateStop) {
      url.searchParams.append('time_range', JSON.stringify({
        since: options.dateStart,
        until: options.dateStop
      }))
    } else {
      url.searchParams.append('date_preset', 'last_30d')
    }
    
    // ブレークダウンパラメータ（time_incrementなし）
    url.searchParams.append('breakdowns', 'publisher_platform')
    
    // 必要なフィールド
    const fields = [
      'ad_id',
      'ad_name',
      'impressions',
      'reach',
      'clicks',
      'spend',
      'cpm',
      'cpc',
      'ctr'
    ]
    url.searchParams.append('fields', fields.join(','))
    url.searchParams.append('limit', '500')
    
    try {
      console.log('🎯 プラットフォーム別データ取得開始')
      const response = await fetch(url.toString())
      const responseData = await response.json()
      
      if (!response.ok) {
        vibe.bad('Platform breakdown API エラー', responseData.error)
        throw new Error(`Platform breakdown API error: ${responseData.error?.message}`)
      }
      
      // ad_idごとにプラットフォーム別データを集約
      const platformData: { [adId: string]: any } = {}
      
      for (const item of responseData.data || []) {
        const adId = item.ad_id
        const platform = item.publisher_platform
        
        if (!platformData[adId]) {
          platformData[adId] = {
            facebook: null,
            instagram: null,
            audience_network: null,
            messenger: null
          }
        }
        
        // プラットフォーム別データを格納
        if (platform) {
          platformData[adId][platform] = {
            impressions: this.validateNumeric(item.impressions),
            reach: this.validateNumeric(item.reach),
            clicks: this.validateNumeric(item.clicks),
            spend: this.validateNumeric(item.spend, 2),
            cpm: this.validateNumeric(item.cpm, 2),
            cpc: this.validateNumeric(item.cpc, 2),
            ctr: this.validateNumeric(item.ctr, 4)
          }
        }
      }
      
      vibe.good(`${Object.keys(platformData).length}件の広告のプラットフォーム別データ取得完了`)
      console.log('✅ プラットフォーム別データ:', platformData)
      
      return platformData
    } catch (error) {
      vibe.bad('プラットフォーム別データ取得失敗', error)
      console.error('❌ プラットフォーム別データ取得エラー:', error)
      return {}
    }
  }

  // Instagram特有のインサイト取得（プロフィールレベル）
  async getInstagramProfileInsights(): Promise<any> {
    try {
      // このメソッドはInstagram Business Accountのプロフィールレベルインサイトを取得
      const url = new URL(`${this.baseUrl}/me/insights`)
      url.searchParams.append('access_token', String(this.token))
      url.searchParams.append('metric', 'impressions,reach,profile_views')
      url.searchParams.append('period', 'day')
      url.searchParams.append('since', this.getDateDaysAgo(30))
      url.searchParams.append('until', this.getDateDaysAgo(1))
      
      const response = await fetch(url.toString())
      const responseData = await response.json()
      
      if (!response.ok) {
        vibe.warn('Instagram Profile Insights 取得失敗', {
          response: responseData,
          status: response.status
        })
        return null
      }
      
      return responseData.data || []
    } catch (error: any) {
      vibe.warn('Instagram Profile Insights エラー', error)
      return null
    }
  }
  
  private getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }
  
  private extractRetryAfter(responseData: any): number {
    // X-Business-Use-Case-Usage ヘッダーから待機時間を抽出
    const usage = responseData.headers?.['x-business-use-case-usage']
    if (usage) {
      try {
        const parsed = JSON.parse(usage)
        const callCount = parsed['17'] || parsed['4'] || parsed['32']
        if (callCount?.estimated_time_to_regain_access) {
          return callCount.estimated_time_to_regain_access
        }
      } catch (e) {
        vibe.debug('Failed to parse rate limit header', e as Record<string, unknown>)
      }
    }
    
    // デフォルトの待機時間（60秒）
    return 60
  }
  
  // 続きからインサイト取得
  async fetchInsightsContinuation(
    nextPageUrl: string,
    options?: { onProgress?: (count: number) => void }
  ): Promise<PaginatedResult> {
    console.log('📄 続きのページを取得:', { 
      url: nextPageUrl.replace(this.token as string, 'TOKEN_HIDDEN') 
    })
    
    const url = new URL(nextPageUrl)
    return this.fetchPaginatedData(url, { 
      maxPages: 1,
      onProgress: options?.onProgress 
    })
  }

  // 広告クリエイティブの詳細取得（バッチ処理対応）
  async getAdCreatives(adIds: string[], options?: { batchSize?: number }): Promise<any[]> {
    if (!adIds.length) return []
    
    const batchSize = options?.batchSize || 25 // デフォルト25件ずつ処理
    const story = vibe.story('クリエイティブデータ一括取得')
    story.chapter(`開始: 全${adIds.length}件を${batchSize}件ずつ処理`)
    
    const allCreatives = []
    let successCount = 0
    let errorCount = 0
    
    // バッチ処理でクリエイティブを取得
    for (let i = 0; i < adIds.length; i += batchSize) {
      const batch = adIds.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(adIds.length / batchSize)
      
      story.chapter(`バッチ${batchNumber}/${totalBatches}: ${batch.length}件処理`)
      
      // 並行処理でパフォーマンスを向上
      const batchPromises = batch.map(async (adId) => {
        try {
          const url = new URL(`${this.baseUrl}/${adId}`)
          url.searchParams.append('access_token', String(this.token))
          url.searchParams.append('fields', 'id,name,creative{id,name,title,body,image_url,video_id,thumbnail_url,object_type,link_url}')
          
          const response = await fetch(url.toString())
          const data = await response.json()
          
          if (!response.ok) {
            errorCount++
            vibe.warn('広告クリエイティブ取得エラー', {
              adId,
              error: data.error,
              batch: batchNumber
            })
            return null
          }
          
          successCount++
          vibe.debug('広告クリエイティブ取得成功', {
            adId,
            creative: data.creative,
            batch: batchNumber
          })
          
          return data
        } catch (error) {
          errorCount++
          vibe.warn('広告クリエイティブ取得失敗', {
            adId,
            error,
            batch: batchNumber
          })
          return null
        }
      })
      
      // バッチの結果を待機
      const batchResults = await Promise.all(batchPromises)
      
      // null以外の結果のみ追加
      const validResults = batchResults.filter(result => result !== null)
      allCreatives.push(...validResults)
      
      // レート制限を考慮した小さな待機時間
      if (i + batchSize < adIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const finalStats = {
      total: adIds.length,
      success: successCount,
      error: errorCount,
      retrieved: allCreatives.length
    }
    
    if (errorCount > 0) {
      story.chapter(`完了（一部エラーあり）: 成功${finalStats.success}件, エラー${finalStats.error}件`)
      vibe.warn('クリエイティブ取得完了（一部失敗）', finalStats)
    } else {
      story.success(`全${successCount}件取得成功`)
      vibe.good('クリエイティブデータ取得成功', finalStats)
    }
    
    return allCreatives
  }
}