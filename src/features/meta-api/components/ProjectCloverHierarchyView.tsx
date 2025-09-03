import React, { useState, useMemo } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface HierarchyItem {
  campaign_name: string
  adset_name?: string
  ad_name?: string
  ad_id?: string
  campaign_id?: string
  impressions: number
  clicks: number
  spend: number
  ctr?: number
  cpm?: number
  frequency?: number
  date_start?: string
}

interface ProjectCloverHierarchyViewProps {
  data: HierarchyItem[]
  isLoading?: boolean
}

interface CampaignData {
  name: string
  id?: string
  adsets: Record<string, AdsetData>
  totals: MetricTotals
}

interface AdsetData {
  name: string
  ads: HierarchyItem[]
  totals: MetricTotals
}

interface MetricTotals {
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpm: number
  frequency: number
}

export function ProjectCloverHierarchyView({ data, isLoading }: ProjectCloverHierarchyViewProps) {
  // 展開状態の管理
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set())

  // データを階層構造に変換
  const hierarchicalData = useMemo(() => {
    if (!data || data.length === 0) return {}

    const campaigns: Record<string, CampaignData> = {}

    data.forEach((item) => {
      const campaignKey = item.campaign_name || 'Unknown Campaign'
      const adsetKey = item.adset_name || 'Unknown Adset'

      // キャンペーンレベルの初期化
      if (!campaigns[campaignKey]) {
        campaigns[campaignKey] = {
          name: campaignKey,
          id: item.campaign_id,
          adsets: {},
          totals: {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
            cpm: 0,
            frequency: 0,
          },
        }
      }

      // 広告セットレベルの初期化
      if (!campaigns[campaignKey].adsets[adsetKey]) {
        campaigns[campaignKey].adsets[adsetKey] = {
          name: adsetKey,
          ads: [],
          totals: {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
            cpm: 0,
            frequency: 0,
          },
        }
      }

      // 広告を追加
      campaigns[campaignKey].adsets[adsetKey].ads.push(item)

      // 広告セットレベルの集計
      const adset = campaigns[campaignKey].adsets[adsetKey]
      adset.totals.impressions += Number(item.impressions) || 0
      adset.totals.clicks += Number(item.clicks) || 0
      adset.totals.spend += Number(item.spend) || 0

      // キャンペーンレベルの集計
      campaigns[campaignKey].totals.impressions += Number(item.impressions) || 0
      campaigns[campaignKey].totals.clicks += Number(item.clicks) || 0
      campaigns[campaignKey].totals.spend += Number(item.spend) || 0
    })

    // CTR、CPM、Frequencyを計算
    Object.values(campaigns).forEach((campaign) => {
      // キャンペーンレベルの計算
      if (campaign.totals.impressions > 0) {
        campaign.totals.ctr = (campaign.totals.clicks / campaign.totals.impressions) * 100
        campaign.totals.cpm = (campaign.totals.spend / campaign.totals.impressions) * 1000
      }

      // 広告セットレベルの計算
      Object.values(campaign.adsets).forEach((adset) => {
        if (adset.totals.impressions > 0) {
          adset.totals.ctr = (adset.totals.clicks / adset.totals.impressions) * 100
          adset.totals.cpm = (adset.totals.spend / adset.totals.impressions) * 1000
        }

        // 広告レベルのfrequency平均を計算
        const frequencies = adset.ads
          .map((ad) => Number(ad.frequency) || 0)
          .filter((f) => f > 0)
        if (frequencies.length > 0) {
          adset.totals.frequency = frequencies.reduce((a, b) => a + b, 0) / frequencies.length
        }
      })

      // キャンペーンレベルのfrequency平均を計算
      const allFrequencies = Object.values(campaign.adsets)
        .flatMap((adset) => adset.ads)
        .map((ad) => Number(ad.frequency) || 0)
        .filter((f) => f > 0)
      if (allFrequencies.length > 0) {
        campaign.totals.frequency =
          allFrequencies.reduce((a, b) => a + b, 0) / allFrequencies.length
      }
    })

    return campaigns
  }, [data])

  // キャンペーンの展開/折りたたみ
  const toggleCampaign = (campaignName: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignName)) {
      newExpanded.delete(campaignName)
    } else {
      newExpanded.add(campaignName)
    }
    setExpandedCampaigns(newExpanded)
  }

  // 広告セットの展開/折りたたみ
  const toggleAdset = (adsetKey: string) => {
    const newExpanded = new Set(expandedAdsets)
    if (newExpanded.has(adsetKey)) {
      newExpanded.delete(adsetKey)
    } else {
      newExpanded.add(adsetKey)
    }
    setExpandedAdsets(newExpanded)
  }

  // 数値フォーマット関数
  const formatNumber = (value: number) => {
    return value.toLocaleString('ja-JP')
  }

  const formatCurrency = (value: number) => {
    return `¥${Math.round(value).toLocaleString('ja-JP')}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const formatCPM = (value: number) => {
    return `¥${value.toFixed(2)}`
  }

  const formatFrequency = (value: number) => {
    return value.toFixed(2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データを読み込み中...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">階層ビュー</h3>
          <div className="text-sm text-gray-500">
            {Object.keys(hierarchicalData).length} キャンペーン
          </div>
        </div>
      </div>

      {/* 階層表示 */}
      <div className="space-y-2">
        {Object.entries(hierarchicalData).map(([campaignName, campaign]) => (
          <div key={campaignName} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* キャンペーンレベル */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleCampaign(campaignName)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {expandedCampaigns.has(campaignName) ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-500">
                      {Object.keys(campaign.adsets).length} 広告セット
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-gray-500">インプレッション</div>
                    <div className="font-medium">{formatNumber(campaign.totals.impressions)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">クリック</div>
                    <div className="font-medium">{formatNumber(campaign.totals.clicks)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">CTR</div>
                    <div className="font-medium">{formatPercentage(campaign.totals.ctr)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">CPM</div>
                    <div className="font-medium">{formatCPM(campaign.totals.cpm)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">頻度</div>
                    <div className="font-medium">
                      {campaign.totals.frequency > 0 ? formatFrequency(campaign.totals.frequency) : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">消化金額</div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(campaign.totals.spend)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 広告セットレベル */}
            {expandedCampaigns.has(campaignName) && (
              <div className="border-t border-gray-200">
                {Object.entries(campaign.adsets).map(([adsetName, adset]) => {
                  const adsetKey = `${campaignName}-${adsetName}`
                  return (
                    <div key={adsetKey} className="pl-8">
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                        onClick={() => toggleAdset(adsetKey)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {expandedAdsets.has(adsetKey) ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                            )}
                            <div>
                              <div className="font-medium text-gray-800 text-sm">{adset.name}</div>
                              <div className="text-xs text-gray-500">{adset.ads.length} 広告</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-6 gap-4 text-xs">
                            <div className="text-right">
                              <div className="font-medium">{formatNumber(adset.totals.impressions)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatNumber(adset.totals.clicks)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatPercentage(adset.totals.ctr)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCPM(adset.totals.cpm)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {adset.totals.frequency > 0 ? formatFrequency(adset.totals.frequency) : '-'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatCurrency(adset.totals.spend)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 広告レベル */}
                      {expandedAdsets.has(adsetKey) && (
                        <div className="bg-gray-50">
                          {adset.ads.map((ad, index) => (
                            <div
                              key={`${ad.ad_id}-${index}`}
                              className="pl-8 pr-4 py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <div className="text-sm text-gray-700">{ad.ad_name || 'Unnamed Ad'}</div>
                                </div>
                                <div className="grid grid-cols-6 gap-4 text-xs text-gray-600">
                                  <div className="text-right">{formatNumber(Number(ad.impressions) || 0)}</div>
                                  <div className="text-right">{formatNumber(Number(ad.clicks) || 0)}</div>
                                  <div className="text-right">
                                    {ad.ctr ? formatPercentage(Number(ad.ctr)) : '-'}
                                  </div>
                                  <div className="text-right">
                                    {ad.cpm ? formatCPM(Number(ad.cpm)) : '-'}
                                  </div>
                                  <div className="text-right">
                                    {ad.frequency ? formatFrequency(Number(ad.frequency)) : '-'}
                                  </div>
                                  <div className="text-right text-green-600">
                                    {formatCurrency(Number(ad.spend) || 0)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}