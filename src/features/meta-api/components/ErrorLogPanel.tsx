import { useEffect, useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface LogEntry {
  id: string
  timestamp: Date
  level: 'error' | 'warning' | 'info' | 'success'
  message: string
  details?: any
}

export function ErrorLogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    // console.logをオーバーライド
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    console.log = function(...args) {
      originalConsoleLog.apply(console, args)
      
      // 特定のキーワードを含むログをキャプチャ
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      if (message.includes('🎯') || message.includes('📅') || message.includes('📊') || 
          message.includes('🔍') || message.includes('📦') || message.includes('🚀') ||
          message.includes('dateRange') || message.includes('modalProps')) {
        addLog('info', message, args[1])
      }
    }

    console.error = function(...args) {
      originalConsoleError.apply(console, args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      addLog('error', message, args[1])
    }

    console.warn = function(...args) {
      originalConsoleWarn.apply(console, args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      addLog('warning', message, args[1])
    }

    // クリーンアップ
    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [])

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      details
    }
    
    // setStateをマイクロタスクで遅延実行してレンダリング競合を回避
    queueMicrotask(() => {
      setLogs(prev => [...prev.slice(-50), newLog]) // 最新50件を保持
    })
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch(level) {
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    }
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch(level) {
      case 'error':
        return 'bg-red-50 text-red-900 border-red-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200'
      case 'info':
        return 'bg-blue-50 text-blue-900 border-blue-200'
      case 'success':
        return 'bg-green-50 text-green-900 border-green-200'
    }
  }

  // 最小化時は小さなバッジのみ表示
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-gray-800"
        >
          <InformationCircleIcon className="h-5 w-5" />
          <span className="text-sm">ログ ({logs.length})</span>
          {logs.filter(l => l.level === 'error').length > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {logs.filter(l => l.level === 'error').length}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed ${isExpanded ? 'inset-4' : 'bottom-4 right-4 w-96'} z-50 transition-all duration-300`}>
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${isExpanded ? 'h-full' : 'max-h-96'}`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">デバッグログ</h3>
            <span className="text-sm text-gray-500">({logs.length}件)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearLogs}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="クリア"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title={isExpanded ? "縮小" : "拡大"}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="最小化"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-200 rounded text-gray-600"
              title="閉じる"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ログリスト */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">ログがまだありません</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border text-xs ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-2">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {log.timestamp.toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          fractionalSecondDigits: 3 
                        })}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                      {log.message}
                    </pre>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                          詳細を表示
                        </summary>
                        <pre className="mt-1 p-1 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}