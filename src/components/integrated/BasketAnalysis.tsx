import React, { useMemo } from 'react'
import { ECForceOrder } from '../../types/ecforce'
import { ShoppingBag, TrendingUp } from 'lucide-react'

interface BasketAnalysisProps {
  orders: ECForceOrder[]
}

interface ProductAssociation {
  productA: string
  productB: string
  supportCount: number // 同時購入回数
  supportA: number // Aの購入回数
  supportB: number // Bの購入回数
  confidence: number // 信頼度（A→B）
  lift: number // リフト値
}

export const BasketAnalysis: React.FC<BasketAnalysisProps> = ({ orders }) => {
  const { productStats, associations, frequentSets } = useMemo(() => {
    // 商品の購入回数を集計
    const productCount: Record<string, number> = {}
    const transactionCount = orders.length
    
    // 商品ペアの同時購入を記録
    const pairCount: Record<string, number> = {}
    
    orders.forEach(order => {
      const products = order.購入商品 || []
      
      // 各商品の購入回数をカウント
      products.forEach(product => {
        productCount[product] = (productCount[product] || 0) + 1
      })
      
      // 商品ペアの同時購入をカウント
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const pair = [products[i], products[j]].sort().join('::')
          pairCount[pair] = (pairCount[pair] || 0) + 1
        }
      }
    })
    
    // アソシエーション分析
    const associations: ProductAssociation[] = []
    
    Object.entries(pairCount).forEach(([pair, count]) => {
      const [productA, productB] = pair.split('::')
      const supportA = productCount[productA] || 0
      const supportB = productCount[productB] || 0
      
      if (count >= 2 && supportA > 0 && supportB > 0) { // 最小サポート数2
        const confidence = count / supportA
        const expectedSupport = (supportA / transactionCount) * (supportB / transactionCount)
        const actualSupport = count / transactionCount
        const lift = actualSupport / expectedSupport
        
        associations.push({
          productA,
          productB,
          supportCount: count,
          supportA,
          supportB,
          confidence: confidence * 100,
          lift
        })
      }
    })
    
    // リフト値でソート
    associations.sort((a, b) => b.lift - a.lift)
    
    // 頻出商品セット
    const frequentProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([product, count]) => ({
        product,
        count,
        percentage: (count / transactionCount) * 100
      }))
    
    // 商品統計
    const stats = {
      totalProducts: Object.keys(productCount).length,
      avgProductsPerOrder: orders.reduce((sum, order) => sum + (order.購入商品?.length || 0), 0) / orders.length,
      singleProductOrders: orders.filter(order => (order.購入商品?.length || 0) === 1).length,
      multiProductOrders: orders.filter(order => (order.購入商品?.length || 0) > 1).length
    }
    
    return {
      productStats: stats,
      associations: associations.slice(0, 20), // 上位20件
      frequentSets: frequentProducts
    }
  }, [orders])

  const getLiftColor = (lift: number) => {
    if (lift >= 3) return 'text-green-600 bg-green-100'
    if (lift >= 2) return 'text-blue-600 bg-blue-100'
    if (lift >= 1.5) return 'text-indigo-600 bg-indigo-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="space-y-6">
      {/* 商品統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総商品数</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {productStats.totalProducts}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均商品数/注文</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {productStats.avgProductsPerOrder.toFixed(1)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">単品購入</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {productStats.singleProductOrders}
            </p>
            <p className="text-xs text-gray-500">
              {((productStats.singleProductOrders / orders.length) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div>
            <p className="text-sm font-medium text-gray-600">複数商品購入</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">
              {productStats.multiProductOrders}
            </p>
            <p className="text-xs text-gray-500">
              {((productStats.multiProductOrders / orders.length) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* 頻出商品 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          人気商品TOP10
        </h3>
        <div className="space-y-3">
          {frequentSets.map((item, index) => (
            <div key={item.product} className="flex items-center">
              <div className="w-8 text-sm font-medium text-gray-500">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.product}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.count}回 ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 商品関連性分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          商品の関連性分析（アソシエーションルール）
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品A → 商品B
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  同時購入数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  信頼度
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リフト値
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  推奨アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {associations.map((assoc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assoc.productA} → {assoc.productB}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {assoc.supportCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {assoc.confidence.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLiftColor(assoc.lift)}`}>
                      {assoc.lift.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {assoc.lift >= 3 ? 'バンドル販売推奨' :
                     assoc.lift >= 2 ? 'クロスセル推奨' :
                     assoc.lift >= 1.5 ? 'レコメンド候補' :
                     '関連性あり'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>※ リフト値が1より大きい場合、商品間に正の相関があります</p>
          <p>※ 信頼度は「商品Aを購入した人が商品Bも購入する確率」を示します</p>
        </div>
      </div>

      {/* インサイト */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          バスケット分析のインサイト
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            リフト値が3以上の商品ペアは、バンドル商品として販売することで売上向上が期待できます。
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            信頼度が高い商品関連性を活用して、パーソナライズドレコメンドを実装しましょう。
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            単品購入が多い場合は、関連商品の提案やセット割引で客単価向上を図りましょう。
          </li>
        </ul>
      </div>
    </div>
  )
}