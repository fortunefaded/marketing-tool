import React from 'react'
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface RealtimeStatusProps {
  isConnected: boolean
  lastUpdate: Date
  activeAlerts?: number
  criticalAlerts?: number
  className?: string
}

export const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  isConnected,
  lastUpdate,
  activeAlerts = 0,
  criticalAlerts = 0,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <WifiIcon
            className={`h-5 w-5 ${
              isConnected ? 'text-green-600' : 'text-gray-400'
            }`}
          />
          {isConnected && (
            <div className="absolute -top-1 -right-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
          )}
        </div>
        <span className={isConnected ? 'text-gray-700' : 'text-gray-500'}>
          {isConnected ? 'リアルタイム接続中' : 'オフライン'}
        </span>
      </div>

      {/* Last Update */}
      <div className="text-gray-500">
        最終更新:{' '}
        {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ja })}
      </div>

      {/* Alerts */}
      {activeAlerts > 0 && (
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon
            className={`h-5 w-5 ${
              criticalAlerts > 0 ? 'text-red-600' : 'text-yellow-600'
            }`}
          />
          <span
            className={
              criticalAlerts > 0 ? 'text-red-600' : 'text-yellow-600'
            }
          >
            {criticalAlerts > 0
              ? `${criticalAlerts}件の重要アラート`
              : `${activeAlerts}件のアラート`}
          </span>
        </div>
      )}
    </div>
  )
}