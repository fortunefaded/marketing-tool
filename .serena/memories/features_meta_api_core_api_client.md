# src/features/meta-api/core/api-client.ts

```typescript
import { AdInsight } from './types'

export class SimpleMetaApi {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  
  constructor(
    private token: string,
    private accountId: string
  ) {}
  
  async getInsights(params: {
    level?: string
    date_preset?: string
    fields?: string
    limit?: number
  } = {}): Promise<AdInsight[]> {
    const defaultParams = {
      level: 'ad',
      date_preset: 'last_30d',
      fields: 'ad_id,ad_name,campaign_id,campaign_name,impressions,reach,frequency,ctr,cpm,spend',
      limit: 100,
      ...params
    }
    
    const url = new URL(`${this.baseUrl}/act_${this.accountId}/insights`)
    url.searchParams.append('access_token', this.token)
    
    Object.entries(defaultParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
    
    try {
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `API Error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }
}
```
