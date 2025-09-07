/**
 * デバッグヘルパー関数
 */

export interface DebugLog {
  type: string
  timestamp: Date
  data: any
}

/**
 * デバッグモードを有効化
 */
export function enableDebugMode() {
  if (typeof window !== 'undefined') {
    (window as any).DEBUG_FATIGUE = true
    (window as any).DEBUG_FATIGUE_LOGS = []
    console.log('🔧 Debug mode enabled. Check window.DEBUG_FATIGUE_LOGS for details.')
  }
}

/**
 * デバッグモードを無効化
 */
export function disableDebugMode() {
  if (typeof window !== 'undefined') {
    (window as any).DEBUG_FATIGUE = false
    console.log('🔧 Debug mode disabled.')
  }
}

/**
 * デバッグログを取得
 */
export function getDebugLogs(): DebugLog[] {
  if (typeof window !== 'undefined' && (window as any).DEBUG_FATIGUE_LOGS) {
    return (window as any).DEBUG_FATIGUE_LOGS
  }
  return []
}

/**
 * デバッグログをクリア
 */
export function clearDebugLogs() {
  if (typeof window !== 'undefined') {
    (window as any).DEBUG_FATIGUE_LOGS = []
    console.log('🔧 Debug logs cleared.')
  }
}

/**
 * デバッグサマリーを表示
 */
export function showDebugSummary() {
  const logs = getDebugLogs()
  const summary = {
    totalLogs: logs.length,
    byType: {} as Record<string, number>,
    lastLog: logs[logs.length - 1] || null,
    firstLog: logs[0] || null
  }
  
  logs.forEach(log => {
    summary.byType[log.type] = (summary.byType[log.type] || 0) + 1
  })
  
  console.log('📊 Debug Summary:', summary)
  return summary
}

// ブラウザのコンソールから簡単に使えるように、グローバルに公開
if (typeof window !== 'undefined') {
  (window as any).FatigueDebug = {
    enable: enableDebugMode,
    disable: disableDebugMode,
    getLogs: getDebugLogs,
    clearLogs: clearDebugLogs,
    summary: showDebugSummary
  }
}