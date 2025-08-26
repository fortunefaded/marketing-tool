import { logger } from '@shared/utils/logger'

export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion?: string
  baseUrl?: string
}

export class MetaApiClient {
  private config: MetaApiConfig
  private baseUrl: string
  private apiVersion: string

  constructor(config: MetaApiConfig) {
    this.config = config
    this.apiVersion = config.apiVersion || 'v23.0'
    this.baseUrl = config.baseUrl || `https://graph.facebook.com/${this.apiVersion}`
  }

  /**
   * Make API call to Meta Graph API
   */
  async apiCall<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add access token
    url.searchParams.append('access_token', this.config.accessToken)
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','))
        } else if (typeof value === 'object') {
          url.searchParams.append(key, JSON.stringify(value))
        } else {
          url.searchParams.append(key, String(value))
        }
      }
    })

    try {
      logger.api('meta_api_request', { endpoint, params })
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `API Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle pagination
      if (data.paging?.next) {
        const allData = [data]
        let nextUrl = data.paging.next
        
        while (nextUrl) {
          const nextResponse = await fetch(nextUrl)
          if (!nextResponse.ok) break
          
          const nextData = await nextResponse.json()
          allData.push(nextData)
          nextUrl = nextData.paging?.next
        }
        
        // Merge all data
        const mergedData = allData.reduce((acc, curr) => {
          if (Array.isArray(curr.data)) {
            acc.data = [...(acc.data || []), ...curr.data]
          }
          return acc
        }, {})
        
        return mergedData as T
      }
      
      return data
    } catch (error) {
      logger.error('Meta API Error:', error)
      throw error
    }
  }

  /**
   * Get account ID with proper formatting
   */
  getAccountId(): string {
    return this.config.accountId.startsWith('act_') 
      ? this.config.accountId 
      : `act_${this.config.accountId}`
  }
}