import { renderHook, act } from '@testing-library/react'
import { useFavoriteAnalysis } from '../useFavoriteAnalysis'

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useFavoriteAnalysis', () => {
  beforeEach(() => {
    localStorageMock.clear()
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
      tags: ['テスト', 'ROAS']
    }

    act(() => {
      result.current.addFavorite(newFavorite)
    })

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0]).toMatchObject({
      ...newFavorite,
      accessCount: 0
    })
    expect(result.current.favorites[0].id).toMatch(/^fav-\d+$/)
    expect(result.current.favorites[0].createdAt).toBeInstanceOf(Date)
  })

  it('お気に入りを削除できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    // お気に入りを追加
    act(() => {
      result.current.addFavorite({
        name: 'テスト分析',
        type: 'roas',
        route: '/test'
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
        name: '元の名前',
        type: 'roas',
        route: '/test'
      })
    })

    const favoriteId = result.current.favorites[0].id

    // お気に入りを更新
    act(() => {
      result.current.updateFavorite(favoriteId, {
        name: '更新後の名前',
        description: '説明を追加'
      })
    })

    expect(result.current.favorites[0].name).toBe('更新後の名前')
    expect(result.current.favorites[0].description).toBe('説明を追加')
  })

  it('IDでお気に入りを取得できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    act(() => {
      result.current.addFavorite({
        name: 'テスト1',
        type: 'roas',
        route: '/test1'
      })
      result.current.addFavorite({
        name: 'テスト2',
        type: 'cohort',
        route: '/test2'
      })
    })

    const favoriteId = result.current.favorites[1].id
    const favorite = result.current.getFavoriteById(favoriteId)

    expect(favorite?.name).toBe('テスト2')
    expect(result.current.getFavoriteById('invalid-id')).toBeUndefined()
  })

  it('タイプ別にお気に入りを取得できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    act(() => {
      result.current.addFavorite({ name: 'ROAS1', type: 'roas', route: '/roas1' })
      result.current.addFavorite({ name: 'ROAS2', type: 'roas', route: '/roas2' })
      result.current.addFavorite({ name: 'RFM1', type: 'rfm', route: '/rfm1' })
    })

    const roasFavorites = result.current.getFavoritesByType('roas')
    
    expect(roasFavorites).toHaveLength(2)
    expect(roasFavorites.every(f => f.type === 'roas')).toBe(true)
  })

  it('アクセスを記録できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    act(() => {
      result.current.addFavorite({
        name: 'テスト',
        type: 'roas',
        route: '/test'
      })
    })

    const favoriteId = result.current.favorites[0].id
    const beforeAccess = { ...result.current.favorites[0] }

    act(() => {
      result.current.recordAccess(favoriteId)
    })

    expect(result.current.favorites[0].accessCount).toBe(1)
    expect(result.current.favorites[0].lastAccessedAt).toBeInstanceOf(Date)
    expect(result.current.favorites[0].lastAccessedAt!.getTime()).toBeGreaterThan(
      beforeAccess.createdAt.getTime()
    )
  })

  it('お気に入りを検索できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    act(() => {
      result.current.addFavorite({
        name: 'ROAS分析レポート',
        description: '広告の費用対効果',
        type: 'roas',
        route: '/roas',
        tags: ['広告', '効果測定']
      })
      result.current.addFavorite({
        name: 'コホート分析',
        description: '顧客の行動パターン',
        type: 'cohort',
        route: '/cohort',
        tags: ['顧客', 'リテンション']
      })
    })

    // 名前で検索
    expect(result.current.searchFavorites('ROAS')).toHaveLength(1)
    
    // 説明で検索
    expect(result.current.searchFavorites('効果')).toHaveLength(1)
    
    // タグで検索
    expect(result.current.searchFavorites('顧客')).toHaveLength(1)
    
    // 大文字小文字を区別しない
    expect(result.current.searchFavorites('roas')).toHaveLength(1)
    
    // 複数マッチ
    expect(result.current.searchFavorites('分析')).toHaveLength(2)
  })

  it('localStorageから復元できる', () => {
    const testData = [{
      id: 'fav-123',
      name: '保存済み分析',
      type: 'roas',
      route: '/saved',
      createdAt: new Date('2024-01-01').toISOString(),
      accessCount: 5,
      lastAccessedAt: new Date('2024-01-10').toISOString()
    }]
    
    localStorageMock.setItem('favorite_analysis', JSON.stringify(testData))
    
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].name).toBe('保存済み分析')
    expect(result.current.favorites[0].createdAt).toBeInstanceOf(Date)
    expect(result.current.favorites[0].lastAccessedAt).toBeInstanceOf(Date)
  })

  it('複数のお気に入りを同時に管理できる', () => {
    const { result } = renderHook(() => useFavoriteAnalysis())
    
    // 複数のお気に入りを追加
    act(() => {
      for (let i = 1; i <= 5; i++) {
        result.current.addFavorite({
          name: `分析${i}`,
          type: i % 2 === 0 ? 'roas' : 'rfm',
          route: `/analysis${i}`
        })
      }
    })

    expect(result.current.favorites).toHaveLength(5)
    
    // いくつかにアクセス
    act(() => {
      result.current.recordAccess(result.current.favorites[0].id)
      result.current.recordAccess(result.current.favorites[2].id)
      result.current.recordAccess(result.current.favorites[2].id)
    })

    // アクセス数でソート
    const sorted = [...result.current.favorites].sort((a, b) => b.accessCount - a.accessCount)
    expect(sorted[0].accessCount).toBe(2)
    expect(sorted[1].accessCount).toBe(1)
  })
})