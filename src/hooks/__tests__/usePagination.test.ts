import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../usePagination'

describe('usePagination', () => {
  const testData = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`
  }))

  it('初期状態で最初のページのデータを返す', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 10 })
    )

    expect(result.current.currentPage).toBe(1)
    expect(result.current.paginatedData).toHaveLength(10)
    expect(result.current.paginatedData[0].id).toBe(1)
    expect(result.current.paginatedData[9].id).toBe(10)
  })

  it('ページ情報を正しく計算する', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 20 })
    )

    expect(result.current.pageInfo).toEqual({
      totalItems: 100,
      totalPages: 5,
      itemsPerPage: 20,
      startIndex: 0,
      endIndex: 19
    })
  })

  it('次のページに移動できる', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 10 })
    )

    act(() => {
      result.current.setCurrentPage(2)
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.paginatedData[0].id).toBe(11)
    expect(result.current.paginatedData[9].id).toBe(20)
  })

  it('ページ範囲外の値を設定した場合、範囲内に修正される', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 10 })
    )

    // 0以下の場合は1に
    act(() => {
      result.current.setCurrentPage(0)
    })
    expect(result.current.currentPage).toBe(1)

    // 最大ページ数を超えた場合は最大ページに
    act(() => {
      result.current.setCurrentPage(20)
    })
    expect(result.current.currentPage).toBe(10)
  })

  it('1ページあたりの表示件数を変更できる', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 10 })
    )

    act(() => {
      result.current.setItemsPerPage(25)
    })

    expect(result.current.pageInfo.itemsPerPage).toBe(25)
    expect(result.current.pageInfo.totalPages).toBe(4)
    expect(result.current.paginatedData).toHaveLength(25)
  })

  it('表示件数を変更した際、現在のページがリセットされる', () => {
    const { result } = renderHook(() => 
      usePagination({ data: testData, itemsPerPage: 10 })
    )

    // ページ3に移動
    act(() => {
      result.current.setCurrentPage(3)
    })
    expect(result.current.currentPage).toBe(3)

    // 表示件数を変更
    act(() => {
      result.current.setItemsPerPage(50)
    })
    expect(result.current.currentPage).toBe(1)
  })

  it('空のデータを処理できる', () => {
    const { result } = renderHook(() => 
      usePagination({ data: [], itemsPerPage: 10 })
    )

    expect(result.current.paginatedData).toEqual([])
    expect(result.current.pageInfo.totalPages).toBe(0)
    expect(result.current.currentPage).toBe(1)
  })

  it('最後のページで正しい件数を表示する', () => {
    const smallData = Array.from({ length: 23 }, (_, i) => ({ id: i + 1 }))
    const { result } = renderHook(() => 
      usePagination({ data: smallData, itemsPerPage: 10 })
    )

    // 最後のページ（3ページ目）へ
    act(() => {
      result.current.setCurrentPage(3)
    })

    expect(result.current.paginatedData).toHaveLength(3)
    expect(result.current.pageInfo.startIndex).toBe(20)
    expect(result.current.pageInfo.endIndex).toBe(22)
  })

  it('データが更新された場合、現在のページを維持する', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination({ data, itemsPerPage: 10 }),
      { initialProps: { data: testData } }
    )

    // ページ2に移動
    act(() => {
      result.current.setCurrentPage(2)
    })

    // データを更新（件数は同じ）
    const newData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 101,
      name: `New Item ${i + 1}`
    }))
    rerender({ data: newData })

    // ページは維持される
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
      result.current.setCurrentPage(5)
    })

    // データを減らす
    const smallerData = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }))
    rerender({ data: smallerData })

    // 最後のページ（3ページ目）に自動的に移動
    expect(result.current.currentPage).toBe(3)
  })
})