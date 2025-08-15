import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// タスク一覧を取得
export const list = query({
  args: {
    campaignId: v.optional(v.id('campaigns')),
    assignedTo: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    if (args.campaignId !== undefined) {
      return await ctx.db
        .query('tasks')
        .withIndex('by_campaign', (q) => q.eq('campaignId', args.campaignId!))
        .collect()
    }

    if (args.assignedTo !== undefined) {
      return await ctx.db
        .query('tasks')
        .withIndex('by_assignee', (q) => q.eq('assignedTo', args.assignedTo!))
        .collect()
    }

    return await ctx.db.query('tasks').collect()
  },
})

// タスクを作成
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    campaignId: v.id('campaigns'),
    assignedTo: v.id('users'),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.insert('tasks', {
      title: args.title,
      description: args.description,
      status: 'pending',
      campaignId: args.campaignId,
      assignedTo: args.assignedTo,
      dueDate: args.dueDate,
      createdAt: Date.now(),
    })

    return task
  },
})

// タスクのステータスを更新
export const updateStatus = mutation({
  args: {
    taskId: v.id('tasks'),
    status: v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed')),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId)
    if (!task) throw new Error('Task not found')

    await ctx.db.patch(args.taskId, {
      status: args.status,
    })

    return { success: true }
  },
})

// タスクを削除
export const remove = mutation({
  args: {
    id: v.id('tasks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
