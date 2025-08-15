import React, { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { MetricCard } from '../components/metrics/MetricCard'
import { CampaignTable } from '../components/campaigns/CampaignTable'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export const MetaDashboard: React.FC = () => {
  // Fetch campaigns data from Convex
  const campaigns = useQuery(api.campaigns.listMetaCampaigns)

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    if (!campaigns || campaigns.length === 0) {
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

    const totals = campaigns.reduce(
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
  }, [campaigns])

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

  return (
    <DashboardLayout
      title="広告パフォーマンスダッシュボード"
      showDateRange={true}
      showFilters={true}
      isLoading={isLoading}
      error={error}
    >
      {/* Key Metrics Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">主要指標</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="広告費用"
            value={metrics.totalSpent}
            format="currency"
            icon={<CurrencyDollarIcon className="h-6 w-6 text-gray-400" />}
            comparison={{
              value: metrics.totalSpent * 0.9, // Mock previous period
              period: '前月',
            }}
          />
          <MetricCard
            title="売上"
            value={metrics.totalRevenue}
            format="currency"
            icon={<ChartBarIcon className="h-6 w-6 text-gray-400" />}
            comparison={{
              value: metrics.totalRevenue * 0.8,
              period: '前月',
            }}
            trend="up"
          />
          <MetricCard
            title="ROAS"
            value={metrics.roas}
            format="decimal"
            icon={<ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />}
            comparison={{
              value: metrics.roas * 0.95,
              period: '前月',
            }}
          />
          <MetricCard
            title="コンバージョン"
            value={metrics.totalConversions}
            format="number"
            icon={<ShoppingCartIcon className="h-6 w-6 text-gray-400" />}
            comparison={{
              value: metrics.totalConversions * 0.85,
              period: '前月',
            }}
            trend="up"
          />
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

      {/* Campaign Table Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">キャンペーン一覧</h2>
        <CampaignTable
          campaigns={
            campaigns?.map((c) => ({
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
    </DashboardLayout>
  )
}
