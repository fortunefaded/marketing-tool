import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class FatigueDashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FatigueDashboard error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const isConvexError = this.state.error?.message?.includes('Could not find public function')
      
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center max-w-lg">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">疲労度分析でエラーが発生しました</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isConvexError ? (
                <>
                  Convexサーバーとの接続に問題があります。
                  <br />
                  開発者ツールのコンソールでエラーを確認してください。
                </>
              ) : (
                this.state.error?.message || '予期しないエラーが発生しました'
              )}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ページを再読み込み
              </button>
            </div>
            {isConvexError && (
              <div className="mt-4 text-xs text-gray-500">
                <p>開発者向け: 以下のコマンドを実行してください:</p>
                <code className="mt-2 block bg-gray-100 p-2 rounded">
                  npx convex dev --typecheck=disable
                </code>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}