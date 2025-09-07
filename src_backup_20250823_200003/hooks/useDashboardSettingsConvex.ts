import { useState, useEffect } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { logger } from '../utils/logger'

export interface WidgetConfig {
  id: string
  type: string
  title?: string
  config?: any
  settings?: any
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

export interface DashboardLayout {
  id: string
  name: string
  widgets: WidgetConfig[]
  createdAt: Date
  updatedAt: Date
}

export interface DashboardSettings {
  layouts: Record<string, DashboardLayout>
  theme?: string
  preferences?: any
}

export interface UseDashboardSettingsReturn {
  layouts: DashboardLayout[]
  currentLayout: DashboardLayout | null
  loading: boolean
  error: string | null
  saveLayout: (name: string, widgets: WidgetConfig[]) => Promise<void>
  loadLayout: (id: string) => void
  deleteLayout: (id: string) => Promise<void>
  updateLayout: (id: string, updates: Partial<DashboardLayout>) => Promise<void>
  exportLayout: (id: string) => string
  importLayout: (data: string) => Promise<void>
  resetLayouts: () => Promise<void>
}

export function useDashboardSettingsConvex(userId?: string): UseDashboardSettingsReturn {
  const convex = useConvex()
  const [layouts, setLayouts] = useState<DashboardLayout[]>([])
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mutations
  const updateLayoutMutation = useMutation(api.dashboardSettings.updateLayout)
  const deleteLayoutMutation = useMutation(api.dashboardSettings.deleteLayout)
  const deleteSettingsMutation = useMutation(api.dashboardSettings.deleteSettings)

  // 設定の読み込み
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const result = await convex.query(api.dashboardSettings.getSettings, { userId })
        
        if (result && result.layouts) {
          const layoutsArray = Object.entries(result.layouts).map(([id, layout]: [string, any]) => ({
            ...layout,
            id,
            createdAt: new Date(layout.createdAt || layout.updatedAt),
            updatedAt: new Date(layout.updatedAt),
          }))
          setLayouts(layoutsArray)
        } else {
          setLayouts([])
        }
        
        setError(null)
      } catch (err) {
        logger.error('Failed to load dashboard settings:', err)
        setError('ダッシュボード設定の読み込みに失敗しました')
        setLayouts([])
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [convex, userId])

  // レイアウトを保存
  const saveLayout = async (name: string, widgets: WidgetConfig[]): Promise<void> => {
    try {
      const newLayout: DashboardLayout = {
        id: `layout-${Date.now()}`,
        name,
        widgets,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await updateLayoutMutation({
        userId,
        layoutId: newLayout.id,
        layout: {
          name: newLayout.name,
          widgets: newLayout.widgets,
          createdAt: newLayout.createdAt.toISOString(),
          updatedAt: newLayout.updatedAt.toISOString(),
        },
      })

      setLayouts(prev => [...prev, newLayout])
      setCurrentLayout(newLayout)
      setError(null)
    } catch (err) {
      logger.error('Failed to save layout:', err)
      throw new Error('レイアウトの保存に失敗しました')
    }
  }

  // レイアウトを読み込み
  const loadLayout = (id: string): void => {
    const layout = layouts.find((l) => l.id === id)
    if (layout) {
      setCurrentLayout(layout)
    }
  }

  // レイアウトを削除
  const deleteLayout = async (id: string): Promise<void> => {
    try {
      await deleteLayoutMutation({
        userId,
        layoutId: id,
      })

      setLayouts(prev => prev.filter((l) => l.id !== id))
      
      if (currentLayout?.id === id) {
        setCurrentLayout(null)
      }
      
      setError(null)
    } catch (err) {
      logger.error('Failed to delete layout:', err)
      throw new Error('レイアウトの削除に失敗しました')
    }
  }

  // レイアウトを更新
  const updateLayout = async (id: string, updates: Partial<DashboardLayout>): Promise<void> => {
    try {
      const layout = layouts.find((l) => l.id === id)
      if (!layout) {
        throw new Error('レイアウトが見つかりません')
      }

      const updatedLayout = {
        ...layout,
        ...updates,
        updatedAt: new Date(),
      }

      await updateLayoutMutation({
        userId,
        layoutId: id,
        layout: {
          name: updatedLayout.name,
          widgets: updatedLayout.widgets,
          createdAt: updatedLayout.createdAt.toISOString(),
          updatedAt: updatedLayout.updatedAt.toISOString(),
        },
      })

      setLayouts(prev => prev.map((l) => (l.id === id ? updatedLayout : l)))
      
      if (currentLayout?.id === id) {
        setCurrentLayout(updatedLayout)
      }
      
      setError(null)
    } catch (err) {
      logger.error('Failed to update layout:', err)
      throw new Error('レイアウトの更新に失敗しました')
    }
  }

  // レイアウトをエクスポート
  const exportLayout = (id: string): string => {
    const layout = layouts.find((l) => l.id === id)
    if (!layout) {
      throw new Error('レイアウトが見つかりません')
    }

    return JSON.stringify({
      name: layout.name,
      widgets: layout.widgets,
      exportedAt: new Date().toISOString(),
    })
  }

  // レイアウトをインポート
  const importLayout = async (data: string): Promise<void> => {
    try {
      const parsed = JSON.parse(data)
      
      if (!parsed.name || !parsed.widgets) {
        throw new Error('無効なレイアウトデータです')
      }

      await saveLayout(parsed.name, parsed.widgets)
    } catch (err) {
      logger.error('Failed to import layout:', err)
      throw new Error('レイアウトのインポートに失敗しました')
    }
  }

  // すべてのレイアウトをリセット
  const resetLayouts = async (): Promise<void> => {
    try {
      await deleteSettingsMutation({ userId })
      
      setLayouts([])
      setCurrentLayout(null)
      setError(null)
    } catch (err) {
      logger.error('Failed to reset layouts:', err)
      throw new Error('レイアウトのリセットに失敗しました')
    }
  }

  return {
    layouts,
    currentLayout,
    loading,
    error,
    saveLayout,
    loadLayout,
    deleteLayout,
    updateLayout,
    exportLayout,
    importLayout,
    resetLayouts,
  }
}