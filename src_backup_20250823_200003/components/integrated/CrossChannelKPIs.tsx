import React, { useMemo } from 'react'
import { TrendingUp, DollarSign, Users, ShoppingCart, Target, Percent } from 'lucide-react'
import { ECForceOrder } from '../../types/ecforce'

interface CrossChannelKPIsProps {
  ecforceOrders: ECForceOrder[]
  metaAdData: any
}

export const CrossChannelKPIs: React.FC<CrossChannelKPIsProps> = ({
  ecforceOrders,
  metaAdData,
}) => {
  const kpis = useMemo(() => {
    // EC Force側の集計
    const totalRevenue = ecforceOrders.reduce((sum, order) => sum + order.小計, 0)
    const uniqueCustomers = new Set(ecforceOrders.map((order) => order.顧客番号)).size
    const totalOrders = ecforceOrders.length

    // 広告経由の注文を推定（広告URLグループ名が存在するもの）
    const adOrders = ecforceOrders.filter(
      (order) => order.広告URLグループ名 && order.広告URLグループ名 !== ''
    )
    const adRevenue = adOrders.reduce((sum, order) => sum + order.小計, 0)

    // ROAS計算
    const roas = metaAdData.totalSpend > 0 ? adRevenue / metaAdData.totalSpend : 0

    // 顧客獲得コスト（CAC）
    const newCustomers = metaAdData.totalConversions || 0
    const cac = newCustomers > 0 ? metaAdData.totalSpend / newCustomers : 0

    // 平均注文単価
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // コンバージョン率
    const conversionRate =
      metaAdData.clicks > 0 ? (metaAdData.totalConversions / metaAdData.clicks) * 100 : 0

    return {
      totalRevenue,
      adRevenue,
      totalSpend: metaAdData.totalSpend,
      roas,
      cac,
      aov,
      uniqueCustomers,
      totalOrders,
      conversionRate,
      adAttributionRate: totalRevenue > 0 ? (adRevenue / totalRevenue) * 100 : 0,
    }
  }, [ecforceOrders, metaAdData])

  const cards = [
    {
      title: '総売上',
      value: `¥${kpis.totalRevenue.toLocaleString()}`,
      subtext: `広告経由: ¥${kpis.adRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'ROAS',
      value: kpis.roas.toFixed(2),
      subtext: '広告費用対効果',
      icon: TrendingUp,
      color: kpis.roas >= 3 ? 'text-green-600' : 'text-orange-600',
      bgColor: kpis.roas >= 3 ? 'bg-green-100' : 'bg-orange-100',
    },
    {
      title: '顧客獲得コスト',
      value: `¥${Math.round(kpis.cac).toLocaleString()}`,
      subtext: '新規顧客1人あたり',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '平均注文単価',
      value: `¥${Math.round(kpis.aov).toLocaleString()}`,
      subtext: `${kpis.totalOrders}件の注文`,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'コンバージョン率',
      value: `${kpis.conversionRate.toFixed(2)}%`,
      subtext: 'クリック→購入',
      icon: Target,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: '広告寄与率',
      value: `${kpis.adAttributionRate.toFixed(1)}%`,
      subtext: '売上に占める広告経由の割合',
      icon: Percent,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>
                </div>
                <div className={`${card.bgColor} rounded-full p-3`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 広告キャンペーン別パフォーマンス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">キャンペーン別パフォーマンス</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  キャンペーン名
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  広告費
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  インプレッション
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  クリック
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コンバージョン
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metaAdData.campaigns.map((campaign: any) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{campaign.spend.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {campaign.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {campaign.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {campaign.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{Math.round(campaign.spend / campaign.conversions).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
