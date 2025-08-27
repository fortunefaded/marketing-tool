import { Link, useLocation } from 'react-router-dom'
import { useVibeLogger } from '../hooks/useVibeLogger'
import {
  Squares2X2Icon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import { ComponentType, useState, useEffect } from 'react'

interface MenuItem {
  name: string
  path?: string
  icon?: ComponentType<{ className?: string }>
  isHeader?: boolean
  isExpanded?: boolean
  children?: MenuItem[]
}

export default function Sidebar() {
  const location = useLocation()
  const logger = useVibeLogger('Sidebar')

  // localStorageから初期状態を読み込み
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  // 状態が変更されたらlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error)
    }
  }, [isCollapsed])

  const menuItems: MenuItem[] = [
    {
      name: '統合ダッシュボード',
      path: '/',
      icon: Squares2X2Icon,
    },
    {
      name: 'Meta広告詳細',
      path: '/meta-dashboard',
      icon: ChartBarIcon,
    },
    {
      name: '広告疲労度分析',
      path: '/ad-fatigue',
      icon: ExclamationTriangleIcon,
    },
    {
      name: 'テストダッシュボード',
      path: '/test-simple',
      icon: AcademicCapIcon,
    },
    {
      name: 'ECForce詳細',
      path: '/ecforce',
      icon: ChartBarIcon,
    },
  ]

  const handleMenuClick = (menuName: string) => {
    logger.action('メニュー項目クリック', { menuName })
  }

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path

    return (
      <li key={item.path}>
        <Link
          to={item.path!}
          onClick={() => handleMenuClick(item.name)}
          className={`
            flex items-center px-3 py-2 text-sm font-medium transition-colors rounded group
            ${isCollapsed ? 'justify-center' : 'space-x-3'}
            ${
              isActive
                ? 'bg-[#fef3c7] text-gray-800 border-l-4 border-[#f6d856]'
                : 'text-gray-700 hover:bg-gray-100'
            }
          `}
          title={isCollapsed ? item.name : undefined}
        >
          {Icon && <Icon className="w-5 h-5 text-[#f6d856] flex-shrink-0" />}
          {!isCollapsed && <span className="truncate">{item.name}</span>}
        </Link>
      </li>
    )
  }

  return (
    <aside
      className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-50 border-r border-gray-200 transition-all duration-300 relative`}
    >
      {/* 折りたたみボタン */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 bg-white border border-gray-300 rounded-full p-1 shadow-md hover:bg-gray-50 z-10"
        title={isCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
      >
        {isCollapsed ? (
          <ChevronDoubleRightIcon className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDoubleLeftIcon className="w-4 h-4 text-gray-600" />
        )}
      </button>

      <nav className="p-3">
        <ul className="space-y-0.5">{menuItems.map((item) => renderMenuItem(item))}</ul>
      </nav>
    </aside>
  )
}
