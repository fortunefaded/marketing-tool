import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { useFavoriteAnalysis, FavoriteAnalysis } from '../../hooks/useFavoriteAnalysis'

interface AddToFavoriteButtonProps {
  analysisName: string
  analysisType: FavoriteAnalysis['type']
  route: string
  description?: string
  filters?: Record<string, any>
  className?: string
}

export const AddToFavoriteButton: React.FC<AddToFavoriteButtonProps> = ({
  analysisName,
  analysisType,
  route,
  description,
  filters,
  className = '',
}) => {
  const { favorites, addFavorite, removeFavorite } = useFavoriteAnalysis()
  const [showModal, setShowModal] = useState(false)
  const [customName, setCustomName] = useState(analysisName)
  const [customDescription, setCustomDescription] = useState(description || '')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // 現在の分析が既にお気に入りかチェック
  const isFavorited = favorites.some(
    (fav) => fav.route === route && JSON.stringify(fav.filters) === JSON.stringify(filters)
  )

  const existingFavorite = favorites.find(
    (fav) => fav.route === route && JSON.stringify(fav.filters) === JSON.stringify(filters)
  )

  const handleToggleFavorite = () => {
    if (isFavorited && existingFavorite) {
      // 既にお気に入りの場合は削除
      removeFavorite(existingFavorite.id)
    } else {
      // お気に入りでない場合はモーダルを表示
      setShowModal(true)
    }
  }

  const handleAddFavorite = () => {
    addFavorite({
      name: customName,
      description: customDescription,
      type: analysisType,
      route,
      filters,
      tags,
    })
    setShowModal(false)
    resetForm()
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const resetForm = () => {
    setCustomName(analysisName)
    setCustomDescription(description || '')
    setTags([])
    setTagInput('')
  }

  return (
    <>
      <button
        onClick={handleToggleFavorite}
        className={`inline-flex items-center px-4 py-2 border rounded-md transition-colors ${
          isFavorited
            ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        } ${className}`}
      >
        <Star className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
        {isFavorited ? 'お気に入り登録済み' : 'お気に入りに追加'}
      </button>

      {/* お気に入り追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">お気に入りに追加</h3>

            <div className="space-y-4">
              {/* 名前 */}
              <div>
                <label
                  htmlFor="favorite-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  名前
                </label>
                <input
                  id="favorite-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="お気に入りの名前"
                />
              </div>

              {/* 説明 */}
              <div>
                <label
                  htmlFor="favorite-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  説明（任意）
                </label>
                <textarea
                  id="favorite-description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="この分析の説明を入力"
                />
              </div>

              {/* タグ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タグ（任意）</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="タグを追加（Enterで確定）"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* 現在のフィルター情報 */}
              {filters && Object.keys(filters).length > 0 && (
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm text-gray-600">現在のフィルター設定も保存されます</p>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddFavorite}
                disabled={!customName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
