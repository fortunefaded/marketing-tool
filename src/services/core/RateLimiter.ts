/**
 * レート制限管理
 * Meta APIのレート制限を適切に処理
 */

import { logger } from '../../utils/logger'

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

export class RateLimiter {
  private queue: Array<() => void> = []
  private processing = false
  private lastRequestTime = 0
  private requestCount = 0
  private windowStart = Date.now()
  
  // Meta APIのデフォルトレート制限
  private readonly limits = {
    requestsPerHour: 200,
    requestsPerDay: 4800,
    minInterval: 100, // ミリ秒
    burstSize: 10
  }
  
  private rateLimitInfo: RateLimitInfo = {
    limit: this.limits.requestsPerHour,
    remaining: this.limits.requestsPerHour,
    reset: Date.now() + 3600000
  }

  /**
   * レート制限に従って待機
   */
  async waitIfNeeded(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  /**
   * レート制限情報を更新
   */
  updateFromHeaders(headers: Headers): void {
    const limit = headers.get('x-business-use-case-usage')
    if (limit) {
      try {
        const usage = JSON.parse(limit)
        // Meta APIの使用率から残りを計算
        const callCount = usage[0]?.call_count || 0
        const totalCputime = usage[0]?.total_cputime || 0
        const totalTime = usage[0]?.total_time || 0
        
        this.rateLimitInfo = {
          limit: this.limits.requestsPerHour,
          remaining: Math.max(0, this.limits.requestsPerHour - callCount),
          reset: Date.now() + 3600000
        }
        
        logger.debug('[RateLimiter] Updated rate limit info', this.rateLimitInfo)
      } catch (error) {
        logger.error('[RateLimiter] Failed to parse rate limit header', error)
      }
    }
  }

  /**
   * 現在のレート制限情報を取得
   */
  getInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  /**
   * キューの処理
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // レート制限チェック
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime()
        logger.debug(`[RateLimiter] Rate limit reached, waiting ${waitTime}ms`)
        await this.sleep(waitTime)
        continue
      }

      // 最小間隔の確保
      const timeSinceLastRequest = Date.now() - this.lastRequestTime
      if (timeSinceLastRequest < this.limits.minInterval) {
        await this.sleep(this.limits.minInterval - timeSinceLastRequest)
      }

      // リクエストを許可
      const resolve = this.queue.shift()
      if (resolve) {
        this.lastRequestTime = Date.now()
        this.requestCount++
        resolve()
      }
    }

    this.processing = false
  }

  /**
   * リクエストが可能かチェック
   */
  private canMakeRequest(): boolean {
    // ウィンドウのリセット
    const now = Date.now()
    if (now - this.windowStart > 3600000) { // 1時間
      this.windowStart = now
      this.requestCount = 0
    }

    // 残りリクエスト数チェック
    if (this.rateLimitInfo.remaining <= 0) {
      return false
    }

    // 時間あたりのリクエスト数チェック
    if (this.requestCount >= this.limits.requestsPerHour) {
      return false
    }

    return true
  }

  /**
   * 待機時間の計算
   */
  private getWaitTime(): number {
    const now = Date.now()
    
    // リセット時間まで待つ
    if (this.rateLimitInfo.reset > now) {
      return Math.min(this.rateLimitInfo.reset - now, 60000) // 最大1分
    }

    // ウィンドウリセットまで待つ
    const windowElapsed = now - this.windowStart
    if (windowElapsed < 3600000) {
      return 3600000 - windowElapsed
    }

    return 1000 // デフォルト1秒
  }

  /**
   * スリープ関数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 統計情報
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      requestCount: this.requestCount,
      windowStart: new Date(this.windowStart).toISOString(),
      rateLimitInfo: this.rateLimitInfo,
      isProcessing: this.processing
    }
  }
}