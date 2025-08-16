import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { Doc } from '../_generated/dataModel'

// Subscribe to campaign updates
export const subscribeToCampaignUpdates = query({
  args: {
    accountId: v.optional(v.string()),
    campaignIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const campaigns = args.accountId
      ? await ctx.db
          .query('metaCampaigns')
          .withIndex('by_accountId', (q) => 
            q.eq('accountId', args.accountId!)
          )
          .collect()
      : await ctx.db.query('metaCampaigns').collect()
    
    // Filter by campaign IDs if specified
    const filteredCampaigns = args.campaignIds
      ? campaigns.filter((c) => args.campaignIds!.includes(c.metaId))
      : campaigns
    
    // Get recent insights for each campaign
    const campaignsWithInsights = await Promise.all(
      filteredCampaigns.map(async (campaign) => {
        const allInsights = await ctx.db
          .query('metaInsights')
          .withIndex('by_campaignId', (q) => q.eq('campaignId', campaign.metaId))
          .collect()
        
        // Sort by date and take last 7
        const recentInsights = allInsights
          .sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime())
          .slice(0, 7)
        
        // Calculate current metrics
        const currentMetrics = recentInsights.reduce(
          (acc, insight) => ({
            impressions: acc.impressions + insight.impressions,
            clicks: acc.clicks + insight.clicks,
            spend: acc.spend + insight.spend,
            conversions: acc.conversions + insight.conversions,
            revenue: acc.revenue + (insight.revenue || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
        )
        
        return {
          ...campaign,
          currentMetrics,
          lastUpdated: new Date().toISOString(),
        }
      })
    )
    
    return campaignsWithInsights
  },
})

// Subscribe to creative performance updates
export const subscribeToCreativeUpdates = query({
  args: {
    campaignId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const creatives = args.campaignId
      ? await ctx.db
          .query('metaCreatives')
          .withIndex('by_campaignId', (q) => 
            q.eq('campaignId', args.campaignId!)
          )
          .collect()
      : await ctx.db.query('metaCreatives').collect()
    const limitedCreatives = creatives.slice(0, args.limit || 50)
    
    // Get real-time performance for each creative
    const creativesWithPerformance = await Promise.all(
      limitedCreatives.map(async (creative) => {
        const allInsights = await ctx.db
          .query('metaInsights')
          .withIndex('by_creativeId', (q) => q.eq('creativeId', creative.metaId))
          .collect()
        
        // Get most recent
        const recentInsights = allInsights
          .sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime())
          .slice(0, 1)
        
        const latestInsight = recentInsights[0]
        
        return {
          ...creative,
          performance: latestInsight || null,
          lastUpdated: new Date().toISOString(),
        }
      })
    )
    
    return creativesWithPerformance
  },
})

// Notify when metrics exceed thresholds
export const subscribeToAlerts = query({
  args: {
    thresholds: v.object({
      maxCpa: v.optional(v.number()),
      minRoas: v.optional(v.number()),
      maxSpend: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const allInsights = await ctx.db
      .query('metaInsights')
      .collect()
    
    // Sort by date and take recent 100
    const recentInsights = allInsights
      .sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime())
      .slice(0, 100)
    
    const alerts: Array<{
      type: 'warning' | 'critical'
      message: string
      campaignId: string
      metric: string
      value: number
      threshold: number
    }> = []
    
    // Group by campaign
    const byCampaign = new Map<string, Doc<'metaInsights'>[]>()
    recentInsights.forEach((insight) => {
      if (!insight.campaignId) return
      
      if (!byCampaign.has(insight.campaignId)) {
        byCampaign.set(insight.campaignId, [])
      }
      byCampaign.get(insight.campaignId)!.push(insight)
    })
    
    // Check thresholds for each campaign
    for (const [campaignId, insights] of byCampaign) {
      const totals = insights.reduce(
        (acc, insight) => ({
          spend: acc.spend + insight.spend,
          conversions: acc.conversions + insight.conversions,
          revenue: acc.revenue + (insight.revenue || 0),
        }),
        { spend: 0, conversions: 0, revenue: 0 }
      )
      
      // Check CPA threshold
      if (args.thresholds.maxCpa && totals.conversions > 0) {
        const cpa = totals.spend / totals.conversions
        if (cpa > args.thresholds.maxCpa) {
          alerts.push({
            type: cpa > args.thresholds.maxCpa * 1.5 ? 'critical' : 'warning',
            message: `CPA exceeds threshold`,
            campaignId,
            metric: 'CPA',
            value: cpa,
            threshold: args.thresholds.maxCpa,
          })
        }
      }
      
      // Check ROAS threshold
      if (args.thresholds.minRoas && totals.spend > 0) {
        const roas = totals.revenue / totals.spend
        if (roas < args.thresholds.minRoas) {
          alerts.push({
            type: roas < args.thresholds.minRoas * 0.5 ? 'critical' : 'warning',
            message: `ROAS below threshold`,
            campaignId,
            metric: 'ROAS',
            value: roas,
            threshold: args.thresholds.minRoas,
          })
        }
      }
      
      // Check spend threshold
      if (args.thresholds.maxSpend && totals.spend > args.thresholds.maxSpend) {
        alerts.push({
          type: totals.spend > args.thresholds.maxSpend * 1.5 ? 'critical' : 'warning',
          message: `Spend exceeds threshold`,
          campaignId,
          metric: 'Spend',
          value: totals.spend,
          threshold: args.thresholds.maxSpend,
        })
      }
    }
    
    return {
      alerts,
      checkedAt: new Date().toISOString(),
      totalCampaigns: byCampaign.size,
    }
  },
})

// Update campaign metrics in real-time
export const updateCampaignMetrics = mutation({
  args: {
    campaignId: v.string(),
    metrics: v.object({
      impressions: v.number(),
      clicks: v.number(),
      spend: v.number(),
      conversions: v.number(),
      revenue: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Create new insight record
    const insight = await ctx.db.insert('metaInsights', {
      campaignId: args.campaignId,
      impressions: args.metrics.impressions,
      clicks: args.metrics.clicks,
      spend: args.metrics.spend,
      conversions: args.metrics.conversions,
      revenue: args.metrics.revenue,
      dateStart: new Date().toISOString(),
      dateStop: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })
    
    // Update campaign last sync time
    const campaign = await ctx.db
      .query('metaCampaigns')
      .withIndex('by_metaId', (q) => q.eq('metaId', args.campaignId))
      .first()
    
    if (campaign) {
      await ctx.db.patch(campaign._id, {
        lastSyncedAt: new Date().toISOString(),
      })
    }
    
    return { success: true, insightId: insight }
  },
})