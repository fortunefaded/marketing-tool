import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// すべてのアカウントを取得
export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query('metaAccounts').withIndex('by_active').collect()

    return accounts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },
})

// すべてのアカウントを取得（別名）
export const getAllAccounts = getAccounts

// アクティブなアカウントを取得
export const getActiveAccount = query({
  args: {},
  handler: async (ctx) => {
    // 設定から現在のアクティブアカウントIDを取得
    const settings = await ctx.db.query('metaAccountSettings').first()

    if (!settings?.activeAccountId) {
      return null
    }

    // アクティブなアカウントを取得
    const account = await ctx.db
      .query('metaAccounts')
      .withIndex('by_account_id')
      .filter((q) => q.eq(q.field('accountId'), settings.activeAccountId))
      .first()

    return account
  },
})

// 既存アカウントのaccountNameフィールドを修正
export const fixAccountNames = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query('metaAccounts').collect()

    for (const account of accounts) {
      if (!account.accountName && account.name) {
        await ctx.db.patch(account._id, {
          accountName: account.name,
        })
      }
    }

    return { updated: accounts.length }
  },
})

// アカウントを追加または更新
export const addOrUpdateAccount = mutation({
  args: {
    accountId: v.string(),
    name: v.string(),
    accessToken: v.string(),
    permissions: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    // 既存のアカウントを確認
    const existing = await ctx.db
      .query('metaAccounts')
      .withIndex('by_account_id')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    if (existing) {
      // 既存のアカウントを更新
      await ctx.db.patch(existing._id, {
        name: args.name,
        accountName: args.name, // accountNameも更新
        accessToken: args.accessToken,
        permissions: args.permissions,
        currency: args.currency,
        timezone: args.timezone,
        lastUsedAt: now,
        updatedAt: now,
      })
    } else {
      // 新規アカウントを作成
      await ctx.db.insert('metaAccounts', {
        accountId: args.accountId,
        accountName: args.name, // accountNameも設定
        fullAccountId: `act_${args.accountId}`,
        name: args.name,
        accessToken: args.accessToken,
        permissions: args.permissions || [],
        currency: args.currency,
        timezone: args.timezone,
        isActive: true,
        createdAt: now,
        lastUsedAt: now,
        updatedAt: now,
      })

      // アクティブなアカウントがない場合は、このアカウントをアクティブにする
      const settings = await ctx.db.query('metaAccountSettings').first()

      if (!settings) {
        await ctx.db.insert('metaAccountSettings', {
          activeAccountId: args.accountId,
          updatedAt: now,
        })
      } else if (!settings.activeAccountId) {
        await ctx.db.patch(settings._id, {
          activeAccountId: args.accountId,
          updatedAt: now,
        })
      }
    }

    return { success: true }
  },
})

// アカウントを削除
export const removeAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    // アカウントを取得
    const account = await ctx.db
      .query('metaAccounts')
      .withIndex('by_account_id')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    if (!account) {
      throw new Error('Account not found')
    }

    // アカウントを削除
    await ctx.db.delete(account._id)

    // アクティブなアカウントが削除された場合、別のアカウントをアクティブにする
    const settings = await ctx.db.query('metaAccountSettings').first()

    if (settings?.activeAccountId === args.accountId) {
      const remainingAccounts = await ctx.db
        .query('metaAccounts')
        .withIndex('by_active')
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect()

      if (remainingAccounts.length > 0) {
        await ctx.db.patch(settings._id, {
          activeAccountId: remainingAccounts[0].accountId,
          updatedAt: new Date().toISOString(),
        })
      } else {
        await ctx.db.patch(settings._id, {
          activeAccountId: undefined,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    return { success: true }
  },
})

// アクティブなアカウントを設定
export const setActiveAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()

    // アカウントが存在するか確認
    const account = await ctx.db
      .query('metaAccounts')
      .withIndex('by_account_id')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    if (!account) {
      throw new Error('Account not found')
    }

    // アカウントの最終使用日時を更新
    await ctx.db.patch(account._id, {
      lastUsedAt: now,
      updatedAt: now,
    })

    // 設定を更新
    const settings = await ctx.db.query('metaAccountSettings').first()

    if (!settings) {
      await ctx.db.insert('metaAccountSettings', {
        activeAccountId: args.accountId,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(settings._id, {
        activeAccountId: args.accountId,
        updatedAt: now,
      })
    }

    return { success: true }
  },
})

// IDでアカウントを取得
export const getAccountById = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query('metaAccounts')
      .withIndex('by_account_id')
      .filter((q) => q.eq(q.field('accountId'), args.accountId))
      .first()

    return account
  },
})
