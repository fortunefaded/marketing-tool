import type { MetaApiConfig, MetaCampaign, MetaCreative, MetaApiError } from './types'

export class MetaApiClient {
  private config: Required<Omit<MetaApiConfig, 'apiVersion'>>
  private readonly apiVersion = 'v23.0'
  private baseUrl = 'https://graph.facebook.com'

  constructor(config: MetaApiConfig) {
    const { apiVersion: _apiVersion, ...configWithoutVersion } = config
    void _apiVersion // 使用されないが、型から除外するために必要
    this.config = configWithoutVersion as Required<Omit<MetaApiConfig, 'apiVersion'>>
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${endpoint}`)

    // Add access token to params
    url.searchParams.append('access_token', this.config.accessToken)

    // Add any additional params
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      const error = data.error as MetaApiError
      throw new Error(error.message || 'API request failed')
    }

    return data
  }

  async getCampaigns(): Promise<MetaCampaign[]> {
    const response = await this.makeRequest<{ data: MetaCampaign[] }>(
      `${this.config.accountId}/campaigns`,
      {
        fields:
          'id,account_id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      }
    )

    // Initialize empty insights for each campaign
    return response.data.map((campaign) => ({
      ...campaign,
      insights: { data: [] },
    }))
  }

  async getCampaignWithInsights(campaignId: string): Promise<MetaCampaign> {
    const [campaign, insights] = await Promise.all([
      this.makeRequest<MetaCampaign>(campaignId, {
        fields:
          'id,account_id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      }),
      this.makeRequest<{ data: MetaCampaign['insights']['data'] }>(`${campaignId}/insights`, {
        fields: 'impressions,clicks,spend,conversions,revenue,date_start,date_stop',
        time_range: JSON.stringify({ since: '2024-01-01', until: '2024-12-31' }),
      }),
    ])

    return {
      ...campaign,
      insights: insights,
    }
  }

  async getCreativesByCampaign(campaignId: string): Promise<MetaCreative[]> {
    const response = await this.makeRequest<{ data: MetaCreative[] }>(`${campaignId}/ads`, {
      fields:
        'id,name,campaign_id,adset_id,creative.fields(id,name,object_type,thumbnail_url,video_url,body,title,call_to_action_type)',
    })

    // Map the response to match our MetaCreative interface
    return response.data.map((ad) => {
      const adData = ad as {
        id: string
        name: string
        campaign_id: string
        adset_id: string
        creative?: {
          id?: string
          name?: string
          object_type?: string
          thumbnail_url?: string
          video_url?: string
          body?: string
          title?: string
          call_to_action_type?: string
        }
      }

      return {
        id: adData.creative?.id || adData.id,
        name: adData.creative?.name || adData.name,
        campaign_id: adData.campaign_id,
        adset_id: adData.adset_id,
        creative_type: this.mapCreativeType(adData.creative?.object_type),
        thumbnail_url: adData.creative?.thumbnail_url,
        video_url: adData.creative?.video_url,
        body: adData.creative?.body,
        title: adData.creative?.title,
        call_to_action_type: adData.creative?.call_to_action_type,
        insights: { data: [] },
      }
    })
  }

  async getCreativeWithInsights(creativeId: string): Promise<MetaCreative> {
    const [creative, insights] = await Promise.all([
      this.makeRequest<MetaCreative>(creativeId, {
        fields:
          'id,name,campaign_id,adset_id,object_type,thumbnail_url,video_url,body,title,call_to_action_type',
      }),
      this.makeRequest<{ data: MetaCreative['insights']['data'] }>(`${creativeId}/insights`, {
        fields: 'creative_id,impressions,clicks,spend,conversions,revenue,date_start,date_stop',
        time_range: JSON.stringify({ since: '2024-01-01', until: '2024-12-31' }),
      }),
    ])

    return {
      ...creative,
      creative_type: this.mapCreativeType((creative as { object_type?: string }).object_type),
      insights: insights,
    }
  }

  private mapCreativeType(objectType?: string): MetaCreative['creative_type'] {
    // Map Meta's object_type to our simplified creative_type
    switch (objectType?.toUpperCase()) {
      case 'VIDEO':
        return 'VIDEO'
      case 'CAROUSEL':
        return 'CAROUSEL'
      default:
        return 'IMAGE'
    }
  }
}
