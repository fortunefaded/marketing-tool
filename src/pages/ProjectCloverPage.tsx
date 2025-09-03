import { Component, ErrorInfo } from 'react'
import { ProjectCloverDashboard } from '../features/meta-api/components/ProjectCloverDashboard'
import { vibe } from '@/lib/vibelogger'

interface State {
  hasError: boolean
  error: Error | null
}

class ProjectCloverErrorBoundary extends Component<{}, State> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    const isConvexError = error.message.includes('Symbol(functionName)') || 
                         error.message.includes('Cannot read properties of undefined')
    
    if (isConvexError) {
      vibe.warn('Convex error in Project Clover', { error: error.message })
    } else {
      vibe.bad('Unexpected error in Project Clover', { error: error.message })
    }
  }

  render() {
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
                プロジェクト・クローバーを利用するには、Convexサーバーが必要です：
              </p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono mb-4">
                npx convex dev
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  再試行
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  戻る
                </button>
              </div>
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
      
      // 通常のエラー表示
      return (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              プロジェクト・クローバーでエラーが発生しました
            </h1>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800 text-sm">
                {this.state.error?.message}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                再試行
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                🍀 プロジェクト・クローバー
              </h1>
              <p className="text-gray-600">
                広告疲労度分析と最適化のための統合ダッシュボード
              </p>
            </div>
            <ProjectCloverDashboard />
          </div>
        </div>
      </div>
    )
  }
}

export { ProjectCloverErrorBoundary as ProjectCloverPage }