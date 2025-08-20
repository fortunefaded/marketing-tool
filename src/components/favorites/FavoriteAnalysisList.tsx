import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  Clock,
  Hash,
  Search,
  Trash2,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Zap,
  Beaker,
} from 'lucide-react'
import { useFavoriteAnalysis, FavoriteAnalysis } from '../../hooks/useFavoriteAnalysis'

const typeIcons: Record<FavoriteAnalysis['type'], React.ReactNode> = {
  roas: <DollarSign className="h-5 w-5" />,
  cohort: <Users className="h-5 w-5" />,
  rfm: <BarChart3 className="h-5 w-5" />,
  basket: <ShoppingBag className="h-5 w-5" />,
  ltv: <TrendingUp className="h-5 w-5" />,
  prediction: <Zap className="h-5 w-5" />,
  abtest: <Beaker className="h-5 w-5" />,
  custom: <Star className="h-5 w-5" />,
}

const typeLabels: Record<FavoriteAnalysis['type'], string> = {
  roas: 'ROAS分析',
  cohort: 'コホート分析',
  rfm: 'RFM分析',
  basket: 'バスケット分析',
  ltv: 'LTV分析',
  prediction: '予測分析',
  abtest: 'A/Bテスト',
  custom: 'カスタム分析',
}

export const FavoriteAnalysisList: React.FC = () => {
  const { favorites, removeFavorite, recordAccess, searchFavorites } = useFavoriteAnalysis()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<FavoriteAnalysis['type'] | 'all'>('all')

  // フィルタリング
  const filteredFavorites = searchQuery
    ? searchFavorites(searchQuery)
    : selectedType === 'all'
      ? favorites
      : favorites.filter((fav) => fav.type === selectedType)

  // ソート（アクセス頻度順）
  const sortedFavorites = [...filteredFavorites].sort((a, b) => b.accessCount - a.accessCount)

  const handleClick = (favorite: FavoriteAnalysis) => {
    recordAccess(favorite.id)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm('このお気に入りを削除しますか？')) {
      removeFavorite(id)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-500" />
          お気に入り分析
        </h2>

        {/* 検索とフィルター */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="お気に入りを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">すべてのタイプ</option>
            {Object.entries(typeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* お気に入りリスト */}
      <div className="divide-y divide-gray-200">
        {sortedFavorites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery || selectedType !== 'all'
              ? 'お気に入りが見つかりませんでした'
              : 'まだお気に入りが登録されていません'}
          </div>
        ) : (
          sortedFavorites.map((favorite) => (
            <Link
              key={favorite.id}
              to={favorite.route}
              onClick={() => handleClick(favorite)}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-indigo-600">{typeIcons[favorite.type]}</div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{favorite.name}</h3>
                      {favorite.description && (
                        <p className="text-sm text-gray-500 mt-1">{favorite.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100">
                      {typeLabels[favorite.type]}
                    </span>

                    {favorite.tags && favorite.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {favorite.tags.map((tag) => (
                          <span key={tag} className="text-gray-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {favorite.lastAccessedAt
                          ? formatDate(favorite.lastAccessedAt)
                          : '未アクセス'}
                      </span>
                    </div>

                    <span>アクセス数: {favorite.accessCount}回</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                  <button
                    onClick={(e) => handleDelete(e, favorite.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
