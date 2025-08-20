import { useState, useEffect } from 'react'

export interface FavoriteAnalysis {
  id: string
  name: string
  description?: string
  type: 'roas' | 'cohort' | 'rfm' | 'basket' | 'ltv' | 'prediction' | 'abtest' | 'custom'
  route: string
  filters?: Record<string, any>
  tags?: string[]
  createdAt: Date
  lastAccessedAt?: Date
  accessCount: number
}

interface UseFavoriteAnalysisReturn {
  favorites: FavoriteAnalysis[]
  addFavorite: (analysis: Omit<FavoriteAnalysis, 'id' | 'createdAt' | 'accessCount'>) => void
  removeFavorite: (id: string) => void
  updateFavorite: (id: string, updates: Partial<FavoriteAnalysis>) => void
  getFavoriteById: (id: string) => FavoriteAnalysis | undefined
  getFavoritesByType: (type: FavoriteAnalysis['type']) => FavoriteAnalysis[]
  recordAccess: (id: string) => void
  searchFavorites: (query: string) => FavoriteAnalysis[]
}

const STORAGE_KEY = 'favorite_analysis'

export function useFavoriteAnalysis(): UseFavoriteAnalysisReturn {
  const [favorites, setFavorites] = useState<FavoriteAnalysis[]>([])

  // 初期読み込み
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setFavorites(
          parsed.map((fav: any) => ({
            ...fav,
            createdAt: new Date(fav.createdAt),
            lastAccessedAt: fav.lastAccessedAt ? new Date(fav.lastAccessedAt) : undefined,
          }))
        )
      } catch (error) {
        console.error('Failed to load favorite analysis:', error)
      }
    }
  }, [])

  // お気に入りを追加
  const addFavorite = (analysis: Omit<FavoriteAnalysis, 'id' | 'createdAt' | 'accessCount'>) => {
    const newFavorite: FavoriteAnalysis = {
      ...analysis,
      id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date(),
      accessCount: 0,
    }

    const updated = [...favorites, newFavorite]
    setFavorites(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // お気に入りを削除
  const removeFavorite = (id: string) => {
    const updated = favorites.filter((fav) => fav.id !== id)
    setFavorites(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // お気に入りを更新
  const updateFavorite = (id: string, updates: Partial<FavoriteAnalysis>) => {
    const updated = favorites.map((fav) => (fav.id === id ? { ...fav, ...updates } : fav))
    setFavorites(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // IDでお気に入りを取得
  const getFavoriteById = (id: string): FavoriteAnalysis | undefined => {
    return favorites.find((fav) => fav.id === id)
  }

  // タイプ別にお気に入りを取得
  const getFavoritesByType = (type: FavoriteAnalysis['type']): FavoriteAnalysis[] => {
    return favorites.filter((fav) => fav.type === type)
  }

  // アクセスを記録
  const recordAccess = (id: string) => {
    const updated = favorites.map((fav) =>
      fav.id === id
        ? {
            ...fav,
            lastAccessedAt: new Date(),
            accessCount: fav.accessCount + 1,
          }
        : fav
    )
    setFavorites(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // お気に入りを検索
  const searchFavorites = (query: string): FavoriteAnalysis[] => {
    const lowerQuery = query.toLowerCase()

    return favorites.filter((fav) => {
      // 名前で検索
      if (fav.name.toLowerCase().includes(lowerQuery)) return true

      // 説明で検索
      if (fav.description?.toLowerCase().includes(lowerQuery)) return true

      // タグで検索
      if (fav.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) return true

      // タイプで検索
      if (fav.type.toLowerCase().includes(lowerQuery)) return true

      return false
    })
  }

  // よくアクセスされる順にソート
  // const getMostAccessed = (_limit: number = 5): FavoriteAnalysis[] => {
  //   return [...favorites]
  //     .sort((a, b) => b.accessCount - a.accessCount)
  //     .slice(0, _limit)
  // }

  // 最近アクセスした順にソート
  // const getRecentlyAccessed = (_limit: number = 5): FavoriteAnalysis[] => {
  //   return [...favorites]
  //     .filter(fav => fav.lastAccessedAt)
  //     .sort((a, b) => {
  //       const aTime = a.lastAccessedAt?.getTime() || 0
  //       const bTime = b.lastAccessedAt?.getTime() || 0
  //       return bTime - aTime
  //     })
  //     .slice(0, _limit)
  // }

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavorite,
    getFavoriteById,
    getFavoritesByType,
    recordAccess,
    searchFavorites,
  }
}
