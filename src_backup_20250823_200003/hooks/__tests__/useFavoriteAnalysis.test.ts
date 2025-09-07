import { renderHook, act } from '@testing-library/react'
import { useFavoriteAnalysis } from '../useFavoriteAnalysis'
import { vi } from 'vitest'

describe('useFavoriteAnalysis', () => {
  // 各テストの前にlocalStorageをクリア
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('初期状態で空の配列を返す', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    expect(result.current.favorites).toEqual([])
  })

  it('お気に入りを追加できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    const newFavorite = {
      name: 'テスト分析',
      description: 'テスト用の分析',
      type: 'roas' as const,
      route: '/test-analysis',
      filters: { category: 'test' },
      tags: ['テスト', 'ROAS'],
    }

    act(() => {
      result.current.addFavorite(newFavorite)
    })

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0]).toMatchObject({
      ...newFavorite,
      id: expect.stringMatching(/^fav-/),
      createdAt: expect.any(Date),
      accessCount: 0,
    })
  })

  it('お気に入りを削除できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // お気に入りを追加
    act(() => {
      result.current.addFavorite({
        name: '削除テスト',
        type: 'cohort',
        route: '/delete-test',
      })
    })

    const favoriteId = result.current.favorites[0].id

    // お気に入りを削除
    act(() => {
      result.current.removeFavorite(favoriteId)
    })

    expect(result.current.favorites).toHaveLength(0)
  })

  it('お気に入りを更新できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // お気に入りを追加
    act(() => {
      result.current.addFavorite({
        name: '更新前',
        type: 'rfm',
        route: '/update-test',
      })
    })

    const favoriteId = result.current.favorites[0].id

    // お気に入りを更新
    act(() => {
      result.current.updateFavorite(favoriteId, {
        name: '更新後',
        description: '更新されました',
      })
    })

    expect(result.current.favorites[0].name).toBe('更新後')
    expect(result.current.favorites[0].description).toBe('更新されました')
  })

  it('IDでお気に入りを取得できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // お気に入りを追加
    act(() => {
      result.current.addFavorite({
        name: 'ID検索テスト',
        type: 'basket',
        route: '/id-test',
      })
    })

    const favoriteId = result.current.favorites[0].id
    const found = result.current.getFavoriteById(favoriteId)

    expect(found).toBeDefined()
    expect(found?.name).toBe('ID検索テスト')
  })

  it('タイプ別にお気に入りを取得できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // 複数のお気に入りを追加 - 各追加を個別のactで囲む
    act(() => {
      result.current.addFavorite({
        name: 'ROAS分析1',
        type: 'roas',
        route: '/roas-1',
      })
    })

    act(() => {
      result.current.addFavorite({
        name: 'ROAS分析2',
        type: 'roas',
        route: '/roas-2',
      })
    })

    act(() => {
      result.current.addFavorite({
        name: 'コホート分析',
        type: 'cohort',
        route: '/cohort-1',
      })
    })

    // Wait for state to update
    expect(result.current.favorites).toHaveLength(3)

    const roasFavorites = result.current.getFavoritesByType('roas')
    expect(roasFavorites).toHaveLength(2)
    expect(roasFavorites.every((f) => f.type === 'roas')).toBe(true)
  })

  it('アクセスを記録できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // お気に入りを追加
    act(() => {
      result.current.addFavorite({
        name: 'アクセステスト',
        type: 'ltv',
        route: '/access-test',
      })
    })

    const favoriteId = result.current.favorites[0].id
    const initialAccessCount = result.current.favorites[0].accessCount

    // アクセスを記録
    act(() => {
      result.current.recordAccess(favoriteId)
    })

    expect(result.current.favorites[0].accessCount).toBe(initialAccessCount + 1)
    expect(result.current.favorites[0].lastAccessedAt).toBeDefined()
  })

  it('お気に入りを検索できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // 複数のお気に入りを追加 - 個別に追加
    act(() => {
      result.current.addFavorite({
        name: 'ROAS最適化分析',
        description: '広告効果の最適化',
        type: 'roas',
        route: '/roas-optimization',
        tags: ['広告', '最適化'],
      })
    })

    act(() => {
      result.current.addFavorite({
        name: 'コホート分析',
        description: '顧客セグメント分析',
        type: 'cohort',
        route: '/cohort-analysis',
        tags: ['顧客', 'セグメント'],
      })
    })

    // 状態の更新を確認
    expect(result.current.favorites).toHaveLength(2)

    // 名前で検索
    const roasResults = result.current.searchFavorites('ROAS')
    expect(roasResults).toHaveLength(1)
    expect(roasResults[0].name).toBe('ROAS最適化分析')

    // タグで検索
    const tagResults = result.current.searchFavorites('広告')
    expect(tagResults).toHaveLength(1)

    // タイプで検索
    const typeResults = result.current.searchFavorites('cohort')
    expect(typeResults).toHaveLength(1)
  })

  it('複数のお気に入りを同時に管理できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())

    // 5つのお気に入りを一度に追加
    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.addFavorite({
          name: `分析${i}`,
          type: i % 2 === 0 ? 'roas' : 'rfm',
          route: `/analysis-${i}`,
        })
      }
    })

    expect(result.current.favorites).toHaveLength(5)

    // タイプ別にカウント
    const roasFavorites = result.current.getFavoritesByType('roas')
    const rfmFavorites = result.current.getFavoritesByType('rfm')

    expect(roasFavorites).toHaveLength(2)
    expect(rfmFavorites).toHaveLength(3)
  })
})
