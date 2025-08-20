import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

// Types
interface SyncResult {
  success: boolean
  syncId: string
  stats: {
    total: number
    created: number
    updated: number
    failed: number
    fieldsUpdated?: string[]
  }
  errors?: Array<{ metaId: string; error: string }>
}

// Generate unique sync ID
function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Calculate next run time based on interval
function calculateNextRun(interval: 'hourly' | 'daily' | 'weekly'): string {
  const now = new Date()
  switch (interval) {
    case 'hourly':
      now.setHours(now.getHours() + 1)
      break
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
  }
  return now.toISOString()
}

// Sync Meta campaigns
export const syncMetaCampaigns = mutation({
  args: {
    campaigns: v.array(
      v.object({
        metaId: v.string(),
        accountId: v.string(),
        name: v.string(),
        objective: v.string(),
        status: v.union(v.literal('ACTIVE'), v.literal('PAUSED'), v.literal('DELETED')),
        dailyBudget: v.optional(v.number()),
        lifetimeBudget: v.optional(v.number()),
        startTime: v.optional(v.string()),
        stopTime: v.optional(v.string()),
        insights: v.optional(
          v.object({
            impressions: v.number(),
            clicks: v.number(),
            spend: v.number(),
            conversions: v.number(),
            revenue: v.number(),
          })
        ),
      })
    ),
    differential: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    const syncId = generateSyncId()
    const startTime = Date.now()
    const stats = {
      total: args.campaigns.length,
      created: 0,
      updated: 0,
      failed: 0,
      fieldsUpdated: [] as string[],
    }
    const errors: Array<{ metaId: string; error: string }> = []

    // Create sync history record
    await ctx.db.insert('syncHistory', {
      syncId,
      source: 'meta',
      type: 'campaigns',
      status: 'started',
      stats,
      startedAt: new Date().toISOString(),
    })

    // Process each campaign
    for (const campaign of args.campaigns) {
      try {
        // Check if campaign already exists
        const existing = await ctx.db
          .query('metaCampaigns')
          .withIndex('by_metaId', (q) => q.eq('metaId', campaign.metaId))
          .first()

        const now = new Date().toISOString()

        if (existing) {
          // Update existing campaign
          const updates: any = {
            updatedAt: now,
            lastSyncedAt: now,
          }

          // Differential update - only update changed fields
          if (args.differential) {
            const fieldsToCheck = [
              'name',
              'objective',
              'status',
              'dailyBudget',
              'lifetimeBudget',
              'startTime',
              'stopTime',
            ] as const

            for (const field of fieldsToCheck) {
              if (campaign[field] !== undefined && campaign[field] !== existing[field]) {
                updates[field] = campaign[field]
                if (!stats.fieldsUpdated.includes(field)) {
                  stats.fieldsUpdated.push(field)
                }
              }
            }
          } else {
            // Full update
            Object.assign(updates, {
              name: campaign.name,
              objective: campaign.objective,
              status: campaign.status,
              dailyBudget: campaign.dailyBudget || 0,
              lifetimeBudget: campaign.lifetimeBudget,
              startTime: campaign.startTime || now,
              stopTime: campaign.stopTime,
            })
          }

          await ctx.db.patch(existing._id, updates)
          stats.updated++

          // Update insights if provided
          if (campaign.insights) {
            await ctx.db.insert('metaInsights', {
              campaignId: campaign.metaId,
              ...campaign.insights,
              dateStart: new Date().toISOString().split('T')[0],
              dateStop: new Date().toISOString().split('T')[0],
              createdAt: now,
            })
          }
        } else {
          // Create new campaign
          await ctx.db.insert('metaCampaigns', {
            metaId: campaign.metaId,
            accountId: campaign.accountId,
            name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            dailyBudget: campaign.dailyBudget || 0,
            lifetimeBudget: campaign.lifetimeBudget,
            startTime: campaign.startTime || now,
            stopTime: campaign.stopTime,
            lastSyncedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          stats.created++

          // Insert insights if provided
          if (campaign.insights) {
            await ctx.db.insert('metaInsights', {
              campaignId: campaign.metaId,
              ...campaign.insights,
              dateStart: new Date().toISOString().split('T')[0],
              dateStop: new Date().toISOString().split('T')[0],
              createdAt: now,
            })
          }
        }
      } catch (error) {
        stats.failed++
        errors.push({
          metaId: campaign.metaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update sync history
    const duration = Date.now() - startTime
    await ctx.db
      .query('syncHistory')
      .filter((q) => q.eq(q.field('syncId'), syncId))
      .first()
      .then((record) => {
        if (record) {
          ctx.db.patch(record._id, {
            status: 'completed',
            stats,
            errors: errors.length > 0 ? errors : undefined,
            completedAt: new Date().toISOString(),
            duration,
          })
        }
      })

    return {
      success: true,
      syncId,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    }
  },
})

// Sync Meta creatives
export const syncMetaCreatives = mutation({
  args: {
    creatives: v.array(
      v.object({
        metaId: v.string(),
        campaignId: v.string(),
        adsetId: v.string(),
        name: v.string(),
        creativeType: v.union(v.literal('IMAGE'), v.literal('VIDEO'), v.literal('CAROUSEL')),
        thumbnailUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        body: v.optional(v.string()),
        title: v.optional(v.string()),
        callToActionType: v.optional(v.string()),
        insights: v.optional(
          v.object({
            impressions: v.number(),
            clicks: v.number(),
            spend: v.number(),
            conversions: v.number(),
            revenue: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    const syncId = generateSyncId()
    const stats = {
      total: args.creatives.length,
      created: 0,
      updated: 0,
      failed: 0,
    }
    const errors: Array<{ metaId: string; error: string }> = []

    for (const creative of args.creatives) {
      try {
        const existing = await ctx.db
          .query('metaCreatives')
          .withIndex('by_metaId', (q) => q.eq('metaId', creative.metaId))
          .first()

        const now = new Date().toISOString()

        if (existing) {
          await ctx.db.patch(existing._id, {
            ...creative,
            updatedAt: now,
            lastSyncedAt: now,
          })
          stats.updated++
        } else {
          await ctx.db.insert('metaCreatives', {
            ...creative,
            lastSyncedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          stats.created++
        }

        // Insert insights if provided
        if (creative.insights) {
          await ctx.db.insert('metaInsights', {
            creativeId: creative.metaId,
            ...creative.insights,
            dateStart: new Date().toISOString().split('T')[0],
            dateStop: new Date().toISOString().split('T')[0],
            createdAt: now,
          })
        }
      } catch (error) {
        stats.failed++
        errors.push({
          metaId: creative.metaId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      success: true,
      syncId,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    }
  },
})

// Query functions
export const getMetaCampaigns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('metaCampaigns').collect()
  },
})

export const getMetaCreatives = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('metaCreatives').collect()
  },
})

export const getSyncHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query('syncHistory').withIndex('by_startedAt').order('desc')

    if (args.limit) {
      return await query.take(args.limit)
    }
    return await query.collect()
  },
})

// Schedule sync
export const scheduleSync = mutation({
  args: {
    type: v.union(v.literal('campaigns'), v.literal('creatives'), v.literal('insights')),
    interval: v.union(v.literal('hourly'), v.literal('daily'), v.literal('weekly')),
    config: v.object({
      accountId: v.optional(v.string()),
      lookbackDays: v.optional(v.number()),
      filters: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    const schedule = {
      name: `Meta ${args.type} sync`,
      type: args.type,
      source: 'meta' as const,
      interval: args.interval,
      config: args.config,
      enabled: true,
      nextRun: calculateNextRun(args.interval),
      createdAt: now,
      updatedAt: now,
    }

    const id = await ctx.db.insert('syncSchedules', schedule)
    return { id, ...schedule }
  },
})

// Run scheduled syncs
export const runScheduledSyncs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const dueSyncs = await ctx.db
      .query('syncSchedules')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .filter((q) => q.lte(q.field('nextRun'), now))
      .collect()

    const results = []

    for (const sync of dueSyncs) {
      try {
        // Execute sync based on type
        // In a real implementation, this would call the Meta API
        // For now, we'll just update the schedule
        await ctx.db.patch(sync._id, {
          lastRun: now,
          nextRun: calculateNextRun(sync.interval),
          updatedAt: now,
        })

        results.push({
          scheduleId: sync._id,
          status: 'completed',
          executedAt: now,
        })
      } catch (error) {
        results.push({
          scheduleId: sync._id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          executedAt: now,
        })
      }
    }

    return {
      executed: results.length,
      jobs: results,
    }
  },
})
