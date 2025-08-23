import { useState, useEffect } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface FilterPreset {
  id: string
  name: string
  criteria: any
  createdAt?: string
  updatedAt?: string
}

export function useFilterPresetsConvex(userId?: string) {
  const convex = useConvex()
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutations
  const savePresetMutation = useMutation(api.filterPresets.savePreset)
  const deletePresetMutation = useMutation(api.filterPresets.deletePreset)
  const bulkSavePresetsMutation = useMutation(api.filterPresets.bulkSavePresets)
  const clearAllPresetsMutation = useMutation(api.filterPresets.clearAllPresets)

  // プリセットの読み込み
  useEffect(() => {
    async function loadPresets() {
      try {
        setLoading(true)
        const result = await convex.query(api.filterPresets.getPresets, { userId })
        
        const formattedPresets: FilterPreset[] = result.map((preset: any) => ({
          id: preset._id,
          name: preset.name,
          criteria: preset.filters,
          createdAt: preset.createdAt,
          updatedAt: preset.updatedAt,
        }))
        
        setPresets(formattedPresets)
        setError(null)
      } catch (err) {
        logger.error('Failed to load filter presets:', err)
        setError('プリセットの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadPresets()
  }, [convex, userId])

  // プリセットの保存
  const savePreset = async (name: string, criteria: any): Promise<void> => {
    try {
      await savePresetMutation({
        name,
        filters: criteria,
        userId,
      })

      // プリセットを再読み込み
      const result = await convex.query(api.filterPresets.getPresets, { userId })
      const formattedPresets: FilterPreset[] = result.map((preset: any) => ({
        id: preset._id,
        name: preset.name,
        criteria: preset.filters,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
      }))
      setPresets(formattedPresets)
    } catch (err) {
      logger.error('Failed to save filter preset:', err)
      throw new Error('プリセットの保存に失敗しました')
    }
  }

  // プリセットの削除
  const deletePreset = async (nameOrId: string): Promise<void> => {
    try {
      // IDからプリセット名を取得
      const preset = presets.find(p => p.id === nameOrId || p.name === nameOrId)
      if (!preset) {
        throw new Error('プリセットが見つかりません')
      }

      await deletePresetMutation({
        name: preset.name,
        userId,
      })

      // ローカルステートを更新
      setPresets(prev => prev.filter(p => p.id !== preset.id))
    } catch (err) {
      logger.error('Failed to delete filter preset:', err)
      throw new Error('プリセットの削除に失敗しました')
    }
  }

  // 複数のプリセットを一括保存
  const bulkSavePresets = async (presetsToSave: Array<{ name: string; criteria: any }>): Promise<void> => {
    try {
      await bulkSavePresetsMutation({
        presets: presetsToSave.map(p => ({
          name: p.name,
          filters: p.criteria,
        })),
        userId,
      })

      // プリセットを再読み込み
      const result = await convex.query(api.filterPresets.getPresets, { userId })
      const formattedPresets: FilterPreset[] = result.map((preset: any) => ({
        id: preset._id,
        name: preset.name,
        criteria: preset.filters,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
      }))
      setPresets(formattedPresets)
    } catch (err) {
      logger.error('Failed to bulk save filter presets:', err)
      throw new Error('プリセットの一括保存に失敗しました')
    }
  }

  // すべてのプリセットをクリア
  const clearAllPresets = async (): Promise<void> => {
    try {
      await clearAllPresetsMutation({ userId })
      setPresets([])
    } catch (err) {
      logger.error('Failed to clear all filter presets:', err)
      throw new Error('プリセットのクリアに失敗しました')
    }
  }

  // 特定の名前のプリセットを取得
  const getPresetByName = async (name: string): Promise<FilterPreset | null> => {
    try {
      const result = await convex.query(api.filterPresets.getPresetByName, { name, userId })
      
      if (!result) {
        return null
      }

      return {
        id: result._id,
        name: result.name,
        criteria: result.filters,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }
    } catch (err) {
      logger.error('Failed to get filter preset by name:', err)
      return null
    }
  }

  return {
    presets,
    loading,
    error,
    savePreset,
    deletePreset,
    bulkSavePresets,
    clearAllPresets,
    getPresetByName,
  }
}