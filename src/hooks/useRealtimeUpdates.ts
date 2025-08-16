import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface RealtimeUpdateOptions {
  accountId?: string
  campaignIds?: string[]
  updateInterval?: number
  enableAlerts?: boolean
  alertThresholds?: {
    maxCpa?: number
    minRoas?: number
    maxSpend?: number
  }
}

export function useRealtimeUpdates(options: RealtimeUpdateOptions = {}) {
  const {
    accountId,
    campaignIds,
    updateInterval = 30000, // 30 seconds
    enableAlerts = true,
    alertThresholds = {
      maxCpa: 5000,
      minRoas: 2.0,
      maxSpend: 100000,
    },
  } = options

  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Subscribe to campaign updates
  const campaigns = useQuery(
    api.functions.realtime.subscribeToCampaignUpdates,
    enableAlerts ? {
      accountId,
      campaignIds,
    } : 'skip'
  )

  // Subscribe to creative updates
  const creatives = useQuery(
    api.functions.realtime.subscribeToCreativeUpdates,
    enableAlerts ? {
      limit: 50,
    } : 'skip'
  )

  // Subscribe to alerts
  const alertData = useQuery(
    api.functions.realtime.subscribeToAlerts,
    enableAlerts
      ? {
          thresholds: alertThresholds,
        }
      : 'skip'
  )

  // Mutation for updating metrics
  const updateMetrics = useMutation(api.functions.realtime.updateCampaignMetrics)

  // Simulate real-time updates (in production, this would come from webhooks or polling)
  useEffect(() => {
    if (!campaigns || updateInterval <= 0) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())
      // In production, this would trigger a refresh or handle incoming updates
      console.log('Checking for real-time updates...')
    }, updateInterval)

    return () => clearInterval(interval)
  }, [campaigns, updateInterval])

  // Handle connection status
  useEffect(() => {
    const handleOnline = () => setIsConnected(true)
    const handleOffline = () => setIsConnected(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Format alerts for display
  const alerts = alertData?.alerts.map((alert) => ({
    ...alert,
    formattedMessage: `${alert.message}: ${alert.metric} = ${
      alert.metric === 'Spend' || alert.metric === 'CPA'
        ? `¥${alert.value.toLocaleString()}`
        : alert.value.toFixed(2)
    } (閾値: ${
      alert.metric === 'Spend' || alert.metric === 'CPA'
        ? `¥${alert.threshold.toLocaleString()}`
        : alert.threshold.toFixed(2)
    })`,
  }))

  // Calculate real-time statistics
  const stats = {
    totalCampaigns: campaigns?.length || 0,
    totalCreatives: creatives?.length || 0,
    activeAlerts: alerts?.length || 0,
    criticalAlerts: alerts?.filter((a) => a.type === 'critical').length || 0,
    lastUpdate,
    isConnected,
  }

  return {
    // Data
    campaigns,
    creatives,
    alerts,
    stats,

    // Status
    isConnected,
    lastUpdate,

    // Actions
    updateMetrics,
    
    // Loading states
    isLoading: campaigns === undefined || creatives === undefined,
  }
}

// Hook for real-time metric updates in components
export function useRealtimeMetric(
  metricType: 'spend' | 'revenue' | 'impressions' | 'conversions',
  campaignId?: string
) {
  const [value, setValue] = useState<number>(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [lastValue, setLastValue] = useState<number>(0)

  const campaigns = useQuery(
    api.functions.realtime.subscribeToCampaignUpdates,
    campaignId ? {
      campaignIds: [campaignId],
    } : {}
  )

  useEffect(() => {
    if (!campaigns || campaigns.length === 0) return

    const currentValue = campaigns.reduce((sum, campaign) => {
      const metrics = campaign.currentMetrics
      switch (metricType) {
        case 'spend':
          return sum + metrics.spend
        case 'revenue':
          return sum + metrics.revenue
        case 'impressions':
          return sum + metrics.impressions
        case 'conversions':
          return sum + metrics.conversions
        default:
          return sum
      }
    }, 0)

    // Update value and trend
    setValue(currentValue)
    
    if (lastValue > 0) {
      if (currentValue > lastValue * 1.01) {
        setTrend('up')
      } else if (currentValue < lastValue * 0.99) {
        setTrend('down')
      } else {
        setTrend('stable')
      }
    }
    
    setLastValue(currentValue)
  }, [campaigns, metricType, lastValue])

  return {
    value,
    trend,
    formattedValue: 
      metricType === 'spend' || metricType === 'revenue'
        ? `¥${value.toLocaleString()}`
        : value.toLocaleString(),
  }
}