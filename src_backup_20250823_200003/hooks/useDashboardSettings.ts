import { useState, useEffect } from 'react'

interface DashboardLayout {
  id: string
  name: string
  widgets: WidgetConfig[]
  createdAt: Date
  updatedAt: Date
}

interface WidgetConfig {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  settings?: Record<string, any>
}

interface UseDashboardSettingsReturn {
  layouts: DashboardLayout[]
  currentLayout: DashboardLayout | null
  saveLayout: (name: string, widgets: WidgetConfig[]) => void
  loadLayout: (id: string) => void
  deleteLayout: (id: string) => void
  updateWidget: (widgetId: string, config: Partial<WidgetConfig>) => void
  exportLayout: (id: string) => void
  importLayout: (file: File) => Promise<void>
}

const STORAGE_KEY = 'dashboard_layouts'

export function useDashboardSettings(): UseDashboardSettingsReturn {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([])
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null)

  // 初期読み込み
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setLayouts(
          parsed.map((layout: any) => ({
            ...layout,
            createdAt: new Date(layout.createdAt),
            updatedAt: new Date(layout.updatedAt),
          }))
        )
      } catch (error) {
        console.error('Failed to load dashboard layouts:', error)
      }
    }
  }, [])

  // レイアウトを保存
  const saveLayout = (name: string, widgets: WidgetConfig[]) => {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      widgets,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedLayouts = [...layouts, newLayout]
    setLayouts(updatedLayouts)
    setCurrentLayout(newLayout)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLayouts))
  }

  // レイアウトを読み込み
  const loadLayout = (id: string) => {
    const layout = layouts.find((l) => l.id === id)
    if (layout) {
      setCurrentLayout(layout)
    }
  }

  // レイアウトを削除
  const deleteLayout = (id: string) => {
    const updatedLayouts = layouts.filter((l) => l.id !== id)
    setLayouts(updatedLayouts)

    if (currentLayout?.id === id) {
      setCurrentLayout(null)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLayouts))
  }

  // ウィジェットを更新
  const updateWidget = (widgetId: string, config: Partial<WidgetConfig>) => {
    if (!currentLayout) return

    const updatedWidgets = currentLayout.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, ...config } : widget
    )

    const updatedLayout = {
      ...currentLayout,
      widgets: updatedWidgets,
      updatedAt: new Date(),
    }

    const updatedLayouts = layouts.map((layout) =>
      layout.id === currentLayout.id ? updatedLayout : layout
    )

    setLayouts(updatedLayouts)
    setCurrentLayout(updatedLayout)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLayouts))
  }

  // レイアウトをエクスポート
  const exportLayout = (id: string) => {
    const layout = layouts.find((l) => l.id === id)
    if (!layout) return

    const dataStr = JSON.stringify(layout, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const link = document.createElement('a')
    link.setAttribute('href', dataUri)
    link.setAttribute('download', `dashboard-layout-${layout.name}.json`)
    link.click()
  }

  // レイアウトをインポート
  const importLayout = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const imported = JSON.parse(content)

          // 新しいIDを生成
          const newLayout: DashboardLayout = {
            ...imported,
            id: `layout-${Date.now()}`,
            createdAt: new Date(imported.createdAt),
            updatedAt: new Date(),
          }

          const updatedLayouts = [...layouts, newLayout]
          setLayouts(updatedLayouts)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLayouts))

          resolve()
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
      reader.readAsText(file)
    })
  }

  return {
    layouts,
    currentLayout,
    saveLayout,
    loadLayout,
    deleteLayout,
    updateWidget,
    exportLayout,
    importLayout,
  }
}
