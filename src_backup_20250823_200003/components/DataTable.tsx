import { useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  format?: (value: unknown) => string
}

export interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  className?: string
}

export default function DataTable({ columns, data, onSort, className = '' }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: Column) => {
    if (!column.sortable) return

    const newDirection = sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc'

    setSortKey(column.key)
    setSortDirection(newDirection)

    if (onSort) {
      onSort(column.key, newDirection)
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0

    const aValue = a[sortKey]
    const bValue = b[sortKey]

    // Handle numeric values (including formatted numbers with commas)
    let aNum = NaN
    let bNum = NaN

    if (typeof aValue === 'string') {
      aNum = parseFloat(aValue.replace(/[,¥%]/g, ''))
    } else if (typeof aValue === 'number') {
      aNum = aValue
    }

    if (typeof bValue === 'string') {
      bNum = parseFloat(bValue.replace(/[,¥%]/g, ''))
    } else if (typeof bValue === 'number') {
      bNum = bValue
    }

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    }

    // Handle string comparison
    const aStr = String(aValue || '')
    const bStr = String(bValue || '')

    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr, 'ja')
    } else {
      return bStr.localeCompare(aStr, 'ja')
    }
  })

  const formatValue = (value: unknown, column: Column) => {
    if (column.format) {
      return column.format(value)
    }
    if (value === null || value === undefined) {
      return '-'
    }
    return String(value)
  }

  const getSortIcon = (column: Column) => {
    if (!column.sortable) return null

    if (sortKey === column.key) {
      return sortDirection === 'asc' ? (
        <ChevronUpIcon className="w-3 h-3" />
      ) : (
        <ChevronDownIcon className="w-3 h-3" />
      )
    }

    return (
      <div className="opacity-0 group-hover:opacity-50">
        <ChevronUpIcon className="w-3 h-3" />
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-3 py-3 text-xs font-medium text-gray-700 text-left
                  ${column.sortable ? 'cursor-pointer hover:bg-gray-50 group' : ''}
                  ${column.width || ''}
                `}
                style={{ textAlign: column.align || 'left' }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center justify-between">
                  <span>{column.label}</span>
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => {
            let highlightClass = ''
            if (row._highlight === 'green') {
              highlightClass = 'bg-green-50'
            } else if (row._highlight === 'summary') {
              highlightClass = 'bg-green-100 font-medium'
            }
            return (
              <tr
                key={rowIndex}
                className={`border-b border-gray-100 hover:bg-gray-50 ${highlightClass}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-3 text-sm text-gray-900"
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {formatValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
