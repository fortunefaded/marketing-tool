import { AdInsight } from './types'

export class SimpleMetaApi {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  
  constructor(
    private token: string,
    private accountId: string
  ) {}
  
  async getInsights(): Promise<AdInsight[]> {
    const url = new URL(`${this.baseUrl}/act_${this.accountId}/insights`)
    url.searchParams.append('access_token', this.token)
    url.searchParams.append('level', 'ad')
    url.searchParams.append('date_preset', 'last_30d')
    url.searchParams.append('fields', 'ad_id,ad_name,campaign_id,campaign_name,impressions,reach,frequency,ctr,cpm,spend')
    url.searchParams.append('limit', '100')
    
    console.log('[SimpleMetaApi] Requesting:', url.pathname + url.search.replace(this.token, 'TOKEN_HIDDEN'))
    
    try {
      const response = await fetch(url.toString())
      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('[SimpleMetaApi] API Error Response:', responseData)
        
        // Meta APIエラーの詳細
        if (responseData.error) {
          const error = responseData.error
          throw new Error(
            error.message || 
            `Meta API Error: ${error.type || 'Unknown'} (Code: ${error.code})`
          )
        }
        
        throw new Error(`API Error: ${response.status}`)
      }
      
      const insights = responseData.data || []
      console.log('[SimpleMetaApi] Success: Retrieved', insights.length, 'ads')
      
      return insights
    } catch (error: any) {
      console.error('[SimpleMetaApi] Request failed:', error)
      throw error
    }
  }
}