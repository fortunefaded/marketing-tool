import React from 'react'
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Transition } from '@headlessui/react'

interface Alert {
  type: 'warning' | 'critical'
  message: string
  campaignId: string
  metric: string
  value: number
  threshold: number
  formattedMessage: string
}

interface AlertsPanelProps {
  alerts: Alert[]
  onDismiss?: (campaignId: string) => void
  className?: string
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onDismiss,
  className = '',
}) => {
  if (!alerts || alerts.length === 0) {
    return null
  }

  const criticalAlerts = alerts.filter((a) => a.type === 'critical')
  const warningAlerts = alerts.filter((a) => a.type === 'warning')

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                重要なアラート
              </h3>
              <div className="space-y-2">
                {criticalAlerts.map((alert, index) => (
                  <div
                    key={`${alert.campaignId}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm text-red-700">
                      {alert.formattedMessage}
                    </p>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(alert.campaignId)}
                        className="ml-3 text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                警告
              </h3>
              <div className="space-y-2">
                {warningAlerts.map((alert, index) => (
                  <div
                    key={`${alert.campaignId}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm text-yellow-700">
                      {alert.formattedMessage}
                    </p>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(alert.campaignId)}
                        className="ml-3 text-yellow-600 hover:text-yellow-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Floating alerts component for global notifications
interface FloatingAlertsProps {
  alerts: Alert[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoHide?: boolean
  autoHideDelay?: number
}

export const FloatingAlerts: React.FC<FloatingAlertsProps> = ({
  alerts,
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 5000,
}) => {
  const [visibleAlerts, setVisibleAlerts] = React.useState<Alert[]>([])
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    // Filter out dismissed alerts
    const newAlerts = alerts.filter(
      (alert) => !dismissedIds.has(alert.campaignId)
    )
    setVisibleAlerts(newAlerts)

    // Auto-hide logic
    if (autoHide && newAlerts.length > 0) {
      const timer = setTimeout(() => {
        setVisibleAlerts([])
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [alerts, dismissedIds, autoHide, autoHideDelay])

  const handleDismiss = (campaignId: string) => {
    setDismissedIds((prev) => new Set(prev).add(campaignId))
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-sm`}>
      <Transition
        show={visibleAlerts.length > 0}
        enter="transition-all duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition-all duration-300"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="space-y-2">
          {visibleAlerts.map((alert, index) => (
            <div
              key={`${alert.campaignId}-${index}`}
              className={`${
                alert.type === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-yellow-500 text-white'
              } rounded-lg shadow-lg p-4 flex items-center justify-between`}
            >
              <div className="flex items-start">
                {alert.type === 'critical' ? (
                  <XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{alert.formattedMessage}</p>
              </div>
              <button
                onClick={() => handleDismiss(alert.campaignId)}
                className="ml-4 flex-shrink-0 hover:opacity-75"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </Transition>
    </div>
  )
}