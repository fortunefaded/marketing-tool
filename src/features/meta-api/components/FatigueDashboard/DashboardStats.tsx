/**
 * DashboardStats.tsx
 * 統計カード部分のコンポーネント
 */

import React from 'react'
import { StatCard } from '../StatCard'
import { FatigueData } from '../../types'

interface DashboardStatsProps {
  data: FatigueData[]
  enableAggregation?: boolean
  aggregationMetrics?: {
    inputRows: number
    outputRows: number
    dataReduction: string
  }
  fatigueStatistics?: {
    criticalCount: number
    warningCount: number
    healthyCount: number
    averageScore: number
  }
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  data,
  enableAggregation,
  aggregationMetrics,
  fatigueStatistics
}) => {
  if (data.length === 0) {
    return null
  }

  const criticalCount = fatigueStatistics?.criticalCount || 
    data.filter((d: any) => d.status === 'critical').length
  
  const warningCount = fatigueStatistics?.warningCount ||
    data.filter((d: any) => d.status === 'warning').length
  
  const healthyCount = fatigueStatistics?.healthyCount ||
    data.filter((d: any) => d.status === 'healthy').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title={enableAggregation ? "広告数" : "Total"} 
        value={data.length} 
        subtitle={
          enableAggregation && aggregationMetrics 
            ? `${aggregationMetrics.inputRows}行 → ${aggregationMetrics.outputRows}行` 
            : undefined
        }
      />
      
      <StatCard
        title="Critical"
        value={criticalCount}
        color="red"
        subtitle={`${((criticalCount / data.length) * 100).toFixed(1)}%`}
      />
      
      <StatCard
        title="Warning"
        value={warningCount}
        color="yellow"
        subtitle={`${((warningCount / data.length) * 100).toFixed(1)}%`}
      />
      
      <StatCard
        title="Healthy"
        value={healthyCount}
        color="green"
        subtitle={`${((healthyCount / data.length) * 100).toFixed(1)}%`}
      />
      
      {fatigueStatistics?.averageScore !== undefined && (
        <StatCard
          title="平均スコア"
          value={fatigueStatistics.averageScore}
          color={
            fatigueStatistics.averageScore >= 70 ? 'red' :
            fatigueStatistics.averageScore >= 50 ? 'yellow' : 'green'
          }
          subtitle="0-100 scale"
        />
      )}
    </div>
  )
}