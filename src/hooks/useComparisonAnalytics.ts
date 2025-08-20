import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export type ComparisonType = 'month-over-month' | 'year-over-year' | 'quarter-over-quarter'

interface UseComparisonAnalyticsOptions {
  comparisonType?: ComparisonType
  accountId?: string
  campaignIds?: string[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useComparisonAnalytics(options: UseComparisonAnalyticsOptions = {}) {
  const {
    comparisonType = 'month-over-month',
    accountId,
    campaignIds,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
  } = options

  const [selectedComparison, setSelectedComparison] = useState<ComparisonType>(comparisonType)
  const [error, setError] = useState<Error | null>(null)

  // Fetch overall comparison data
  const overallComparison = useQuery(api.analytics.getCampaignComparison, {
    comparisonType: selectedComparison,
    accountId,
    campaignIds,
  })

  // Fetch campaign breakdown comparison
  const campaignBreakdown = useQuery(api.analytics.getCampaignBreakdownComparison, {
    comparisonType: selectedComparison,
    limit: 10,
    sortBy: 'revenue',
  })

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // In a real app, this would trigger a re-fetch
      console.log('Auto-refreshing comparison data...')
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Export function
  const exportData = async (format: 'csv' | 'json' = 'csv') => {
    if (!overallComparison) return

    try {
      const data = {
        overall: overallComparison,
        breakdown: campaignBreakdown,
        exportedAt: new Date().toISOString(),
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `comparison-${selectedComparison}-${new Date().toISOString()}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // CSV export
        const headers = [
          'Period',
          'Spend',
          'Revenue',
          'Impressions',
          'Clicks',
          'Conversions',
          'CTR',
          'CPC',
          'CPA',
          'ROAS',
        ]

        const rows = [
          headers.join(','),
          [
            overallComparison.current.period,
            overallComparison.current.metrics.spend,
            overallComparison.current.metrics.revenue,
            overallComparison.current.metrics.impressions,
            overallComparison.current.metrics.clicks,
            overallComparison.current.metrics.conversions,
            overallComparison.current.metrics.ctr.toFixed(2),
            overallComparison.current.metrics.cpc.toFixed(2),
            overallComparison.current.metrics.cpa.toFixed(2),
            overallComparison.current.metrics.roas.toFixed(2),
          ].join(','),
          [
            overallComparison.previous.period,
            overallComparison.previous.metrics.spend,
            overallComparison.previous.metrics.revenue,
            overallComparison.previous.metrics.impressions,
            overallComparison.previous.metrics.clicks,
            overallComparison.previous.metrics.conversions,
            overallComparison.previous.metrics.ctr.toFixed(2),
            overallComparison.previous.metrics.cpc.toFixed(2),
            overallComparison.previous.metrics.cpa.toFixed(2),
            overallComparison.previous.metrics.roas.toFixed(2),
          ].join(','),
        ]

        const csv = rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `comparison-${selectedComparison}-${new Date().toISOString()}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err as Error)
      console.error('Export failed:', err)
    }
  }

  // Calculate insights
  const insights = {
    topPerformer: campaignBreakdown?.[0]?.campaign?.name || null,
    biggestGrowth: campaignBreakdown?.reduce(
      (best, current) => {
        if (!best || current?.change?.revenue > best?.change?.revenue) {
          return current
        }
        return best
      },
      null as (typeof campaignBreakdown)[0] | null
    ),
    needsAttention:
      campaignBreakdown?.filter((c) => c?.current?.roas < 1 || c?.change?.roas < -10) || [],
  }

  return {
    // Data
    overallComparison,
    campaignBreakdown,
    insights,

    // State
    selectedComparison,
    isLoading: overallComparison === undefined || campaignBreakdown === undefined,
    error,

    // Actions
    setComparisonType: setSelectedComparison,
    exportData,

    // Utilities
    formatChange: (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%'
      const change = ((current - previous) / previous) * 100
      return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
    },
  }
}
