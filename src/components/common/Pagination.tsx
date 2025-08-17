import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageInfo?: {
    from: number
    to: number
    total: number
  }
  itemsPerPageOptions?: number[]
  onItemsPerPageChange?: (items: number) => void
  itemsPerPage?: number
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageInfo,
  itemsPerPageOptions = [10, 20, 50, 100],
  onItemsPerPageChange,
  itemsPerPage = 20
}) => {
  // ページ番号の配列を生成
  const getPageNumbers = () => {
    const delta = 2 // 現在のページの前後に表示するページ数
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i)
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    })

    return rangeWithDots
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center">
          {pageInfo && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">{pageInfo.from}</span>
              {' - '}
              <span className="font-medium">{pageInfo.to}</span>
              {' / '}
              <span className="font-medium">{pageInfo.total}</span>
              {' 件'}
            </p>
          )}
          
          {onItemsPerPageChange && (
            <div className="ml-6 flex items-center">
              <label htmlFor="items-per-page" className="text-sm text-gray-700 mr-2">
                表示件数:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>
                    {option}件
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {/* 最初のページへ */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-l-md border ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              } border-gray-300`}
              aria-label="最初のページ"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* 前のページへ */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 text-sm font-medium border ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              } border-gray-300`}
              aria-label="前のページ"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* ページ番号 */}
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span
                  key={`dots-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    currentPage === page
                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            ))}

            {/* 次のページへ */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 text-sm font-medium border ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              } border-gray-300`}
              aria-label="次のページ"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* 最後のページへ */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 text-sm font-medium rounded-r-md border ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              } border-gray-300`}
              aria-label="最後のページ"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}