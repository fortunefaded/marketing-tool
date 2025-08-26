import React, { useMemo } from 'react'
import { ECForceOrder } from '@/types'

interface CohortAnalysisProps {
  orders: ECForceOrder[]
}

export const CohortAnalysis: React.FC<CohortAnalysisProps> = ({ orders }) => {
  const cohortData = useMemo(() => {
    // 顧客の初回購入月を特定
    const customerFirstPurchase: Record<string, string> = {}
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(a.受注日).getTime() - new Date(b.受注日).getTime()
    )

    sortedOrders.forEach((order) => {
      if (!customerFirstPurchase[order.顧客番号]) {
        const date = new Date(order.受注日)
        customerFirstPurchase[order.顧客番号] =
          `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
      }
    })

    // コホート別のリテンション率を計算
    const cohortMap: Record<string, Record<string, Set<string>>> = {}

    orders.forEach((order) => {
      const cohortMonth = customerFirstPurchase[order.顧客番号]
      const purchaseDate = new Date(order.受注日)
      const purchaseMonth = `${purchaseDate.getFullYear()}/${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`

      if (!cohortMap[cohortMonth]) {
        cohortMap[cohortMonth] = {}
      }
      if (!cohortMap[cohortMonth][purchaseMonth]) {
        cohortMap[cohortMonth][purchaseMonth] = new Set()
      }

      cohortMap[cohortMonth][purchaseMonth].add(order.顧客番号)
    })

    // コホートテーブルの作成
    const cohortTable: any[] = []
    const cohortMonths = Object.keys(cohortMap).sort()

    cohortMonths.forEach((cohortMonth) => {
      const cohortSize = Object.values(customerFirstPurchase).filter(
        (m) => m === cohortMonth
      ).length
      const row: any = {
        cohort: cohortMonth,
        cohortSize,
        month0: 100, // 初月は必ず100%
      }

      // 各月のリテンション率を計算
      const cohortStartDate = new Date(cohortMonth + '/01')

      for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(cohortStartDate)
        targetDate.setMonth(targetDate.getMonth() + i)
        const targetMonth = `${targetDate.getFullYear()}/${String(targetDate.getMonth() + 1).padStart(2, '0')}`

        if (cohortMap[cohortMonth][targetMonth]) {
          const retainedCustomers = cohortMap[cohortMonth][targetMonth].size
          row[`month${i}`] = Math.round((retainedCustomers / cohortSize) * 100)
        } else {
          row[`month${i}`] = 0
        }
      }

      cohortTable.push(row)
    })

    return cohortTable
  }, [orders])

  // 購入回数別の顧客分布
  const purchaseFrequency = useMemo(() => {
    const customerPurchases: Record<string, number> = {}

    orders.forEach((order) => {
      customerPurchases[order.顧客番号] = (customerPurchases[order.顧客番号] || 0) + 1
    })

    const distribution: Record<string, number> = {
      '1回': 0,
      '2回': 0,
      '3回': 0,
      '4-5回': 0,
      '6-9回': 0,
      '10回以上': 0,
    }

    Object.values(customerPurchases).forEach((count) => {
      if (count === 1) distribution['1回']++
      else if (count === 2) distribution['2回']++
      else if (count === 3) distribution['3回']++
      else if (count <= 5) distribution['4-5回']++
      else if (count <= 9) distribution['6-9回']++
      else distribution['10回以上']++
    })

    return Object.entries(distribution).map(([key, value]) => ({
      frequency: key,
      customers: value,
      percentage: Math.round((value / Object.keys(customerPurchases).length) * 100),
    }))
  }, [orders])

  const getRetentionColor = (value: number) => {
    if (value >= 50) return 'bg-green-100 text-green-800'
    if (value >= 30) return 'bg-yellow-100 text-yellow-800'
    if (value >= 10) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* コホートリテンション表 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月別コホートリテンション率</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コホート
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客数
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  初月
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  1ヶ月後
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  2ヶ月後
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  3ヶ月後
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  4ヶ月後
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  5ヶ月後
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  6ヶ月後
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cohortData.map((cohort) => (
                <tr key={cohort.cohort}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cohort.cohort}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {cohort.cohortSize}
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6].map((month) => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {cohort[`month${month}`] !== undefined ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRetentionColor(
                            cohort[`month${month}`]
                          )}`}
                        >
                          {cohort[`month${month}`]}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          ※ リテンション率は各コホートの初月購入顧客に対する、各月の購入顧客の割合を示しています
        </div>
      </div>

      {/* 購入回数分布 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">購入回数別顧客分布</h3>
        <div className="space-y-4">
          {purchaseFrequency.map((item) => (
            <div key={item.frequency} className="flex items-center">
              <div className="w-24 text-sm font-medium text-gray-700">{item.frequency}</div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-indigo-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-xs text-white font-medium">{item.percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-sm text-gray-600 text-right">{item.customers}人</div>
            </div>
          ))}
        </div>
      </div>

      {/* インサイト */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">コホート分析のインサイト</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            初月から2ヶ月目のリテンション率が重要な指標です。30%以上を維持できれば良好です。
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            購入回数1回の顧客が多い場合は、初回購入後のフォローアップ施策を強化しましょう。
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            定期購入への誘導やリマインドメールなど、リテンション向上施策を検討してください。
          </li>
        </ul>
      </div>
    </div>
  )
}
