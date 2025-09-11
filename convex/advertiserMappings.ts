import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// マッピング一覧を取得
export const getMappings = query({
  handler: async (ctx) => {
    const mappings = await ctx.db.query('advertiserMappings').collect()
    return mappings.sort((a, b) => a.ecforceAdvertiser.localeCompare(b.ecforceAdvertiser))
  },
})

// Metaアカウントに対応するECForce広告主を取得
export const getMappingByMetaAccount = query({
  args: {
    metaAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('advertiserMappings')
      .withIndex('by_meta_account', (q) => q.eq('metaAccountId', args.metaAccountId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()
  },
})

// ECForce広告主に対応するMetaアカウントを取得
export const getMappingByAdvertiser = query({
  args: {
    ecforceAdvertiser: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('advertiserMappings')
      .withIndex('by_advertiser', (q) => q.eq('ecforceAdvertiser', args.ecforceAdvertiser))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()
  },
})

// マッピングを作成または更新
export const upsertMapping = mutation({
  args: {
    metaAccountId: v.string(),
    ecforceAdvertiser: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 既存のマッピングを確認
    const existing = await ctx.db
      .query('advertiserMappings')
      .withIndex('by_meta_account', (q) => q.eq('metaAccountId', args.metaAccountId))
      .first()

    const now = Date.now()

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ecforceAdvertiser: args.ecforceAdvertiser,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      })
      return { action: 'updated', id: existing._id }
    } else {
      // 新規作成
      const id = await ctx.db.insert('advertiserMappings', {
        metaAccountId: args.metaAccountId,
        ecforceAdvertiser: args.ecforceAdvertiser,
        isActive: args.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      return { action: 'created', id }
    }
  },
})

// マッピングを削除
export const deleteMapping = mutation({
  args: {
    id: v.id('advertiserMappings'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})

// マッピングの有効/無効を切り替え
export const toggleMapping = mutation({
  args: {
    id: v.id('advertiserMappings'),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db.get(args.id)
    if (!mapping) {
      throw new Error('マッピングが見つかりません')
    }

    await ctx.db.patch(args.id, {
      isActive: !mapping.isActive,
      updatedAt: Date.now(),
    })

    return { isActive: !mapping.isActive }
  },
})

// 利用可能なMetaアカウント一覧を取得
export const getAvailableMetaAccounts = query({
  handler: async (ctx) => {
    // metaAccountsテーブルから全Metaアカウントを取得（有効/無効問わず）
    const accounts = await ctx.db.query('metaAccounts').collect()

    console.log('取得したMetaアカウント数:', accounts.length)
    console.log('Metaアカウントの詳細:', JSON.stringify(accounts, null, 2))

    // 既にマッピング済みのアカウントIDを取得
    const mappedAccounts = await ctx.db.query('advertiserMappings').collect()
    const activeMapppings = new Map(
      mappedAccounts.filter((m) => m.isActive).map((m) => [m.metaAccountId, m])
    )

    // すべてのアカウントを返す（マッピング状態付き）
    const result = accounts
      .filter((account) => account.accountId) // accountIdが存在するもののみ
      .map((account) => ({
        accountId: account.accountId,
        accountName: account.accountName || account.name || account.accountId,
        isMapped: activeMapppings.has(account.accountId),
        isAccountActive: account.isActive ?? false,
      }))

    console.log('最終的に返すデータ:', JSON.stringify(result, null, 2))
    return result
  },
})

// MetaアカウントIDから対応するECForceデータを取得
export const getECForceDataForMetaAccount = query({
  args: {
    metaAccountId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // MetaアカウントIDから広告主を取得
    const mapping = await ctx.db
      .query('advertiserMappings')
      .withIndex('by_meta_account', (q) => q.eq('metaAccountId', args.metaAccountId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (!mapping) {
      console.log(`マッピングが見つかりません: ${args.metaAccountId}`)
      return []
    }

    // 広告主名でECForceデータを取得
    const advertiserNormalized = mapping.ecforceAdvertiser.toLowerCase().replace(/\s+/g, '')
    const ecforceData = await ctx.db
      .query('ecforcePerformance')
      .withIndex('by_advertiser', (q) => q.eq('advertiserNormalized', advertiserNormalized))
      .collect()

    // 日付範囲でフィルタリング
    const filtered = ecforceData.filter((record) => {
      const recordDate = record.dataDate || record.date
      if (!recordDate) return false
      return recordDate >= args.startDate && recordDate <= args.endDate
    })

    console.log(`ECForceデータ取得: ${mapping.ecforceAdvertiser} - ${filtered.length}件`)

    return filtered.map((record) => ({
      date: record.dataDate || record.date,
      cvOrder: record.cvOrder, // CV（受注）
      cvPayment: record.cvPayment, // CV（決済）
      cvrOrder: record.cvrOrder, // CVR（受注）
      cvrPayment: record.cvrPayment, // CVR（決済）
      orderAmount: record.orderAmount, // 受注金額
      salesAmount: record.salesAmount, // 売上金額
      cost: record.cost, // コスト
      realCPA: record.realCPA, // 実質CPA
      roas: record.roas, // ROAS
    }))
  },
})

// ECForce広告主一覧を取得（マッピング状態付き）
export const getAdvertisersWithMapping = query({
  handler: async (ctx) => {
    // ECForceから広告主一覧を取得
    const ecforceData = await ctx.db.query('ecforcePerformance').collect()
    const advertisers = [...new Set(ecforceData.map((record) => record.advertiser))]

    // マッピング情報を取得
    const mappings = await ctx.db.query('advertiserMappings').collect()
    const mappingsByAdvertiser = new Map(mappings.map((m) => [m.ecforceAdvertiser, m]))

    // 広告主とマッピング情報を結合
    return advertisers
      .map((advertiser) => {
        const mapping = mappingsByAdvertiser.get(advertiser)
        return {
          advertiser,
          metaAccountId: mapping?.metaAccountId,
          isActive: mapping?.isActive ?? false,
          mappingId: mapping?._id,
        }
      })
      .sort((a, b) => a.advertiser.localeCompare(b.advertiser))
  },
})
