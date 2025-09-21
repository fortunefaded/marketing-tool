import React from 'react'

interface CampaignTypeDailyData {
  type: string
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversionValue: number
}

interface CampaignTypeBreakdown {
  pmax: CampaignTypeDailyData[]
  demandgen: CampaignTypeDailyData[]
  general: CampaignTypeDailyData[]
}

interface GoogleAdsCampaignTypeTableProps {
  data: CampaignTypeBreakdown
  startDate: string
  endDate: string
}

export const GoogleAdsCampaignTypeTable: React.FC<GoogleAdsCampaignTypeTableProps> = ({
  data,
  startDate,
  endDate,
}) => {
  // 全ての日付を取得
  const allDates = new Set<string>()
  Object.values(data).forEach(typeData => {
    typeData.forEach(item => allDates.add(item.date))
  })
  const sortedDates = Array.from(allDates).sort()

  // 各タイプの合計を計算
  const calculateTotals = (typeData: CampaignTypeDailyData[]) => {
    return typeData.reduce((acc, curr) => ({
      spend: acc.spend + curr.spend,
      impressions: acc.impressions + curr.impressions,
      clicks: acc.clicks + curr.clicks,
      conversions: acc.conversions + curr.conversions,
      conversionValue: acc.conversionValue + curr.conversionValue,
    }), {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
    })
  }

  const pMaxTotals = calculateTotals(data.pmax || [])
  const demandGenTotals = calculateTotals(data.demandgen || [])
  const generalTotals = calculateTotals(data.general || [])

  // 日付別のデータマップを作成
  const createDateMap = (typeData: CampaignTypeDailyData[]) => {
    const map = new Map<string, CampaignTypeDailyData>()
    typeData.forEach(item => map.set(item.date, item))
    return map
  }

  const pMaxMap = createDateMap(data.pmax || [])
  const demandGenMap = createDateMap(data.demandgen || [])
  const generalMap = createDateMap(data.general || [])

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          キャンペーンタイプ別実績
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {startDate} 〜 {endDate}
        </p>
      </div>

      {/* サマリーカード */}
      <div className="px-6 py-4 grid grid-cols-3 gap-4 bg-gray-50">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">P-Max</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">広告費</span>
              <span className="text-sm font-semibold">¥{pMaxTotals.spend.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CV</span>
              <span className="text-sm font-semibold">{pMaxTotals.conversions.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CPA</span>
              <span className="text-sm font-semibold">
                ¥{pMaxTotals.conversions > 0 ? Math.round(pMaxTotals.spend / pMaxTotals.conversions).toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Demand Gen</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">広告費</span>
              <span className="text-sm font-semibold">¥{demandGenTotals.spend.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CV</span>
              <span className="text-sm font-semibold">{demandGenTotals.conversions.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CPA</span>
              <span className="text-sm font-semibold">
                ¥{demandGenTotals.conversions > 0 ? Math.round(demandGenTotals.spend / demandGenTotals.conversions).toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">一般</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">広告費</span>
              <span className="text-sm font-semibold">¥{generalTotals.spend.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CV</span>
              <span className="text-sm font-semibold">{generalTotals.conversions.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">CPA</span>
              <span className="text-sm font-semibold">
                ¥{generalTotals.conversions > 0 ? Math.round(generalTotals.spend / generalTotals.conversions).toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 日別テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                日付
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                P-Max
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                Demand Gen
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                一般
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50" colSpan={3}>
                合計
              </th>
            </tr>
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-10"></th>
              {/* P-Max */}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">広告費</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CV</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CPA</th>
              {/* Demand Gen */}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">広告費</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CV</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CPA</th>
              {/* 一般 */}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">広告費</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CV</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">CPA</th>
              {/* 合計 */}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 bg-blue-50">広告費</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 bg-blue-50">CV</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 bg-blue-50">CPA</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDates.map((date) => {
              const pMaxData = pMaxMap.get(date)
              const demandGenData = demandGenMap.get(date)
              const generalData = generalMap.get(date)

              const totalSpend = (pMaxData?.spend || 0) + (demandGenData?.spend || 0) + (generalData?.spend || 0)
              const totalConversions = (pMaxData?.conversions || 0) + (demandGenData?.conversions || 0) + (generalData?.conversions || 0)
              const totalCPA = totalConversions > 0 ? totalSpend / totalConversions : 0

              return (
                <tr key={date} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {date}
                  </td>
                  {/* P-Max */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {pMaxData ? `¥${Math.round(pMaxData.spend).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {pMaxData ? pMaxData.conversions.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {pMaxData && pMaxData.conversions > 0 ? `¥${Math.round(pMaxData.spend / pMaxData.conversions).toLocaleString()}` : '-'}
                  </td>
                  {/* Demand Gen */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {demandGenData ? `¥${Math.round(demandGenData.spend).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {demandGenData ? demandGenData.conversions.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {demandGenData && demandGenData.conversions > 0 ? `¥${Math.round(demandGenData.spend / demandGenData.conversions).toLocaleString()}` : '-'}
                  </td>
                  {/* 一般 */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {generalData ? `¥${Math.round(generalData.spend).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {generalData ? generalData.conversions.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {generalData && generalData.conversions > 0 ? `¥${Math.round(generalData.spend / generalData.conversions).toLocaleString()}` : '-'}
                  </td>
                  {/* 合計 */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 bg-blue-50">
                    ¥{Math.round(totalSpend).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 bg-blue-50">
                    {totalConversions.toFixed(1)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 bg-blue-50">
                    {totalCPA > 0 ? `¥${Math.round(totalCPA).toLocaleString()}` : '-'}
                  </td>
                </tr>
              )
            })}
            {/* 合計行 */}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-100 z-10">
                合計
              </td>
              {/* P-Max */}
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                ¥{Math.round(pMaxTotals.spend).toLocaleString()}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {pMaxTotals.conversions.toFixed(1)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {pMaxTotals.conversions > 0 ? `¥${Math.round(pMaxTotals.spend / pMaxTotals.conversions).toLocaleString()}` : '-'}
              </td>
              {/* Demand Gen */}
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                ¥{Math.round(demandGenTotals.spend).toLocaleString()}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {demandGenTotals.conversions.toFixed(1)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {demandGenTotals.conversions > 0 ? `¥${Math.round(demandGenTotals.spend / demandGenTotals.conversions).toLocaleString()}` : '-'}
              </td>
              {/* 一般 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                ¥{Math.round(generalTotals.spend).toLocaleString()}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {generalTotals.conversions.toFixed(1)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {generalTotals.conversions > 0 ? `¥${Math.round(generalTotals.spend / generalTotals.conversions).toLocaleString()}` : '-'}
              </td>
              {/* 合計 */}
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900 bg-blue-100">
                ¥{Math.round(pMaxTotals.spend + demandGenTotals.spend + generalTotals.spend).toLocaleString()}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900 bg-blue-100">
                {(pMaxTotals.conversions + demandGenTotals.conversions + generalTotals.conversions).toFixed(1)}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900 bg-blue-100">
                {(pMaxTotals.conversions + demandGenTotals.conversions + generalTotals.conversions) > 0
                  ? `¥${Math.round((pMaxTotals.spend + demandGenTotals.spend + generalTotals.spend) / (pMaxTotals.conversions + demandGenTotals.conversions + generalTotals.conversions)).toLocaleString()}`
                  : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}