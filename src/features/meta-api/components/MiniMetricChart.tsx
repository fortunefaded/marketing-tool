import { LineChart, Line, YAxis, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts'

export type ChartType = 'line' | 'area'
export type MetricType = 'frequency' | 'ctr' | 'cpm' | 'spend' | 'conversions' | 'impressions' | 'engagement'

interface MiniMetricChartProps {
  data?: Array<{ date: string; value: number }>
  currentValue: number
  metricType: MetricType
  chartType?: ChartType
  showThreshold?: boolean
}

const METRIC_CONFIG = {
  frequency: {
    threshold: 3.5,
    domain: [0, 5],
    colors: { safe: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    warningRatio: 0.8
  },
  ctr: {
    threshold: null, // CTRは相対的な低下で判断
    domain: [0, 'auto'],
    colors: { safe: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' },
    baselineDecline: 0.25 // 25%低下で危険
  },
  cpm: {
    threshold: null, // CPMは相対的な上昇で判断
    domain: [0, 'auto'],
    colors: { safe: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    baselineIncrease: 0.20 // 20%上昇で危険
  },
  spend: {
    threshold: null,
    domain: [0, 'auto'],
    colors: { safe: '#6366f1', warning: '#f59e0b', danger: '#ef4444' },
  },
  conversions: {
    threshold: null,
    domain: [0, 'auto'],
    colors: { safe: '#8b5cf6', warning: '#f59e0b', danger: '#ef4444' },
  },
  impressions: {
    threshold: null,
    domain: [0, 'auto'],
    colors: { safe: '#06b6d4', warning: '#f59e0b', danger: '#ef4444' },
  },
  engagement: {
    threshold: 0.7, // 業界平均
    domain: [0, 3],
    colors: { safe: '#ec4899', warning: '#f59e0b', danger: '#ef4444' },
    warningRatio: 0.7
  }
}

export function MiniMetricChart({ 
  data, 
  currentValue, 
  metricType,
  chartType = 'line',
  showThreshold = true
}: MiniMetricChartProps) {
  // ダミーデータ生成（実際のデータがない場合）
  const chartData = data || generateDummyData(currentValue, metricType)
  const config = METRIC_CONFIG[metricType]
  
  // メトリクスごとの色判定
  const getColor = () => {
    if (metricType === 'frequency' && config.threshold) {
      if (currentValue >= config.threshold) return config.colors.danger
      if (currentValue >= config.threshold * config.warningRatio!) return config.colors.warning
      return config.colors.safe
    }
    
    if (metricType === 'ctr' && chartData.length > 0) {
      const baseline = chartData[0].value
      const declineRate = (baseline - currentValue) / baseline
      if ('baselineDecline' in config && config.baselineDecline) {
        if (declineRate >= config.baselineDecline) return config.colors.danger
        if (declineRate >= config.baselineDecline * 0.5) return config.colors.warning
      }
      return config.colors.safe
    }
    
    if (metricType === 'cpm' && chartData.length > 0) {
      const baseline = chartData[0].value
      const increaseRate = (currentValue - baseline) / baseline
      if ('baselineIncrease' in config && config.baselineIncrease) {
        if (increaseRate >= config.baselineIncrease) return config.colors.danger
        if (increaseRate >= config.baselineIncrease * 0.5) return config.colors.warning
      }
      return config.colors.safe
    }
    
    return config.colors.safe
  }
  
  const color = getColor()
  
  if (chartType === 'area') {
    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <YAxis hide domain={config.domain as [number, number] | [number, string]} />
            {showThreshold && config.threshold && (
              <ReferenceLine y={config.threshold} stroke={config.colors.danger} strokeWidth={1} strokeDasharray="3 3" />
            )}
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <YAxis hide domain={config.domain as [number, number] | [number, string]} />
          {showThreshold && config.threshold && (
            <ReferenceLine y={config.threshold} stroke={config.colors.danger} strokeWidth={1} strokeDasharray="3 3" />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// メトリクスタイプに応じたダミーデータ生成
function generateDummyData(currentValue: number, metricType: MetricType, days: number = 7): Array<{ date: string; value: number }> {
  const data = []
  
  // メトリクスごとのトレンドパターン
  const trendPatterns = {
    frequency: { start: 0.7, volatility: 0.1, trend: 'increasing' },
    ctr: { start: 1.3, volatility: 0.15, trend: 'decreasing' },
    cpm: { start: 0.8, volatility: 0.1, trend: 'increasing' },
    spend: { start: 0.9, volatility: 0.05, trend: 'stable' },
    conversions: { start: 1.1, volatility: 0.2, trend: 'volatile' },
    impressions: { start: 0.95, volatility: 0.1, trend: 'stable' },
    engagement: { start: 1.2, volatility: 0.15, trend: 'decreasing' }
  }
  
  const pattern = trendPatterns[metricType]
  const baseValue = currentValue * pattern.start
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    let value: number
    const progress = (days - i) / days
    
    switch (pattern.trend) {
      case 'increasing':
        value = baseValue + (currentValue - baseValue) * progress
        break
      case 'decreasing':
        value = baseValue - (baseValue - currentValue) * progress
        break
      case 'volatile':
        value = currentValue + (Math.sin(i) * currentValue * pattern.volatility)
        break
      case 'stable':
      default:
        value = currentValue * (1 + (Math.random() - 0.5) * pattern.volatility)
    }
    
    // ランダムな変動を追加
    value += (Math.random() - 0.5) * currentValue * pattern.volatility
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value) // 負の値を防ぐ
    })
  }
  
  return data
}