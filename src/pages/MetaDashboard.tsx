import React, { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { DashboardLayoutWithFilters } from '../components/dashboard/DashboardLayoutWithFilters'
import type { FilterState } from '../components/filters/CustomFilterPanel'
import { MetricCard } from '../components/metrics/MetricCard'
import { CampaignTable } from '../components/campaigns/CampaignTable'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { ComparisonPanel } from '../components/analytics/ComparisonPanel'
import { CreativePerformanceGrid } from '../components/creatives/CreativePerformanceGrid'
import { CreativeDetailModal } from '../components/creatives/CreativeDetailModal'
import { useComparisonAnalytics } from '../hooks/useComparisonAnalytics'
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates'
import { useMockDataInitializer } from '../hooks/useMockData'
import { RealtimeStatus } from '../components/realtime/RealtimeStatus'
import { RealtimeMetricCard } from '../components/realtime/RealtimeMetricCard'
import { AlertsPanel } from '../components/realtime/AlertsPanel'
import type { CreativeData } from '../components/creatives/CreativePerformanceGrid'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  PhotoIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

export const MetaDashboard: React.FC = () => {
  const [showComparison, setShowComparison] = useState(false)
  const [showCreatives, setShowCreatives] = useState(false)
  const [showRealtime, setShowRealtime] = useState(false)
  const [selectedCreative, setSelectedCreative] = useState<CreativeData | null>(null)
  const [filters, setFilters] = useState<FilterState>({})
  
  // Initialize mock data
  useMockDataInitializer()
  
  // Fetch campaigns data from Convex
  const campaigns = useQuery(api.campaigns.listMetaCampaigns)
  
  // Fetch creative performance data
  const creatives = useQuery(api.creatives.getCreativePerformance, {
    limit: 20,
  })
  
  // Use comparison analytics hook
  const {
    overallComparison,
    selectedComparison,
    setComparisonType,
    exportData,
    isLoading: comparisonLoading,
  } = useComparisonAnalytics({
    comparisonType: 'month-over-month',
  })

  // Use real-time updates hook (always call it to follow React rules)
  const realtimeData = useRealtimeUpdates({
    enableAlerts: showRealtime,
    alertThresholds: {
      maxCpa: 5000,
      minRoas: 2.0,
      maxSpend: 100000,
    },
  })
  
  // Extract values based on whether realtime is enabled
  const {
    campaigns: realtimeCampaigns,
    alerts,
    stats: realtimeStats,
    isConnected,
    lastUpdate,
  } = showRealtime ? realtimeData : {
    campaigns: [],
    alerts: [],
    stats: {
      totalCampaigns: 0,
      totalCreatives: 0,
      activeAlerts: 0,
      criticalAlerts: 0,
      lastUpdate: new Date(),
      isConnected: false,
    },
    isConnected: false,
    lastUpdate: new Date(),
  }

  // Filter campaigns based on active filters
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return []
    
    let filtered = [...campaigns]
    
    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(c => 
        filters.status!.includes(c.status.toUpperCase())
      )
    }
    
    // Apply performance filters
    if (filters.metrics) {
      const { minSpend, maxSpend, minRoas, maxRoas } = filters.metrics
      
      filtered = filtered.filter(c => {
        const roas = c.spent > 0 ? c.revenue / c.spent : 0
        
        if (minSpend !== undefined && c.spent < minSpend) return false
        if (maxSpend !== undefined && c.spent > maxSpend) return false
        if (minRoas !== undefined && roas < minRoas) return false
        if (maxRoas !== undefined && roas > maxRoas) return false
        
        return true
      })
    }
    
    return filtered
  }, [campaigns, filters])
  
  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) {
      return {
        totalSpent: 0,
        totalRevenue: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCtr: 0,
        averageCpc: 0,
        averageCpa: 0,
        roas: 0,
      }
    }

    const totals = filteredCampaigns.reduce(
      (acc, campaign) => ({
        spent: acc.spent + (campaign.spent || 0),
        revenue: acc.revenue + (campaign.revenue || 0),
        impressions: acc.impressions + (campaign.impressions || 0),
        clicks: acc.clicks + (campaign.clicks || 0),
        conversions: acc.conversions + (campaign.conversions || 0),
      }),
      { spent: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
    )

    return {
      totalSpent: totals.spent,
      totalRevenue: totals.revenue,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      averageCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      averageCpc: totals.clicks > 0 ? totals.spent / totals.clicks : 0,
      averageCpa: totals.conversions > 0 ? totals.spent / totals.conversions : 0,
      roas: totals.spent > 0 ? totals.revenue / totals.spent : 0,
    }
  }, [filteredCampaigns])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return []

    // Group by date and aggregate metrics
    const dataByDate = new Map<
      string,
      {
        date: string
        impressions: number
        clicks: number
        conversions: number
        cost: number
        revenue: number
      }
    >()

    campaigns.forEach((campaign) => {
      if (!campaign.dailyMetrics) return

      campaign.dailyMetrics.forEach((metric) => {
        const existing = dataByDate.get(metric.date) || {
          date: metric.date,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          revenue: 0,
        }

        dataByDate.set(metric.date, {
          date: metric.date,
          impressions: existing.impressions + metric.impressions,
          clicks: existing.clicks + metric.clicks,
          conversions: existing.conversions + metric.conversions,
          cost: existing.cost + metric.cost,
          revenue: existing.revenue + metric.revenue,
        })
      })
    })

    return Array.from(dataByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days
  }, [campaigns])

  const isLoading = campaigns === undefined
  const error: string | undefined = undefined // You might want to handle errors from Convex

  // Prepare campaign options for filter panel
  const campaignOptions = useMemo(() => {
    return campaigns?.map(c => ({ id: c._id, name: c.name })) || []
  }, [campaigns])

  return (
    <DashboardLayoutWithFilters
      title="広告パフォーマンスダッシュボード"
      showDateRange={true}
      showFilters={true}
      isLoading={isLoading}
      error={error}
      onFiltersChange={setFilters}
      campaignOptions={campaignOptions}
    >
      {/* Real-time Status */}
      <div className="mb-4">
        <RealtimeStatus
          isConnected={isConnected}
          lastUpdate={lastUpdate}
          activeAlerts={realtimeStats.activeAlerts}
          criticalAlerts={realtimeStats.criticalAlerts}
        />
      </div>

      {/* Toggle Buttons */}
      <div className="mb-6 flex justify-end space-x-3">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
          {showComparison ? '比較を隠す' : '比較を表示'}
        </button>
        <button
          onClick={() => setShowCreatives(!showCreatives)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <PhotoIcon className="h-5 w-5 mr-2" />
          {showCreatives ? 'クリエイティブを隠す' : 'クリエイティブを表示'}
        </button>
        <button
          onClick={() => setShowRealtime(!showRealtime)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <BoltIcon className="h-5 w-5 mr-2" />
          {showRealtime ? 'リアルタイムを隠す' : 'リアルタイム表示'}
        </button>
      </div>

      {/* Alerts Panel */}
      {alerts && alerts.length > 0 && (
        <section className="mb-8">
          <AlertsPanel alerts={alerts} />
        </section>
      )}

      {/* Comparison Panel */}
      {showComparison && (
        <section className="mb-8">
          <ComparisonPanel
            data={overallComparison}
            onPeriodChange={(period) => setComparisonType(period as any)}
            onExport={(params) => exportData(params.format as 'csv' | 'json')}
            isLoading={comparisonLoading}
          />
        </section>
      )}
      {/* Key Metrics Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">主要指標</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {showRealtime ? (
            // Real-time metric cards
            <>
              <RealtimeMetricCard
                title="広告費用"
                metricType="spend"
                icon={<CurrencyDollarIcon className="h-6 w-6 text-gray-400" />}
              />
              <RealtimeMetricCard
                title="売上"
                metricType="revenue"
                icon={<ChartBarIcon className="h-6 w-6 text-gray-400" />}
              />
              <RealtimeMetricCard
                title="インプレッション"
                metricType="impressions"
                icon={<ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />}
              />
              <RealtimeMetricCard
                title="コンバージョン"
                metricType="conversions"
                icon={<ShoppingCartIcon className="h-6 w-6 text-gray-400" />}
              />
            </>
          ) : (
            // Standard metric cards
            <>
              <MetricCard
            title="広告費用"
            value={metrics.totalSpent}
            format="currency"
            icon={<CurrencyDollarIcon className="h-6 w-6 text-gray-400" />}
            comparison={
              overallComparison
                ? {
                    value: overallComparison.previous.metrics.spend,
                    period: overallComparison.previous.period,
                  }
                : {
                    value: metrics.totalSpent * 0.9, // Fallback
                    period: '前月',
                  }
            }
          />
          <MetricCard
            title="売上"
            value={metrics.totalRevenue}
            format="currency"
            icon={<ChartBarIcon className="h-6 w-6 text-gray-400" />}
            comparison={
              overallComparison
                ? {
                    value: overallComparison.previous.metrics.revenue,
                    period: overallComparison.previous.period,
                  }
                : {
                    value: metrics.totalRevenue * 0.8,
                    period: '前月',
                  }
            }
            trend="up"
          />
          <MetricCard
            title="ROAS"
            value={metrics.roas}
            format="decimal"
            icon={<ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />}
            comparison={
              overallComparison
                ? {
                    value: overallComparison.previous.metrics.roas,
                    period: overallComparison.previous.period,
                  }
                : {
                    value: metrics.roas * 0.95,
                    period: '前月',
                  }
            }
          />
          <MetricCard
            title="コンバージョン"
            value={metrics.totalConversions}
            format="number"
            icon={<ShoppingCartIcon className="h-6 w-6 text-gray-400" />}
            comparison={
              overallComparison
                ? {
                    value: overallComparison.previous.metrics.conversions,
                    period: overallComparison.previous.period,
                  }
                : {
                    value: metrics.totalConversions * 0.85,
                    period: '前月',
                  }
            }
            trend="up"
          />
            </>
          )}
        </div>
      </section>

      {/* Performance Chart Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンス推移</h2>
        <PerformanceChart
          data={chartData}
          metrics={['impressions', 'clicks', 'conversions']}
          showMetricSelector={true}
          height={400}
        />
      </section>

      {/* Creative Performance Section */}
      {showCreatives && creatives && (
        <section className="mb-8">
          <CreativePerformanceGrid
            creatives={creatives}
            onCreativeClick={setSelectedCreative}
          />
        </section>
      )}

      {/* Campaign Table Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">キャンペーン一覧</h2>
        <CampaignTable
          campaigns={
            filteredCampaigns?.map((c) => ({
              id: c._id,
              name: c.name,
              status: c.status as 'active' | 'paused' | 'completed',
              budget: c.budget || 0,
              spent: c.spent || 0,
              impressions: c.impressions || 0,
              clicks: c.clicks || 0,
              conversions: c.conversions || 0,
              ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
              cpc: c.clicks > 0 ? c.spent / c.clicks : 0,
              cpa: c.conversions > 0 ? c.spent / c.conversions : 0,
              roas: c.spent > 0 ? (c.revenue || 0) / c.spent : 0,
              startDate: c.startDate || '',
              endDate: c.endDate || '',
            })) || []
          }
          onRowClick={() => {
            // Navigate to campaign detail page
          }}
          onSort={() => {
            // Implement sorting logic
          }}
        />
      </section>

      {/* Creative Detail Modal */}
      <CreativeDetailModal
        creative={selectedCreative}
        isOpen={selectedCreative !== null}
        onClose={() => setSelectedCreative(null)}
      />

      {/* Floating Alerts - TODO: FloatingAlertsコンポーネントを実装する */}
      {/* {showRealtime && alerts && (
        <FloatingAlerts
          alerts={alerts}
          position="top-right"
          autoHide={true}
          autoHideDelay={5000}
        />
      )} */}
    </DashboardLayoutWithFilters>
  )
}
