import { AdInsight } from '@/types'
import { vibe } from '@/lib/vibelogger'
import { AccountId, AccessToken } from './branded-types'

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
  
  async getInsights(options: {
    datePreset?: string
    timeRange?: { since: string; until: string }
    forceRefresh?: boolean
  } = {}): Promise<AdInsight[]> {
    const url = new URL(`${this.baseUrl}/${AccountId.toFullId(this.accountId)}/insights`)
    // トークンが文字列であることを確実にする
    url.searchParams.append('access_token', this.token as string)
    url.searchParams.append('level', 'ad')
    
    // 日付範囲設定（カスタム範囲 > プリセット > デフォルト）
    if (options.timeRange) {
      url.searchParams.append('time_range', JSON.stringify({
        since: options.timeRange.since,
        until: options.timeRange.until
      }))
    } else {
      url.searchParams.append('date_preset', options.datePreset || 'last_30d')
    }
    
    url.searchParams.append('fields', this.getFieldsString())
    url.searchParams.append('limit', '100')
    
    // Add breakdowns for platform-specific insights
    url.searchParams.append('breakdowns', 'publisher_platform')
    
    // Add time increment for daily data
    url.searchParams.append('time_increment', '1')
    
    // Note: action_attribution_windows is deprecated in v23.0, using default attribution windows
    
    // データ更新時のキャッシュ回避
    if (options.forceRefresh) {
      url.searchParams.append('_nocache', Date.now().toString())
    }
    
    return this.fetchPaginatedData(url)
  }
  
  private getFieldsString(): string {
    return [
      // Basic ad info
      'ad_id', 'ad_name', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
      
      // Performance metrics
      'impressions', 'reach', 'frequency', 'spend',
      
      // Click metrics
      'clicks', 'unique_clicks', 'cpc', 'cost_per_unique_click',
      
      // CTR metrics
      'ctr', 'unique_ctr', 'unique_link_clicks_ctr', 'unique_inline_link_clicks', 'unique_inline_link_click_ctr',
      
      // CPM metrics
      'cpm', 'cpp',
      
      // Conversion metrics
      'actions', 'cost_per_action_type', 'conversions', 'cost_per_conversion',
      
      // Creative info (may not always be available)
      'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions',
      
      // Instagram specific (through actions)
      'unique_actions'
    ].join(',')
  }
  
  private async fetchPaginatedData(url: URL): Promise<AdInsight[]> {
    let allData: AdInsight[] = []
    let nextUrl: string | null = url.toString()
    while (nextUrl) {
      vibe.debug('Meta API リクエスト', {
        endpoint: new URL(nextUrl).pathname,
        params: new URL(nextUrl).search.replace(String(this.token), 'TOKEN_HIDDEN'),
        currentCount: allData.length,
        tokenType: typeof this.token,
        tokenLength: this.token ? String(this.token).length : 0
      })
      
      try {
        const response = await fetch(nextUrl)
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
        const processedInsights = insights.map((insight: any) => this.processInsightData(insight))
        allData.push(...processedInsights)
        
        // ページング処理
        nextUrl = responseData.paging?.next || null
        
        vibe.debug('Meta API ページ取得完了', {
          pageCount: insights.length,
          totalCount: allData.length,
          hasNext: !!nextUrl
        })
        
      } catch (error: any) {
        vibe.bad('Meta API リクエスト失敗', error)
        throw error
      }
    }
    
    vibe.good('Meta API 全データ取得成功', {
      totalCount: allData.length,
      type: 'ads'
    })
    
    return allData
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
    
    return {
      ...insight,
      // 基本メトリクスの数値変換（精度を保持）
      ad_id: insight.ad_id,
      ad_name: insight.ad_name || 'Unnamed Ad',
      campaign_id: insight.campaign_id || '',
      campaign_name: insight.campaign_name || 'Unknown Campaign',
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
      }
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