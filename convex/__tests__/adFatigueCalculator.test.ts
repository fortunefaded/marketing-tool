import { describe, test, expect } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'

describe('AdFatigueCalculator Functions', () => {
  test('calculateFatigueFromInsights should be callable', async () => {
    const t = convexTest(schema)

    // テストデータを作成
    await t.run(async (ctx) => {
      // 複数日のインサイトデータを作成
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']
      for (const date of dates) {
        await ctx.db.insert('metaInsights', {
          accountId: 'test-account',
          ad_id: 'test-ad-123',
          ad_name: 'Test Ad',
          campaign_id: 'test-campaign',
          campaign_name: 'Test Campaign',
          creative_id: 'test-creative',
          creative_type: 'VIDEO',
          date_start: date,
          impressions: 1000,
          clicks: 50,
          spend: 100,
          reach: 800,
          frequency: 1.25,
          ctr: 5.0,
          cpm: 100,
          conversions: 5,
          video_views: 500,
        })
      }
    })

    // 関数を呼び出す
    const result = await t.query(api.adFatigueCalculator.calculateFatigueFromInsights, {
      accountId: 'test-account',
      adId: 'test-ad-123',
      lookbackDays: 5,
    })

    // 結果を検証
    expect(result).not.toBeNull()
    expect(result?.adId).toBe('test-ad-123')
    expect(result?.metrics).toBeDefined()
    expect(result?.fatigueScore).toBeDefined()
    expect(result?.fatigueScore.total).toBeGreaterThanOrEqual(0)
    expect(result?.fatigueScore.total).toBeLessThanOrEqual(100)
  })

  test('calculateFatigueFromInsights should return null for missing data', async () => {
    const t = convexTest(schema)

    const result = await t.query(api.adFatigueCalculator.calculateFatigueFromInsights, {
      accountId: 'test-account',
      adId: 'non-existent-ad',
      lookbackDays: 21,
    })

    expect(result).toBeNull()
  })

  test('saveFatigueAnalysis should save analysis results', async () => {
    const t = convexTest(schema)

    const analysis = {
      adName: 'Test Ad',
      campaignId: 'test-campaign',
      campaignName: 'Test Campaign',
      creativeId: 'test-creative',
      creativeType: 'VIDEO',
      metrics: {
        frequency: 3.2,
        firstTimeRatio: 0.35,
        ctrDeclineRate: 0.28,
        cpmIncreaseRate: 0.22,
        reach: 50000,
        impressions: 160000,
        ctr: 1.2,
        cpm: 1200,
        conversions: 100,
        daysActive: 5,
      },
      fatigueScore: {
        total: 65,
        breakdown: {
          audience: 70,
          creative: 60,
          algorithm: 65,
        },
        primaryIssue: 'audience' as const,
        status: 'warning' as const,
      },
      dataRange: {
        start: '2024-01-01',
        end: '2024-01-05',
      },
      analyzedAt: new Date().toISOString(),
    }

    await t.mutation(api.adFatigueCalculator.saveFatigueAnalysis, {
      accountId: 'test-account',
      adId: 'test-ad-123',
      analysis,
    })

    // 保存されたデータを確認
    const saved = await t.query(api.adFatigueCalculator.getSavedFatigueAnalysis, {
      accountId: 'test-account',
      adId: 'test-ad-123',
    })

    expect(saved).not.toBeNull()
    expect(saved?.adId).toBe('test-ad-123')
    expect(saved?.fatigueScore.total).toBe(65)
  })
})
