import React from 'react'
import { TrendingUp, Users, ShoppingCart, DollarSign, Percent } from 'lucide-react'

interface KPIData {
  totalRevenue: number
  uniqueCustomers: number
  averageOrderValue: number
  subscriptionRate: number
  totalOrders: number
}

interface ECForceKPICardsProps {
  kpis: KPIData
}

export const ECForceKPICards: React.FC<ECForceKPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      title: '総売上',
      value: `¥${kpis.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '注文数',
      value: kpis.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'ユニーク顧客数',
      value: kpis.uniqueCustomers.toLocaleString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '平均注文単価',
      value: `¥${Math.round(kpis.averageOrderValue).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: '定期購入率',
      value: `${kpis.subscriptionRate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`${card.bgColor} rounded-full p-3`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
