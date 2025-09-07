import { MetaApiClient } from '@meta/services/MetaApiClient'
import { logger } from '@shared/utils/logger'

interface BatchRequest {
  id: string
  resolve: (value: any) => void
  reject: (error: any) => void
}

export class BatchedMetaApiService {
  private batchQueue: Map<string, BatchRequest[]> = new Map()
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 50
  private readonly BATCH_DELAY = 100 // ms
  
  // インメモリキャッシュ
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分

  constructor(private client: MetaApiClient) {}

  /**
   * バッチ処理でインサイトを取得
   */
  async getInsightBatched(adId: string): Promise<any> {
    // キャッシュチェック
    const cached = this.getFromCache(adId)
    if (cached) return cached

    return new Promise((resolve, reject) => {
      // バッチキューに追加
      if (!this.batchQueue.has('insights')) {
        this.batchQueue.set('insights', [])
      }
      
      this.batchQueue.get('insights')!.push({ id: adId, resolve, reject })
      
      // バッチ処理をスケジュール
      this.scheduleBatch()
    })
  }

  /**
   * 複数のクリエイティブを並列で取得
   */
  async getCreativesBatch(creativeIds: string[]): Promise<Map<string, any>> {
    const chunks = this.chunkArray(creativeIds, this.BATCH_SIZE)
    
    // 並列でバッチリクエスト
    const results = await Promise.all(
      chunks.map(chunk => this.fetchCreativeBatch(chunk))
    )
    
    // 結果をMapに変換
    const creativesMap = new Map<string, any>()
    results.flat().forEach(creative => {
      creativesMap.set(creative.id, creative)
      this.setCache(creative.id, creative)
    })
    
    return creativesMap
  }

  /**
   * バッチ処理のスケジューリング
   */
  private scheduleBatch() {
    if (this.batchTimeout) return
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch()
      this.batchTimeout = null
    }, this.BATCH_DELAY)
  }

  /**
   * バッチ処理の実行
   */
  private async processBatch() {
    for (const [endpoint, requests] of this.batchQueue.entries()) {
      if (requests.length === 0) continue
      
      // バッチサイズごとに分割
      const chunks = this.chunkArray(requests, this.BATCH_SIZE)
      
      for (const chunk of chunks) {
        try {
          const ids = chunk.map(r => r.id)
          const results = await this.fetchBatch(endpoint, ids)
          
          // 結果を各リクエストに配信
          chunk.forEach(request => {
            const result = results.find(r => r.id === request.id)
            if (result) {
              this.setCache(request.id, result)
              request.resolve(result)
            } else {
              request.reject(new Error(`No data found for ${request.id}`))
            }
          })
        } catch (error) {
          // エラーを全リクエストに配信
          chunk.forEach(request => request.reject(error))
        }
      }
    }
    
    // キューをクリア
    this.batchQueue.clear()
  }

  /**
   * バッチAPIリクエスト
   */
  private async fetchBatch(endpoint: string, ids: string[]): Promise<any[]> {
    logger.debug(`Batch API request: ${endpoint} with ${ids.length} ids`)
    
    const response = await this.client.apiCall(`/${endpoint}`, {
      ids: ids.join(','),
      fields: this.getFieldsForEndpoint(endpoint)
    })
    
    return Array.isArray(response) ? response : response.data || []
  }

  /**
   * クリエイティブのバッチ取得
   */
  private async fetchCreativeBatch(ids: string[]): Promise<any[]> {
    const response = await this.client.apiCall('/creatives', {
      ids: ids.join(','),
      fields: 'id,name,thumbnail_url,video_url,body,title,status'
    })
    
    return Array.isArray(response) ? response : response.data || []
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // TTLチェック
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * キャッシュに保存
   */
  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * 配列を指定サイズに分割
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * エンドポイントごとのフィールド定義
   */
  private getFieldsForEndpoint(endpoint: string): string {
    const fieldMap: Record<string, string> = {
      insights: 'ad_id,ad_name,impressions,clicks,spend,reach,frequency,ctr,cpm,actions',
      creatives: 'id,name,thumbnail_url,video_url,body,title,status',
      campaigns: 'id,name,status,objective,daily_budget,lifetime_budget'
    }
    
    return fieldMap[endpoint] || 'id,name'
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * キャッシュ統計
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp
      }))
    }
  }
}