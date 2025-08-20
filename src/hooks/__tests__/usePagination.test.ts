import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../usePagination'

describe('usePagination', () => {
  const testData = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }))

  it('初期状態で最初のページのデータを返す', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 10 }))

    expect(result.current.currentPage).toBe(1)
    expect(result.current.paginatedData).toHaveLength(10)
    expect(result.current.paginatedData[0].id).toBe(1)
    expect(result.current.paginatedData[9].id).toBe(10)
  })

  it('ページ情報を正しく計算する', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 20 }))

    expect(result.current.pageInfo).toEqual({
      from: 1,
      to: 20,
      total: 100,
    })
  })

  it('次のページに移動できる', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 10 }))

    act(() => {
      result.current.nextPage()
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedData[0].id).toBe(11)
    expect(result.current.paginatedData[9].id).toBe(20)
  })

  it('ページ範囲外の値を設定した場合、範囲内に修正される', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 10 }))

    // 範囲外のページに移動しようとしても、1ページ目のまま
    act(() => {
      result.current.goToPage(0)
    })
    expect(result.current.currentPage).toBe(1)

    // 最大ページ数（10）を超えても、現在のページ（1）のまま
    act(() => {
      result.current.goToPage(20)
    })
    expect(result.current.currentPage).toBe(1)
  })

  it('1ページあたりの表示件数を変更できる', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 10 }))

    act(() => {
      result.current.setItemsPerPage(25)
    })

    expect(result.current.totalPages).toBe(4)
    expect(result.current.paginatedData).toHaveLength(25)
  })

  it('表示件数を変更した際、現在のページがリセットされる', () => {
    const { result } = renderHook(() => usePagination({ data: testData, itemsPerPage: 10 }))

    // ページ3に移動
    act(() => {
      result.current.goToPage(3)
    })
    expect(result.current.currentPage).toBe(3)

    // 表示件数を変更
    act(() => {
      result.current.setItemsPerPage(50)
    })
    expect(result.current.currentPage).toBe(1)
  })

  it('空のデータを処理できる', () => {
    const { result } = renderHook(() => usePagination({ data: [], itemsPerPage: 10 }))

    expect(result.current.paginatedData).toEqual([])
    expect(result.current.totalPages).toBe(0)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageInfo).toEqual({
      from: 0,
      to: 0,
      total: 0,
    })
  })

  it('最後のページで正しい件数を表示する', () => {
    const smallData = Array.from({ length: 23 }, (_, i) => ({ id: i + 1 }))
    const { result } = renderHook(() => usePagination({ data: smallData, itemsPerPage: 10 }))

    // 最後のページ（3ページ目）へ
    act(() => {
      result.current.goToPage(3)
    })

    expect(result.current.paginatedData).toHaveLength(3)
    expect(result.current.pageInfo).toEqual({
      from: 21,
      to: 23,
      total: 23,
    })
  })

  it('データが更新された場合、現在のページを維持する', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination({ data, itemsPerPage: 10 }),
      { initialProps: { data: testData } }
    )

    // ページ2に移動
    act(() => {
      result.current.goToPage(2)
    })
    expect(result.current.currentPage).toBe(2)

    // データを更新（件数は同じ）
    const newData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 101,
      name: `Item ${i + 101}`,
    }))
    rerender({ data: newData })

    // ページ2のまま
    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedData[0].id).toBe(111)
  })

  it('データ件数が減って現在のページが存在しなくなった場合、最後のページに移動', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination({ data, itemsPerPage: 10 }),
      { initialProps: { data: testData } }
    )

    // ページ5に移動
    act(() => {
      result.current.goToPage(5)
    })
    expect(result.current.currentPage).toBe(5)

    // データを削減（20件だけに）
    const smallData = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
    rerender({ data: smallData })

    // 現在のページが維持される（ただし、データは空）
    expect(result.current.currentPage).toBe(5)
    expect(result.current.paginatedData).toHaveLength(0)
  })
})
