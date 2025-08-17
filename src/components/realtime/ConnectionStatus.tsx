import React from 'react'
import { ConnectionStatus as ConnectionStatusType } from '../../services/websocketService'

export interface ConnectionStatusProps {
  status: ConnectionStatusType | 'initializing' | 'reconnecting' | 'unknown'
  className?: string
  compact?: boolean
  showTooltip?: boolean
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  className = '',
  compact = false,
  showTooltip = false
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500'
      case 'disconnected':
        return 'bg-gray-500'
      case 'error':
        return 'bg-red-500'
      case 'initializing':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return '接続中'
      case 'connecting':
        return '接続中...'
      case 'disconnected':
        return '切断中'
      case 'error':
        return 'エラー'
      case 'reconnecting':
        return '再接続中...'
      case 'initializing':
        return '初期化中...'
      default:
        return '不明'
    }
  }

  const isAnimated = status === 'connecting' || status === 'reconnecting' || status === 'initializing'

  const tooltipText = showTooltip ? `WebSocket接続状態: ${getStatusText()}` : undefined

  return (
    <div 
      className={`flex items-center ${className}`}
      title={tooltipText}
    >
      <div className="relative">
        <span
          data-testid="connection-status"
          className={`
            inline-block w-3 h-3 rounded-full
            ${getStatusColor()}
            ${isAnimated ? 'animate-pulse' : ''}
          `}
        />
        {isAnimated && (
          <span 
            className={`
              absolute inset-0 rounded-full 
              ${getStatusColor()}
              animate-ping opacity-75
            `}
          />
        )}
      </div>
      {!compact && (
        <span className="ml-2 text-sm text-gray-300">
          {getStatusText()}
        </span>
      )}
    </div>
  )
}