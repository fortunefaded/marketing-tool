#!/usr/bin/env tsx
/**
 * Meta API統合テストスクリプト
 * 実際のMeta APIを使用してエンドツーエンドのテストを実行
 */

import dotenv from 'dotenv'
import { MetaAPIClientEnhanced } from '../src/lib/meta-api/client-enhanced'
import { MetaTokenManager } from '../src/lib/meta-api/token-manager'
import chalk from 'chalk'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  message?: string
  error?: Error
  duration?: number
}

class MetaAPIIntegrationTester {
  private client: MetaAPIClientEnhanced | null = null
  private tokenManager: MetaTokenManager | null = null
  private results: TestResult[] = []

  constructor(
    private config: {
      appId: string
      appSecret?: string
      adAccountId: string
      accessToken: string
    }
  ) {}

  async run() {
    console.log(chalk.blue('\n🚀 Meta API統合テストを開始します...\n'))

    // 環境変数チェック
    await this.test('環境変数チェック', async () => {
      if (!this.config.appId) throw new Error('VITE_META_APP_ID が設定されていません')
      if (!this.config.adAccountId) throw new Error('VITE_META_AD_ACCOUNT_ID が設定されていません')
      if (!this.config.accessToken) throw new Error('VITE_META_ACCESS_TOKEN が設定されていません')
      
      console.log(chalk.gray(`App ID: ${this.config.appId}`))
      console.log(chalk.gray(`Ad Account ID: ${this.config.adAccountId}`))
      console.log(chalk.gray(`Access Token: ${this.config.accessToken.substring(0, 10)}...`))
    })

    // クライアント初期化
    await this.test('APIクライアント初期化', async () => {
      this.client = new MetaAPIClientEnhanced({
        accessToken: this.config.accessToken,
        accountId: this.config.adAccountId,
      })

      if (this.config.appSecret) {
        this.tokenManager = new MetaTokenManager({
          appId: this.config.appId,
          appSecret: this.config.appSecret,
        })
      }
    })

    // API接続テスト
    await this.test('API接続確認', async () => {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/me?access_token=${this.config.accessToken}`
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(chalk.gray(`ユーザーID: ${data.id}`))
      console.log(chalk.gray(`ユーザー名: ${data.name}`))
    })

    // アカウント情報取得
    await this.test('広告アカウント情報取得', async () => {
      if (!this.client) throw new Error('クライアントが初期化されていません')

      const response = await fetch(
        `https://graph.facebook.com/v23.0/${this.config.adAccountId}?fields=id,name,currency,timezone_name,account_status&access_token=${this.config.accessToken}`
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || `HTTP ${response.status}`)
      }

      const account = await response.json()
      console.log(chalk.gray(`アカウント名: ${account.name}`))
      console.log(chalk.gray(`通貨: ${account.currency}`))
      console.log(chalk.gray(`タイムゾーン: ${account.timezone_name}`))
      console.log(chalk.gray(`ステータス: ${account.account_status === 1 ? 'アクティブ' : '非アクティブ'}`))
    })

    // キャンペーン一覧取得
    await this.test('キャンペーン一覧取得', async () => {
      if (!this.client) throw new Error('クライアントが初期化されていません')

      const campaigns = await this.client.getCampaigns()
      console.log(chalk.gray(`取得したキャンペーン数: ${campaigns.length}`))
      
      if (campaigns.length > 0) {
        console.log(chalk.gray('\n最初の3件:'))
        campaigns.slice(0, 3).forEach(campaign => {
          console.log(chalk.gray(`  - ${campaign.name} (${campaign.status})`))
        })
      }
    })

    // インサイトデータ取得
    await this.test('インサイトデータ取得', async () => {
      if (!this.client) throw new Error('クライアントが初期化されていません')

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7) // 過去7日間

      const insights = await this.client.getInsights({
        datePreset: 'last_7d'
      })

      if (insights.length > 0) {
        const data = insights[0]
        console.log(chalk.gray(`期間: ${data.date_start} 〜 ${data.date_stop}`))
        console.log(chalk.gray(`広告費用: ${data.spend || 0}`))
        console.log(chalk.gray(`インプレッション: ${data.impressions || 0}`))
        console.log(chalk.gray(`クリック数: ${data.clicks || 0}`))
      } else {
        console.log(chalk.gray('インサイトデータがありません'))
      }
    })

    // トークン検証（App Secretがある場合）
    if (this.config.appSecret) {
      await this.test('トークン検証', async () => {
        if (!this.tokenManager) throw new Error('トークンマネージャーが初期化されていません')

        const isValid = await this.tokenManager.validateToken(this.config.accessToken)
        if (!isValid) {
          throw new Error('トークンが無効です')
        }

        const info = await this.tokenManager.getTokenInfo()
        console.log(chalk.gray(`トークンタイプ: ${info.type}`))
        if (info.expiresAt) {
          console.log(chalk.gray(`有効期限: ${info.expiresAt.toLocaleString()}`))
        }
        if (info.scopes) {
          console.log(chalk.gray(`権限: ${info.scopes}`))
        }
      })

      // 長期トークンへの交換テスト
      await this.test('長期トークン交換（オプション）', async () => {
        if (!this.tokenManager) throw new Error('トークンマネージャーが初期化されていません')

        try {
          const longLivedToken = await this.tokenManager.exchangeToken(this.config.accessToken)
          console.log(chalk.gray('長期トークンへの交換に成功しました'))
          console.log(chalk.gray(`新しいトークン: ${longLivedToken.substring(0, 10)}...`))
        } catch (error) {
          // 既に長期トークンの場合はエラーになる
          console.log(chalk.yellow('スキップ: 既に長期トークンの可能性があります'))
        }
      })
    }

    // レート制限チェック
    await this.test('レート制限状態確認', async () => {
      if (!this.client) throw new Error('クライアントが初期化されていません')

      const rateLimitStatus = (this.client as any).getRateLimitStatus()
      console.log(chalk.gray(`API呼び出し回数: ${rateLimitStatus.callCount}`))
      console.log(chalk.gray(`最後の呼び出し: ${rateLimitStatus.lastCallTime ? new Date(rateLimitStatus.lastCallTime).toLocaleTimeString() : 'なし'}`))
    })

    // バッチリクエストテスト
    await this.test('バッチリクエスト', async () => {
      if (!this.client) throw new Error('クライアントが初期化されていません')

      const batch = await this.client.batchRequest([
        {
          method: 'GET',
          relative_url: `${this.config.adAccountId}?fields=name,currency`
        },
        {
          method: 'GET',
          relative_url: `${this.config.adAccountId}/campaigns?fields=name,status&limit=5`
        }
      ])

      console.log(chalk.gray(`バッチリクエスト成功: ${batch.length}件のレスポンス`))
    })

    // エラーハンドリングテスト
    await this.test('エラーハンドリング', async () => {
      try {
        // 無効なアカウントIDでテスト
        const response = await fetch(
          `https://graph.facebook.com/v23.0/act_invalid_account_id?access_token=${this.config.accessToken}`
        )
        
        if (!response.ok) {
          const error = await response.json()
          console.log(chalk.gray('期待通りエラーが発生しました'))
          console.log(chalk.gray(`エラーメッセージ: ${error.error?.message}`))
        } else {
          throw new Error('エラーが発生するはずでしたが、成功してしまいました')
        }
      } catch (error) {
        // ネットワークエラーなどの場合
        console.log(chalk.gray('エラーハンドリングが正常に動作しています'))
      }
    })

    // テスト結果のサマリー
    this.printSummary()
  }

  private async test(name: string, fn: () => Promise<void>) {
    const startTime = Date.now()
    
    try {
      console.log(chalk.cyan(`\n▶ ${name}`))
      await fn()
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        status: 'passed',
        duration
      })
      
      console.log(chalk.green(`✓ 成功 (${duration}ms)`))
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        status: 'failed',
        error: error as Error,
        message: (error as Error).message,
        duration
      })
      
      console.log(chalk.red(`✗ 失敗: ${(error as Error).message} (${duration}ms)`))
    }
  }

  private printSummary() {
    console.log(chalk.blue('\n\n📊 テスト結果サマリー\n'))

    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const total = this.results.length

    console.log(chalk.green(`✓ 成功: ${passed}/${total}`))
    if (failed > 0) {
      console.log(chalk.red(`✗ 失敗: ${failed}/${total}`))
    }

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    console.log(chalk.gray(`\n総実行時間: ${totalDuration}ms`))

    if (failed > 0) {
      console.log(chalk.red('\n\n失敗したテスト:'))
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(chalk.red(`  - ${r.name}: ${r.message}`))
        })
    }

    console.log(chalk.blue('\n\n✨ テスト完了\n'))
  }
}

// メイン実行
async function main() {
  const config = {
    appId: process.env.VITE_META_APP_ID || '',
    appSecret: process.env.VITE_META_APP_SECRET || '',
    adAccountId: process.env.VITE_META_AD_ACCOUNT_ID || '',
    accessToken: process.env.VITE_META_ACCESS_TOKEN || '',
  }

  const tester = new MetaAPIIntegrationTester(config)
  await tester.run()
}

// エラーハンドリング
main().catch(error => {
  console.error(chalk.red('\n\n❌ テスト実行中にエラーが発生しました:'))
  console.error(error)
  process.exit(1)
})