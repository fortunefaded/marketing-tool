/**
 * 統一デバッグログシステム
 * すべてのコンポーネントから使用する共通のログユーティリティ
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory =
  | 'API'
  | 'DATA'
  | 'UI'
  | 'FILTER'
  | 'STATE'
  | 'ROUTE'
  | 'PERFORMANCE'
  | 'ERROR'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  component: string
  message: string
  data?: any
  stack?: string
}

class DebugLogger {
  private logs: LogEntry[] = []
  private maxLogs: number = 500
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()
  private isEnabled: boolean = true

  constructor() {
    // ブラウザのグローバル変数として公開
    if (typeof window !== 'undefined') {
      ;(window as any).__DEBUG_LOGGER__ = this
    }
  }

  private createEntry(
    level: LogLevel,
    category: LogCategory,
    component: string,
    message: string,
    data?: any
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      component,
      message,
      data: data ? this.sanitizeData(data) : undefined,
    }

    // エラーの場合はスタックトレースを追加
    if (level === 'error') {
      entry.stack = new Error().stack
    }

    return entry
  }

  private sanitizeData(data: any): any {
    try {
      // 循環参照を防ぐためにJSON.stringify/parseを使用
      return JSON.parse(
        JSON.stringify(data, (key, value) => {
          // 大きすぎるデータは省略
          if (typeof value === 'string' && value.length > 1000) {
            return value.substring(0, 1000) + '... (truncated)'
          }
          // 配列が大きすぎる場合は最初の10件のみ
          if (Array.isArray(value) && value.length > 10) {
            return [...value.slice(0, 10), `... and ${value.length - 10} more items`]
          }
          return value
        })
      )
    } catch (e) {
      return { error: 'Failed to serialize data', originalType: typeof data }
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)

    // 最大ログ数を超えたら古いものから削除
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // リスナーに通知
    this.notifyListeners()

    // コンソールにも出力
    this.outputToConsole(entry)
  }

  private outputToConsole(entry: LogEntry) {
    if (!this.isEnabled) return

    const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}] [${entry.category}] ${entry.component}:`
    const style = this.getConsoleStyle(entry.level)

    switch (entry.level) {
      case 'debug':
        console.log(`%c${prefix}`, style, entry.message, entry.data || '')
        break
      case 'info':
        console.info(`%c${prefix}`, style, entry.message, entry.data || '')
        break
      case 'warn':
        console.warn(`%c${prefix}`, style, entry.message, entry.data || '')
        break
      case 'error':
        console.error(`%c${prefix}`, style, entry.message, entry.data || '', entry.stack || '')
        break
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return 'color: #888; font-weight: normal;'
      case 'info':
        return 'color: #2563eb; font-weight: bold;'
      case 'warn':
        return 'color: #f59e0b; font-weight: bold;'
      case 'error':
        return 'color: #ef4444; font-weight: bold;'
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.logs))
  }

  // パブリックメソッド
  debug(category: LogCategory, component: string, message: string, data?: any) {
    this.addLog(this.createEntry('debug', category, component, message, data))
  }

  info(category: LogCategory, component: string, message: string, data?: any) {
    this.addLog(this.createEntry('info', category, component, message, data))
  }

  warn(category: LogCategory, component: string, message: string, data?: any) {
    this.addLog(this.createEntry('warn', category, component, message, data))
  }

  error(category: LogCategory, component: string, message: string, data?: any) {
    this.addLog(this.createEntry('error', category, component, message, data))
  }

  // ログの取得
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  // ログのクリア
  clear() {
    this.logs = []
    this.notifyListeners()
  }

  // リスナーの登録
  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // 有効/無効の切り替え
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // ログのエクスポート
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // 特定カテゴリのログのみ取得
  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter((log) => log.category === category)
  }

  // 特定コンポーネントのログのみ取得
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter((log) => log.component === component)
  }

  // パフォーマンス計測用
  startTimer(label: string): () => void {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.info('PERFORMANCE', 'Timer', `${label} took ${duration.toFixed(2)}ms`, { duration })
    }
  }
}

// シングルトンインスタンス
export const debugLogger = new DebugLogger()

// 便利なショートカット関数
export const logAPI = (component: string, message: string, data?: any) =>
  debugLogger.info('API', component, message, data)

export const logData = (component: string, message: string, data?: any) =>
  debugLogger.debug('DATA', component, message, data)

export const logUI = (component: string, message: string, data?: any) =>
  debugLogger.debug('UI', component, message, data)

export const logFilter = (component: string, message: string, data?: any) =>
  debugLogger.info('FILTER', component, message, data)

export const logState = (component: string, message: string, data?: any) =>
  debugLogger.debug('STATE', component, message, data)

export const logRoute = (component: string, message: string, data?: any) =>
  debugLogger.info('ROUTE', component, message, data)

export const logError = (component: string, message: string, error: any) =>
  debugLogger.error('ERROR', component, message, error)

export const logPerformance = (component: string, message: string, data?: any) =>
  debugLogger.info('PERFORMANCE', component, message, data)
