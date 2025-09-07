// 環境に応じたログ出力ユーティリティ
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  debug: isDevelopment ? console.log : () => {},
  info: isDevelopment ? console.info : () => {},
  warn: console.warn,
  error: console.error,
  
  // 構造化ログ
  api: (event: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[API] ${event}`, data)
    }
  },
  
  // パフォーマンス計測
  time: isDevelopment ? console.time : () => {},
  timeEnd: isDevelopment ? console.timeEnd : () => {},
}

// グループ化されたログ
export const logGroup = isDevelopment 
  ? (title: string, fn: () => void) => {
      console.group(title)
      fn()
      console.groupEnd()
    }
  : () => {}