import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

// 期間レポートを保存（シンプル版）
export const saveSnapshot = mutation({
  args: {
    name: v.string(),
    startIndex: v.number(),
    endIndex: v.number(),
    startDate: v.string(),
    endDate: v.string(),
    originalDateRange: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('📊 期間レポートを保存中...', args.name)

    const snapshot = await ctx.db.insert('kpiSnapshots', {
      ...args,
      createdAt: Date.now(),
    })

    console.log('✅ 期間レポート保存完了:', snapshot)
    return snapshot
  },
})

// スナップショット一覧を取得
export const listSnapshots = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log('📋 スナップショット一覧を取得中...')

    const query = ctx.db.query('kpiSnapshots')
      .withIndex('by_createdAt')
      .order('desc')

    const snapshots = await query.take(args.limit || 20)

    console.log(`✅ ${snapshots.length}件のスナップショットを取得`)
    return snapshots
  },
})

// 特定のスナップショットを取得
export const getSnapshot = query({
  args: {
    id: v.id('kpiSnapshots'),
  },
  handler: async (ctx, args) => {
    console.log('🔍 スナップショットを取得中:', args.id)

    const snapshot = await ctx.db.get(args.id)

    if (!snapshot) {
      throw new Error('スナップショットが見つかりません')
    }

    return snapshot
  },
})

// スナップショットを削除
export const deleteSnapshot = mutation({
  args: {
    id: v.id('kpiSnapshots'),
  },
  handler: async (ctx, args) => {
    console.log('🗑️ スナップショットを削除中:', args.id)

    await ctx.db.delete(args.id)

    console.log('✅ スナップショット削除完了')
    return { success: true }
  },
})

// スナップショットをお気に入りに設定/解除（現在は未実装）
// export const toggleFavorite = mutation({
//   args: {
//     id: v.id('kpiSnapshots'),
//   },
//   handler: async (ctx, args) => {
//     // お気に入り機能は後で実装
//     return { success: true }
//   },
// })

// スナップショットの名前や説明を更新
export const updateSnapshot = mutation({
  args: {
    id: v.id('kpiSnapshots'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    console.log('✏️ スナップショットを更新中:', args.id)

    const { id, ...updates } = args
    await ctx.db.patch(id, updates)

    console.log('✅ スナップショット更新完了')
    return { success: true }
  },
})

// お気に入りのスナップショットを取得（現在は未実装）
// export const getFavoriteSnapshots = query({
//   args: {},
//   handler: async (ctx, args) => {
//     // お気に入り機能は後で実装
//     return []
//   },
// })