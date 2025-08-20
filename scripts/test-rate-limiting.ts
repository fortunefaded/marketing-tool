#!/usr/bin/env tsx
/**
 * Meta APIレート制限テストスクリプト
 * APIのレート制限動作を検証し、適切な制御が機能することを確認
 */

import dotenv from 'dotenv'
import { MetaAPIClientEnhanced } from '../src/lib/meta-api/client-enhanced'
import chalk from 'chalk'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

interface RateLimitMetrics {
  totalRequests: number
  successfulRequests: number
  rateLimitedRequests: number
  errors: number
  startTime: number
  endTime: number
  averageResponseTime: number
  peakRequestsPerMinute: number
}

class RateLimitTester {
  private client: MetaAPIClientEnhanced
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    rateLimitedRequests: 0,
    errors: 0,
    startTime: Date.now(),
    endTime: 0,
    averageResponseTime: 0,
    peakRequestsPerMinute: 0,
  }
  private responseTimes: number[] = []
  private requestTimestamps: number[] = []

  constructor(
    private config: {
      accessToken: string
      accountId: string
    }
  ) {
    this.client = new MetaAPIClientEnhanced({
      accessToken: config.accessToken,
      accountId: config.accountId,
    })
  }

  async run() {
    console.log(chalk.blue('\n⚡ Meta APIレート制限テストを開始します...\n'))

    // テストシナリオを実行
    await this.testBurstRequests()
    await this.testSustainedLoad()
    await this.testRateLimitHeaders()
    await this.testAdaptiveRateLimiting()

    // 結果を表示
    this.printResults()
  }

  /**
   * バーストリクエストテスト
   * 短時間に大量のリクエストを送信
   */
  private async testBurstRequests() {
    console.log(chalk.cyan('\n▶ バーストリクエストテスト'))
    console.log(chalk.gray('  10個の同時リクエストを送信します...'))

    const promises = []
    const batchSize = 10

    for (let i = 0; i < batchSize; i++) {
      promises.push(this.makeTimedRequest(() => this.client.getCampaigns({ limit: 5 })))
    }

    const results = await Promise.allSettled(promises)

    let successCount = 0
    let rateLimitCount = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++
        console.log(chalk.green(`  ✓ リクエスト ${index + 1}: 成功`))
      } else {
        const error = result.reason
        if (error.message.includes('rate limit')) {
          rateLimitCount++
          console.log(chalk.yellow(`  ⚠️  リクエスト ${index + 1}: レート制限`))
        } else {
          console.log(chalk.red(`  ✗ リクエスト ${index + 1}: エラー - ${error.message}`))
        }
      }
    })

    console.log(
      chalk.gray(`\n  結果: ${successCount}/${batchSize} 成功, ${rateLimitCount} レート制限`)
    )
  }

  /**
   * 持続的負荷テスト
   * 一定期間継続的にリクエストを送信
   */
  private async testSustainedLoad() {
    console.log(chalk.cyan('\n▶ 持続的負荷テスト'))
    console.log(chalk.gray('  30秒間、1秒間隔でリクエストを送信します...'))

    const duration = 30000 // 30秒
    const interval = 1000 // 1秒
    const startTime = Date.now()

    while (Date.now() - startTime < duration) {
      try {
        const response = await this.makeTimedRequest(() =>
          this.client.getInsights({
            datePreset: 'yesterday',
            fields: ['impressions', 'clicks', 'spend'],
          })
        )

        console.log(chalk.green(`  ✓ ${new Date().toLocaleTimeString()}: 成功`))
      } catch (error) {
        if ((error as Error).message.includes('rate limit')) {
          console.log(chalk.yellow(`  ⚠️  ${new Date().toLocaleTimeString()}: レート制限`))
          this.metrics.rateLimitedRequests++

          // レート制限に達したら少し待機
          console.log(chalk.gray('     60秒待機中...'))
          await new Promise((resolve) => setTimeout(resolve, 60000))
        } else {
          console.log(chalk.red(`  ✗ ${new Date().toLocaleTimeString()}: エラー`))
          this.metrics.errors++
        }
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   * レート制限ヘッダーのテスト
   * APIレスポンスのレート制限情報を確認
   */
  private async testRateLimitHeaders() {
    console.log(chalk.cyan('\n▶ レート制限ヘッダー確認'))

    try {
      // 直接fetchを使用してヘッダーを確認
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${this.config.accountId}/campaigns?limit=1&access_token=${this.config.accessToken}`
      )

      // レート制限関連のヘッダーを取得
      const headers = {
        'x-business-use-case-usage': response.headers.get('x-business-use-case-usage'),
        'x-app-usage': response.headers.get('x-app-usage'),
        'x-ad-account-usage': response.headers.get('x-ad-account-usage'),
      }

      console.log(chalk.gray('\n  レート制限情報:'))
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          try {
            const parsed = JSON.parse(value)
            console.log(chalk.gray(`    ${key}:`))
            console.log(chalk.gray(`      ${JSON.stringify(parsed, null, 2)}`))
          } catch {
            console.log(chalk.gray(`    ${key}: ${value}`))
          }
        }
      })
    } catch (error) {
      console.log(chalk.red(`  エラー: ${(error as Error).message}`))
    }
  }

  /**
   * アダプティブレート制限テスト
   * レート制限に基づいて自動的に調整
   */
  private async testAdaptiveRateLimiting() {
    console.log(chalk.cyan('\n▶ アダプティブレート制限テスト'))
    console.log(chalk.gray('  レート制限を検出して自動調整します...'))

    let delay = 100 // 初期遅延（ミリ秒）
    let consecutiveSuccesses = 0
    let consecutiveFailures = 0
    const maxRequests = 20

    for (let i = 0; i < maxRequests; i++) {
      try {
        await this.makeTimedRequest(() => this.client.getCampaigns({ limit: 1 }))

        consecutiveSuccesses++
        consecutiveFailures = 0

        // 成功が続いたら遅延を減らす（より速く）
        if (consecutiveSuccesses >= 3 && delay > 100) {
          delay = Math.max(100, delay - 50)
          console.log(chalk.green(`  ✓ 成功 - 遅延を${delay}msに短縮`))
        } else {
          console.log(chalk.green(`  ✓ 成功 - 現在の遅延: ${delay}ms`))
        }
      } catch (error) {
        consecutiveSuccesses = 0
        consecutiveFailures++

        if ((error as Error).message.includes('rate limit')) {
          // レート制限に達したら遅延を増やす
          delay = Math.min(5000, delay * 2)
          console.log(chalk.yellow(`  ⚠️  レート制限 - 遅延を${delay}msに増加`))
          this.metrics.rateLimitedRequests++
        } else {
          console.log(chalk.red(`  ✗ エラー: ${(error as Error).message}`))
          this.metrics.errors++
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  /**
   * 時間計測付きリクエスト
   */
  private async makeTimedRequest<T>(request: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.metrics.totalRequests++
    this.requestTimestamps.push(startTime)

    try {
      const result = await request()
      const responseTime = Date.now() - startTime
      this.responseTimes.push(responseTime)
      this.metrics.successfulRequests++
      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.responseTimes.push(responseTime)
      throw error
    }
  }

  /**
   * 結果の表示
   */
  private printResults() {
    this.metrics.endTime = Date.now()
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000

    // 平均レスポンスタイムを計算
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime =
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
    }

    // ピークリクエスト数/分を計算
    const requestsPerMinute = this.calculateRequestsPerMinute()
    this.metrics.peakRequestsPerMinute = Math.max(...requestsPerMinute)

    console.log(chalk.blue('\n\n📊 レート制限テスト結果\n'))

    console.log(chalk.white('基本統計:'))
    console.log(chalk.gray(`  総リクエスト数: ${this.metrics.totalRequests}`))
    console.log(chalk.green(`  成功: ${this.metrics.successfulRequests}`))
    console.log(chalk.yellow(`  レート制限: ${this.metrics.rateLimitedRequests}`))
    console.log(chalk.red(`  エラー: ${this.metrics.errors}`))
    console.log(chalk.gray(`  実行時間: ${duration.toFixed(2)}秒`))

    console.log(chalk.white('\nパフォーマンス指標:'))
    console.log(
      chalk.gray(`  平均レスポンスタイム: ${this.metrics.averageResponseTime.toFixed(0)}ms`)
    )
    console.log(chalk.gray(`  最小レスポンスタイム: ${Math.min(...this.responseTimes)}ms`))
    console.log(chalk.gray(`  最大レスポンスタイム: ${Math.max(...this.responseTimes)}ms`))
    console.log(chalk.gray(`  ピークリクエスト数/分: ${this.metrics.peakRequestsPerMinute}`))

    console.log(chalk.white('\nレート制限対策の効果:'))
    const successRate = (
      (this.metrics.successfulRequests / this.metrics.totalRequests) *
      100
    ).toFixed(1)
    console.log(chalk.gray(`  成功率: ${successRate}%`))

    if (this.metrics.rateLimitedRequests > 0) {
      console.log(chalk.yellow('\n⚠️  レート制限に達しました'))
      console.log(chalk.gray('  推奨事項:'))
      console.log(chalk.gray('  - リクエスト間隔を増やす'))
      console.log(chalk.gray('  - バッチAPIを使用する'))
      console.log(chalk.gray('  - キャッシュを活用する'))
    } else {
      console.log(chalk.green('\n✓ レート制限内で正常に動作しています'))
    }

    // クライアントのレート制限状態を表示
    const rateLimitStatus = (this.client as any).getRateLimitStatus()
    console.log(chalk.white('\nクライアント内部状態:'))
    console.log(chalk.gray(`  総API呼び出し回数: ${rateLimitStatus.callCount}`))
    console.log(chalk.gray(`  現在のウィンドウ内の呼び出し: ${rateLimitStatus.windowCalls || 0}`))
  }

  /**
   * 分あたりのリクエスト数を計算
   */
  private calculateRequestsPerMinute(): number[] {
    const minuteBuckets: { [key: number]: number } = {}

    this.requestTimestamps.forEach((timestamp) => {
      const minute = Math.floor(timestamp / 60000)
      minuteBuckets[minute] = (minuteBuckets[minute] || 0) + 1
    })

    return Object.values(minuteBuckets)
  }
}

// レート制限回避戦略のデモ
class RateLimitStrategies {
  private client: MetaAPIClientEnhanced

  constructor(accessToken: string, accountId: string) {
    this.client = new MetaAPIClientEnhanced({
      accessToken,
      accountId,
    })
  }

  async demonstrateStrategies() {
    console.log(chalk.blue('\n\n🛡️ レート制限回避戦略のデモ\n'))

    await this.demonstrateBatching()
    await this.demonstrateCaching()
    await this.demonstrateFieldFiltering()
  }

  private async demonstrateBatching() {
    console.log(chalk.cyan('▶ バッチリクエスト戦略'))
    console.log(chalk.gray('  複数のAPIコールを1つのバッチにまとめます'))

    const individualStartTime = Date.now()

    // 個別リクエスト（比較用）
    try {
      await this.client.getCampaigns({ limit: 5 })
      await this.client.getInsights({ datePreset: 'yesterday' })
    } catch (error) {
      console.log(chalk.red('  個別リクエストでエラー'))
    }

    const individualTime = Date.now() - individualStartTime

    // バッチリクエスト
    const batchStartTime = Date.now()

    try {
      const batch = await this.client.batchRequest([
        {
          method: 'GET',
          relative_url: `${this.client['accountId']}/campaigns?limit=5`,
        },
        {
          method: 'GET',
          relative_url: `${this.client['accountId']}/insights?date_preset=yesterday`,
        },
      ])

      const batchTime = Date.now() - batchStartTime

      console.log(chalk.green(`  ✓ バッチリクエスト成功`))
      console.log(chalk.gray(`    個別リクエスト時間: ${individualTime}ms`))
      console.log(chalk.gray(`    バッチリクエスト時間: ${batchTime}ms`))
      console.log(
        chalk.gray(
          `    改善率: ${(((individualTime - batchTime) / individualTime) * 100).toFixed(1)}%`
        )
      )
    } catch (error) {
      console.log(chalk.red(`  バッチリクエストでエラー: ${(error as Error).message}`))
    }
  }

  private async demonstrateCaching() {
    console.log(chalk.cyan('\n▶ キャッシュ戦略'))
    console.log(chalk.gray('  同じデータへの重複リクエストを避けます'))

    const cache = new Map<string, { data: any; timestamp: number }>()
    const cacheTimeout = 60000 // 1分

    const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
      const cached = cache.get(key)

      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        console.log(chalk.green(`  ✓ キャッシュヒット: ${key}`))
        return cached.data
      }

      console.log(chalk.yellow(`  ⚠️  キャッシュミス: ${key}`))
      const data = await fetcher()
      cache.set(key, { data, timestamp: Date.now() })
      return data
    }

    // 初回リクエスト
    await getCachedData('campaigns', () => this.client.getCampaigns({ limit: 5 }))

    // 2回目（キャッシュから）
    await getCachedData('campaigns', () => this.client.getCampaigns({ limit: 5 }))

    console.log(chalk.gray(`  キャッシュサイズ: ${cache.size}`))
  }

  private async demonstrateFieldFiltering() {
    console.log(chalk.cyan('\n▶ フィールドフィルタリング戦略'))
    console.log(chalk.gray('  必要なフィールドのみを取得してデータ量を削減'))

    try {
      // すべてのフィールドを取得（比較用）
      const fullStartTime = Date.now()
      await this.client.getCampaigns()
      const fullTime = Date.now() - fullStartTime

      // 必要なフィールドのみ
      const filteredStartTime = Date.now()
      await this.client.getCampaigns({
        fields: ['name', 'status', 'objective'],
      })
      const filteredTime = Date.now() - filteredStartTime

      console.log(chalk.green('  ✓ フィールドフィルタリング成功'))
      console.log(chalk.gray(`    全フィールド取得時間: ${fullTime}ms`))
      console.log(chalk.gray(`    フィルター適用時間: ${filteredTime}ms`))
      console.log(
        chalk.gray(`    改善率: ${(((fullTime - filteredTime) / fullTime) * 100).toFixed(1)}%`)
      )
    } catch (error) {
      console.log(chalk.red(`  エラー: ${(error as Error).message}`))
    }
  }
}

// メイン実行
async function main() {
  const config = {
    accessToken: process.env.VITE_META_ACCESS_TOKEN || '',
    accountId: process.env.VITE_META_AD_ACCOUNT_ID || '',
  }

  if (!config.accessToken || !config.accountId) {
    console.error(chalk.red('環境変数が設定されていません'))
    console.error(
      chalk.gray('VITE_META_ACCESS_TOKEN と VITE_META_AD_ACCOUNT_ID を設定してください')
    )
    process.exit(1)
  }

  // レート制限テスト
  const tester = new RateLimitTester(config)
  await tester.run()

  // レート制限回避戦略のデモ
  const strategies = new RateLimitStrategies(config.accessToken, config.accountId)
  await strategies.demonstrateStrategies()
}

// エラーハンドリング
main().catch((error) => {
  console.error(chalk.red('\n\n❌ テスト実行中にエラーが発生しました:'))
  console.error(error)
  process.exit(1)
})
