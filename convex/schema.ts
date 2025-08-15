import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ユーザーテーブル
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  // キャンペーンテーブル
  campaigns: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('completed')),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // タスクテーブル
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('in_progress'), v.literal('completed')),
    campaignId: v.id('campaigns'),
    assignedTo: v.id('users'),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_campaign', ['campaignId'])
    .index('by_assignee', ['assignedTo'])
    .index('by_status', ['status']),
})
