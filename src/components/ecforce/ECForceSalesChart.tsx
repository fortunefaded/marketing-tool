import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ECForceOrder } from '@/types'

interface ECForceSalesChartProps {
  orders: ECForceOrder[]
}

export const ECForceSalesChart: React.FC<ECForceSalesChartProps> = ({ orders }) => {
  const chartData = useMemo(() => {
    // 日付ごとに集計
    const salesByDate = orders.reduce(
      (acc, order) => {
        const date = order.受注日.split(' ')[0] // YYYY/MM/DD部分のみ取得

        if (!acc[date]) {
          acc[date] = {
            date,
            売上: 0,
            注文数: 0,
            定期注文: 0,
            通常注文: 0,
          }
        }

        acc[date].売上 += order.小計
        acc[date].注文数 += 1

        if (order.定期ステータス === '有効') {
          acc[date].定期注文 += order.小計
        } else {
          acc[date].通常注文 += order.小計
        }

        return acc
      },
      {} as Record<string, any>
    )

    // 配列に変換してソート
    return Object.values(salesByDate)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // 直近30日間のみ表示
  }, [orders])

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `¥${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `¥${(value / 1000).toFixed(0)}K`
    }
    return `¥${value}`
  }

  const formatTooltip = (value: number) => {
    return `¥${value.toLocaleString()}`
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxis} />
          <Tooltip formatter={formatTooltip} labelFormatter={(label) => `日付: ${label}`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="売上"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="定期注文"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="通常注文"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
