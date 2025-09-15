// 簡略化されたMeta API Service
export class MetaApiService {
  private accessToken: string
  private accountId: string
  private apiVersion: string = 'v23.0'
  private baseUrl: string = 'https://graph.facebook.com'

  constructor(config: { accessToken: string; accountId: string; apiVersion?: string }) {
    this.accessToken = config.accessToken
    this.accountId = config.accountId
    if (config.apiVersion) {
      this.apiVersion = config.apiVersion
    }
  }

  // APIリクエストのヘルパーメソッド
  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${endpoint}`)
    
    // アクセストークンを追加
    url.searchParams.append('access_token', this.accessToken)
    
    // その他のパラメータを追加
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed')
    }

    return data
  }

  // アカウント情報を取得
  async getAccountInfo() {
    return this.makeRequest(`act_${this.accountId}`, {
      fields: 'id,name,currency,timezone_name,account_status'
    })
  }

  // キャンペーン一覧を取得
  async getCampaigns() {
    const result = await this.makeRequest(`act_${this.accountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget',
      limit: 100
    })
    return result.data || []
  }

  // 広告セット一覧を取得
  async getAdSets() {
    const result = await this.makeRequest(`act_${this.accountId}/adsets`, {
      fields: 'id,name,campaign_id,status,daily_budget,lifetime_budget',
      limit: 100
    })
    return result.data || []
  }

  // 広告一覧を取得
  async getAds() {
    const result = await this.makeRequest(`act_${this.accountId}/ads`, {
      fields: 'id,name,adset_id,status,creative',
      limit: 100
    })
    return result.data || []
  }

  // インサイトデータを取得
  async getInsights(params: {
    datePreset?: string
    timeRange?: { since: string; until: string }
    level?: string
    fields?: string[]
  } = {}) {
    const defaultFields = [
      'impressions',
      'reach',
      'frequency',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'spend'
    ]

    const result = await this.makeRequest(`act_${this.accountId}/insights`, {
      date_preset: params.datePreset || 'last_7d',
      level: params.level || 'ad',
      fields: (params.fields || defaultFields).join(','),
      limit: 500
    })
    
    return result.data || []
  }

  // アクセストークンの検証
  async validateToken() {
    try {
      const result = await this.makeRequest('me', {
        fields: 'id,name'
      })
      return { valid: true, user: result }
    } catch (error) {
      return { valid: false, error }
    }
  }
}

// エクスポート用のインターフェース
export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
}

export default MetaApiService