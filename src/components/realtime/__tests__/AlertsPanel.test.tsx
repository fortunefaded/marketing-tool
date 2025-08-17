import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { AlertsPanel } from '../AlertsPanel'
import { RealtimeAlert } from '../../../hooks/useRealtimeAlerts'

const mockAlerts: RealtimeAlert[] = [
  {
    id: 'alert-001',
    severity: 'critical',
    title: '売上急増',
    message: '過去1時間の売上が通常の200%を超えました',
    timestamp: new Date('2024-01-20T10:15:00'),
    acknowledged: false
  },
  {
    id: 'alert-002',
    severity: 'high',
    title: '在庫警告',
    message: '商品Aの在庫が残り10個になりました',
    timestamp: new Date('2024-01-20T10:10:00'),
    acknowledged: true
  },
  {
    id: 'alert-003',
    severity: 'medium',
    title: '配送遅延',
    message: '一部地域で配送の遅延が発生しています',
    timestamp: new Date('2024-01-20T10:05:00'),
    acknowledged: false
  }
]

describe('AlertsPanel', () => {
  const defaultProps = {
    alerts: mockAlerts,
    onAcknowledge: vi.fn(),
    onDismiss: vi.fn(),
    onClearAll: vi.fn()
  }

  it('アラートリストを表示する', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    expect(screen.getByText('売上急増')).toBeInTheDocument()
    expect(screen.getByText('在庫警告')).toBeInTheDocument()
    expect(screen.getByText('配送遅延')).toBeInTheDocument()
  })

  it('重要度に応じた色を表示する', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    const criticalAlert = screen.getByText('売上急増')
      .closest('[class*="border-l-4"]')
    expect(criticalAlert).toHaveClass('border-red-600')
    
    const highAlert = screen.getByText('在庫警告')
      .closest('[class*="border-l-4"]')
    expect(highAlert).toHaveClass('border-orange-500')
    
    const mediumAlert = screen.getByText('配送遅延')
      .closest('[class*="border-l-4"]')
    expect(mediumAlert).toHaveClass('border-yellow-500')
  })

  it('未確認アラートを強調表示する', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    const unacknowledgedAlert = screen.getByText('売上急増')
      .closest('[class*="border-l-4"]')
    expect(unacknowledgedAlert).toHaveClass('bg-gray-700')
    
    const acknowledgedAlert = screen.getByText('在庫警告')
      .closest('[class*="border-l-4"]')
    expect(acknowledgedAlert).toHaveClass('bg-gray-800')
  })

  it('確認ボタンをクリックできる', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    const acknowledgeButtons = screen.getAllByTitle('確認')
    fireEvent.click(acknowledgeButtons[0])
    
    expect(defaultProps.onAcknowledge).toHaveBeenCalledWith('alert-001')
  })

  it('削除ボタンをクリックできる', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    const dismissButtons = screen.getAllByTitle('削除')
    fireEvent.click(dismissButtons[0])
    
    expect(defaultProps.onDismiss).toHaveBeenCalledWith('alert-001')
  })

  it('すべてクリアボタンをクリックできる', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    const clearAllButton = screen.getByText('すべてクリア')
    fireEvent.click(clearAllButton)
    
    expect(defaultProps.onClearAll).toHaveBeenCalled()
  })

  it('アラートがない場合はメッセージを表示する', () => {
    render(<AlertsPanel {...defaultProps} alerts={[]} />)
    
    expect(screen.getByText('アラートはありません')).toBeInTheDocument()
  })

  it('タイムスタンプを適切にフォーマットする', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    expect(screen.getByText('10:15')).toBeInTheDocument()
    expect(screen.getByText('10:10')).toBeInTheDocument()
    expect(screen.getByText('10:05')).toBeInTheDocument()
  })

  it('最大表示数を制限できる', () => {
    render(<AlertsPanel {...defaultProps} maxDisplay={2} />)
    
    expect(screen.getByText('売上急増')).toBeInTheDocument()
    expect(screen.getByText('在庫警告')).toBeInTheDocument()
    expect(screen.queryByText('配送遅延')).not.toBeInTheDocument()
    
    expect(screen.getByText('他1件のアラート')).toBeInTheDocument()
  })

  it('カスタムクラスを適用する', () => {
    render(<AlertsPanel {...defaultProps} className="custom-class" />)
    
    const panel = screen.getByText('売上急増').closest('.custom-class')
    expect(panel).toBeInTheDocument()
  })

  it('低重要度アラートも表示する', () => {
    const alertsWithLow = [
      ...mockAlerts,
      {
        id: 'alert-004',
        severity: 'low' as const,
        title: '情報',
        message: 'システムメンテナンスのお知らせ',
        timestamp: new Date('2024-01-20T10:00:00'),
        acknowledged: false
      }
    ]
    
    render(<AlertsPanel {...defaultProps} alerts={alertsWithLow} />)
    
    const lowAlert = screen.getByText('情報')
      .closest('[class*="border-l-4"]')
    expect(lowAlert).toHaveClass('border-blue-500')
  })

  it('確認済みアラートでは確認ボタンを無効化する', () => {
    render(<AlertsPanel {...defaultProps} />)
    
    // 在庫警告のアラート内の確認ボタンを探す
    const acknowledgedAlertContainer = screen.getByText('在庫警告')
      .closest('[class*="border-l-4"]')
    
    const acknowledgeButton = acknowledgedAlertContainer
      ?.querySelector('button[title="確認済み"]')
    
    expect(acknowledgeButton).toBeDisabled()
  })
})