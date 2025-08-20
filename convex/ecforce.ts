import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ECForce注文データの一括インポート
export const importOrders = mutation({
  args: {
    orders: v.array(
      v.object({
        orderId: v.string(),
        orderDate: v.string(),
        purchaseDate: v.string(),
        customerId: v.string(),
        customerNumber: v.string(),
        email: v.string(),
        postalCode: v.optional(v.string()),
        address: v.optional(v.string()),
        subtotal: v.number(),
        discount: v.optional(v.number()),
        tax: v.optional(v.number()),
        shipping: v.optional(v.number()),
        fee: v.optional(v.number()),
        pointsUsed: v.optional(v.number()),
        total: v.number(),
        products: v.optional(v.array(v.string())),
        offer: v.optional(v.string()),
        subscriptionStatus: v.optional(v.string()),
        deliveryStatus: v.optional(v.string()),
        adCode: v.optional(v.string()),
        advertiserName: v.optional(v.string()),
        adMedia: v.optional(v.string()),
      })
    ),
    strategy: v.union(v.literal('skip'), v.literal('replace')),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    let imported = 0
    let skipped = 0
    let replaced = 0

    for (const order of args.orders) {
      // 既存データをチェック
      const existing = await ctx.db
        .query('ecforceOrders')
        .withIndex('by_orderId', (q) => q.eq('orderId', order.orderId))
        .first()

      if (existing) {
        if (args.strategy === 'skip') {
          skipped++
          continue
        } else {
          // 既存データを更新
          await ctx.db.patch(existing._id, {
            ...order,
            updatedAt: now,
          })
          replaced++
        }
      } else {
        // 新規データを挿入
        await ctx.db.insert('ecforceOrders', {
          ...order,
          importedAt: now,
          updatedAt: now,
        })
        imported++
      }
    }

    return {
      imported,
      skipped,
      replaced,
      total: imported + skipped + replaced,
    }
  },
})

// 注文データの取得（ページネーション付き）
export const getOrders = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 1000) // 最大で1000件まで
    let query = ctx.db.query('ecforceOrders').withIndex('by_orderDate').order('desc')

    // カーソルが指定されている場合
    if (args.cursor) {
      const cursorDoc = await ctx.db.get(args.cursor as any)
      if (cursorDoc && 'orderDate' in cursorDoc) {
        query = query.filter((q) => q.lt(q.field('orderDate'), (cursorDoc as any).orderDate))
      }
    }

    const orders = await query.take(limit + 1)
    const hasMore = orders.length > limit
    const items = hasMore ? orders.slice(0, -1) : orders
    const nextCursor = hasMore ? orders[orders.length - 2]._id : null

    // 日付フィルタリング
    const filteredItems = items.filter((order) => {
      if (args.startDate && order.orderDate < args.startDate) return false
      if (args.endDate && order.orderDate > args.endDate) return false
      return true
    })

    return {
      items: filteredItems,
      nextCursor,
      hasMore,
    }
  },
})

// 注文データの統計情報を取得（インデックスを活用した効率的な集計）
export const getOrderStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 日付範囲を使用してインデックスで効率的にクエリ
    let query = ctx.db.query('ecforceOrders').withIndex('by_orderDate')

    // 日付範囲でフィルタリング（インデックスを活用）
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field('orderDate'), args.startDate!))
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field('orderDate'), args.endDate!))
    }

    // 制限付きで取得（統計のための概算値）
    const sampleSize = 5000
    const sample = await query.take(sampleSize)

    // 全体数の推定（最初と最後の100件から推定）
    const firstBatch = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderDate')
      .order('asc')
      .take(100)

    const lastBatch = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderDate')
      .order('desc')
      .take(100)

    // サンプルから統計を計算
    let totalRevenue = 0
    let totalOrders = sample.length
    const customerSet = new Set<string>()

    for (const order of sample) {
      totalRevenue += order.total
      customerSet.add(order.customerId)
    }

    // 全体数を推定（実際のドキュメント数が取得できない場合）
    const estimatedTotal = sample.length < sampleSize ? sample.length : sample.length * 2 // 簡易的な推定

    const uniqueCustomers = customerSet.size
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalRevenue: totalRevenue * (estimatedTotal / totalOrders), // 推定値に調整
      totalOrders: estimatedTotal,
      uniqueCustomers: Math.round(uniqueCustomers * (estimatedTotal / totalOrders)),
      avgOrderValue,
      dateRange: {
        start: args.startDate || firstBatch[0]?.orderDate,
        end: args.endDate || lastBatch[0]?.orderDate,
      },
      isEstimate: sample.length >= sampleSize, // 推定値かどうかのフラグ
    }
  },
})

// 全注文データをクリア
export const clearAllOrders = mutation({
  handler: async (ctx) => {
    const orders = await ctx.db.query('ecforceOrders').collect()

    for (const order of orders) {
      await ctx.db.delete(order._id)
    }

    return { deleted: orders.length }
  },
})

// 顧客別の注文データを取得
export const getOrdersByCustomer = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('ecforceOrders')
      .withIndex('by_customerId', (q) => q.eq('customerId', args.customerId))
      .collect()
  },
})

// 全データ数を取得（推定値）
export const getTotalOrderCount = query({
  handler: async (ctx) => {
    // 大量データの場合は推定値を返す
    // 最新1000件を取得してサンプリング
    const recentOrders = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderDate')
      .order('desc')
      .take(1000)

    if (recentOrders.length < 1000) {
      // 1000件未満の場合は正確な数
      return recentOrders.length
    }

    // 1000件以上の場合は推定
    // 最初と最後の日付から期間を計算
    const firstOrder = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderDate')
      .order('asc')
      .first()

    const lastOrder = recentOrders[0]

    if (!firstOrder || !lastOrder) {
      return recentOrders.length
    }

    // 日付範囲から推定
    const firstDate = new Date(firstOrder.orderDate)
    const lastDate = new Date(lastOrder.orderDate)
    const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

    // 最近7日間のデータから1日あたりの平均を計算
    const recentDays = 7
    const recentDate = new Date(lastDate)
    recentDate.setDate(recentDate.getDate() - recentDays)

    const recentCount = recentOrders.filter((o) => new Date(o.orderDate) >= recentDate).length
    const avgPerDay = recentCount / recentDays

    // 推定総数
    const estimatedTotal = Math.round(avgPerDay * daysDiff)

    return Math.max(recentOrders.length, estimatedTotal)
  },
})
