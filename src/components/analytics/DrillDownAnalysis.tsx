import React, { useState, useMemo } from 'react'
import { ECForceOrder } from '../../types/ecforce'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface DrillDownAnalysisProps {
  orders: ECForceOrder[]
}

type DrillLevel = 'advertiser' | 'product' | 'daily'

interface BreadcrumbItem {
  label: string
  level: DrillLevel
  value?: string
}

export const DrillDownAnalysis: React.FC<DrillDownAnalysisProps> = ({ orders }) => {
  const [currentLevel, setCurrentLevel] = useState<DrillLevel>('advertiser')
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('')

  // フィルタリングされた注文データ
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]
    
    if (dateFilter) {
      filtered = filtered.filter(order => 
        order.受注日.startsWith(dateFilter)
      )
    }
    
    if (selectedAdvertiser) {
      filtered = filtered.filter(order => 
        order.広告主名 === selectedAdvertiser
      )
    }
    
    if (selectedProduct) {
      filtered = filtered.filter(order => 
        order.購入商品?.includes(selectedProduct)
      )
    }
    
    return filtered
  }, [orders, dateFilter, selectedAdvertiser, selectedProduct])

  // レベル1: 広告主別データ
  const advertiserData = useMemo(() => {
    const data = new Map<string, number>()
    
    filteredOrders.forEach(order => {
      const advertiser = order.広告主名 || '不明'
      data.set(advertiser, (data.get(advertiser) || 0) + order.小計)
    })
    
    const total = Array.from(data.values()).reduce((sum, val) => sum + val, 0)
    
    return Array.from(data.entries()).map(([name, value]) => ({
      name,
      value,
      displayValue: `¥${value.toLocaleString()}`,
      percentage: ((value / total) * 100).toFixed(1)
    }))
  }, [filteredOrders])

  // レベル2: 商品別データ
  const productData = useMemo(() => {
    if (!selectedAdvertiser) return []
    
    const data = new Map<string, number>()
    
    filteredOrders.forEach(order => {
      order.購入商品?.forEach(product => {
        data.set(product, (data.get(product) || 0) + order.小計)
      })
    })
    
    return Array.from(data.entries()).map(([name, value]) => ({
      name,
      value,
      displayValue: `¥${value.toLocaleString()}`
    }))
  }, [filteredOrders, selectedAdvertiser])

  // レベル3: 日別データ
  const dailyData = useMemo(() => {
    if (!selectedProduct) return []
    
    const data = new Map<string, number>()
    
    filteredOrders.forEach(order => {
      const date = order.受注日.split(' ')[0]
      data.set(date, (data.get(date) || 0) + order.小計)
    })
    
    return Array.from(data.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        value,
        displayValue: `¥${value.toLocaleString()}`
      }))
  }, [filteredOrders, selectedProduct])

  // ドリルダウン処理
  const handleDrillDown = (name: string, level: DrillLevel) => {
    if (level === 'advertiser') {
      setSelectedAdvertiser(name)
      setCurrentLevel('product')
    } else if (level === 'product') {
      setSelectedProduct(name)
      setCurrentLevel('daily')
    }
  }

  // パンくずナビゲーション
  const breadcrumbs: BreadcrumbItem[] = [
    { label: '広告主別', level: 'advertiser' }
  ]
  
  if (selectedAdvertiser) {
    breadcrumbs.push({ 
      label: selectedAdvertiser, 
      level: 'product',
      value: selectedAdvertiser
    })
  }
  
  if (selectedProduct) {
    breadcrumbs.push({ 
      label: selectedProduct, 
      level: 'daily',
      value: selectedProduct
    })
  }

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setCurrentLevel(item.level)
    
    if (item.level === 'advertiser') {
      setSelectedAdvertiser(null)
      setSelectedProduct(null)
    } else if (item.level === 'product') {
      setSelectedProduct(null)
    }
  }

  // 色の配列
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">ドリルダウン分析</h2>
        <p className="text-gray-500">データがありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">ドリルダウン分析</h2>
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="date-filter" className="sr-only">期間</label>
            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            <ArrowDownTrayIcon className="h-5 w-5" />
            エクスポート
          </button>
        </div>
      </div>

      {/* パンくずナビゲーション */}
      <div className="flex items-center gap-2 mb-4">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.level}>
            {index > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
            <button
              data-testid={`breadcrumb-${item.level}`}
              onClick={() => handleBreadcrumbClick(item)}
              className={`text-sm ${
                index === breadcrumbs.length - 1
                  ? 'text-gray-900 font-medium'
                  : 'text-indigo-600 hover:text-indigo-800'
              }`}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
        {currentLevel === 'product' && ' > 商品別売上'}
        {currentLevel === 'daily' && ' > 日別売上'}
      </div>

      {/* グラフ表示 */}
      <div 
        data-testid="drill-down-container"
        className="transition-opacity duration-300 opacity-100"
      >
        {/* レベル1: 広告主別（円グラフ） */}
        {currentLevel === 'advertiser' && (
          <div data-testid="pie-chart" className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={advertiserData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {advertiserData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      onClick={() => handleDrillDown(entry.name, 'advertiser')}
                      style={{ cursor: 'pointer' }}
                      data-testid={`chart-segment-${index}`}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded shadow" role="tooltip">
                          <p className="font-medium">{data.name}</p>
                          <p>売上: {data.displayValue}</p>
                          <p>シェア: {data.percentage}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* レベル2: 商品別（棒グラフ） */}
        {currentLevel === 'product' && (
          <div data-testid="bar-chart" className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#3B82F6"
                  onClick={(data) => handleDrillDown(data.name || '', 'product')}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* レベル3: 日別（線グラフ） */}
        {currentLevel === 'daily' && (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}