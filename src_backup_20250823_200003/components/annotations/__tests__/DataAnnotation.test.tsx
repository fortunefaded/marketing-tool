import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataAnnotation } from '../DataAnnotation'
import { vi } from 'vitest'

describe('DataAnnotation', () => {
  const mockOnSave = vi.fn()
  const mockOnDelete = vi.fn()

  const mockAnnotations = [
    {
      id: '1',
      text: '売上が急増した日',
      dataPoint: { date: '2024-01-15', value: 50000 },
      author: 'user@example.com',
      createdAt: new Date('2024-01-16'),
      color: '#10B981',
    },
    {
      id: '2',
      text: 'キャンペーン開始',
      dataPoint: { date: '2024-01-20', value: 30000 },
      author: 'admin@example.com',
      createdAt: new Date('2024-01-20'),
      color: '#3B82F6',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('既存のアノテーションが表示される', () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('売上が急増した日')).toBeInTheDocument()
    expect(screen.getByText('キャンペーン開始')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('新しいアノテーションを追加できる', async () => {
    render(
      <DataAnnotation
        annotations={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        currentDataPoint={{ date: '2024-01-25', value: 45000 }}
      />
    )

    // 追加ボタンをクリック
    fireEvent.click(screen.getByText('アノテーション追加'))

    // フォームが表示される
    expect(screen.getByLabelText('コメント')).toBeInTheDocument()

    // テキストを入力
    const textarea = screen.getByLabelText('コメント')
    fireEvent.change(textarea, { target: { value: '重要なイベント' } })

    // 色を選択
    const colorPicker = screen.getByTestId('color-green')
    fireEvent.click(colorPicker)

    // 保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        text: '重要なイベント',
        dataPoint: { date: '2024-01-25', value: 45000 },
        color: '#10B981',
      })
    })
  })

  it('アノテーションを編集できる', async () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    // 編集ボタンをクリック
    const editButtons = screen.getAllByTestId('edit-annotation')
    fireEvent.click(editButtons[0])

    // 編集フォームが表示される
    const textarea = screen.getByDisplayValue('売上が急増した日')
    fireEvent.change(textarea, { target: { value: '売上が急増した日（修正）' } })

    // 保存
    fireEvent.click(screen.getByText('更新'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          text: '売上が急増した日（修正）',
        })
      )
    })
  })

  it('アノテーションを削除できる', async () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    // 削除ボタンをクリック
    const deleteButtons = screen.getAllByTestId('delete-annotation')
    fireEvent.click(deleteButtons[0])

    // 確認ダイアログが表示される
    expect(screen.getByText('このアノテーションを削除しますか？')).toBeInTheDocument()

    // 確認
    fireEvent.click(screen.getByText('削除'))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })
  })

  it('アノテーションの色を変更できる', () => {
    render(<DataAnnotation annotations={[]} onSave={mockOnSave} onDelete={mockOnDelete} />)

    fireEvent.click(screen.getByText('アノテーション追加'))

    // 色選択パレットが表示される
    expect(screen.getByTestId('color-green')).toBeInTheDocument()
    expect(screen.getByTestId('color-blue')).toBeInTheDocument()
    expect(screen.getByTestId('color-yellow')).toBeInTheDocument()
    expect(screen.getByTestId('color-red')).toBeInTheDocument()
    expect(screen.getByTestId('color-purple')).toBeInTheDocument()

    // 色を選択
    fireEvent.click(screen.getByTestId('color-purple'))

    // 選択された色がハイライトされる
    expect(screen.getByTestId('color-purple')).toHaveClass('ring-2')
  })

  it('アノテーションをフィルタリングできる', () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    // 検索フィルター
    const searchInput = screen.getByPlaceholderText('アノテーションを検索')
    fireEvent.change(searchInput, { target: { value: 'キャンペーン' } })

    // フィルタリングされた結果
    expect(screen.getByText('キャンペーン開始')).toBeInTheDocument()
    expect(screen.queryByText('売上が急増した日')).not.toBeInTheDocument()
  })

  it('アノテーションを日付でソートできる', () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    // ソートボタン
    const sortButton = screen.getByText('新しい順')
    fireEvent.click(sortButton)

    // ソート順が変更される
    expect(screen.getByText('古い順')).toBeInTheDocument()

    // アノテーションの順序を確認
    const annotations = screen.getAllByTestId('annotation-item')
    expect(annotations[0]).toHaveTextContent('売上が急増した日')
  })

  it('アノテーションにタグを追加できる', () => {
    render(<DataAnnotation annotations={[]} onSave={mockOnSave} onDelete={mockOnDelete} />)

    fireEvent.click(screen.getByText('アノテーション追加'))

    // タグ入力
    const tagInput = screen.getByPlaceholderText('タグを追加（Enterで確定）')
    fireEvent.change(tagInput, { target: { value: '重要' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    // タグが追加される
    expect(screen.getByText('#重要')).toBeInTheDocument()

    // 複数のタグ
    fireEvent.change(tagInput, { target: { value: '売上' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('#売上')).toBeInTheDocument()
  })

  it('アノテーションをエクスポートできる', () => {
    render(
      <DataAnnotation annotations={mockAnnotations} onSave={mockOnSave} onDelete={mockOnDelete} />
    )

    // エクスポートボタン
    fireEvent.click(screen.getByText('エクスポート'))

    // エクスポート形式の選択
    expect(screen.getByText('CSV形式')).toBeInTheDocument()
    expect(screen.getByText('JSON形式')).toBeInTheDocument()
    expect(screen.getByText('Markdown形式')).toBeInTheDocument()
  })

  it('グラフ上でアノテーションポイントが表示される', () => {
    render(
      <DataAnnotation
        annotations={mockAnnotations}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        showOnChart={true}
      />
    )

    // チャート上のマーカー
    const markers = screen.getAllByTestId('annotation-marker')
    expect(markers).toHaveLength(2)

    // マーカーにホバーでツールチップ表示
    fireEvent.mouseEnter(markers[0])

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('売上が急増した日')
  })
})
