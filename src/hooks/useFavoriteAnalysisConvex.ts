import { useState, useEffect } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface FavoriteAnalysis {
  id: string
  name: string
  type: 'roas' | 'cohort' | 'rfm' | 'basket' | 'ltv' | 'prediction' | 'abtest' | 'custom' | 'campaign' | 'creative' | 'period'
  config: any
  route: string
  filters?: any
  description?: string
  tags?: string[]
  isFavorite: boolean
  createdAt: Date
  lastAccessedAt?: Date
  accessCount: number
}

export interface UseFavoriteAnalysisReturn {
  favorites: FavoriteAnalysis[]
  loading: boolean
  error: string | null
  addFavorite: (analysis: Omit<FavoriteAnalysis, 'id' | 'createdAt' | 'accessCount'>) => Promise<void>
  removeFavorite: (id: string) => Promise<void>
  updateFavorite: (id: string, updates: Partial<FavoriteAnalysis>) => Promise<void>
  getFavoriteById: (id: string) => FavoriteAnalysis | undefined
  toggleFavorite: (id: string) => Promise<void>
  recordAccess: (id: string) => Promise<void>
  clearAllFavorites: () => Promise<void>
}

export function useFavoriteAnalysisConvex(userId?: string): UseFavoriteAnalysisReturn {
  const convex = useConvex()
  const [favorites, setFavorites] = useState<FavoriteAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutations
  const saveFavoriteMutation = useMutation(api.favoriteAnalyses.saveFavorite)
  const deleteFavoriteMutation = useMutation(api.favoriteAnalyses.deleteFavorite)
  const toggleFavoriteMutation = useMutation(api.favoriteAnalyses.toggleFavorite)
  const updateLastAccessedMutation = useMutation(api.favoriteAnalyses.updateLastAccessed)
  const clearAllFavoritesMutation = useMutation(api.favoriteAnalyses.clearAllFavorites)

  // お気に入りの読み込み
  useEffect(() => {
    async function loadFavorites() {
      try {
        setLoading(true)
        const result = await convex.query(api.favoriteAnalyses.getFavorites, { userId })
        
        const formattedFavorites: FavoriteAnalysis[] = result.map((fav: any) => ({
          id: fav.id,
          name: fav.name,
          type: fav.type,
          config: fav.config,
          route: fav.route || '',
          filters: fav.filters,
          description: fav.description,
          tags: fav.tags || [],
          isFavorite: fav.isFavorite,
          createdAt: new Date(fav.createdAt),
          lastAccessedAt: fav.lastAccessedAt ? new Date(fav.lastAccessedAt) : undefined,
          accessCount: 0, // TODO: アクセス回数の管理を実装
        }))
        
        setFavorites(formattedFavorites)
        setError(null)
      } catch (err) {
        logger.error('Failed to load favorite analyses:', err)
        setError('お気に入り分析の読み込みに失敗しました')
        setFavorites([])
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [convex, userId])

  // お気に入りを追加
  const addFavorite = async (
    analysis: Omit<FavoriteAnalysis, 'id' | 'createdAt' | 'accessCount'>
  ): Promise<void> => {
    try {
      const id = `fav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      
      await saveFavoriteMutation({
        id,
        name: analysis.name,
        type: analysis.type,
        config: analysis.config,
        isFavorite: analysis.isFavorite !== false, // デフォルトはtrue
        userId,
      })

      const newFavorite: FavoriteAnalysis = {
        ...analysis,
        id,
        createdAt: new Date(),
        accessCount: 0,
      }

      setFavorites(prev => [...prev, newFavorite])
      setError(null)
    } catch (err) {
      logger.error('Failed to add favorite analysis:', err)
      throw new Error('お気に入り分析の追加に失敗しました')
    }
  }

  // お気に入りを削除
  const removeFavorite = async (id: string): Promise<void> => {
    try {
      await deleteFavoriteMutation({ id })
      setFavorites(prev => prev.filter((fav) => fav.id !== id))
      setError(null)
    } catch (err) {
      logger.error('Failed to remove favorite analysis:', err)
      throw new Error('お気に入り分析の削除に失敗しました')
    }
  }

  // お気に入りを更新
  const updateFavorite = async (id: string, updates: Partial<FavoriteAnalysis>): Promise<void> => {
    try {
      const favorite = favorites.find(fav => fav.id === id)
      if (!favorite) {
        throw new Error('お気に入り分析が見つかりません')
      }

      await saveFavoriteMutation({
        id,
        name: updates.name || favorite.name,
        type: updates.type || favorite.type,
        config: updates.config || favorite.config,
        isFavorite: updates.isFavorite !== undefined ? updates.isFavorite : favorite.isFavorite,
        userId,
      })

      setFavorites(prev => prev.map((fav) => 
        fav.id === id 
          ? { ...fav, ...updates }
          : fav
      ))
      setError(null)
    } catch (err) {
      logger.error('Failed to update favorite analysis:', err)
      throw new Error('お気に入り分析の更新に失敗しました')
    }
  }

  // IDでお気に入りを取得
  const getFavoriteById = (id: string): FavoriteAnalysis | undefined => {
    return favorites.find((fav) => fav.id === id)
  }

  // お気に入り状態の切り替え
  const toggleFavorite = async (id: string): Promise<void> => {
    try {
      const result = await toggleFavoriteMutation({ id })
      
      setFavorites(prev => prev.map((fav) =>
        fav.id === id
          ? { ...fav, isFavorite: result.isFavorite }
          : fav
      ))
      setError(null)
    } catch (err) {
      logger.error('Failed to toggle favorite:', err)
      throw new Error('お気に入り状態の切り替えに失敗しました')
    }
  }

  // アクセスを記録
  const recordAccess = async (id: string): Promise<void> => {
    try {
      await updateLastAccessedMutation({ id })
      
      setFavorites(prev => prev.map((fav) =>
        fav.id === id
          ? { 
              ...fav, 
              lastAccessedAt: new Date(),
              accessCount: fav.accessCount + 1
            }
          : fav
      ))
      setError(null)
    } catch (err) {
      logger.error('Failed to record access:', err)
      // アクセス記録の失敗は致命的ではないのでエラーを投げない
    }
  }

  // すべてのお気に入りをクリア
  const clearAllFavorites = async (): Promise<void> => {
    try {
      await clearAllFavoritesMutation({ userId })
      setFavorites([])
      setError(null)
    } catch (err) {
      logger.error('Failed to clear all favorites:', err)
      throw new Error('お気に入りのクリアに失敗しました')
    }
  }

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    updateFavorite,
    getFavoriteById,
    toggleFavorite,
    recordAccess,
    clearAllFavorites,
  }
}