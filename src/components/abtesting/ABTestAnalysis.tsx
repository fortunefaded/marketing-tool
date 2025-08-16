import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Flask, TrendingUp, Users, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { ECForceOrder } from '../../types/ecforce'

interface ABTestAnalysisProps {
  orders: ECForceOrder[]
}

interface TestVariant {
  name: string
  visitors: number
  conversions: number
  revenue: number
  conversionRate: number
  averageOrderValue: number
  confidence: number
  isWinner: boolean
}

export const ABTestAnalysis: React.FC<ABTestAnalysisProps> = ({ orders }) => {
  const [testType, setTestType] = useState<'offer' | 'advertiser' | 'landing'>('offer')
  
  const testResults = useMemo(() => {
    // テストバリアントを抽出
    let variants: Map<string, ECForceOrder[]> = new Map()
    
    switch (testType) {
      case 'offer':
        orders.forEach(order => {
          const variant = order.購入オファー || '不明'
          const variantOrders = variants.get(variant) || []
          variantOrders.push(order)
          variants.set(variant, variantOrders)
        })
        break
        
      case 'advertiser':
        orders.forEach(order => {
          const variant = order.広告主名 || '不明'
          const variantOrders = variants.get(variant) || []
          variantOrders.push(order)
          variants.set(variant, variantOrders)
        })
        break
        
      case 'landing':
        orders.forEach(order => {
          const variant = order.購入URL || '不明'
          const variantOrders = variants.get(variant) || []
          variantOrders.push(order)
          variants.set(variant, variantOrders)
        })
        break
    }
    
    // 統計を計算
    const results: TestVariant[] = []
    let bestConversionRate = 0
    let controlVariant: TestVariant | null = null
    
    variants.forEach((variantOrders, variantName) => {
      // 仮想的な訪問者数を計算（コンバージョン率を20%と仮定）
      const visitors = Math.round(variantOrders.length / 0.2)
      const conversions = variantOrders.length
      const revenue = variantOrders.reduce((sum, order) => sum + order.小計, 0)
      const conversionRate = (conversions / visitors) * 100
      const averageOrderValue = conversions > 0 ? revenue / conversions : 0
      
      const variant: TestVariant = {
        name: variantName,
        visitors,
        conversions,
        revenue,
        conversionRate,
        averageOrderValue,
        confidence: 0,
        isWinner: false
      }
      
      results.push(variant)
      
      if (conversionRate > bestConversionRate) {
        bestConversionRate = conversionRate
      }
      
      // 最初のバリアントをコントロールとする
      if (!controlVariant) {
        controlVariant = variant
      }
    })
    
    // 統計的有意性を計算（簡易版）
    results.forEach(variant => {
      if (controlVariant && variant !== controlVariant) {
        // z検定の簡易実装
        const p1 = controlVariant.conversionRate / 100
        const p2 = variant.conversionRate / 100
        const n1 = controlVariant.visitors
        const n2 = variant.visitors
        
        const pooledP = (controlVariant.conversions + variant.conversions) / (n1 + n2)
        const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
        const z = Math.abs(p2 - p1) / se
        
        // z値から信頼度を計算（簡易版）
        if (z >= 2.58) variant.confidence = 99
        else if (z >= 1.96) variant.confidence = 95
        else if (z >= 1.645) variant.confidence = 90
        else variant.confidence = Math.min(89, z * 45)
      }
      
      variant.isWinner = variant.conversionRate === bestConversionRate && variant.confidence >= 95
    })
    
    return results.sort((a, b) => b.conversionRate - a.conversionRate)
  }, [orders, testType])
  
  // 勝者と対照群の比較
  const winner = testResults.find(v => v.isWinner)
  const control = testResults[testResults.length - 1] // 最もパフォーマンスが低いものを対照とする
  const improvement = winner && control && control.conversionRate > 0
    ? ((winner.conversionRate - control.conversionRate) / control.conversionRate) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* テストタイプ選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Flask className="h-5 w-5 mr-2 text-indigo-600" />
            A/Bテスト分析
          </h3>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="offer">購入オファー別</option>
            <option value="advertiser">広告主別</option>
            <option value="landing">ランディングページ別</option>
          </select>
        </div>

        {/* パフォーマンス比較グラフ */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={testResults} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === '売上') return `¥${value.toLocaleString()}`
                  if (name === 'コンバージョン率') return `${value.toFixed(2)}%`
                  return value
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="conversions" fill="#4F46E5" name="コンバージョン数" />
              <Bar yAxisId="right" dataKey="conversionRate" fill="#10B981" name="コンバージョン率" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 統計的有意性 */}
      {winner && (
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-start">
            <TrendingUp className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                テスト結果: {winner.name}が勝利
              </h4>
              <p className="text-sm text-gray-700">
                コンバージョン率: <span className="font-semibold">{winner.conversionRate.toFixed(2)}%</span>
                （対照群比 <span className="font-semibold text-green-600">+{improvement.toFixed(1)}%</span>）
              </p>
              <p className="text-sm text-gray-700 mt-1">
                統計的信頼度: <span className="font-semibold">{winner.confidence}%</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 詳細テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            バリアント詳細比較
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  バリアント
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  訪問者数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コンバージョン
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CVR
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  売上
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均単価
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  信頼度
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testResults.map((variant, index) => (
                <tr key={variant.name} className={variant.isWinner ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {variant.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {variant.visitors.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {variant.conversions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {variant.conversionRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{variant.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ¥{Math.round(variant.averageOrderValue).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      variant.confidence >= 95 ? 'bg-green-100 text-green-800' :
                      variant.confidence >= 90 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {variant.confidence}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {variant.isWinner ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        勝者
                      </span>
                    ) : index === testResults.length - 1 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        対照群
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 統計的有意性の説明 */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              統計的有意性について
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 信頼度95%以上: 統計的に有意な差があります</li>
              <li>• 信頼度90-95%: 差がある可能性が高いですが、さらなるデータが必要です</li>
              <li>• 信頼度90%未満: 統計的に有意な差はまだ確認できません</li>
              <li>• サンプルサイズが大きいほど、より正確な結果が得られます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}