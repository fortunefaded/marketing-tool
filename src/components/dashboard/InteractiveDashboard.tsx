/* eslint-env browser */
import React, { useState, useEffect } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from '@hello-pangea/dnd'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  BookmarkIcon,
  ArrowsPointingOutIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import { GripVertical } from 'lucide-react'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'

export interface DashboardWidget {
  id: string
  type: string
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
}

interface InteractiveDashboardProps {
  initialWidgets?: DashboardWidget[]
  gridColumns?: number
  onLayoutChange?: (widgets: DashboardWidget[]) => void
}

export const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  initialWidgets = [],
  gridColumns = 12,
  onLayoutChange,
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [layoutName, setLayoutName] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null)

  const { layouts, saveLayout, loadLayout, importLayout, currentLayout } = useDashboardSettings()

  // レスポンシブ対応
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ドラッグ終了時の処理
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // 位置を再計算
    const updatedWidgets = items.map((widget, index) => ({
      ...widget,
      position: calculatePosition(index, gridColumns),
    }))

    setWidgets(updatedWidgets)
    onLayoutChange?.(updatedWidgets)
  }

  // 位置計算
  const calculatePosition = (index: number, _columns: number) => {
    const row = Math.floor(index / 2)
    const col = (index % 2) * 6
    return { x: col, y: row * 4 }
  }

  // ウィジェット追加
  const handleAddWidget = (type: string, title: string) => {
    const newWidget: DashboardWidget = {
      id: Date.now().toString(),
      type,
      title,
      position: calculatePosition(widgets.length, gridColumns),
      size: { width: 6, height: 4 },
    }
    setWidgets([...widgets, newWidget])
    setShowAddModal(false)
  }

  // ウィジェット削除
  const handleDeleteWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id))
    setShowDeleteConfirm(null)
  }

  // レイアウト保存
  const handleSaveLayout = () => {
    const widgetConfigs = widgets.map((w) => ({
      id: w.id,
      type: w.type,
      position: w.position,
      size: w.size,
      settings: {},
    }))
    saveLayout(layoutName, widgetConfigs)
    setShowSaveModal(false)
    setLayoutName('')
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)
  }

  // レイアウト読み込み
  const handleLoadLayout = () => {
    if (!selectedLayoutId) return
    loadLayout(selectedLayoutId)
    setShowLoadModal(false)
  }

  // 現在のレイアウトを監視
  useEffect(() => {
    if (currentLayout) {
      const loadedWidgets = currentLayout.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        title: getWidgetTitle(w.type),
        position: w.position,
        size: w.size,
      }))
      setWidgets(loadedWidgets)
    }
  }, [currentLayout])

  // ウィジェットタイトル取得
  const getWidgetTitle = (type: string) => {
    const titles: Record<string, string> = {
      'roas-analysis': 'ROAS分析',
      'rfm-analysis': 'RFM分析',
      'churn-prediction': 'チャーン予測',
      'cohort-analysis': 'コホート分析',
      'ltv-analysis': 'LTV分析',
      'basket-analysis': 'バスケット分析',
    }
    return titles[type] || type
  }

  // インポートハンドラー
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await importLayout(file)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 3000)
    } catch (error) {
      console.error('Failed to import layout:', error)
    }
  }

  // ウィジェットコンポーネントのレンダリング
  const renderWidget = (widget: DashboardWidget) => {
    // 実際のウィジェットコンポーネントをここでレンダリング
    return (
      <div className="bg-gray-200 h-full rounded-lg flex items-center justify-center">
        <span className="text-gray-600">{widget.title}</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">インタラクティブダッシュボード</h2>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                ウィジェット追加
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <BookmarkIcon className="h-5 w-5" />
                保存
              </button>
              <button
                onClick={() => setShowLoadModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                読込
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <CheckIcon className="h-5 w-5" />
                編集完了
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowLoadModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                レイアウト読込
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <PencilIcon className="h-5 w-5" />
                レイアウト編集
              </button>
            </>
          )}
        </div>
      </div>

      {/* ダッシュボードグリッド */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" isDropDisabled={!isEditMode}>
          {(provided: DroppableProvided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-testid="dashboard-container"
              className={`relative ${isMobile ? 'grid-cols-1' : ''}`}
              style={{ minHeight: '600px' }}
            >
              {widgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!isEditMode}
                >
                  {(provided: DraggableProvided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      data-testid="dashboard-widget"
                      className={`absolute ${snapshot.isDragging ? 'z-50' : 'z-10'}`}
                      style={{
                        ...provided.draggableProps.style,
                        left: isMobile ? 0 : `${(widget.position.x / gridColumns) * 100}%`,
                        top: isMobile ? `${index * 200}px` : `${widget.position.y * 50}px`,
                        width: isMobile ? '100%' : `${(widget.size.width / gridColumns) * 100}%`,
                        height: `${widget.size.height * 50}px`,
                        padding: '8px',
                      }}
                    >
                      <div className="bg-white rounded-lg shadow-lg h-full relative">
                        {isEditMode && (
                          <>
                            {/* ドラッグハンドル */}
                            <div
                              {...provided.dragHandleProps}
                              data-testid="drag-handle"
                              className="absolute top-2 left-2 cursor-move p-1 bg-gray-100 rounded"
                            >
                              <GripVertical className="h-5 w-5 text-gray-600" />
                            </div>
                            {/* 削除ボタン */}
                            <button
                              data-testid="delete-widget"
                              onClick={() => setShowDeleteConfirm(widget.id)}
                              className="absolute top-2 right-2 p-1 bg-red-100 rounded hover:bg-red-200"
                            >
                              <TrashIcon className="h-5 w-5 text-red-600" />
                            </button>
                            {/* リサイズハンドル */}
                            <div
                              data-testid="resize-handle"
                              className="absolute bottom-2 right-2 cursor-se-resize p-1 bg-gray-100 rounded"
                            >
                              <ArrowsPointingOutIcon className="h-4 w-4 text-gray-600" />
                            </div>
                          </>
                        )}
                        <div className="p-4 h-full">{renderWidget(widget)}</div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* ウィジェット追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">ウィジェットを選択</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddWidget('roas-analysis', 'ROAS分析')}
                className="w-full p-3 text-left hover:bg-gray-100 rounded"
              >
                ROAS分析
              </button>
              <button
                onClick={() => handleAddWidget('rfm-analysis', 'RFM分析')}
                className="w-full p-3 text-left hover:bg-gray-100 rounded"
              >
                RFM分析
              </button>
              <button
                onClick={() => handleAddWidget('churn-prediction', 'チャーン予測')}
                className="w-full p-3 text-left hover:bg-gray-100 rounded"
              >
                チャーン予測
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 w-full p-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <p className="mb-4">ウィジェットを削除しますか？</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteWidget(showDeleteConfirm)}
                className="flex-1 p-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                削除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* レイアウト保存モーダル */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">レイアウトを保存</h3>
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="レイアウト名"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveLayout}
                className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* レイアウト読み込みモーダル */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">レイアウトを読み込み</h3>
            <div className="space-y-2 mb-4">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  onClick={() => setSelectedLayoutId(layout.id)}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedLayoutId === layout.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{layout.name}</div>
                  <div className="text-sm text-gray-500">
                    作成日: {new Date(layout.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {layouts.length === 0 && (
                <p className="text-gray-500 text-center py-4">保存されたレイアウトがありません</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLoadLayout}
                disabled={!selectedLayoutId}
                className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                読み込み
              </button>
              <label className="flex-1">
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                <span className="block p-2 bg-green-600 text-white rounded hover:bg-green-700 text-center cursor-pointer">
                  <ArrowUpTrayIcon className="h-5 w-5 inline mr-1" />
                  インポート
                </span>
              </label>
              <button
                onClick={() => {
                  setShowLoadModal(false)
                  setSelectedLayoutId(null)
                }}
                className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功メッセージ */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          レイアウトの操作が完了しました
        </div>
      )}
    </div>
  )
}
