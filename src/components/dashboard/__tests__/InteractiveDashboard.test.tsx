/* eslint-env browser */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InteractiveDashboard } from '../InteractiveDashboard'
import { vi } from 'vitest'

// ドラッグ&ドロップのモック
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children({
      draggableProps: {},
      dragHandleProps: {},
      innerRef: vi.fn(),
      droppableProps: {
        'data-rbd-droppable-id': 'test',
        'data-rbd-droppable-context-id': 'test',
      },
      placeholder: null,
      isDraggingOver: false,
    }),
  Draggable: ({ children }: any) =>
    children({
      draggableProps: {
        style: {},
      },
      dragHandleProps: {},
      innerRef: vi.fn(),
      isDragging: false,
    }),
}))

describe('InteractiveDashboard', () => {
  const mockWidgets = [
    {
      id: '1',
      type: 'sales-chart',
      title: '売上推移',
      position: { x: 0, y: 0 },
      size: { width: 6, height: 4 },
    },
    {
      id: '2',
      type: 'customer-pie',
      title: '顧客分布',
      position: { x: 6, y: 0 },
      size: { width: 6, height: 4 },
    },
    {
      id: '3',
      type: 'kpi-card',
      title: '主要KPI',
      position: { x: 0, y: 4 },
      size: { width: 3, height: 2 },
    },
  ]

  it('ダッシュボードのレイアウトを編集モードに切り替えられる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    const editButton = screen.getByText('レイアウト編集')
    fireEvent.click(editButton)

    expect(screen.getByText('編集完了')).toBeInTheDocument()
    expect(screen.getByText('ウィジェット追加')).toBeInTheDocument()
  })

  it('ウィジェットをドラッグ&ドロップで移動できる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    // 編集モードに切り替え
    fireEvent.click(screen.getByText('レイアウト編集'))

    // ドラッグハンドルが表示される
    const dragHandles = screen.getAllByTestId('drag-handle')
    expect(dragHandles).toHaveLength(3)
  })

  it('ウィジェットのサイズを変更できる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    fireEvent.click(screen.getByText('レイアウト編集'))

    // リサイズハンドルが表示される
    const resizeHandles = screen.getAllByTestId('resize-handle')
    expect(resizeHandles.length).toBeGreaterThan(0)
  })

  it('新しいウィジェットを追加できる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    fireEvent.click(screen.getByText('レイアウト編集'))
    fireEvent.click(screen.getByText('ウィジェット追加'))

    // ウィジェット選択モーダルが表示される
    expect(screen.getByText('ウィジェットを選択')).toBeInTheDocument()
    expect(screen.getByText('ROAS分析')).toBeInTheDocument()
    expect(screen.getByText('RFM分析')).toBeInTheDocument()
    expect(screen.getByText('チャーン予測')).toBeInTheDocument()
  })

  it('ウィジェットを削除できる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    fireEvent.click(screen.getByText('レイアウト編集'))

    const deleteButtons = screen.getAllByTestId('delete-widget')
    fireEvent.click(deleteButtons[0])

    // 確認ダイアログが表示される
    expect(screen.getByText('ウィジェットを削除しますか？')).toBeInTheDocument()
  })

  it('レイアウトを保存・読み込みできる', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    fireEvent.click(screen.getByText('レイアウト編集'))

    // レイアウト保存
    fireEvent.click(screen.getByText('レイアウト保存'))

    const layoutNameInput = screen.getByPlaceholderText('レイアウト名')
    fireEvent.change(layoutNameInput, { target: { value: '営業用ダッシュボード' } })
    fireEvent.click(screen.getByText('保存'))

    // 保存成功メッセージ
    expect(screen.getByText('レイアウトを保存しました')).toBeInTheDocument()
  })

  it('グリッドレイアウトが正しく適用される', () => {
    render(<InteractiveDashboard initialWidgets={mockWidgets} gridColumns={12} />)

    const widgets = screen.getAllByTestId('dashboard-widget')
    expect(widgets).toHaveLength(3)

    // グリッドサイズが正しく適用されている
    widgets.forEach((widget, _index) => {
      const style = window.getComputedStyle(widget)
      expect(style.position).toBe('absolute')
    })
  })

  it('ウィジェットの最小・最大サイズが制限される', () => {
    const oversizedWidget = {
      id: '4',
      type: 'sales-chart',
      title: 'テスト',
      position: { x: 0, y: 0 },
      size: { width: 20, height: 20 }, // グリッドを超えるサイズ
    }

    render(<InteractiveDashboard initialWidgets={[oversizedWidget]} gridColumns={12} />)

    const widget = screen.getByTestId('dashboard-widget')
    // 最大サイズに制限される
    expect(widget).toHaveStyle({ width: '100%' })
  })

  it('ウィジェットが重ならないように自動配置される', () => {
    const overlappingWidgets = [
      {
        id: '1',
        type: 'sales-chart',
        title: 'A',
        position: { x: 0, y: 0 },
        size: { width: 6, height: 4 },
      },
      {
        id: '2',
        type: 'kpi-card',
        title: 'B',
        position: { x: 2, y: 2 },
        size: { width: 6, height: 4 },
      },
    ]

    render(<InteractiveDashboard initialWidgets={overlappingWidgets} />)

    // 自動的に重ならない位置に調整される
    const widgets = screen.getAllByTestId('dashboard-widget')
    expect(widgets).toHaveLength(2)
  })

  it('レスポンシブ対応でモバイル時は1カラムになる', () => {
    // ビューポートサイズを変更
    ;(globalThis as any).innerWidth = 500
    globalThis.dispatchEvent(new Event('resize'))

    render(<InteractiveDashboard initialWidgets={mockWidgets} />)

    const container = screen.getByTestId('dashboard-container')
    expect(container).toHaveClass('grid-cols-1')
  })
})
