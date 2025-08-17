import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { ConnectionStatus } from '../ConnectionStatus'

describe('ConnectionStatus', () => {
  it('接続中状態を表示する', () => {
    render(<ConnectionStatus status="connected" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-green-500')
    expect(screen.getByText('接続中')).toBeInTheDocument()
  })

  it('接続中状態でアニメーションを表示する', () => {
    render(<ConnectionStatus status="connecting" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-yellow-500')
    expect(screen.getByText('接続中...')).toBeInTheDocument()
    
    // アニメーション要素の確認
    expect(indicator).toHaveClass('animate-pulse')
  })

  it('切断状態を表示する', () => {
    render(<ConnectionStatus status="disconnected" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-gray-500')
    expect(screen.getByText('切断中')).toBeInTheDocument()
  })

  it('エラー状態を表示する', () => {
    render(<ConnectionStatus status="error" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-red-500')
    expect(screen.getByText('エラー')).toBeInTheDocument()
  })

  it('カスタムクラスを適用する', () => {
    render(<ConnectionStatus status="connected" className="custom-class" />)
    
    const container = screen.getByText('接続中').closest('div')
    expect(container).toHaveClass('custom-class')
  })

  it('コンパクトモードで表示する', () => {
    render(<ConnectionStatus status="connected" compact />)
    
    expect(screen.queryByText('接続中')).not.toBeInTheDocument()
    expect(screen.getByTestId('connection-status')).toBeInTheDocument()
  })

  it('ツールチップを表示する', () => {
    render(<ConnectionStatus status="connected" showTooltip />)
    
    const container = screen.getByText('接続中').closest('div')
    expect(container).toHaveAttribute('title', 'WebSocket接続状態: 接続中')
  })

  it('再接続中状態を表示する', () => {
    render(<ConnectionStatus status="reconnecting" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-yellow-500')
    expect(screen.getByText('再接続中...')).toBeInTheDocument()
    
    // アニメーション要素の確認
    expect(indicator).toHaveClass('animate-pulse')
  })

  it('初期化中状態を表示する', () => {
    render(<ConnectionStatus status="initializing" />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-blue-500')
    expect(screen.getByText('初期化中...')).toBeInTheDocument()
  })

  it('不明な状態でデフォルト表示をする', () => {
    render(<ConnectionStatus status={'unknown' as any} />)
    
    const indicator = screen.getByTestId('connection-status')
    expect(indicator).toHaveClass('bg-gray-500')
    expect(screen.getByText('不明')).toBeInTheDocument()
  })
})