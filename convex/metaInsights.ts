import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Meta Insightsデータのスキーマ定義
const metaInsightSchema = v.object({
  // 基本情報
  accountId: v.string(),
  date_start: v.string(),
  date_stop: v.string(),

  // キャンペーン情報
  campaign_id: v.optional(v.string()),
  campaign_name: v.optional(v.string()),

  // 広告セット情報
  adset_id: v.optional(v.string()),
  adset_name: v.optional(v.string()),

  // 広告情報
  ad_id: v.optional(v.string()),
  ad_name: v.optional(v.string()),

  // クリエイティブ情報
  creative_id: v.optional(v.string()),
  creative_name: v.optional(v.string()),
  creative_type: v.optional(v.string()),
  thumbnail_url: v.optional(v.string()),
  video_url: v.optional(v.string()),
  carousel_cards: v.optional(
    v.array(
      v.object({
        image_url: v.optional(v.string()),
        video_url: v.optional(v.string()),
        link: v.optional(v.string()),
      })
    )
  ),

  // パフォーマンスメトリクス
  impressions: v.optional(v.number()),
  clicks: v.optional(v.number()),
  spend: v.optional(v.number()),
  reach: v.optional(v.number()),
  frequency: v.optional(v.number()),
  cpc: v.optional(v.number()),
  cpm: v.optional(v.number()),
  ctr: v.optional(v.number()),

  // コンバージョンメトリクス
  conversions: v.optional(v.number()),
  conversion_rate: v.optional(v.number()),
  cost_per_conversion: v.optional(v.number()),

  // エンゲージメントメトリクス
  engagement_rate: v.optional(v.number()),
  video_views: v.optional(v.number()),
  video_view_rate: v.optional(v.number()),

  // その他のフィールド（互換性のため）
  dateStart: v.optional(v.string()),
  dateStop: v.optional(v.string()),
  campaignId: v.optional(v.string()),
  campaignName: v.optional(v.string()),
  adId: v.optional(v.string()),
  adName: v.optional(v.string()),
})

// Insightsデータの一括インポート
export const importInsights = mutation({
  args: {
    insights: v.array(metaInsightSchema),
    strategy: v.union(v.literal('replace'), v.literal('merge')),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    let imported = 0
    let updated = 0
    let skipped = 0

    for (const insight of args.insights) {
      // ユニークキーで既存データを検索
      // const uniqueKey = `${insight.date_start}_${insight.campaign_id || 'account'}_${insight.ad_id || ''}`

      const existing = await ctx.db
        .query('metaInsights')
        .filter((q) =>
          q.and(
            q.eq(q.field('accountId'), insight.accountId),
            q.eq(q.field('dateStart'), insight.date_start || null),
            q.eq(q.field('campaignId'), insight.campaign_id || null),
            q.eq(q.field('adId'), insight.ad_id || null)
          )
        )
        .first()

      if (existing) {
        if (args.strategy === 'replace') {
          // 既存データを更新
          const updateData = {
            ...insight,
            // フィールド名を正規化
            dateStart: insight.date_start,
            dateStop: insight.date_stop,
            campaignId: insight.campaign_id,
            campaignName: insight.campaign_name,
            adId: insight.ad_id,
            adName: insight.ad_name,
            updatedAt: now,
          }
          await ctx.db.patch(existing._id, updateData)
          updated++
        } else if (args.strategy === 'merge') {
          // クリエイティブ情報を保持しながらマージ
          const merged = {
            ...insight,
            // フィールド名を正規化
            dateStart: insight.date_start,
            dateStop: insight.date_stop,
            campaignId: insight.campaign_id,
            campaignName: insight.campaign_name,
            adId: insight.ad_id,
            adName: insight.ad_name,
            updatedAt: now,
          }

          // 新しいデータにクリエイティブ情報がない場合、既存のものを保持
          if (!insight.creative_type && existing.creative_type) {
            merged.creative_type = existing.creative_type
            merged.creative_id = existing.creative_id
            merged.creative_name = existing.creative_name
            merged.thumbnail_url = existing.thumbnail_url
            merged.video_url = existing.video_url
            merged.carousel_cards = existing.carousel_cards
          }

          await ctx.db.patch(existing._id, merged)
          updated++
        } else {
          skipped++
        }
      } else {
        // 新規データを挿入
        const insertData = {
          ...insight,
          // insightIdを生成
          insightId: `${insight.accountId}_${insight.date_start}_${insight.ad_id || 'campaign'}`,
          // フィールド名を正規化
          dateStart: insight.date_start,
          dateStop: insight.date_stop,
          campaignId: insight.campaign_id,
          campaignName: insight.campaign_name,
          adId: insight.ad_id,
          adName: insight.ad_name,
          impressions: insight.impressions || 0,
          createdAt: now,
          updatedAt: now,
        }
        await ctx.db.insert('metaInsights', insertData)
        imported++
      }
    }

    return {
      imported,
      updated,
      skipped,
      total: imported + updated + skipped,
    }
  },
})

// Insightsデータの取得（ページネーション付き）
export const getInsights = query({
  args: {
    accountId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    adId: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 1000, 5000)

    let query = ctx.db
      .query('metaInsights')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))

    // 日付フィルタリング
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field('dateStart'), args.startDate!))
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field('dateStart'), args.endDate!))
    }

    // キャンペーン/広告フィルタリング
    if (args.campaignId) {
      query = query.filter((q) => q.eq(q.field('campaignId'), args.campaignId))
    }
    if (args.adId) {
      query = query.filter((q) => q.eq(q.field('adId'), args.adId))
    }

    // カーソルベースのページネーション
    if (args.cursor) {
      const cursorDoc = await ctx.db.get(args.cursor as any)
      if (cursorDoc && 'dateStart' in cursorDoc) {
        query = query.filter((q) => q.lt(q.field('dateStart'), (cursorDoc as any).dateStart))
      }
    }

    const items = await query.take(limit + 1)
    const hasMore = items.length > limit
    const results = hasMore ? items.slice(0, -1) : items
    const nextCursor = hasMore ? items[items.length - 2]._id : null

    return {
      items: results,
      nextCursor,
      hasMore,
    }
  },
})

// 統計情報の取得（効率的な集計）
export const getInsightsStats = query({
  args: {
    accountId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // サンプリングで統計を取得
    const sampleSize = 5000
    let query = ctx.db
      .query('metaInsights')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))

    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field('dateStart'), args.startDate!))
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field('dateStart'), args.endDate!))
    }

    const sample = await query.take(sampleSize)

    // 集計
    let totalSpend = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalConversions = 0
    const campaigns = new Set<string>()
    const ads = new Set<string>()

    for (const item of sample) {
      totalSpend += item.spend || 0
      totalImpressions += item.impressions || 0
      totalClicks += item.clicks || 0
      totalConversions += item.conversions || 0

      if (item.campaignId) campaigns.add(item.campaignId)
      if (item.adId) ads.add(item.adId)
    }

    // 全体数の推定
    const estimatedTotal = sample.length < sampleSize ? sample.length : sample.length * 2
    const multiplier = estimatedTotal / sample.length

    return {
      totalSpend: totalSpend * multiplier,
      totalImpressions: Math.round(totalImpressions * multiplier),
      totalClicks: Math.round(totalClicks * multiplier),
      totalConversions: Math.round(totalConversions * multiplier),
      avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
      avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      totalRecords: estimatedTotal,
      uniqueCampaigns: campaigns.size,
      uniqueAds: ads.size,
      dateRange: {
        start: args.startDate || sample[0]?.dateStart,
        end: args.endDate || sample[sample.length - 1]?.dateStart,
      },
      isEstimate: sample.length >= sampleSize,
    }
  },
})

// 同期ステータスの保存
export const saveSyncStatus = mutation({
  args: {
    accountId: v.string(),
    lastFullSync: v.optional(v.string()),
    lastIncrementalSync: v.optional(v.string()),
    totalRecords: v.optional(v.number()),
    earliestDate: v.optional(v.string()),
    latestDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('metaSyncStatus')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    const data = {
      accountId: args.accountId,
      lastFullSync: args.lastFullSync || existing?.lastFullSync || undefined,
      lastIncrementalSync: args.lastIncrementalSync || existing?.lastIncrementalSync || undefined,
      totalRecords: args.totalRecords ?? existing?.totalRecords ?? 0,
      earliestDate: args.earliestDate || existing?.earliestDate || undefined,
      latestDate: args.latestDate || existing?.latestDate || undefined,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      const { accountId: _accountId, ...updateData } = data
      void _accountId // accountIdは除外して更新（重複を避けるため）
      await ctx.db.patch(existing._id, updateData)
    } else {
      await ctx.db.insert('metaSyncStatus', data)
    }

    return { success: true }
  },
})

// 同期ステータスの取得
export const getSyncStatus = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('metaSyncStatus')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()
  },
})

// アカウントのデータをクリア
export const clearAccountData = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    // Insightsデータを削除
    const insights = await ctx.db
      .query('metaInsights')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .collect()

    for (const insight of insights) {
      await ctx.db.delete(insight._id)
    }

    // 同期ステータスを削除
    const syncStatus = await ctx.db
      .query('metaSyncStatus')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    if (syncStatus) {
      await ctx.db.delete(syncStatus._id)
    }

    return { deleted: insights.length }
  },
})

// 日付範囲で欠損期間を検出
export const findMissingDateRanges = query({
  args: {
    accountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // 既存のデータの日付を取得（最大1000件）
    const existingData = await ctx.db
      .query('metaInsights')
      .filter((q) =>
        q.and(
          q.eq(q.field('accountId'), args.accountId),
          q.gte(q.field('dateStart'), args.startDate),
          q.lte(q.field('dateStart'), args.endDate)
        )
      )
      .take(1000)

    const existingDates = new Set(existingData.map((d) => d.dateStart))

    // 月単位で欠損をチェック
    const missing: Array<{ start: string; end: string }> = []
    const start = new Date(args.startDate)
    const end = new Date(args.endDate)

    let currentStart = new Date(start)

    while (currentStart < end) {
      const currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0)

      if (currentEnd > end) {
        currentEnd.setTime(end.getTime())
      }

      // この月にデータがあるかチェック
      const monthStart = currentStart.toISOString().split('T')[0]
      const monthEnd = currentEnd.toISOString().split('T')[0]

      let hasData = false
      for (const date of existingDates) {
        if (date && date >= monthStart && date <= monthEnd) {
          hasData = true
          break
        }
      }

      if (!hasData) {
        missing.push({
          start: monthStart,
          end: monthEnd,
        })
      }

      currentStart.setMonth(currentStart.getMonth() + 1)
      currentStart.setDate(1)
    }

    return missing
  },
})
