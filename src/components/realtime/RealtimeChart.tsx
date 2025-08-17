import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getWebSocketService } from '../../services/websocketService'

export interface RealtimeChartProps {
  title: string
  dataKey: string
  color: string
  maxDataPoints?: number
  height?: number
  formatter?: (value: number) => string
  className?: string
  testId?: string
}

interface ChartData {
  timestamp: string
  value: number
  formattedTime: string
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  title,
  dataKey,
  color,
  maxDataPoints = 30,
  height = 300,
  formatter,
  className = '',
  testId
}) => {
  const [data, setData] = useState<ChartData[]>([])

  // データ更新ハンドラー
  const handleDataUpdate = useCallback((newData: any) => {
    if (dataKey in newData) {
      const timestamp = newData.timestamp || new Date().toISOString()
      const newPoint: ChartData = {
        timestamp,
        value: newData[dataKey],
        formattedTime: format(new Date(timestamp), 'HH:mm:ss', { locale: ja })
      }

      setData(current => {
        const updated = [...current, newPoint]
        // 最大データポイント数を超えた場合、古いものを削除
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints)
        }
        return updated
      })
    }
  }, [dataKey, maxDataPoints])

  // 増分更新ハンドラー
  const handleDeltaUpdate = useCallback((deltaData: any) => {
    if (dataKey in deltaData) {
      const timestamp = deltaData.timestamp || new Date().toISOString()
      
      setData(current => {
        if (current.length === 0) {
          // 初回データの場合
          return [{
            timestamp,
            value: deltaData[dataKey],
            formattedTime: format(new Date(timestamp), 'HH:mm:ss', { locale: ja })
          }]
        }

        // 最新データに増分を追加
        const lastValue = current[current.length - 1].value
        const newPoint: ChartData = {
          timestamp,
          value: lastValue + deltaData[dataKey],
          formattedTime: format(new Date(timestamp), 'HH:mm:ss', { locale: ja })
        }

        const updated = [...current, newPoint]
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints)
        }
        return updated
      })
    }
  }, [dataKey, maxDataPoints])

  // WebSocketイベントのリスニング
  useEffect(() => {
    try {
      const ws = getWebSocketService()
      
      ws.on('metrics:update', handleDataUpdate)
      ws.on('metrics:delta', handleDeltaUpdate)

      return () => {
        ws.off('metrics:update', handleDataUpdate)
        ws.off('metrics:delta', handleDeltaUpdate)
      }
    } catch (error) {
      // WebSocketサービスが初期化されていない場合は何もしない
      console.warn('WebSocket service not available:', error)
    }
  }, [handleDataUpdate, handleDeltaUpdate])

  // デフォルトフォーマッター
  const defaultFormatter = (value: number) => {
    if (dataKey === 'revenue' || dataKey === 'averageOrderValue') {
      return `¥${value.toLocaleString()}`
    }
    if (dataKey === 'conversionRate') {
      return `${value.toFixed(2)}%`
    }
    return value.toLocaleString()
  }

  const valueFormatter = formatter || defaultFormatter

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-6 ${className}`}
      data-testid={testId}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="formattedTime"
            stroke="#9CA3AF"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fontSize: 12 }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem'
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => [valueFormatter(value), title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}