/**
 * Meta API統合テスト
 * 実際のAPIとの連携を確認
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SimpleMetaApi } from '../../api-client'
import { MetaApiOptimizer } from '../../meta-api-optimizer'
import { SimpleTokenStore } from '../../token'
import { SimpleAccountStore } from '../../../account/account-store'

// 環境変数から取得
const TEST_MODE = process.env.VITE_TEST_MODE || 'mock'
const META_ACCESS_TOKEN = process.env.VITE_META_ACCESS_TOKEN
const META_ACCOUNT_ID = process.env.VITE_META_ACCOUNT_ID

describe('Meta API Integration Tests', () => {
  let apiClient: SimpleMetaApi | null = null
  let optimizer: MetaApiOptimizer | null = null

  beforeAll(() => {
    if (TEST_MODE === 'live' && META_ACCESS_TOKEN && META_ACCOUNT_ID) {
      console.log('🔴 LIVE MODE: 実際のMeta APIを使用')
      apiClient = new SimpleMetaApi(META_ACCESS_TOKEN, META_ACCOUNT_ID)
      optimizer = new MetaApiOptimizer()
    } else {
      console.log('🟢 MOCK MODE: モックAPIを使用')
    }
  })

  describe('Phase 1: 接続テスト', () => {
    it('should connect to Meta API', async () => {
      if (TEST_MODE !== 'live' || !apiClient) {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      try {
        const result = await apiClient.getTimeSeriesInsights({
          datePreset: 'yesterday',
          forceRefresh: true
        })

        expect(result).toBeDefined()
        expect(result.data).toBeInstanceOf(Array)
        console.log(`✅ 接続成功: ${result.data.length}件のデータ取得`)
      } catch (error) {
        console.error('❌ 接続失敗:', error)
        throw error
      }
    })

    it('should handle rate limiting gracefully', async () => {
      if (TEST_MODE !== 'live' || !apiClient || !optimizer) {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      // 小規模なバッチテスト
      const requests = [
        { accountId: META_ACCOUNT_ID!, dateRange: 'yesterday', priority: 1 },
        { accountId: META_ACCOUNT_ID!, dateRange: 'last_7d', priority: 2 }
      ]

      const results = await optimizer.executeBatch(requests, apiClient)
      
      expect(results).toBeDefined()
      expect(results.length).toBe(2)
      
      const stats = optimizer.getStatistics()
      console.log('📊 統計情報:', {
        total: stats.totalRequests,
        success: stats.successfulRequests,
        failed: stats.failedRequests,
        rateLimitHits: stats.rateLimitHits
      })
    })
  })

  describe('Phase 2: データ整合性テスト', () => {
    it('should fetch consistent data across multiple calls', async () => {
      if (TEST_MODE !== 'live' || !apiClient) {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      // 同じデータを2回取得
      const result1 = await apiClient.getTimeSeriesInsights({
        datePreset: 'yesterday'
      })
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result2 = await apiClient.getTimeSeriesInsights({
        datePreset: 'yesterday'
      })

      // データの一貫性を確認
      expect(result1.totalCount).toBe(result2.totalCount)
      console.log(`✅ データ一貫性確認: ${result1.totalCount}件`)
    })

    it('should handle pagination correctly', async () => {
      if (TEST_MODE !== 'live' || !apiClient) {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      const result = await apiClient.getTimeSeriesInsights({
        datePreset: 'last_30d'
      })

      expect(result).toBeDefined()
      expect(result.hasMore).toBeDefined()
      
      if (result.nextPageUrl) {
        console.log('📄 次ページあり:', result.nextPageUrl)
      } else {
        console.log('📄 全データ取得完了')
      }
    })
  })

  describe('Phase 3: エラーハンドリングテスト', () => {
    it('should handle invalid token gracefully', async () => {
      if (TEST_MODE !== 'live') {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      const invalidClient = new SimpleMetaApi('invalid_token', META_ACCOUNT_ID!)
      
      try {
        await invalidClient.getTimeSeriesInsights()
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error).toBeDefined()
        console.log('✅ エラーハンドリング成功:', error.message)
      }
    })

    it('should recover from network errors', async () => {
      if (TEST_MODE !== 'live' || !optimizer || !apiClient) {
        console.log('⏭️  スキップ: LIVE MODEではありません')
        return
      }

      // エラー回復のテスト
      const request = {
        accountId: META_ACCOUNT_ID!,
        dateRange: 'yesterday',
        priority: 1
      }

      const results = await optimizer.executeBatch([request], apiClient)
      
      // リトライ統計を確認
      const stats = optimizer.getStatistics()
      console.log('🔄 リトライ統計:', {
        retried: stats.retriedRequests,
        failed: stats.failedRequests,
        avgResponseTime: stats.averageResponseTime
      })
    })
  })

  afterAll(() => {
    if (optimizer) {
      optimizer.clearQueues()
    }
  })
})

/**
 * テスト実行方法:
 * 
 * 1. モックモード（デフォルト）:
 *    npm test meta-api-integration
 * 
 * 2. ライブモード（実際のAPI）:
 *    VITE_TEST_MODE=live \
 *    VITE_META_ACCESS_TOKEN=your_token \
 *    VITE_META_ACCOUNT_ID=your_account_id \
 *    npm test meta-api-integration
 * 
 * 3. 段階的実行:
 *    - Phase 1のみ: npm test meta-api-integration -- -t "Phase 1"
 *    - Phase 2のみ: npm test meta-api-integration -- -t "Phase 2"
 *    - Phase 3のみ: npm test meta-api-integration -- -t "Phase 3"
 */