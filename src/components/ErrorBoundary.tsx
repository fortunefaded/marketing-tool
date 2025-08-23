import { Component, ErrorInfo, ReactNode } from 'react'

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
    this.setState({
      error,
      errorInfo,
    })
  }

  public render() {
    if (this.state.hasError) {
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
