/**
 * DebugLogDisplay.tsx
 * デバッグログを画面上に表示するコンポーネント
 */

import React, { useState, useEffect, useRef } from 'react'

interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  data?: any
}

interface DebugLogDisplayProps {
  isVisible: boolean
  onToggle: () => void
}

export const DebugLogDisplay: React.FC<DebugLogDisplayProps> = ({
  isVisible,
  onToggle
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const originalConsoleLog = useRef<any>()
  const originalConsoleError = useRef<any>()
  const originalConsoleWarn = useRef<any>()

  // コンソールログをキャプチャ
  useEffect(() => {
    if (!originalConsoleLog.current) {
      originalConsoleLog.current = console.log
      originalConsoleError.current = console.error
      originalConsoleWarn.current = console.warn
    }

    const addLog = (type: LogEntry['type'], message: string, ...args: any[]) => {
      const logEntry: LogEntry = {
        id: Date.now() + Math.random().toString(),
        timestamp: new Date(),
        type,
        message,
        data: args.length > 0 ? args : undefined
      }
      
      setLogs(prev => {
        const newLogs = [...prev, logEntry]
        // 最新100件のみ保持
        return newLogs.slice(-100)
      })
    }

    // Meta APIやプラットフォーム関連のログのみをキャプチャ
    console.log = (...args: any[]) => {
      originalConsoleLog.current(...args)
      const message = args.join(' ')
      if (message.includes('🎯') || message.includes('📊') || message.includes('✅') || message.includes('Meta API')) {
        addLog('info', message, ...args.slice(1))
      }
    }

    console.error = (...args: any[]) => {
      originalConsoleError.current(...args)
      const message = args.join(' ')
      if (message.includes('❌') || message.includes('Meta API') || message.includes('Platform')) {
        addLog('error', message, ...args.slice(1))
      }
    }

    console.warn = (...args: any[]) => {
      originalConsoleWarn.current(...args)
      const message = args.join(' ')
      if (message.includes('⚠️') || message.includes('Meta API') || message.includes('Platform')) {
        addLog('warning', message, ...args.slice(1))
      }
    }

    return () => {
      console.log = originalConsoleLog.current
      console.error = originalConsoleError.current
      console.warn = originalConsoleWarn.current
    }
  }, [])

  // 自動スクロール
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isAutoScroll])

  const clearLogs = () => {
    setLogs([])
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '📊'
    }
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="デバッグログを表示"
        >
          🐛 Debug
        </button>
      </div>
    )
  }

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onToggle} />
      
      {/* デバッグパネル */}
      <div className="fixed bottom-4 right-4 w-96 h-96 bg-white border border-gray-300 rounded-lg shadow-xl z-50 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🐛 デバッグログ</span>
            <span className="text-xs text-gray-500">({logs.length}/100)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`text-xs px-2 py-1 rounded ${
                isAutoScroll 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isAutoScroll ? '自動スクロール: ON' : '自動スクロール: OFF'}
            </button>
            <button
              onClick={clearLogs}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              クリア
            </button>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ログ表示エリア */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-900 text-sm font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              Meta API関連のログが表示されます
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="text-green-400 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`${getLogColor(log.type)} text-white`}>
                    {getLogIcon(log.type)}
                  </span>
                  <div className="flex-1 text-green-300">
                    {log.message}
                  </div>
                </div>
                {log.data && (
                  <div className="ml-6 text-gray-400 text-xs mt-1">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </>
  )
}