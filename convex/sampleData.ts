import { v } from 'convex/values'
import { mutation } from './_generated/server'

// サンプルデータの挿入
export const insertSampleAdData = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    const today = new Date()
    
    // 過去30日分のサンプルデータを生成
    const sampleAds = [
      {
        ad_id: 'sample_ad_001',
        ad_name: 'Instagram Reels - 春のキャンペーン',
        campaign_id: 'sample_campaign_001',
        campaign_name: '2024春季プロモーション',
        creative_type: 'VIDEO',
      },
      {
        ad_id: 'sample_ad_002',
        ad_name: 'ストーリーズ広告 - 新商品紹介',
        campaign_id: 'sample_campaign_002',
        campaign_name: '新商品ローンチキャンペーン',
        creative_type: 'IMAGE',
      },
      {
        ad_id: 'sample_ad_003',
        ad_name: 'フィード広告 - 週末セール',
        campaign_id: 'sample_campaign_003',
        campaign_name: 'ウィークエンドセール',
        creative_type: 'CAROUSEL',
      },
    ]
    
    let imported = 0
    
    for (const ad of sampleAds) {
      // 各広告について30日分のデータを生成
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // パフォーマンスの自然な変動を生成
        const dayFactor = 1 - (i * 0.02) // 時間経過による疲労
        const randomFactor = 0.8 + Math.random() * 0.4 // ランダムな変動
        
        const baseImpressions = 10000 + Math.floor(Math.random() * 5000)
        const baseCTR = (2.0 - i * 0.05) * randomFactor // CTRは徐々に低下
        const baseCPM = 500 + i * 10 // CPMは徐々に上昇
        const frequency = 1.5 + i * 0.1 // フリークエンシーは徐々に上昇
        
        const insight = {
          accountId: args.accountId,
          date_start: dateStr,
          date_stop: dateStr,
          ad_id: ad.ad_id,
          ad_name: ad.ad_name,
          campaign_id: ad.campaign_id,
          campaign_name: ad.campaign_name,
          creative_type: ad.creative_type,
          
          // メトリクス
          impressions: Math.floor(baseImpressions * dayFactor),
          reach: Math.floor(baseImpressions * dayFactor / frequency),
          frequency: frequency,
          clicks: Math.floor(baseImpressions * dayFactor * (baseCTR / 100)),
          spend: Math.floor(baseImpressions * baseCPM / 1000),
          ctr: baseCTR,
          cpm: baseCPM,
          cpc: baseCPM / (baseCTR * 10),
          
          // Instagram特有のメトリクス
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          saves: Math.floor(Math.random() * 200),
          shares: Math.floor(Math.random() * 50),
          
          // ビデオメトリクス（VIDEO広告の場合）
          video_play_actions: ad.creative_type === 'VIDEO' ? Math.floor(baseImpressions * 0.7) : undefined,
          video_avg_play_time: ad.creative_type === 'VIDEO' ? 8.5 - i * 0.1 : undefined,
          
          importedAt: now,
          updatedAt: now,
        }
        
        // 既存のデータをチェック
        const existing = await ctx.db
          .query('metaInsights')
          .withIndex('by_ad')
          .filter((q) =>
            q.and(
              q.eq(q.field('accountId'), args.accountId),
              q.eq(q.field('ad_id'), ad.ad_id),
              q.eq(q.field('date_start'), dateStr)
            )
          )
          .first()
        
        if (!existing) {
          await ctx.db.insert('metaInsights', insight)
          imported++
        }
      }
    }
    
    return {
      imported,
      message: `${imported}件のサンプルデータを挿入しました。`
    }
  },
})