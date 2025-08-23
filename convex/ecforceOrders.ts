import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ECForce注文の一覧取得
export const getOrders = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    customerId: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let allOrders

    // フィルター適用
    if (args.customerId) {
      allOrders = await ctx.db
        .query('ecforceOrders')
        .withIndex('by_customerId', (query) => query.eq('customerId', args.customerId as string))
        .collect()
    } else if (args.email) {
      allOrders = await ctx.db
        .query('ecforceOrders')
        .withIndex('by_email', (query) => query.eq('email', args.email as string))
        .collect()
    } else if (args.startDate) {
      allOrders = await ctx.db
        .query('ecforceOrders')
        .withIndex('by_orderDate')
        .collect()
    } else {
      allOrders = await ctx.db
        .query('ecforceOrders')
        .collect()
    }

    // 日付フィルタリング
    let filteredOrders = allOrders
    if (args.startDate || args.endDate) {
      filteredOrders = allOrders.filter((order) => {
        if (args.startDate && order.orderDate < args.startDate) return false
        if (args.endDate && order.orderDate > args.endDate) return false
        return true
      })
    }

    // ページネーション
    const limit = args.limit || 100
    const startIndex = args.cursor ? parseInt(args.cursor) : 0
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit)

    return {
      orders: paginatedOrders,
      nextCursor: startIndex + limit < filteredOrders.length ? String(startIndex + limit) : null,
      total: filteredOrders.length,
    }
  },
})

// 特定の注文を取得
export const getOrder = query({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
      .first()
  },
})

// 注文の追加または更新
export const upsertOrder = mutation({
  args: {
    orderId: v.string(),
    orderNumber: v.optional(v.string()),
    orderDate: v.string(),
    purchaseDate: v.string(),
    purchaseUrl: v.optional(v.string()),
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
    subscriptionOrderNumber: v.optional(v.string()),
    deliveryStatus: v.optional(v.string()),
    adCode: v.optional(v.string()),
    advertiserName: v.optional(v.string()),
    adMedia: v.optional(v.string()),
    adUrlGroupName: v.optional(v.string()),
    adType: v.optional(v.string()),
    adTrackingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
      .first()

    const now = new Date().toISOString()
    const data = {
      ...args,
      importedAt: existing?.importedAt || now,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return { action: 'updated', orderId: args.orderId }
    } else {
      await ctx.db.insert('ecforceOrders', data)
      return { action: 'created', orderId: args.orderId }
    }
  },
})

// 複数の注文を一括インポート
export const bulkImportOrders = mutation({
  args: {
    orders: v.array(
      v.object({
        orderId: v.string(),
        orderNumber: v.optional(v.string()),
        orderDate: v.string(),
        purchaseDate: v.string(),
        purchaseUrl: v.optional(v.string()),
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
        subscriptionOrderNumber: v.optional(v.string()),
        deliveryStatus: v.optional(v.string()),
        adCode: v.optional(v.string()),
        advertiserName: v.optional(v.string()),
        adMedia: v.optional(v.string()),
        adUrlGroupName: v.optional(v.string()),
        adType: v.optional(v.string()),
        adTrackingUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    let created = 0
    let updated = 0

    for (const order of args.orders) {
      const existing = await ctx.db
        .query('ecforceOrders')
        .withIndex('by_orderId', (q) => q.eq('orderId', order.orderId))
        .first()

      const data = {
        ...order,
        importedAt: existing?.importedAt || now,
        updatedAt: now,
      }

      if (existing) {
        await ctx.db.patch(existing._id, data)
        updated++
      } else {
        await ctx.db.insert('ecforceOrders', data)
        created++
      }
    }

    return {
      created,
      updated,
      total: created + updated,
    }
  },
})

// 注文の削除
export const deleteOrder = mutation({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('ecforceOrders')
      .withIndex('by_orderId', (q) => q.eq('orderId', args.orderId))
      .first()

    if (order) {
      await ctx.db.delete(order._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// 注文をすべてクリア
export const clearAllOrders = mutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('ecforceOrders').collect()
    let deleted = 0

    for (const order of orders) {
      await ctx.db.delete(order._id)
      deleted++
    }

    return { deleted }
  },
})

// 注文統計を取得
export const getOrderStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query('ecforceOrders').collect()

    // 日付フィルタリング
    const filteredOrders = orders.filter((order) => {
      if (args.startDate && order.orderDate < args.startDate) return false
      if (args.endDate && order.orderDate > args.endDate) return false
      return true
    })

    // 統計計算
    const stats = {
      totalOrders: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: 0,
      uniqueCustomers: new Set(filteredOrders.map((o) => o.customerId)).size,
      dateRange: {
        start: args.startDate || (filteredOrders.length > 0 ? filteredOrders[0].orderDate : ''),
        end: args.endDate || (filteredOrders.length > 0 ? filteredOrders[filteredOrders.length - 1].orderDate : ''),
      },
    }

    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders
    }

    return stats
  },
})