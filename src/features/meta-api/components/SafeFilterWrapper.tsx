/**
 * SafeFilterWrapper
 * フィルターコンポーネントのエラーハンドリングラッパー
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class SafeFilterWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Filter component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            フィルター機能で一時的な問題が発生しました。
            {this.state.error?.message && (
              <span className="block text-xs mt-1 font-mono">
                {this.state.error.message}
              </span>
            )}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}