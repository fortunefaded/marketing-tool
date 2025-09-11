import { useState, useEffect, useRef } from 'react'
import { Copy, ChevronDown, ChevronUp, X, Download, Bug, Trash2, Filter } from 'lucide-react'
import { debugLogger, type LogCategory } from '../utils/debugLogger'
import { vibe } from '../utils/vibelogger'

interface UnifiedLog {
  id: string
  timestamp: string
  source: 'debugLogger' | 'vibe'
  level: 'debug' | 'info' | 'warn' | 'error' | 'good' | 'bad'
  category?: string
  component?: string
  message: string
  data?: any
}

export function UnifiedDebugPanel() {
  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [filterSource, setFilterSource] = useState<'all' | 'debugLogger' | 'vibe'>('all')
  const [filterLevel, setFilterLevel] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const logContainerRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)

  // 開発環境でのみ表示
  if (import.meta.env.PROD) {
    return null
  }

  useEffect(() => {
    // debugLoggerの既存ログを取得
    const debugLogs = debugLogger.getLogs().map(log => ({
      id: `debug-${logIdCounter.current++}`,
      timestamp: log.timestamp,
      source: 'debugLogger' as const,
      level: log.level,
      category: log.category,
      component: log.component,
      message: log.message,
      data: log.data
    }))
    setLogs(debugLogs)

    // debugLoggerの更新を購読（レンダリング中の更新を避けるため遅延実行）
    const unsubscribeDebug = debugLogger.subscribe((newLogs) => {
      // setTimeout 0を使って次のイベントループで実行
      setTimeout(() => {
        const unified = newLogs.map(log => ({
          id: `debug-${logIdCounter.current++}`,
          timestamp: log.timestamp,
          source: 'debugLogger' as const,
          level: log.level,
          category: log.category,
          component: log.component,
          message: log.message,
          data: log.data
        }))
        setLogs(prev => {
          // 重複を避けるため、debugLoggerのログを置き換え
          const vibeLogs = prev.filter(l => l.source === 'vibe')
          return [...vibeLogs, ...unified].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
      }, 0)
    })

    // vibeloggerのログをインターセプト
    const originalMethods = {
      debug: vibe.debug?.bind(vibe),
      info: vibe.info?.bind(vibe),
      warn: vibe.warn?.bind(vibe),
      error: vibe.error?.bind(vibe),
      good: vibe.good?.bind(vibe),
      bad: vibe.bad?.bind(vibe),
      vibe: vibe.vibe?.bind(vibe),
      story: vibe.story?.bind(vibe)
    }
    
    const interceptVibe = (level: string) => {
      return function(this: any, ...args: any[]) {
        const message = args[0] || ''
        const data = args.slice(1)
        
        // setTimeout 0を使って次のイベントループで実行
        setTimeout(() => {
          setLogs(prev => [...prev, {
            id: `vibe-${logIdCounter.current++}`,
            timestamp: new Date().toISOString(),
            source: 'vibe',
            level: level as any,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            data: data.length > 0 ? data : undefined
          }])
        }, 0)
        
        // 元のメソッドを呼び出す
        const originalMethod = originalMethods[level as keyof typeof originalMethods]
        if (originalMethod) {
          return originalMethod(...args)
        }
      }
    }

    // vibeメソッドをオーバーライド（存在するメソッドのみ）
    if (vibe.debug) vibe.debug = interceptVibe('debug')
    if (vibe.info) vibe.info = interceptVibe('info')
    if (vibe.warn) vibe.warn = interceptVibe('warn')
    if (vibe.error) vibe.error = interceptVibe('error')
    if (vibe.good) vibe.good = interceptVibe('good')
    if (vibe.bad) vibe.bad = interceptVibe('error')

    return () => {
      unsubscribeDebug()
      // vibeメソッドを元に戻す
      if (originalMethods.debug) vibe.debug = originalMethods.debug
      if (originalMethods.info) vibe.info = originalMethods.info
      if (originalMethods.warn) vibe.warn = originalMethods.warn
      if (originalMethods.error) vibe.error = originalMethods.error
      if (originalMethods.good) vibe.good = originalMethods.good
      if (originalMethods.bad) vibe.bad = originalMethods.bad
    }
  }, [])

  // 新しいログが追加されたら自動スクロール
  useEffect(() => {
    if (logContainerRef.current && isExpanded && !isMinimized) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, isExpanded, isMinimized])

  // フィルタリングされたログ
  const filteredLogs = logs.filter((log) => {
    if (filterSource !== 'all' && log.source !== filterSource) return false
    if (filterLevel !== 'all' && log.level !== filterLevel) return false
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleCopyToClipboard = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.source}] [${log.level}] ${log.category || ''} ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    navigator.clipboard.writeText(logText).then(() => {
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 2000)
    })
  }

  const handleDownload = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.source}] [${log.level}] ${log.category || ''} ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-log-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setLogs([])
    debugLogger.clear()
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-blue-600'
      case 'warn': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'bad': return 'text-red-600'
      case 'good': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getSourceBadge = (source: string) => {
    return source === 'vibe' 
      ? 'bg-purple-100 text-purple-700' 
      : 'bg-blue-100 text-blue-700'
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
          title="デバッグパネルを開く"
        >
          <Bug className="w-5 h-5" />
          {filteredLogs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {filteredLogs.length}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[600px] bg-white border-l border-t border-gray-200 shadow-2xl z-50 flex flex-col max-h-[70vh]">
      {/* ヘッダー */}
      <div className="bg-gray-900 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <span className="font-semibold">統合デバッグログ</span>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            {filteredLogs.length} / {logs.length} 件
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="ログをクリア"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="ダウンロード"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="コピー"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* フィルター */}
      {isExpanded && (
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 flex-wrap">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as any)}
            className="text-xs px-2 py-1 border border-gray-300 rounded"
          >
            <option value="all">全ソース</option>
            <option value="debugLogger">DebugLogger</option>
            <option value="vibe">Vibe</option>
          </select>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="text-xs px-2 py-1 border border-gray-300 rounded"
          >
            <option value="all">全レベル</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="検索..."
            className="text-xs px-2 py-1 border border-gray-300 rounded flex-1 min-w-[100px]"
          />
        </div>
      )}

      {/* ログ表示エリア */}
      {isExpanded && (
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-gray-900 text-gray-100 p-2 font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-4">ログがありません</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="py-1 border-b border-gray-800 hover:bg-gray-800">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                  </span>
                  <span className={`text-[10px] px-1 rounded ${getSourceBadge(log.source)}`}>
                    {log.source}
                  </span>
                  <span className={`font-semibold ${getLevelColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  {log.category && (
                    <span className="text-cyan-400">[{log.category}]</span>
                  )}
                  <span className="text-gray-100 flex-1">{log.message}</span>
                </div>
                {log.data && (
                  <div className="ml-[140px] text-gray-400 text-[10px] mt-1">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 通知 */}
      {showNotification && (
        <div className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          クリップボードにコピーしました
        </div>
      )}
    </div>
  )
}