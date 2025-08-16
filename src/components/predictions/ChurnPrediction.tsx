import React, { useMemo } from 'react'
import { AlertTriangle, TrendingDown, Users, Calendar } from 'lucide-react'
import { ECForceOrder } from '../../types/ecforce'

interface ChurnPredictionProps {
  orders: ECForceOrder[]
}

interface CustomerChurnRisk {
  customerId: string
  email: string
  lastPurchaseDate: Date
  daysSinceLastPurchase: number
  purchaseFrequency: number
  totalPurchases: number
  isSubscriber: boolean
  churnRisk: 'low' | 'medium' | 'high'
  churnProbability: number
  riskFactors: string[]
}

export const ChurnPrediction: React.FC<ChurnPredictionProps> = ({ orders }) => {
  const churnAnalysis = useMemo(() => {
    const now = new Date()
    const customerMap = new Map<string, {
      email: string
      purchases: Date[]
      totalSpent: number
      isSubscriber: boolean
    }>()

    // 顧客ごとにデータを集約
    orders.forEach(order => {
      const customer = customerMap.get(order.顧客番号) || {
        email: order.メールアドレス,
        purchases: [],
        totalSpent: 0,
        isSubscriber: false
      }
      
      customer.purchases.push(new Date(order.受注日))
      customer.totalSpent += order.小計
      if (order.定期ステータス === '有効') {
        customer.isSubscriber = true
      }
      
      customerMap.set(order.顧客番号, customer)
    })

    // チャーンリスクを計算
    const customerRisks: CustomerChurnRisk[] = []
    
    customerMap.forEach((customer, customerId) => {
      const sortedPurchases = customer.purchases.sort((a, b) => a.getTime() - b.getTime())
      const lastPurchase = sortedPurchases[sortedPurchases.length - 1]
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // 購入頻度を計算（平均購入間隔）
      let avgDaysBetweenPurchases = 0
      if (sortedPurchases.length > 1) {
        const totalDays = (lastPurchase.getTime() - sortedPurchases[0].getTime()) / (1000 * 60 * 60 * 24)
        avgDaysBetweenPurchases = totalDays / (sortedPurchases.length - 1)
      }
      
      // リスクファクターの特定
      const riskFactors: string[] = []
      let riskScore = 0
      
      // 最終購入からの経過日数
      if (!customer.isSubscriber) {
        if (daysSinceLastPurchase > avgDaysBetweenPurchases * 3) {
          riskFactors.push('長期間購入なし')
          riskScore += 40
        } else if (daysSinceLastPurchase > avgDaysBetweenPurchases * 2) {
          riskFactors.push('購入間隔が通常より長い')
          riskScore += 20
        }
      } else {
        // 定期購入者の場合
        if (daysSinceLastPurchase > 45) {
          riskFactors.push('定期購入が滞っている可能性')
          riskScore += 30
        }
      }
      
      // 購入回数
      if (sortedPurchases.length === 1) {
        riskFactors.push('初回購入のみ')
        riskScore += 30
      } else if (sortedPurchases.length < 3) {
        riskFactors.push('購入回数が少ない')
        riskScore += 15
      }
      
      // 購入頻度の低下
      if (sortedPurchases.length >= 3) {
        const recentInterval = daysSinceLastPurchase
        const historicalInterval = avgDaysBetweenPurchases
        if (recentInterval > historicalInterval * 2) {
          riskFactors.push('購入頻度が低下')
          riskScore += 25
        }
      }
      
      // チャーンリスクレベルの決定
      let churnRisk: 'low' | 'medium' | 'high'
      if (riskScore >= 60) {
        churnRisk = 'high'
      } else if (riskScore >= 30) {
        churnRisk = 'medium'
      } else {
        churnRisk = 'low'
      }
      
      // チャーン確率の計算（簡易版）
      const churnProbability = Math.min(95, riskScore * 1.2)
      
      customerRisks.push({
        customerId,
        email: customer.email,
        lastPurchaseDate: lastPurchase,
        daysSinceLastPurchase,
        purchaseFrequency: avgDaysBetweenPurchases,
        totalPurchases: sortedPurchases.length,
        isSubscriber: customer.isSubscriber,
        churnRisk,
        churnProbability,
        riskFactors
      })
    })

    // リスクレベル別の統計
    const riskStats = {
      high: customerRisks.filter(c => c.churnRisk === 'high').length,
      medium: customerRisks.filter(c => c.churnRisk === 'medium').length,
      low: customerRisks.filter(c => c.churnRisk === 'low').length,
      total: customerRisks.length
    }

    // 高リスク顧客をソート
    const highRiskCustomers = customerRisks
      .filter(c => c.churnRisk === 'high' || c.churnRisk === 'medium')
      .sort((a, b) => b.churnProbability - a.churnProbability)
      .slice(0, 20)

    return {
      customers: highRiskCustomers,
      stats: riskStats
    }
  }, [orders])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* リスク統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">高リスク顧客</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">
                {churnAnalysis.stats.high}
              </p>
              <p className="text-xs text-gray-500">
                {((churnAnalysis.stats.high / churnAnalysis.stats.total) * 100).toFixed(1)}%
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">中リスク顧客</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">
                {churnAnalysis.stats.medium}
              </p>
              <p className="text-xs text-gray-500">
                {((churnAnalysis.stats.medium / churnAnalysis.stats.total) * 100).toFixed(1)}%
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">低リスク顧客</p>
              <p className="text-2xl font-semibold text-green-600 mt-1">
                {churnAnalysis.stats.low}
              </p>
              <p className="text-xs text-gray-500">
                {((churnAnalysis.stats.low / churnAnalysis.stats.total) * 100).toFixed(1)}%
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">総顧客数</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {churnAnalysis.stats.total}
            </p>
            <p className="text-xs text-gray-500">
              アクティブ顧客
            </p>
          </div>
        </div>
      </div>

      {/* 高リスク顧客リスト */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            離脱リスクの高い顧客
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            早急な対応が必要な顧客リスト
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リスクレベル
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  離脱確率
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終購入
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  購入回数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リスク要因
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {churnAnalysis.customers.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.isSubscriber ? '定期購入者' : '通常購入者'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getRiskColor(customer.churnRisk)
                    }`}>
                      {customer.churnRisk === 'high' ? '高' :
                       customer.churnRisk === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            customer.churnProbability >= 70 ? 'bg-red-600' :
                            customer.churnProbability >= 40 ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}
                          style={{ width: `${customer.churnProbability}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {customer.churnProbability.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    <div className="flex items-center justify-end">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      {customer.daysSinceLastPurchase}日前
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {customer.totalPurchases}回
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <ul className="list-disc list-inside">
                      {customer.riskFactors.map((factor, index) => (
                        <li key={index} className="text-xs">{factor}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 対策提案 */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          推奨アクション
        </h4>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <div>
              <strong>高リスク顧客：</strong>
              パーソナライズされた特別オファーやリマインドメールを送信
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <div>
              <strong>定期購入の遅延：</strong>
              定期購入者には配送状況の確認と継続特典の案内
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <div>
              <strong>初回購入のみの顧客：</strong>
              2回目購入の特別割引やフォローアップメール
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}