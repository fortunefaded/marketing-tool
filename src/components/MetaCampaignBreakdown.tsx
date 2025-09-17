import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { MetaAccount } from '@/types'

interface MetaCampaignBreakdownProps {
  accountId: string | null
  startDate: Date | null
  endDate: Date | null
  accounts: MetaAccount[]
  ecforceData?: any[]
}

interface CampaignData {
  id: string
  name: string
  cost: number
  impressions: number
  clicks: number
  cv: number
  cpo: number
  cpc: number
  ctr: number
  cvr: number
}

export function MetaCampaignBreakdown({
  accountId,
  startDate,
  endDate,
  accounts,
  ecforceData = [],
}: MetaCampaignBreakdownProps) {
  const [campaignData, setCampaignData] = useState<CampaignData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  // 日付フォーマット関数
  const formatDateToISO = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // キャンペーン別データ取得
  const fetchCampaignData = useCallback(async () => {
    const account = accounts.find(acc => acc.accountId === accountId)
    if (!accountId || !account?.accessToken || !startDate || !endDate) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = 'https://graph.facebook.com/v23.0'
      const cleanAccountId = accountId.replace('act_', '')
      const url = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)

      url.searchParams.append('access_token', account.accessToken)
      url.searchParams.append('time_range', JSON.stringify({
        since: formatDateToISO(startDate),
        until: formatDateToISO(endDate),
      }))
      url.searchParams.append('level', 'campaign')
      url.searchParams.append('fields', 'campaign_id,campaign_name,spend,impressions,clicks,actions,cpc,ctr')
      url.searchParams.append('limit', '100')

      console.log('📊 Meta キャンペーン別データ取得中...')
      const response = await fetch(url.toString())
      const result = await response.json()

      if (result.data) {
        // ECForceデータから期間中のCVを集計
        const totalECForceCV = ecforceData.reduce((sum, item) => sum + (item.cvOrder || 0), 0)

        // キャンペーンデータにECForceのCVを配分（費用比で配分）
        const totalSpend = result.data.reduce((sum: number, item: any) => sum + parseFloat(item.spend || '0'), 0)

        const campaigns = result.data.map((item: any) => {
          const cost = parseFloat(item.spend || '0')
          const clicks = parseInt(item.clicks || '0')
          const impressions = parseInt(item.impressions || '0')

          // ECForceのCVを費用比で配分
          const cv = totalSpend > 0 ? Math.round((cost / totalSpend) * totalECForceCV) : 0

          return {
            id: item.campaign_id,
            name: item.campaign_name || 'Unknown Campaign',
            cost,
            impressions,
            clicks,
            cv,
            cpo: cv > 0 ? cost / cv : 0,
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            cvr: clicks > 0 ? (cv / clicks) * 100 : 0,
          }
        })

        // コストが高い順にソート
        campaigns.sort((a: CampaignData, b: CampaignData) => b.cost - a.cost)

        setCampaignData(campaigns)
        console.log('✅ キャンペーン別データ取得完了:', campaigns.length, '件')
      }
    } catch (err) {
      console.error('❌ キャンペーンデータ取得エラー:', err)
      setError('データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, accounts, startDate, endDate, ecforceData])

  useEffect(() => {
    fetchCampaignData()
  }, [fetchCampaignData])

  // 数値フォーマット
  const formatNumber = (num: number) => num.toLocaleString('ja-JP')
  const formatCurrency = (num: number) => `¥${formatNumber(Math.round(num))}`

  // 合計計算
  const totals = useMemo(() => {
    return campaignData.reduce(
      (acc, campaign) => ({
        cost: acc.cost + campaign.cost,
        impressions: acc.impressions + campaign.impressions,
        clicks: acc.clicks + campaign.clicks,
        cv: acc.cv + campaign.cv,
      }),
      { cost: 0, impressions: 0, clicks: 0, cv: 0 }
    )
  }, [campaignData])

  const totalCPO = totals.cv > 0 ? totals.cost / totals.cv : 0
  const totalCPC = totals.clicks > 0 ? totals.cost / totals.clicks : 0
  const totalCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const totalCVR = totals.clicks > 0 ? (totals.cv / totals.clicks) * 100 : 0

  if (!accountId || !startDate || !endDate) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">キャンペーン別 Breakdown</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : campaignData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">データがありません</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">キャンペーン</th>
                  <th className="px-4 py-2 text-right font-medium">IMP</th>
                  <th className="px-4 py-2 text-right font-medium">CTR</th>
                  <th className="px-4 py-2 text-right font-medium">CPC</th>
                  <th className="px-4 py-2 text-right font-medium">CVR</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                  <th className="px-4 py-2 text-right font-medium">CV</th>
                  <th className="px-4 py-2 text-right font-medium bg-amber-50">CPO</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {campaignData.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">
                      {campaign.name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {campaign.ctr.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(campaign.cpc)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {campaign.cvr.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {formatCurrency(campaign.cost)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {formatNumber(campaign.cv)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600 bg-amber-50">
                      {formatCurrency(campaign.cpo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 text-sm font-semibold">
                <tr>
                  <td className="px-4 py-3 text-gray-900">合計</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatNumber(totals.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {totalCTR.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(totalCPC)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {totalCVR.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(totals.cost)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(totals.cv)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700 bg-amber-100">
                    {formatCurrency(totalCPO)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}