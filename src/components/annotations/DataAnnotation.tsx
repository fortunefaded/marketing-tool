import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Edit2,
  Trash2,
  X,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

export interface Annotation {
  id: string
  text: string
  dataPoint: { date: string; value: number }
  author: string
  createdAt: Date
  color: string
  tags?: string[]
}

interface DataAnnotationProps {
  annotations: Annotation[]
  onSave: (annotation: Partial<Annotation>) => void
  onDelete: (id: string) => void
  currentDataPoint?: { date: string; value: number }
  showOnChart?: boolean
}

const COLORS = [
  { name: 'green', value: '#10B981' },
  { name: 'blue', value: '#3B82F6' },
  { name: 'yellow', value: '#F59E0B' },
  { name: 'red', value: '#EF4444' },
  { name: 'purple', value: '#8B5CF6' },
]

export const DataAnnotation: React.FC<DataAnnotationProps> = ({
  annotations,
  onSave,
  onDelete,
  currentDataPoint,
  showOnChart = false,
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'markdown' | null>(null)

  // フィルタリングとソート
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations.filter(
      (annotation) =>
        annotation.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        annotation.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        annotation.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // ソート
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [annotations, searchTerm, sortOrder])

  // 新規追加または編集の開始
  const startEdit = (annotation?: Annotation) => {
    if (annotation) {
      setEditingId(annotation.id)
      setText(annotation.text)
      setSelectedColor(annotation.color)
      setTags(annotation.tags || [])
    } else {
      setIsAdding(true)
      setText('')
      setSelectedColor(COLORS[0].value)
      setTags([])
    }
  }

  // 保存処理
  const handleSave = () => {
    if (!text.trim()) return

    const annotation: Partial<Annotation> = {
      text,
      color: selectedColor,
      tags,
    }

    if (editingId) {
      annotation.id = editingId
    } else if (currentDataPoint) {
      annotation.dataPoint = currentDataPoint
    }

    onSave(annotation)

    // リセット
    setIsAdding(false)
    setEditingId(null)
    setText('')
    setTags([])
  }

  // キャンセル処理
  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setText('')
    setTags([])
  }

  // タグ追加
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // タグ削除
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // エクスポート処理
  const handleExport = () => {
    if (!exportFormat) return

    const data = filteredAnnotations
    let content = ''
    let filename = ''
    let mimeType = ''

    switch (exportFormat) {
      case 'csv':
        content = 'ID,日付,値,テキスト,作成者,作成日時,色,タグ\n'
        data.forEach((a) => {
          content += `${a.id},${a.dataPoint.date},${a.dataPoint.value},"${a.text}",${a.author},${a.createdAt},${a.color},"${a.tags?.join(', ') || ''}"\n`
        })
        filename = 'annotations.csv'
        mimeType = 'text/csv'
        break

      case 'json':
        content = JSON.stringify(data, null, 2)
        filename = 'annotations.json'
        mimeType = 'application/json'
        break

      case 'markdown':
        content = '# データアノテーション\n\n'
        data.forEach((a) => {
          content += `## ${a.dataPoint.date} - ${a.dataPoint.value}\n\n`
          content += `**作成者:** ${a.author}\n`
          content += `**作成日時:** ${new Date(a.createdAt).toLocaleString()}\n`
          if (a.tags && a.tags.length > 0) {
            content += `**タグ:** ${a.tags.map((t) => `#${t}`).join(' ')}\n`
          }
          content += `\n${a.text}\n\n---\n\n`
        })
        filename = 'annotations.md'
        mimeType = 'text/markdown'
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    setExportFormat(null)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
          データアノテーション
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            アノテーション追加
          </button>

          <div className="relative">
            <button
              onClick={() => setExportFormat(exportFormat ? null : 'csv')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              エクスポート
            </button>

            {exportFormat !== null && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  onClick={() => {
                    setExportFormat('csv')
                    handleExport()
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  CSV形式
                </button>
                <button
                  onClick={() => {
                    setExportFormat('json')
                    handleExport()
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  JSON形式
                </button>
                <button
                  onClick={() => {
                    setExportFormat('markdown')
                    handleExport()
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Markdown形式
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 検索とソート */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="アノテーションを検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
        >
          {sortOrder === 'desc' ? '新しい順' : '古い順'}
          {sortOrder === 'desc' ? (
            <ChevronDown className="h-4 w-4 ml-1" />
          ) : (
            <ChevronUp className="h-4 w-4 ml-1" />
          )}
        </button>
      </div>

      {/* 新規追加フォーム */}
      {isAdding && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="mb-3">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              コメント
            </label>
            <textarea
              id="comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          {/* 色選択 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  data-testid={`color-${color.name}`}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>

          {/* タグ */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700"
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="タグを追加（Enterで確定）"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* アノテーション一覧 */}
      <div className="space-y-3">
        {filteredAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            data-testid="annotation-item"
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            style={{ borderLeftColor: annotation.color, borderLeftWidth: '4px' }}
          >
            {editingId === annotation.id ? (
              // 編集フォーム
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    更新
                  </button>
                </div>
              </div>
            ) : (
              // 表示
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-gray-900">{annotation.text}</p>
                    {annotation.tags && annotation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {annotation.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button
                      data-testid="edit-annotation"
                      onClick={() => startEdit(annotation)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      data-testid="delete-annotation"
                      onClick={() => setShowDeleteConfirm(annotation.id)}
                      className="p-1 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <span>{annotation.author}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(annotation.createdAt).toLocaleString()}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {annotation.dataPoint.date} - ¥{annotation.dataPoint.value.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* 削除確認 */}
            {showDeleteConfirm === annotation.id && (
              <div className="mt-3 p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-700 mb-2">このアノテーションを削除しますか？</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-3 py-1 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      onDelete(annotation.id)
                      setShowDeleteConfirm(null)
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* チャート表示用マーカー */}
      {showOnChart &&
        filteredAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            data-testid="annotation-marker"
            className="absolute"
            style={{
              backgroundColor: annotation.color,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const tooltip = document.createElement('div')
              tooltip.setAttribute('role', 'tooltip')
              tooltip.className =
                'absolute bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg z-50'
              tooltip.textContent = annotation.text
              tooltip.style.bottom = '20px'
              tooltip.style.left = '50%'
              tooltip.style.transform = 'translateX(-50%)'
              e.currentTarget.appendChild(tooltip)
            }}
            onMouseLeave={(e) => {
              const tooltip = e.currentTarget.querySelector('[role="tooltip"]')
              if (tooltip) tooltip.remove()
            }}
          />
        ))}
    </div>
  )
}
