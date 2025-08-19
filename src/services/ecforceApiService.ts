export interface ECForceConfig {
  apiKey: string
  shopId: string
  apiEndpoint?: string
}

export interface ECForceOrder {
  id: string
  order_number: string
  created_at: string
  updated_at: string
  status: string
  total_amount: number
  subtotal_amount: number
  tax_amount: number
  shipping_amount: number
  discount_amount: number
  customer: {
    id: string
    email: string
    name: string
  }
  items: Array<{
    id: string
    product_id: string
    product_name: string
    quantity: number
    price: number
    total: number
  }>
  // Meta広告との紐付け用
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  fbclid?: string // Facebook Click ID
  gclid?: string // Google Click ID
}

export interface ECForceSalesData {
  date: string
  orders_count: number
  total_sales: number
  average_order_value: number
  new_customers: number
  returning_customers: number
  products_sold: number
}

export interface ECForceProduct {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category: string
  created_at: string
  updated_at: string
}

export class ECForceApiError extends Error {
  code: string
  statusCode?: number
  details?: any

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message)
    this.name = 'ECForceApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ECForceApiService {
  private config: ECForceConfig
  private baseUrl: string

  constructor(config: ECForceConfig) {
    this.config = config
    this.baseUrl = config.apiEndpoint || 'https://api.ecforce.jp/v1'
  }

  // 認証ヘッダーの生成
  private getAuthHeaders(): Headers {
    return new Headers({
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'X-Shop-Id': this.config.shopId
    })
  }

  // APIコール
  private async apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new ECForceApiError(
          error.message || 'API request failed',
          error.code || 'API_ERROR',
          response.status,
          error
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ECForceApiError) {
        throw error
      }
      throw new ECForceApiError(
        'Network error',
        'NETWORK_ERROR',
        undefined,
        error
      )
    }
  }

  // 注文データの取得
  async getOrders(params?: {
    startDate?: string
    endDate?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<ECForceOrder[]> {
    const queryParams = new URLSearchParams()
    
    if (params?.startDate) queryParams.append('created_at_from', params.startDate)
    if (params?.endDate) queryParams.append('created_at_to', params.endDate)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const response = await this.apiCall<{ orders: ECForceOrder[] }>(
      `/orders?${queryParams.toString()}`
    )
    
    return response.orders || []
  }

  // 売上サマリーの取得
  async getSalesSummary(params: {
    startDate: string
    endDate: string
    groupBy?: 'day' | 'week' | 'month'
  }): Promise<ECForceSalesData[]> {
    const queryParams = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      group_by: params.groupBy || 'day'
    })

    const response = await this.apiCall<{ sales: ECForceSalesData[] }>(
      `/sales/summary?${queryParams.toString()}`
    )
    
    return response.sales || []
  }

  // 商品データの取得
  async getProducts(params?: {
    category?: string
    limit?: number
    offset?: number
  }): Promise<ECForceProduct[]> {
    const queryParams = new URLSearchParams()
    
    if (params?.category) queryParams.append('category', params.category)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const response = await this.apiCall<{ products: ECForceProduct[] }>(
      `/products?${queryParams.toString()}`
    )
    
    return response.products || []
  }

  // 特定の注文の詳細取得
  async getOrderDetail(orderId: string): Promise<ECForceOrder> {
    return await this.apiCall<ECForceOrder>(`/orders/${orderId}`)
  }

  // Facebook Click IDによる注文検索
  async getOrdersByFbclid(fbclid: string): Promise<ECForceOrder[]> {
    const queryParams = new URLSearchParams({
      fbclid: fbclid
    })

    const response = await this.apiCall<{ orders: ECForceOrder[] }>(
      `/orders/search?${queryParams.toString()}`
    )
    
    return response.orders || []
  }

  // UTMパラメータによる注文検索
  async getOrdersByUTM(params: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    startDate?: string
    endDate?: string
  }): Promise<ECForceOrder[]> {
    const queryParams = new URLSearchParams()
    
    if (params.utm_source) queryParams.append('utm_source', params.utm_source)
    if (params.utm_medium) queryParams.append('utm_medium', params.utm_medium)
    if (params.utm_campaign) queryParams.append('utm_campaign', params.utm_campaign)
    if (params.utm_content) queryParams.append('utm_content', params.utm_content)
    if (params.startDate) queryParams.append('created_at_from', params.startDate)
    if (params.endDate) queryParams.append('created_at_to', params.endDate)

    const response = await this.apiCall<{ orders: ECForceOrder[] }>(
      `/orders/search?${queryParams.toString()}`
    )
    
    return response.orders || []
  }

  // 売上データとMeta広告データの紐付け
  async matchOrdersWithMetaCampaigns(orders: ECForceOrder[]): Promise<Array<{
    order: ECForceOrder
    campaign_id?: string
    ad_id?: string
    creative_id?: string
    attribution_type: 'direct' | 'utm' | 'unknown'
  }>> {
    return orders.map(order => {
      // Facebook Click IDがある場合は直接紐付け
      if (order.fbclid) {
        return {
          order,
          attribution_type: 'direct' as const
          // ここでMeta APIを使ってfbclidから広告情報を取得する処理を追加
        }
      }
      
      // UTMパラメータで紐付け
      if (order.utm_source === 'facebook' && order.utm_campaign) {
        return {
          order,
          attribution_type: 'utm' as const
          // キャンペーン名から広告情報を特定する処理を追加
        }
      }
      
      return {
        order,
        attribution_type: 'unknown' as const
      }
    })
  }
}