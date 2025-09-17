import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'

interface MetaAdsBreakdownProps {
  accountId: string | null
  startDate: Date | null
  endDate: Date | null
  accessToken?: string
  ecforceData: any[]
}

interface CampaignData {
  id: string
  name: string
  cost: number
  clicks: number
  impressions: number
  cv: number
  cpo: number
  isExpanded?: boolean
  adsets?: AdsetData[]
}

interface AdsetData {
  id: string
  name: string
  campaignId: string
  cost: number
  clicks: number
  impressions: number
  cv: number
  cpo: number
}

type SortField = 'name' | 'cost' | 'cv' | 'cpo'
type SortOrder = 'asc' | 'desc'

export function MetaAdsBreakdown({
  accountId,
  startDate,
  endDate,
  accessToken,
  ecforceData,
}: MetaAdsBreakdownProps) {
  const [campaignData, setCampaignData] = useState<CampaignData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('cost')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())

  // 日付フォーマット関数
  const formatDateToISO = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Meta APIからキャンペーン・広告セット別データを取得
  const fetchCampaignData = useCallback(async () => {
    if (!accountId || !accessToken || !startDate || !endDate) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = 'https://graph.facebook.com/v23.0'
      const cleanAccountId = accountId.replace('act_', '')

      // キャンペーンレベルのデータを取得
      const campaignUrl = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)
      campaignUrl.searchParams.append('access_token', accessToken)
      campaignUrl.searchParams.append('time_range', JSON.stringify({
        since: formatDateToISO(startDate),
        until: formatDateToISO(endDate),
      }))
      campaignUrl.searchParams.append('level', 'campaign')
      campaignUrl.searchParams.append('fields', 'campaign_id,campaign_name,spend,clicks,impressions,actions')
      campaignUrl.searchParams.append('limit', '500')

      console.log('📊 キャンペーン別データ取得中...')
      const campaignResponse = await fetch(campaignUrl.toString())
      const campaignResult = await campaignResponse.json()

      // 広告セットレベルのデータを取得
      const adsetUrl = new URL(`${baseUrl}/act_${cleanAccountId}/insights`)
      adsetUrl.searchParams.append('access_token', accessToken)
      adsetUrl.searchParams.append('time_range', JSON.stringify({
        since: formatDateToISO(startDate),
        until: formatDateToISO(endDate),
      }))
      adsetUrl.searchParams.append('level', 'adset')
      adsetUrl.searchParams.append('fields', 'adset_id,adset_name,campaign_id,campaign_name,spend,clicks,impressions,actions')
      adsetUrl.searchParams.append('limit', '500')

      const adsetResponse = await fetch(adsetUrl.toString())
      const adsetResult = await adsetResponse.json()

      if (campaignResult.data) {
        // キャンペーンデータを整形
        const campaigns = new Map<string, CampaignData>()

        campaignResult.data.forEach((item: any) => {
          // actionsからpurchaseアクションを探す
          const purchaseAction = item.actions?.find((action: any) =>
            action.action_type === 'purchase' ||
            action.action_type === 'omni_purchase'
          )
          const cv = purchaseAction ? parseInt(purchaseAction.value) : 0

          const cost = parseFloat(item.spend || '0')
          campaigns.set(item.campaign_id, {
            id: item.campaign_id,
            name: item.campaign_name || 'Unknown Campaign',
            cost,
            clicks: parseInt(item.clicks || '0'),
            impressions: parseInt(item.impressions || '0'),
            cv,
            cpo: cv > 0 ? cost / cv : 0,
            adsets: [],
          })
        })

        // 広告セットデータを追加
        if (adsetResult.data) {
          adsetResult.data.forEach((item: any) => {
            const purchaseAction = item.actions?.find((action: any) =>
              action.action_type === 'purchase' ||
              action.action_type === 'omni_purchase'
            )
            const cv = purchaseAction ? parseInt(purchaseAction.value) : 0
            const cost = parseFloat(item.spend || '0')

            const adset: AdsetData = {
              id: item.adset_id,
              name: item.adset_name || 'Unknown Adset',
              campaignId: item.campaign_id,
              cost,
              clicks: parseInt(item.clicks || '0'),
              impressions: parseInt(item.impressions || '0'),
              cv,
              cpo: cv > 0 ? cost / cv : 0,
            }

            const campaign = campaigns.get(item.campaign_id)
            if (campaign) {
              if (!campaign.adsets) campaign.adsets = []
              campaign.adsets.push(adset)
            }
          })
        }

        setCampaignData(Array.from(campaigns.values()))
        console.log('✅ キャンペーン別データ取得完了')
      }
    } catch (err) {
      console.error('❌ キャンペーンデータ取得エラー:', err)
      setError('キャンペーンデータの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, accessToken, startDate, endDate])

  // データ取得
  useEffect(() => {
    fetchCampaignData()
  }, [fetchCampaignData])

  // ソート機能
  const sortedData = useMemo(() => {
    const sorted = [...campaignData]
    sorted.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'name') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    return sorted
  }, [campaignData, sortField, sortOrder])

  // ソート変更ハンドラー
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // 展開/折りたたみトグル
  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }

  // 数値フォーマット
  const formatNumber = (num: number) => num.toLocaleString('ja-JP')
  const formatCurrency = (num: number) => `¥${formatNumber(Math.round(num))}`

  // 合計計算
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, campaign) => ({
        cost: acc.cost + campaign.cost,
        cv: acc.cv + campaign.cv,
        clicks: acc.clicks + campaign.clicks,
      }),
      { cost: 0, cv: 0, clicks: 0 }
    )
  }, [sortedData])

  const totalCPO = totals.cv > 0 ? totals.cost / totals.cv : 0

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">キャンペーンデータを読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Meta広告 キャンペーン別パフォーマンス
        </h2>
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {sortedData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    キャンペーン
                    <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleSort('cost')}
                    className="flex items-center justify-end gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    広告費
                    <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleSort('cv')}
                    className="flex items-center justify-end gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    CV
                    <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleSort('cpo')}
                    className="flex items-center justify-end gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    CPO
                    <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </span>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CVR
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((campaign) => (
                <React.Fragment key={campaign.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCampaign(campaign.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {expandedCampaigns.has(campaign.id) ? (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <span className="font-medium text-gray-900">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatCurrency(campaign.cost)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatNumber(campaign.cv)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-amber-600">
                      {formatCurrency(campaign.cpo)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">
                      {campaign.impressions > 0
                        ? `${((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">
                      {campaign.clicks > 0
                        ? `${((campaign.cv / campaign.clicks) * 100).toFixed(2)}%`
                        : '-'}
                    </td>
                  </tr>
                  {expandedCampaigns.has(campaign.id) && campaign.adsets?.map((adset) => (
                    <tr key={adset.id} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                      <td className="pl-14 pr-6 py-3">
                        <span className="text-sm text-gray-600">└ {adset.name}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">
                        {formatCurrency(adset.cost)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">
                        {formatNumber(adset.cv)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-amber-600">
                        {formatCurrency(adset.cpo)}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-gray-500">
                        {adset.impressions > 0
                          ? `${((adset.clicks / adset.impressions) * 100).toFixed(2)}%`
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-gray-500">
                        {adset.clicks > 0
                          ? `${((adset.cv / adset.clicks) * 100).toFixed(2)}%`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 font-semibold text-gray-900">
                  合計
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                  {formatCurrency(totals.cost)}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">
                  {formatNumber(totals.cv)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-amber-700">
                  {formatCurrency(totalCPO)}
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          データがありません
        </div>
      )}
    </div>
  )
}

export default MetaAdsBreakdown