import { useState, useEffect, useCallback, useRef } from 'react'
import { getWebSocketService } from '../services/websocketService'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface RealtimeAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date | string
  acknowledged: boolean
}

export interface UseRealtimeAlertsOptions {
  maxAlerts?: number
  severityFilter?: AlertSeverity[]
  playSound?: boolean
  soundUrl?: string
  onNewAlert?: (alert: RealtimeAlert) => void
}

export interface UseRealtimeAlertsReturn {
  alerts: RealtimeAlert[]
  unreadCount: number
  acknowledgeAlert: (alertId: string) => void
  dismissAlert: (alertId: string) => void
  clearAll: () => void
}

export function useRealtimeAlerts(options: UseRealtimeAlertsOptions = {}): UseRealtimeAlertsReturn {
  const {
    maxAlerts = 50,
    severityFilter,
    playSound = false,
    soundUrl = '/sounds/alert.mp3',
    onNewAlert,
  } = options

  const [alerts, setAlerts] = useState<RealtimeAlert[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 未読カウントの計算
  const unreadCount = alerts.filter(alert => !alert.acknowledged).length

  // アラート音の初期化
  useEffect(() => {
    if (playSound && typeof window !== 'undefined' && window.Audio) {
      audioRef.current = new Audio(soundUrl)
    }
  }, [playSound, soundUrl])

  // 新しいアラートの処理
  const handleNewAlert = useCallback((alertData: any) => {
    // 重要度フィルター
    if (severityFilter && !severityFilter.includes(alertData.severity)) {
      return
    }

    const newAlert: RealtimeAlert = {
      ...alertData,
      timestamp: typeof alertData.timestamp === 'string' 
        ? new Date(alertData.timestamp) 
        : alertData.timestamp,
      acknowledged: false,
    }

    setAlerts(current => {
      // 重複チェック
      if (current.some(a => a.id === newAlert.id)) {
        return current
      }

      // 新しいアラートを追加
      let updated = [newAlert, ...current]
      
      // 最大数を超えた場合、古いものを削除
      if (updated.length > maxAlerts) {
        updated = updated.slice(0, maxAlerts)
      }

      return updated
    })

    // コールバック実行
    onNewAlert?.(newAlert)

    // 音声再生
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play alert sound:', err)
      })
    }
  }, [maxAlerts, severityFilter, playSound, onNewAlert])

  // アラートの確認
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(current =>
      current.map(alert =>
        alert.id === alertId
          ? { ...alert, acknowledged: true }
          : alert
      )
    )

    // WebSocketで確認を送信
    try {
      const ws = getWebSocketService()
      if (ws.isConnected()) {
        ws.acknowledgeAlert(alertId)
      }
    } catch (error) {
      // WebSocketサービスが利用できない場合は無視
      console.warn('WebSocket service not available:', error)
    }
  }, [])

  // アラートの削除
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(current => current.filter(alert => alert.id !== alertId))
  }, [])

  // すべてクリア
  const clearAll = useCallback(() => {
    setAlerts([])
  }, [])

  // WebSocketイベントのリスニング
  useEffect(() => {
    try {
      const ws = getWebSocketService()
      
      ws.on('alert', handleNewAlert)

      return () => {
        ws.off('alert', handleNewAlert)
      }
    } catch (error) {
      // WebSocketサービスが初期化されていない場合は何もしない
      console.warn('WebSocket service not available:', error)
    }
  }, [handleNewAlert])

  return {
    alerts,
    unreadCount,
    acknowledgeAlert,
    dismissAlert,
    clearAll,
  }
}