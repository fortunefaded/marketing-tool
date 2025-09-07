import React, { Component, ReactNode } from 'react'
import { FatigueDashboardFull } from './FatigueDashboardFull'

interface Props {
  accountId: string
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('FatigueDashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[600px] flex items-center justify-center p-8">
          <div className="max-w-lg w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                エラーが発生しました
              </h3>
              <p className="text-sm text-red-700">
                {this.state.error?.message || '予期しないエラーが発生しました'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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

// エラーバウンダリでラップした安全なコンポーネント
export const SafeFatigueDashboard: React.FC<Props> = ({ accountId }) => {
  return (
    <ErrorBoundary>
      <FatigueDashboardFull accountId={accountId} />
    </ErrorBoundary>
  )
}