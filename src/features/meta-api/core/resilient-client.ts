import { vibe } from '@/lib/vibelogger'
import { MetaApiError, MetaApiResponse, AdInsight } from '@/types'
import { SecureTokenManager } from './secure-token-manager'
import { AccountId, AccessToken } from './branded-types'
import { Result } from './result'
import { toError, toMetaApiError } from './type-guards'

/**
 * レジリエントなMeta APIクライアント
 * - サーキットブレーカーパターン
 * - 指数バックオフ with ジッター
 * - リクエスト重複排除
 * - レスポンスキャッシング
 */
export class ResilientMetaApiClient {
  private static instance: ResilientMetaApiClient
  private baseUrl = 'https://graph.facebook.com/v23.0'
  
  // サーキットブレーカー状態
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private readonly failureThreshold = 5
  private lastFailureTime = 0
  private readonly circuitBreakerTimeout = 60000 // 60秒
  
  // リクエスト重複排除
  private pendingRequests = new Map<string, Promise<any>>()
  
  // レスポンスキャッシュ
  private responseCache = new Map<string, { data: any; expiry: Date }>()
  
  private constructor(
    private tokenManager: SecureTokenManager,
    private accountId: AccountId
  ) {}
  
  static getInstance(tokenManager: SecureTokenManager, accountId: AccountId): ResilientMetaApiClient {
    if (!ResilientMetaApiClient.instance) {
      ResilientMetaApiClient.instance = new ResilientMetaApiClient(tokenManager, accountId)
    }
    return ResilientMetaApiClient.instance
  }
  
  /**
   * 広告インサイトの取得（レジリエント版）
   */
  async getInsights(options: {
    datePreset?: string
    fields?: string[]
    limit?: number
  } = {}): Promise<Result<AdInsight[]>> {
    const story = vibe.story('レジリエントMeta API呼び出し')
    
    try {
      // サーキットブレーカーチェック
      if (!this.canMakeRequest()) {
        story.chapter('サーキットブレーカー作動中')
        const cached = this.getCachedResponse('insights', options)
        if (cached) {
          story.success('キャッシュからデータ返却')
          return Result.ok(cached, true)
        }
        return Result.err(new MetaApiError('Circuit breaker is open', {
          code: 'CIRCUIT_OPEN',
          statusCode: 503
        }))
      }
      
      // リクエスト重複排除
      const requestKey = this.generateRequestKey('insights', options)
      const pending = this.pendingRequests.get(requestKey)
      if (pending) {
        story.chapter('重複リクエスト検出', '既存のリクエストを待機')
        return await pending
      }
      
      // 新規リクエスト
      const requestPromise = this.makeResilientRequest('/insights', options)
      this.pendingRequests.set(requestKey, requestPromise)
      
      try {
        const result = await requestPromise
        this.recordSuccess()
        story.success('API呼び出し成功')
        return Result.ok(result)
      } finally {
        this.pendingRequests.delete(requestKey)
      }
      
    } catch (error) {
      const err = toMetaApiError(error)
      story.fail(`エラー: ${err.message}`)
      return Result.err(err)
    }
  }
  
  /**
   * レジリエントなリクエスト実行
   */
  private async makeResilientRequest(
    endpoint: string,
    options: any,
    retryCount = 0
  ): Promise<any> {
    const maxRetries = 3
    const story = vibe.story(`API呼び出し (試行 ${retryCount + 1}/${maxRetries + 1})`)
    
    try {
      // トークン取得
      const tokenResult = await this.tokenManager.getToken(this.accountId)
      if (!Result.isOk(tokenResult)) {
        throw tokenResult.error
      }
      const token = tokenResult.data
      
      // URL構築
      const url = new URL(`${this.baseUrl}/act_${this.accountId}${endpoint}`)
      url.searchParams.append('access_token', AccessToken.mask(token))
      
      // パラメータ設定
      if (options.datePreset) {
        url.searchParams.append('date_preset', options.datePreset)
      }
      if (options.fields) {
        url.searchParams.append('fields', options.fields.join(','))
      }
      if (options.limit) {
        url.searchParams.append('limit', options.limit.toString())
      }
      
      story.chapter('リクエスト送信', `${url.pathname}`)
      
      // リクエスト実行
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000) // 30秒タイムアウト
      })
      
      const responseData: MetaApiResponse<any> = await response.json()
      
      if (!response.ok) {
        throw new MetaApiError(
          responseData.error?.message || 'API Error',
          {
            code: responseData.error?.code,
            statusCode: response.status,
            type: responseData.error?.type
          }
        )
      }
      
      // 成功時の処理
      const data = responseData.data || []
      
      // キャッシュに保存
      this.cacheResponse(endpoint, options, data)
      
      story.success(`${data.length}件のデータ取得`)
      return data
      
    } catch (error) {
      const err = toError(error)
      story.chapter('エラー発生', err.message)
      
      // リトライ可能かチェック
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateBackoffDelay(retryCount)
        story.chapter('リトライ待機', `${delay}ms後に再試行`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.makeResilientRequest(endpoint, options, retryCount + 1)
      }
      
      // 失敗を記録
      this.recordFailure()
      story.fail('リトライ上限到達')
      throw error
    }
  }
  
  /**
   * サーキットブレーカーの状態チェック
   */
  private canMakeRequest(): boolean {
    if (this.circuitState === 'closed') {
      return true
    }
    
    if (this.circuitState === 'open') {
      // タイムアウト経過後はhalf-openに移行
      if (Date.now() - this.lastFailureTime > this.circuitBreakerTimeout) {
        this.circuitState = 'half-open'
        vibe.info('サーキットブレーカー: half-open状態に移行')
        return true
      }
      return false
    }
    
    // half-open状態では1回だけ試行
    return true
  }
  
  /**
   * 成功を記録
   */
  private recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed'
      vibe.good('サーキットブレーカー: 正常状態に復帰')
    }
    this.failureCount = 0
  }
  
  /**
   * 失敗を記録
   */
  private recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'open'
      vibe.bad('サーキットブレーカー: 作動（open状態）')
    }
  }
  
  /**
   * リトライすべきか判定
   */
  private shouldRetry(error: unknown, retryCount: number): boolean {
    const maxRetries = 3
    
    if (retryCount >= maxRetries) {
      return false
    }
    
    const apiError = toMetaApiError(error)
    
    // ネットワークエラーまたは5xx系エラーはリトライ
    if (apiError.name === 'NetworkError' || (apiError.statusCode && apiError.statusCode >= 500)) {
      return true
    }
    
    // レート制限エラーもリトライ
    if (apiError.code === 4 || apiError.code === 17 || apiError.code === '4' || apiError.code === '17') {
      return true
    }
    
    return false
  }
  
  /**
   * バックオフ遅延の計算（指数バックオフ + ジッター）
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = 1000 // 1秒
    const maxDelay = 32000 // 32秒
    
    // 指数バックオフ
    let delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
    
    // ジッター追加（±25%）
    const jitter = delay * 0.25
    delay = delay + (Math.random() * 2 - 1) * jitter
    
    return Math.floor(delay)
  }
  
  /**
   * リクエストキーの生成
   */
  private generateRequestKey(endpoint: string, options: any): string {
    return `${endpoint}:${JSON.stringify(options)}`
  }
  
  /**
   * レスポンスのキャッシュ
   */
  private cacheResponse(endpoint: string, options: any, data: any): void {
    const key = this.generateRequestKey(endpoint, options)
    const expiry = new Date(Date.now() + 5 * 60 * 1000) // 5分間有効
    
    this.responseCache.set(key, { data, expiry })
    
    // 古いキャッシュを削除
    this.cleanupCache()
  }
  
  /**
   * キャッシュからレスポンスを取得
   */
  private getCachedResponse(endpoint: string, options: any): any | null {
    const key = this.generateRequestKey(endpoint, options)
    const cached = this.responseCache.get(key)
    
    if (cached && cached.expiry > new Date()) {
      vibe.info('キャッシュヒット', { endpoint, options })
      return cached.data
    }
    
    return null
  }
  
  /**
   * 期限切れキャッシュのクリーンアップ
   */
  private cleanupCache(): void {
    const now = new Date()
    for (const [key, value] of this.responseCache.entries()) {
      if (value.expiry < now) {
        this.responseCache.delete(key)
      }
    }
  }
}