import { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '../utils/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error, errorInfo)
    
    // Convex関連のエラーかどうか判定
    const isConvexError = error.message.includes('Symbol(functionName)') || 
                         error.message.includes('Cannot read properties of undefined')
    
    if (isConvexError) {
      logger.warn('Convex initialization error detected')
    }
    
    this.setState({
      error,
      errorInfo,
    })
  }

  public render() {
    if (this.state.hasError) {
      const isConvexError = this.state.error?.message.includes('Symbol(functionName)') || 
                           this.state.error?.message.includes('Cannot read properties of undefined')
      
      if (isConvexError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white border border-red-200 rounded-lg p-6 max-w-lg shadow-lg">
              <h2 className="text-red-800 text-lg font-semibold mb-2">
                Convex接続エラー
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                開発サーバーが起動していることを確認してください：
              </p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono mb-4">
                npx convex dev
              </pre>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                再試行
              </button>
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  エラー詳細
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                  {this.state.error?.message}
                </pre>
              </details>
            </div>
          </div>
        )
      }
      
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-red-500 mb-4">エラーが発生しました</h1>
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2">エラー詳細:</h2>
              <pre className="text-red-400 text-sm overflow-auto">
                {this.state.error && this.state.error.toString()}
              </pre>
              {this.state.errorInfo && (
                <>
                  <h3 className="text-lg font-semibold mt-4 mb-2">スタックトレース:</h3>
                  <pre className="text-gray-400 text-xs overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
