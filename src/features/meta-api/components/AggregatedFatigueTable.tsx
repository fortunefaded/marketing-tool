import { AggregatedData } from '../utils/aggregation'

interface AggregatedFatigueTableProps {
  data: AggregatedData[]
  level: 'campaign' | 'adset'
}

export function AggregatedFatigueTable({ data, level }: AggregatedFatigueTableProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'caution': return 'bg-orange-100 text-orange-800'
      case 'healthy': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (value: number) => {
    return `¥${Math.ceil(value).toLocaleString('ja-JP')}`
  }

  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('ja-JP', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {level === 'campaign' ? 'キャンペーン' : '広告セット'}
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              広告数
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              疲労度
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              広告費用 (¥)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              インプレッション
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              クリック
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CV
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CPA (¥)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CTR (%)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CPC (¥)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CVR (%)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              CPM (¥)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Frequency
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">ID: {item.id}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <span className="text-sm text-gray-900">{item.adCount}</span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {item.fatigueScore !== undefined ? item.fatigueScore : '-'}
                  </span>
                  {item.fatigueStatus && (
                    <span className={`mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.fatigueStatus)}`}>
                      {item.fatigueStatus}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.spend)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.impressions)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.clicks)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.conversions)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {item.metrics.conversions > 0 ? formatCurrency(item.metrics.cpa) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.ctr, 2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.cpc)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.cvr, 2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatCurrency(item.metrics.cpm)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                {formatNumber(item.metrics.frequency, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}