import { v } from 'convex/values'
import { query } from './_generated/server'

// 日別サマリーを取得
export const getDailySummaries = query({
  args: {
    accountId: v.string(),
    startDate: v.string(), // YYYY-MM-DD形式
    endDate: v.string(), // YYYY-MM-DD形式
  },
  handler: async (ctx, args) => {
    console.log(`📊 日別サマリー取得: ${args.startDate} ~ ${args.endDate}`)

    // ダミーデータを返す（Meta APIからの取得は後で実装）
    const days = []
    const start = new Date(args.startDate)
    const end = new Date(args.endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]

      // ランダムなデータを生成（実際にはMeta APIから取得）
      days.push({
        date: dateStr,
        impressions: Math.floor(Math.random() * 50000) + 100000,
        clicks: Math.floor(Math.random() * 2000) + 1000,
        spend: Math.floor(Math.random() * 50000) + 10000,
        conversions: Math.floor(Math.random() * 100) + 20,
        ctr: Math.random() * 2 + 0.5,
        cpc: Math.floor(Math.random() * 50) + 100,
        cpa: Math.floor(Math.random() * 5000) + 3000,
        reach: Math.floor(Math.random() * 30000) + 50000,
      })
    }

    return {
      days,
      summary: {
        totalImpressions: days.reduce((sum, d) => sum + d.impressions, 0),
        totalClicks: days.reduce((sum, d) => sum + d.clicks, 0),
        totalSpend: days.reduce((sum, d) => sum + d.spend, 0),
        totalConversions: days.reduce((sum, d) => sum + d.conversions, 0),
        avgCtr: days.reduce((sum, d) => sum + d.ctr, 0) / days.length,
        avgCpc: days.reduce((sum, d) => sum + d.cpc, 0) / days.length,
        avgCpa: days.reduce((sum, d) => sum + d.cpa, 0) / days.length,
        totalReach: days.reduce((sum, d) => sum + d.reach, 0),
      }
    }
  },
})