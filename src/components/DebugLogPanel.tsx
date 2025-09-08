import React, { useState, useEffect, useRef } from 'react'
import { Copy, ChevronDown, ChevronUp, X, Filter, Download, Bug } from 'lucide-react'
import { debugLogger, type LogCategory } from '../utils/debugLogger'

export function DebugLogPanel() {
  const [logs, setLogs] = useState(debugLogger.getLogs())
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'ALL'>('ALL')
  const [filterLevel, setFilterLevel] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all')
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // デバッグロガーの更新を購読
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs)
    })

    return unsubscribe
  }, [])

  // 新しいログが追加されたら自動スクロール
  useEffect(() => {
    if (logContainerRef.current && isExpanded) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, isExpanded])

  // フィルタリングされたログ
  const filteredLogs = logs.filter((log) => {
    if (filterCategory !== 'ALL' && log.category !== filterCategory) return false
    if (filterLevel !== 'all' && log.level !== filterLevel) return false
    return true
  })

  const handleCopyToClipboard = () => {
    const logText = debugLogger.export()
    navigator.clipboard
      .writeText(logText)
      .then(() => {
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 2000)
      })
      .catch((err) => {
        debugLogger.error('UI', 'DebugLogPanel', 'クリップボードへのコピーに失敗', err)
      })
  }

  const handleDownload = () => {
    const logText = debugLogger.export()
    const blob = new Blob([logText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    debugLogger.clear()
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug':
        return 'text-gray-400'
      case 'info':
        return 'text-blue-400'
      case 'warn':
        return 'text-yellow-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-300'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'API':
        return 'bg-purple-600'
      case 'DATA':
        return 'bg-green-600'
      case 'UI':
        return 'bg-blue-600'
      case 'FILTER':
        return 'bg-yellow-600'
      case 'STATE':
        return 'bg-indigo-600'
      case 'ROUTE':
        return 'bg-pink-600'
      case 'PERFORMANCE':
        return 'bg-orange-600'
      case 'ERROR':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-gray-700"
        >
          <Bug className="w-4 h-4" />
          <span className="text-xs">デバッグログ</span>
          {filteredLogs.length > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {filteredLogs.length}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[500px] max-w-[calc(100vw-2rem)]">
      <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">デバッグログ</span>
            <span className="text-xs text-gray-400">
              ({filteredLogs.length}/{logs.length}件)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyToClipboard}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors relative"
              title="クリップボードにコピー"
            >
              <Copy className="w-4 h-4" />
              {showNotification && (
                <span className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  コピーしました！
                </span>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="ダウンロード"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="クリア"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title={isExpanded ? '折りたたむ' : '展開'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="最小化"
            >
              <span className="text-xs">_</span>
            </button>
          </div>
        </div>

        {/* フィルター */}
        {isExpanded && (
          <div className="px-3 py-2 border-b border-gray-700 flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">全カテゴリ</option>
              <option value="API">API</option>
              <option value="DATA">DATA</option>
              <option value="UI">UI</option>
              <option value="FILTER">FILTER</option>
              <option value="STATE">STATE</option>
              <option value="ROUTE">ROUTE</option>
              <option value="PERFORMANCE">PERFORMANCE</option>
              <option value="ERROR">ERROR</option>
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value="all">全レベル</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
        )}

        {/* ログ表示エリア */}
        {isExpanded && (
          <div
            ref={logContainerRef}
            className="max-h-[400px] overflow-y-auto p-3 font-mono text-[11px] space-y-1 bg-gray-950"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">ログがありません</div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 py-1 ${getLevelColor(log.level)}`}
                >
                  <span className="text-gray-600 text-[10px] min-w-[80px]">
                    {log.timestamp.split('T')[1].split('.')[0]}
                  </span>
                  <span
                    className={`px-1 py-0 text-[10px] rounded text-white ${getCategoryColor(log.category)}`}
                  >
                    {log.category}
                  </span>
                  <span className="text-cyan-400 text-[10px] min-w-[100px]">{log.component}</span>
                  <div className="flex-1">
                    <div className="break-all">{log.message}</div>
                    {log.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-[10px]">
                          データを表示
                        </summary>
                        <pre className="mt-1 text-[10px] text-gray-400 whitespace-pre-wrap break-all bg-gray-800 p-1 rounded">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
