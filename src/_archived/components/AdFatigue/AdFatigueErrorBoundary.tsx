import React, { Component, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { handleReactError, getUserFriendlyErrorMessage } from '../../utils/globalErrorHandler'
import { logger } from '../../utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
  retryCount: number
}

export class AdFatigueErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('[AdFatigueErrorBoundary] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })

    // グローバルエラーハンドラーに通知
    handleReactError(error, errorInfo)

    // 親コンポーネントに通知
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({ errorInfo })
  }

  handleRetry = () => {
    logger.info('[AdFatigueErrorBoundary] Retrying...')
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      const userMessage = getUserFriendlyErrorMessage(this.state.error)
      const isMetaApiError = this.state.error.message?.includes('Meta') || 
                            this.state.error.message?.includes('API')

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-red-800">
                    エラーが発生しました
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    {userMessage}
                  </p>
                  
                  {/* デバッグ情報（開発環境のみ） */}
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-4">
                      <summary className="text-xs text-red-600 cursor-pointer">
                        技術的な詳細
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={this.handleRetry}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                      再試行
                    </button>

                    {isMetaApiError && (
                      <a
                        href="/settings"
                        className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        設定を確認
                      </a>
                    )}
                  </div>

                  {this.state.retryCount > 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      再試行回数: {this.state.retryCount}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}