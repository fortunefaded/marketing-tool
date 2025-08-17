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
  conversions?: string
  conversion_value?: string
  cost_per_conversion?: string
  roas?: string
  [key: string]: string | undefined
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

  constructor(config: MetaApiConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || 'v23.0'
    }
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`
  }

  getConfig(): MetaApiConfig {
    return this.config
  }

  // 認証
  async validateAccessToken(): Promise<boolean> {
    try {
      const response = await this.apiCall('/debug_token', {
        input_token: this.config.accessToken,
        access_token: this.config.accessToken
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
        fields: 'id,name,currency,timezone_name,account_status'
      })
      return response
    } catch (error) {
      console.error('Failed to get account info:', error)
      throw error
    }
  }

  // キャンペーンデータ取得
  async getCampaigns(filter?: MetaApiFilter & { limit?: number; after?: string }): Promise<MetaCampaignData[]> {
    const params: any = {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,insights{spend}',
      limit: filter?.limit || 100
    }
    
    console.log('Getting campaigns for account:', `act_${this.config.accountId}`)

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.campaignIds) {
      params.filtering = JSON.stringify([{
        field: 'id',
        operator: 'IN',
        value: filter.campaignIds
      }])
    }

    if (filter?.dateRange) {
      params.time_range = JSON.stringify({
        since: filter.dateRange.since,
        until: filter.dateRange.until
      })
    }

    if (filter?.status) {
      params.filtering = JSON.stringify([{
        field: 'status',
        operator: 'IN',
        value: filter.status
      }])
    }

    const response = await this.apiCall(`/act_${this.config.accountId}/campaigns`, params)
    return (response.data || []).map((campaign: any) => ({
      ...campaign,
      dailyBudget: parseFloat(campaign.daily_budget || '0'),
      lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : undefined,
      spend: campaign.insights?.data?.[0]?.spend ? parseFloat(campaign.insights.data[0].spend) : 0
    }))
  }

  // 広告セットデータ取得
  async getAdSets(filter?: MetaApiFilter & { limit?: number; after?: string }): Promise<MetaAdSetData[]> {
    const params: any = {
      fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,created_time,updated_time',
      limit: filter?.limit || 100
    }

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.adSetIds) {
      params.filtering = JSON.stringify([{
        field: 'id',
        operator: 'IN',
        value: filter.adSetIds
      }])
    }

    if (filter?.campaignIds) {
      params.filtering = JSON.stringify([{
        field: 'campaign_id',
        operator: 'IN',
        value: filter.campaignIds
      }])
    }

    const response = await this.apiCall(`/act_${this.config.accountId}/adsets`, params)
    return response.data || []
  }

  // 広告データ取得
  async getAds(filter?: MetaApiFilter & { limit?: number; after?: string }): Promise<MetaAdData[]> {
    const params: any = {
      fields: 'id,name,adset_id,campaign_id,status,creative{id,name,title,body,image_url},created_time,updated_time',
      limit: filter?.limit || 100
    }

    if (filter?.after) {
      params.after = filter.after
    }

    if (filter?.adIds) {
      params.filtering = JSON.stringify([{
        field: 'id',
        operator: 'IN',
        value: filter.adIds
      }])
    }

    const response = await this.apiCall(`/act_${this.config.accountId}/ads`, params)
    return response.data || []
  }

  // インサイトデータ取得
  async getInsights(options: MetaInsightsOptions): Promise<MetaInsightsData[]> {
    const defaultMetrics = [
      'impressions', 'clicks', 'spend', 'reach', 'frequency',
      'cpm', 'cpc', 'ctr', 'conversions', 'conversion_value',
      'cost_per_conversion', 'purchase_roas'
    ]

    const params: any = {
      fields: options.fields ? options.fields.join(',') : (options.metrics || defaultMetrics).join(','),
      level: options.level,
      limit: options.limit || 100
    }

    if (options.datePreset) {
      params.date_preset = options.datePreset
    } else if (options.dateRange) {
      params.time_range = JSON.stringify({
        since: options.dateRange.since,
        until: options.dateRange.until
      })
    }

    if (options.after) {
      params.after = options.after
    }

    if (options.breakdowns) {
      params.breakdowns = options.breakdowns.join(',')
    }

    if (options.filtering) {
      params.filtering = JSON.stringify(options.filtering)
    }

    let endpoint = `/act_${this.config.accountId}/insights`
    
    const response = await this.apiCall(endpoint, params)
    return (response.data || []).map((insight: any) => ({
      dateStart: insight.date_start,
      dateStop: insight.date_stop,
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: parseFloat(insight.spend || '0'),
      reach: parseInt(insight.reach || '0'),
      frequency: parseFloat(insight.frequency || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      ctr: parseFloat(insight.ctr || '0'),
      conversions: parseInt(insight.conversions || '0'),
      conversionValue: parseFloat(insight.conversion_value || '0'),
      costPerConversion: parseFloat(insight.cost_per_conversion || '0'),
      roas: parseFloat(insight.purchase_roas || '0')
    }))
  }

  // バッチリクエスト
  async batch(requests: MetaBatchRequest[]): Promise<any[]> {
    const batch = requests.map(req => ({
      method: req.method,
      relative_url: req.relative_url,
      body: req.body
    }))

    const params = {
      batch: JSON.stringify(batch),
      access_token: this.config.accessToken
    }

    const response = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      body: new URLSearchParams(params),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
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
      updatedTime: apiData.updated_time
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
      console.log('Meta API - baseUrl:', this.baseUrl, 'apiVersion:', this.config.apiVersion)
      const url = new URL(`${this.baseUrl}${endpoint}`)
      
      if (params) {
        Object.keys(params).forEach(key => {
          url.searchParams.append(key, params[key])
        })
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Meta API Error Response:', {
          endpoint,
          status: response.status,
          error,
          accountId: this.config.accountId,
          apiVersion: this.config.apiVersion
        })
        
        const errorCode = error.error?.code || this.getErrorCode(response.status, error)
        
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
      
      throw new MetaApiError(
        'Network error',
        'NETWORK_ERROR',
        undefined,
        error
      )
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
}
