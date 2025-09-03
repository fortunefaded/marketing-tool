import React, { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  CircleStackIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface CacheEntry {
  _id: string
  cacheKey: string
  accountId: string
  dateRange: string
  data: any
  dataSize: number
  recordCount: number
  createdAt: number
  updatedAt: number
  expiresAt: number
  accessCount: number
  lastAccessedAt: number
}

interface GroupedData {
  [campaignId: string]: {
    campaignName: string
    adsets: {
      [adsetId: string]: {
        adsetName: string
        ads: {
          [adId: string]: {
            adName: string
            entries: CacheEntry[]
          }
        }
      }
    }
  }
}

export function CacheDataViewer() {
  const [selectedAccount, setSelectedAccount] = useState<string>('596086994975714')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set())
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<string>('')
  
  // Convexからキャッシュデータを取得
  const cacheEntries = useQuery(api.cache.cacheEntries.getByAccount, {
    accountId: selectedAccount,
    includeExpired: false
  })
  
  // キャッシュ統計を取得
  const cacheStats = useQuery(api.cache.cacheEntries.getStats, {
    accountId: selectedAccount
  })
  
  // データをグループ化
  const groupedData: GroupedData = React.useMemo(() => {
    if (!cacheEntries) return {}
    
    const grouped: GroupedData = {}
    
    cacheEntries.forEach((entry: CacheEntry) => {
      if (entry.data) {
        const { campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name } = entry.data
        
        // 日付フィルター
        if (dateFilter && entry.data.date_start && !entry.data.date_start.includes(dateFilter)) {
          return
        }
        
        if (!grouped[campaign_id]) {
          grouped[campaign_id] = {
            campaignName: campaign_name || 'Unknown Campaign',
            adsets: {}
          }
        }
        
        if (!grouped[campaign_id].adsets[adset_id]) {
          grouped[campaign_id].adsets[adset_id] = {
            adsetName: adset_name || 'Unknown Adset',
            ads: {}
          }
        }
        
        if (!grouped[campaign_id].adsets[adset_id].ads[ad_id]) {
          grouped[campaign_id].adsets[adset_id].ads[ad_id] = {
            adName: ad_name || 'Unknown Ad',
            entries: []
          }
        }
        
        grouped[campaign_id].adsets[adset_id].ads[ad_id].entries.push(entry)
      }
    })
    
    return grouped
  }, [cacheEntries, dateFilter])
  
  const toggleCampaign = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
    }
    setExpandedCampaigns(newExpanded)
  }
  
  const toggleAdset = (adsetId: string) => {
    const newExpanded = new Set(expandedAdsets)
    if (newExpanded.has(adsetId)) {
      newExpanded.delete(adsetId)
    } else {
      newExpanded.add(adsetId)
    }
    setExpandedAdsets(newExpanded)
  }
  
  const toggleAd = (adId: string) => {
    const newExpanded = new Set(expandedAds)
    if (newExpanded.has(adId)) {
      newExpanded.delete(adId)
    } else {
      newExpanded.add(adId)
    }
    setExpandedAds(newExpanded)
  }
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP')
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CircleStackIcon className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">キャッシュデータビューア</h1>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>更新</span>
          </button>
        </div>
        
        {/* 統計情報 */}
        {cacheStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">総エントリ数</div>
              <div className="text-2xl font-bold text-gray-900">{cacheStats.totalEntries.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">総データサイズ</div>
              <div className="text-2xl font-bold text-gray-900">{cacheStats.totalSizeMB.toFixed(2)} MB</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">総レコード数</div>
              <div className="text-2xl font-bold text-gray-900">{cacheStats.totalRecords.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">平均アクセス数</div>
              <div className="text-2xl font-bold text-gray-900">{cacheStats.avgAccessCount}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="日付フィルター (例: 2025-08)"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            {Object.keys(groupedData).length} キャンペーン表示中
          </div>
        </div>
      </div>
      
      {/* データ表示 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">保存されたデータ</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {Object.entries(groupedData).map(([campaignId, campaign]) => (
            <div key={campaignId} className="border-l-4 border-indigo-400">
              {/* キャンペーン */}
              <div
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={() => toggleCampaign(campaignId)}
              >
                <div className="flex items-center space-x-2">
                  {expandedCampaigns.has(campaignId) ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                  <ChartBarIcon className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">{campaign.campaignName}</span>
                  <span className="text-sm text-gray-500">({campaignId})</span>
                </div>
                <span className="text-sm text-gray-500">
                  {Object.keys(campaign.adsets).length} 広告セット
                </span>
              </div>
              
              {/* 広告セット */}
              {expandedCampaigns.has(campaignId) && (
                <div className="pl-8">
                  {Object.entries(campaign.adsets).map(([adsetId, adset]) => (
                    <div key={adsetId} className="border-l-4 border-blue-300">
                      <div
                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleAdset(adsetId)}
                      >
                        <div className="flex items-center space-x-2">
                          {expandedAdsets.has(adsetId) ? (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-gray-700">{adset.adsetName}</span>
                          <span className="text-xs text-gray-500">({adsetId})</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {Object.keys(adset.ads).length} 広告
                        </span>
                      </div>
                      
                      {/* 広告 */}
                      {expandedAdsets.has(adsetId) && (
                        <div className="pl-8">
                          {Object.entries(adset.ads).map(([adId, ad]) => (
                            <div key={adId} className="border-l-4 border-green-300">
                              <div
                                className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                onClick={() => toggleAd(adId)}
                              >
                                <div className="flex items-center space-x-2">
                                  {expandedAds.has(adId) ? (
                                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span className="text-gray-600 text-sm">{ad.adName}</span>
                                  <span className="text-xs text-gray-500">({adId})</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {ad.entries.length} エントリ
                                </span>
                              </div>
                              
                              {/* エントリ詳細 */}
                              {expandedAds.has(adId) && (
                                <div className="pl-8 pb-2">
                                  <div className="bg-gray-50 rounded-lg p-3 m-2 text-xs">
                                    <table className="min-w-full">
                                      <thead>
                                        <tr className="text-left text-gray-500">
                                          <th className="pr-4">日付</th>
                                          <th className="pr-4">Impressions</th>
                                          <th className="pr-4">Clicks</th>
                                          <th className="pr-4">CTR</th>
                                          <th className="pr-4">Spend</th>
                                          <th className="pr-4">サイズ</th>
                                          <th>更新日時</th>
                                        </tr>
                                      </thead>
                                      <tbody className="text-gray-700">
                                        {ad.entries
                                          .sort((a, b) => (b.data.date_start || '').localeCompare(a.data.date_start || ''))
                                          .map((entry) => (
                                          <tr key={entry._id} className="border-t border-gray-200">
                                            <td className="pr-4 py-1">{entry.data.date_start}</td>
                                            <td className="pr-4">{entry.data.impressions}</td>
                                            <td className="pr-4">{entry.data.clicks}</td>
                                            <td className="pr-4">{entry.data.ctr}%</td>
                                            <td className="pr-4">¥{entry.data.spend}</td>
                                            <td className="pr-4">{formatBytes(entry.dataSize)}</td>
                                            <td>{formatDate(entry.updatedAt)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {Object.keys(groupedData).length === 0 && (
          <div className="p-8 text-center text-gray-500">
            データが見つかりません
          </div>
        )}
      </div>
    </div>
  )
}