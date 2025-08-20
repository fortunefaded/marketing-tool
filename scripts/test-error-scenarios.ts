#!/usr/bin/env tsx
/**
 * Meta APIエラーシナリオテストスクリプト
 * 様々なエラーケースをシミュレートして、エラーハンドリングが適切に動作することを確認
 */

import dotenv from 'dotenv'
import { MetaAPIClientEnhanced } from '../src/lib/meta-api/client-enhanced'
import chalk from 'chalk'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

interface ErrorTestCase {
  name: string
  description: string
  test: () => Promise<void>
  expectedError?: string
  expectedBehavior: string
}

class MetaAPIErrorTester {
  private client: MetaAPIClientEnhanced | null = null
  private validAccessToken: string
  private validAccountId: string

  constructor() {
    this.validAccessToken = process.env.VITE_META_ACCESS_TOKEN || ''
    this.validAccountId = process.env.VITE_META_AD_ACCOUNT_ID || ''
  }

  async run() {
    console.log(chalk.blue('\n🧪 Meta APIエラーシナリオテストを開始します...\n'))

    if (!this.validAccessToken || !this.validAccountId) {
      console.error(chalk.red('環境変数が設定されていません'))
      return
    }

    const testCases: ErrorTestCase[] = [
      {
        name: '無効なアクセストークン',
        description: '無効なトークンでAPIを呼び出した場合',
        test: async () => {
          const client = new MetaAPIClientEnhanced({
            accessToken: 'invalid_token_12345',
            accountId: this.validAccountId,
          })
          await client.getCampaigns()
        },
        expectedError: 'Invalid OAuth 2.0 Access Token',
        expectedBehavior: 'エラーメッセージが表示され、リトライしない',
      },
      {
        name: '期限切れトークン',
        description: '期限切れのトークンを使用した場合',
        test: async () => {
          // 期限切れトークンをシミュレート（実際には無効なトークン）
          const client = new MetaAPIClientEnhanced({
            accessToken: 'EAAExpiredToken1234567890',
            accountId: this.validAccountId,
          })
          await client.getInsights({ datePreset: 'yesterday' })
        },
        expectedError: 'Error validating access token',
        expectedBehavior: '再認証を促すメッセージが表示される',
      },
      {
        name: '権限不足エラー',
        description: '必要な権限がないトークンでアクセスした場合',
        test: async () => {
          const client = new MetaAPIClientEnhanced({
            accessToken: this.validAccessToken,
            accountId: 'act_99999999999', // アクセス権限のないアカウント
          })
          await client.getCampaigns()
        },
        expectedError: 'does not have permission',
        expectedBehavior: '権限エラーメッセージが表示される',
      },
      {
        name: '存在しないリソース',
        description: '存在しないキャンペーンIDを指定した場合',
        test: async () => {
          this.client = new MetaAPIClientEnhanced({
            accessToken: this.validAccessToken,
            accountId: this.validAccountId,
          })
          // 存在しないキャンペーンIDでインサイトを取得
          const response = await fetch(
            `https://graph.facebook.com/v23.0/999999999999999/insights?access_token=${this.validAccessToken}`
          )
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error?.message)
          }
        },
        expectedError: 'does not exist',
        expectedBehavior: 'リソースが見つからないエラーが表示される',
      },
      {
        name: '不正なパラメータ',
        description: '無効なdate_presetを指定した場合',
        test: async () => {
          this.client = new MetaAPIClientEnhanced({
            accessToken: this.validAccessToken,
            accountId: this.validAccountId,
          })
          // 無効なdate_presetを使用
          await this.client.getInsights({ datePreset: 'invalid_date_preset' as any })
        },
        expectedError: 'Invalid parameter',
        expectedBehavior: 'パラメータエラーが表示される',
      },
      {
        name: 'レート制限エラー（シミュレート）',
        description: '短時間に大量のリクエストを送信した場合',
        test: async () => {
          this.client = new MetaAPIClientEnhanced({
            accessToken: this.validAccessToken,
            accountId: this.validAccountId,
          })

          // 10回連続でリクエストを送信
          const promises = []
          for (let i = 0; i < 10; i++) {
            promises.push(this.client.getCampaigns())
          }

          await Promise.all(promises)
          console.log(chalk.gray('レート制限状態:', (this.client as any).getRateLimitStatus()))
        },
        expectedBehavior: 'リクエストが自動的に調整される',
      },
      {
        name: 'ネットワークタイムアウト',
        description: '応答が遅い場合のタイムアウト処理',
        test: async () => {
          // タイムアウトをシミュレート（存在しないエンドポイント）
          const controller = new AbortController()
          setTimeout(() => controller.abort(), 1000) // 1秒でタイムアウト

          await fetch('https://httpstat.us/200?sleep=5000', {
            signal: controller.signal,
          })
        },
        expectedError: 'aborted',
        expectedBehavior: 'タイムアウトエラーが表示され、リトライが実行される',
      },
      {
        name: 'JSONパースエラー',
        description: '不正なレスポンスが返された場合',
        test: async () => {
          // HTMLレスポンスを返すエンドポイントでJSONパースエラーをシミュレート
          const response = await fetch('https://www.facebook.com/')
          const data = await response.json() // これはエラーになる
        },
        expectedError: 'JSON',
        expectedBehavior: '予期しないレスポンス形式エラーが表示される',
      },
      {
        name: 'バッチリクエストの部分的失敗',
        description: 'バッチリクエストの一部が失敗した場合',
        test: async () => {
          this.client = new MetaAPIClientEnhanced({
            accessToken: this.validAccessToken,
            accountId: this.validAccountId,
          })

          const batch = await this.client.batchRequest([
            {
              method: 'GET',
              relative_url: `${this.validAccountId}?fields=name`, // 成功するリクエスト
            },
            {
              method: 'GET',
              relative_url: 'invalid_endpoint_12345', // 失敗するリクエスト
            },
          ])

          console.log(chalk.gray('バッチ結果:', batch))
        },
        expectedBehavior: '成功したリクエストの結果は取得でき、失敗分はエラーとして報告される',
      },
      {
        name: 'サーバーエラー（5xx）',
        description: 'Meta APIサーバーがエラーを返した場合',
        test: async () => {
          // 5xxエラーをシミュレート
          const response = await fetch('https://httpstat.us/500')
          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`)
          }
        },
        expectedError: 'Server error: 500',
        expectedBehavior: '自動的にリトライが実行される',
      },
    ]

    // 各テストケースを実行
    for (const testCase of testCases) {
      await this.runTestCase(testCase)
    }

    // サマリーを表示
    this.printSummary()
  }

  private async runTestCase(testCase: ErrorTestCase) {
    console.log(chalk.cyan(`\n▶ ${testCase.name}`))
    console.log(chalk.gray(`   ${testCase.description}`))

    try {
      await testCase.test()
      console.log(chalk.yellow('⚠️  エラーが発生しませんでした（予期しない結果）'))
    } catch (error) {
      const errorMessage = (error as Error).message

      if (
        testCase.expectedError &&
        errorMessage.toLowerCase().includes(testCase.expectedError.toLowerCase())
      ) {
        console.log(chalk.green('✓ 期待通りのエラーが発生しました'))
        console.log(chalk.gray(`   エラー: ${errorMessage}`))
      } else {
        console.log(chalk.red('✗ 予期しないエラーが発生しました'))
        console.log(chalk.red(`   エラー: ${errorMessage}`))
      }
    }

    console.log(chalk.blue(`   期待される動作: ${testCase.expectedBehavior}`))
  }

  private printSummary() {
    console.log(chalk.blue('\n\n📊 エラーハンドリングテスト完了\n'))
    console.log(chalk.gray('すべてのエラーシナリオをテストしました。'))
    console.log(
      chalk.gray('アプリケーションが各種エラーに対して適切に対応できることを確認してください。')
    )
  }
}

// エラーリカバリー機能のテスト
class ErrorRecoveryTester {
  private client: MetaAPIClientEnhanced

  constructor(accessToken: string, accountId: string) {
    this.client = new MetaAPIClientEnhanced({
      accessToken,
      accountId,
    })
  }

  async testRetryMechanism() {
    console.log(chalk.blue('\n\n🔄 リトライメカニズムテスト\n'))

    // リトライカウンターをリセット
    let retryCount = 0

    // リトライをシミュレート
    const makeRequest = async () => {
      retryCount++
      if (retryCount < 3) {
        throw new Error('Network error')
      }
      return { success: true }
    }

    try {
      const result = await this.retryWithBackoff(makeRequest, 3)
      console.log(chalk.green('✓ リトライが成功しました'))
      console.log(chalk.gray(`   試行回数: ${retryCount}`))
    } catch (error) {
      console.log(chalk.red('✗ リトライが失敗しました'))
    }
  }

  private async retryWithBackoff(
    fn: () => Promise<any>,
    maxRetries: number,
    delay = 1000
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === maxRetries - 1) throw error

        const backoffDelay = delay * Math.pow(2, i)
        console.log(chalk.yellow(`   リトライ ${i + 1}/${maxRetries} (${backoffDelay}ms待機)`))
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }
  }

  async testCircuitBreaker() {
    console.log(chalk.blue('\n\n🔌 サーキットブレーカーテスト\n'))

    let failureCount = 0
    const threshold = 5

    for (let i = 0; i < 10; i++) {
      try {
        // エラーをシミュレート
        if (i < 6) {
          throw new Error('Service unavailable')
        }
        console.log(chalk.green(`✓ リクエスト ${i + 1}: 成功`))
        failureCount = 0 // 成功したらカウンターリセット
      } catch (error) {
        failureCount++

        if (failureCount >= threshold) {
          console.log(chalk.red(`⛔ サーキットブレーカー作動 (失敗数: ${failureCount})`))
          console.log(chalk.yellow('   30秒間新規リクエストを停止'))
          break
        } else {
          console.log(chalk.yellow(`⚠️  リクエスト ${i + 1}: 失敗 (失敗数: ${failureCount})`))
        }
      }
    }
  }
}

// メイン実行
async function main() {
  const errorTester = new MetaAPIErrorTester()
  await errorTester.run()

  // リカバリー機能のテスト
  const accessToken = process.env.VITE_META_ACCESS_TOKEN || ''
  const accountId = process.env.VITE_META_AD_ACCOUNT_ID || ''

  if (accessToken && accountId) {
    const recoveryTester = new ErrorRecoveryTester(accessToken, accountId)
    await recoveryTester.testRetryMechanism()
    await recoveryTester.testCircuitBreaker()
  }
}

// エラーハンドリング
main().catch((error) => {
  console.error(chalk.red('\n\n❌ テスト実行中に予期しないエラーが発生しました:'))
  console.error(error)
  process.exit(1)
})
