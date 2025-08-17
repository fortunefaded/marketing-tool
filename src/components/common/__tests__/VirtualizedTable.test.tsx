import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VirtualizedTable } from '../VirtualizedTable'

// ResizeObserverモック（既に設定済みだが念のため）
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('VirtualizedTable', () => {
  const generateTestData = (count: number) => 
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000)
    }))

  const columns = [
    { key: 'id', header: 'ID', width: 100 },
    { key: 'name', header: '名前' },
    { 
      key: 'value', 
      header: '値',
      render: (item: any) => `¥${item.value.toLocaleString()}`
    }
  ]

  it('基本的なテーブルを表示する', () => {
    const data = generateTestData(10)
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
      />
    )

    // ヘッダーが表示される
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('名前')).toBeInTheDocument()
    expect(screen.getByText('値')).toBeInTheDocument()

    // データが表示される
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('カスタムレンダラーが機能する', () => {
    const data = [{ id: 1, name: 'Test', value: 1000 }]
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
      />
    )

    expect(screen.getByText('¥1,000')).toBeInTheDocument()
  })

  it('行数情報を表示する', () => {
    const data = generateTestData(100)
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
      />
    )

    // 初期表示時の行数情報
    expect(screen.getByText(/表示中:/)).toBeInTheDocument()
    expect(screen.getByText(/全100件/)).toBeInTheDocument()
  })

  it('スクロールで表示範囲が更新される', async () => {
    const data = generateTestData(1000)
    
    const { container } = render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
        rowHeight={50}
      />
    )

    const scrollContainer = container.querySelector('.overflow-auto')
    expect(scrollContainer).toBeInTheDocument()

    // 最初は上部のアイテムが表示される
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.queryByText('Item 100')).not.toBeInTheDocument()

    // スクロールをシミュレート
    fireEvent.scroll(scrollContainer!, { target: { scrollTop: 5000 } })

    // スクロール後は別のアイテムが表示される
    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })
  })

  it('行クリックイベントが動作する', () => {
    const data = generateTestData(10)
    const handleClick = jest.fn()
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
        onRowClick={handleClick}
      />
    )

    // 行をクリック
    const row = screen.getByText('Item 1').closest('div[class*="flex border-b"]')
    expect(row).toHaveClass('cursor-pointer')
    
    fireEvent.click(row!)
    expect(handleClick).toHaveBeenCalledWith(data[0])
  })

  it('空のデータを処理できる', () => {
    render(
      <VirtualizedTable
        data={[]}
        columns={columns}
        getRowKey={(_item, index) => index}
        height={400}
      />
    )

    expect(screen.getByText('表示中: 0 - 0 / 全0件')).toBeInTheDocument()
  })

  it('列幅が正しく適用される', () => {
    const data = generateTestData(5)
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
      />
    )

    // ID列の幅が100pxに設定されている
    const idHeader = screen.getByText('ID').parentElement
    expect(idHeader).toHaveStyle({ width: '100px' })
  })

  it('大量データでもパフォーマンスが維持される', () => {
    const largeData = generateTestData(10000)
    const startTime = performance.now()
    
    render(
      <VirtualizedTable
        data={largeData}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
      />
    )

    const renderTime = performance.now() - startTime
    
    // レンダリング時間が妥当な範囲内（1秒以内）
    expect(renderTime).toBeLessThan(1000)
    
    // 全てのデータが描画されていない（仮想化されている）
    const renderedRows = screen.queryAllByText(/Item \d+/)
    expect(renderedRows.length).toBeLessThan(50) // 表示されている行数は限定的
  })

  it('カスタム行の高さが適用される', () => {
    const data = generateTestData(10)
    const customRowHeight = 80
    
    render(
      <VirtualizedTable
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        height={400}
        rowHeight={customRowHeight}
      />
    )

    const row = screen.getByText('Item 1').closest('div[class*="flex border-b"]')
    expect(row).toHaveStyle({ height: `${customRowHeight}px` })
  })
})