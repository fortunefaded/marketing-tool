import React from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { RealtimeAlert, AlertSeverity } from '../../hooks/useRealtimeAlerts'

export interface AlertsPanelProps {
  alerts: RealtimeAlert[]
  onAcknowledge: (alertId: string) => void
  onDismiss: (alertId: string) => void
  onClearAll: () => void
  maxDisplay?: number
  className?: string
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onDismiss,
  onClearAll,
  maxDisplay = 10,
  className = ''
}) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-600 text-red-400'
      case 'high':
        return 'border-orange-500 text-orange-400'
      case 'medium':
        return 'border-yellow-500 text-yellow-400'
      case 'low':
        return 'border-blue-500 text-blue-400'
      default:
        return 'border-gray-500 text-gray-400'
    }
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
      case 'medium':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
      case 'low':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const displayAlerts = alerts.slice(0, maxDisplay)
  const remainingCount = alerts.length - maxDisplay

  if (alerts.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>アラートはありません</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayAlerts.map((alert) => {
        const timestamp = typeof alert.timestamp === 'string' 
          ? new Date(alert.timestamp) 
          : alert.timestamp

        return (
          <div
            key={alert.id}
            className={`
              rounded-lg border-l-4 p-4 
              ${getSeverityColor(alert.severity)}
              ${alert.acknowledged ? 'bg-gray-800' : 'bg-gray-700'}
              transition-all duration-200
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <h4 className="font-semibold">{alert.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {format(timestamp, 'HH:mm', { locale: ja })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                    title="確認"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                )}
                {alert.acknowledged && (
                  <button
                    disabled
                    className="p-1 opacity-50 cursor-not-allowed"
                    title="確認済み"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                  title="削除"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {remainingCount > 0 && (
        <p className="text-sm text-gray-500 text-center">
          他{remainingCount}件のアラート
        </p>
      )}

      {alerts.length > 0 && (
        <button
          onClick={onClearAll}
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors flex items-center justify-center space-x-2"
        >
          <TrashIcon className="h-4 w-4" />
          <span>すべてクリア</span>
        </button>
      )}
    </div>
  )
}