import { v } from 'convex/values'
import { query } from './_generated/server'
import { Doc } from './_generated/dataModel'

// Helper function to get date range based on comparison type
function getDateRanges(comparisonType: string): { current: { start: Date; end: Date }; previous: { start: Date; end: Date } } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  switch (comparisonType) {
    case 'month-over-month': {
      // Current month
      const currentStart = new Date(currentYear, currentMonth, 1)
      const currentEnd = new Date(currentYear, currentMonth + 1, 0)
      
      // Previous month
      const previousStart = new Date(currentYear, currentMonth - 1, 1)
      const previousEnd = new Date(currentYear, currentMonth, 0)
      
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      }
    }
    
    case 'year-over-year': {
      // Current year to date
      const currentStart = new Date(currentYear, 0, 1)
      const currentEnd = now
      
      // Previous year same period
      const previousStart = new Date(currentYear - 1, 0, 1)
      const previousEnd = new Date(currentYear - 1, currentMonth, now.getDate())
      
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      }
    }
    
    case 'quarter-over-quarter': {
      // Current quarter
      const currentQuarter = Math.floor(currentMonth / 3)
      const currentStart = new Date(currentYear, currentQuarter * 3, 1)
      const currentEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0)
      
      // Previous quarter
      const previousQuarter = currentQuarter - 1
      const previousYear = previousQuarter < 0 ? currentYear - 1 : currentYear
      const adjustedQuarter = previousQuarter < 0 ? 3 : previousQuarter
      const previousStart = new Date(previousYear, adjustedQuarter * 3, 1)
      const previousEnd = new Date(previousYear, (adjustedQuarter + 1) * 3, 0)
      
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
      }
    }
    
    default:
      throw new Error(`Invalid comparison type: ${comparisonType}`)
  }
}

// Format period string for display
function formatPeriod(start: Date, _end: Date, comparisonType: string): string {
  const year = start.getFullYear()
  const month = start.getMonth() + 1
  
  switch (comparisonType) {
    case 'month-over-month':
      return `${year}年${month}月`
    case 'year-over-year':
      return `${year}年`
    case 'quarter-over-quarter': {
      const quarter = Math.floor(start.getMonth() / 3) + 1
      return `${year}年Q${quarter}`
    }
    default:
      return `${year}年${month}月`
  }
}

// Aggregate insights for a date range
function aggregateInsights(insights: Doc<'metaInsights'>[]): {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
} {
  return insights.reduce(
    (acc, insight) => ({
      impressions: acc.impressions + (insight.impressions || 0),
      clicks: acc.clicks + (insight.clicks || 0),
      spend: acc.spend + (insight.spend || 0),
      conversions: acc.conversions + (insight.conversions || 0),
      revenue: acc.revenue + (insight.revenue || 0),
    }),
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
    }
  )
}

// Calculate derived metrics
function calculateMetrics(aggregated: ReturnType<typeof aggregateInsights>) {
  const { impressions, clicks, spend, conversions, revenue } = aggregated
  
  return {
    ...aggregated,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
  }
}

// Get comparison data for campaigns
export const getCampaignComparison = query({
  args: {
    comparisonType: v.union(
      v.literal('month-over-month'),
      v.literal('year-over-year'),
      v.literal('quarter-over-quarter')
    ),
    accountId: v.optional(v.string()),
    campaignIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { current, previous } = getDateRanges(args.comparisonType)
    
    // Build query filters
    let currentQuery = ctx.db.query('metaInsights')
      .filter((q) =>
        q.and(
          q.gte(q.field('dateStart'), current.start.toISOString()),
          q.lte(q.field('dateStart'), current.end.toISOString())
        )
      )
    
    let previousQuery = ctx.db.query('metaInsights')
      .filter((q) =>
        q.and(
          q.gte(q.field('dateStart'), previous.start.toISOString()),
          q.lte(q.field('dateStart'), previous.end.toISOString())
        )
      )
    
    // Apply campaign filters if specified
    if (args.campaignIds && args.campaignIds.length > 0) {
      // Note: Convex doesn't support 'in' queries directly, so we'd need to handle this differently
      // For now, we'll fetch all and filter in memory
    }
    
    const [currentInsights, previousInsights] = await Promise.all([
      currentQuery.collect(),
      previousQuery.collect(),
    ])
    
    // Filter by campaign IDs if specified
    const filteredCurrent = args.campaignIds
      ? currentInsights.filter((i) => i.campaignId && args.campaignIds!.includes(i.campaignId))
      : currentInsights
    
    const filteredPrevious = args.campaignIds
      ? previousInsights.filter((i) => i.campaignId && args.campaignIds!.includes(i.campaignId))
      : previousInsights
    
    // Aggregate and calculate metrics
    const currentAggregated = aggregateInsights(filteredCurrent)
    const previousAggregated = aggregateInsights(filteredPrevious)
    
    return {
      current: {
        period: formatPeriod(current.start, current.end, args.comparisonType),
        metrics: calculateMetrics(currentAggregated),
        startDate: current.start.toISOString(),
        endDate: current.end.toISOString(),
      },
      previous: {
        period: formatPeriod(previous.start, previous.end, args.comparisonType),
        metrics: calculateMetrics(previousAggregated),
        startDate: previous.start.toISOString(),
        endDate: previous.end.toISOString(),
      },
    }
  },
})

// Get campaign breakdown with comparison
export const getCampaignBreakdownComparison = query({
  args: {
    comparisonType: v.union(
      v.literal('month-over-month'),
      v.literal('year-over-year'),
      v.literal('quarter-over-quarter')
    ),
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal('spend'),
        v.literal('revenue'),
        v.literal('impressions'),
        v.literal('conversions'),
        v.literal('roas')
      )
    ),
  },
  handler: async (ctx, args) => {
    const { current, previous } = getDateRanges(args.comparisonType)
    
    // Get all campaigns
    const campaigns = await ctx.db.query('metaCampaigns').collect()
    
    // Get insights for current and previous periods
    const [currentInsights, previousInsights] = await Promise.all([
      ctx.db
        .query('metaInsights')
        .filter((q) =>
          q.and(
            q.gte(q.field('dateStart'), current.start.toISOString()),
            q.lte(q.field('dateStart'), current.end.toISOString())
          )
        )
        .collect(),
      ctx.db
        .query('metaInsights')
        .filter((q) =>
          q.and(
            q.gte(q.field('dateStart'), previous.start.toISOString()),
            q.lte(q.field('dateStart'), previous.end.toISOString())
          )
        )
        .collect(),
    ])
    
    // Group insights by campaign
    const currentByCampaign = new Map<string, Doc<'metaInsights'>[]>()
    const previousByCampaign = new Map<string, Doc<'metaInsights'>[]>()
    
    currentInsights.forEach((insight) => {
      if (insight.campaignId) {
        if (!currentByCampaign.has(insight.campaignId)) {
          currentByCampaign.set(insight.campaignId, [])
        }
        currentByCampaign.get(insight.campaignId)!.push(insight)
      }
    })
    
    previousInsights.forEach((insight) => {
      if (insight.campaignId) {
        if (!previousByCampaign.has(insight.campaignId)) {
          previousByCampaign.set(insight.campaignId, [])
        }
        previousByCampaign.get(insight.campaignId)!.push(insight)
      }
    })
    
    // Calculate metrics for each campaign
    const campaignComparisons = campaigns.map((campaign) => {
      const currentCampaignInsights = currentByCampaign.get(campaign.metaId) || []
      const previousCampaignInsights = previousByCampaign.get(campaign.metaId) || []
      
      const currentMetrics = calculateMetrics(aggregateInsights(currentCampaignInsights))
      const previousMetrics = calculateMetrics(aggregateInsights(previousCampaignInsights))
      
      return {
        campaign: {
          id: campaign._id,
          metaId: campaign.metaId,
          name: campaign.name,
          status: campaign.status,
        },
        current: currentMetrics,
        previous: previousMetrics,
        change: {
          spend: previousMetrics.spend > 0
            ? ((currentMetrics.spend - previousMetrics.spend) / previousMetrics.spend) * 100
            : 0,
          revenue: previousMetrics.revenue > 0
            ? ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100
            : 0,
          impressions: previousMetrics.impressions > 0
            ? ((currentMetrics.impressions - previousMetrics.impressions) / previousMetrics.impressions) * 100
            : 0,
          conversions: previousMetrics.conversions > 0
            ? ((currentMetrics.conversions - previousMetrics.conversions) / previousMetrics.conversions) * 100
            : 0,
          roas: previousMetrics.roas > 0
            ? ((currentMetrics.roas - previousMetrics.roas) / previousMetrics.roas) * 100
            : 0,
        },
      }
    })
    
    // Sort campaigns
    let sorted = campaignComparisons
    if (args.sortBy) {
      sorted = [...campaignComparisons].sort((a, b) => {
        const aValue = a.current[args.sortBy!]
        const bValue = b.current[args.sortBy!]
        return bValue - aValue
      })
    }
    
    // Apply limit
    if (args.limit) {
      sorted = sorted.slice(0, args.limit)
    }
    
    return sorted
  },
})