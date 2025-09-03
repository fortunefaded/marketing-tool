import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ThreeLayerCache } from '../../features/meta-api/core/three-layer-cache'
import { SimpleAccountStore } from '../../features/meta-api/account/account-store'
import { FatigueDashboardPresentation } from '../../features/meta-api/components/FatigueDashboardPresentation'
import { MetaAccount } from '@/types'
import { 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CloudArrowDownIcon,
  ChartBarIcon,
  CheckCircleIcon as CheckCircleOutlineIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface SyncStats {
  totalRecords: number
  updatedRecords: number
  newRecords: number
  failedRecords: number
  startTime?: Date
  endTime?: Date
}

interface DataDiff {
  adId: string
  adName: string
  campaignName: string
  date: string
  type: 'new' | 'updated' | 'unchanged'
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  metrics?: {
    impressions?: number
    clicks?: number
    spend?: number
    ctr?: number
    conversions?: number
  }
}

export default function WeeklySyncPage() {
  const navigate = useNavigate()
  const convex = useConvex()
  
  // 同期状態
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalRecords: 0,
    updatedRecords: 0,
    newRecords: 0,
    failedRecords: 0
  })
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [dataDiffs, setDataDiffs] = useState<DataDiff[]>([])
  const [showDiffDetails, setShowDiffDetails] = useState(false)
  const [showUnchanged, setShowUnchanged] = useState(false)
  
  // アカウント情報
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))
  
  // ダッシュボード用の状態
  const [dashboardData, setDashboardData] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'last_month' | 'last_90d' | 'all'>('last_7d')
  const [filteredData, setFilteredData] = useState<any>(null)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [loadedDays, setLoadedDays] = useState(7) // 現在読み込まれている日数
  const [isLoadingMore, setIsLoadingMore] = useState(false) // 追加読み込み中
  const [isFilterLoading, setIsFilterLoading] = useState(false) // フィルター変更時のローディング
  const [filterUpdateMessage, setFilterUpdateMessage] = useState<string | null>(null) // フィルター更新完了メッセージ
  
  // Convexミューテーション
  const bulkInsertCacheData = useMutation(api.cache.cacheEntries.bulkInsert)
  
  // 初期化
  useEffect(() => {
    loadAccountInfo()
    loadLastSyncTime()
  }, [])
  
  const loadAccountInfo = async () => {
    try {
      setIsLoadingAccounts(true)
      const store = new SimpleAccountStore(convex)
      const accountsList = await store.getAccounts()
      setAccounts(accountsList)
      
      const activeAccount = await store.getActiveAccount()
      let targetAccountId: string | null = null
      
      if (!activeAccount) {
        if (accountsList.length > 0) {
          targetAccountId = accountsList[0].accountId
          setAccountId(targetAccountId)
          cacheSystem.setAccessToken(accountsList[0].accessToken)
        } else {
          navigate('/meta-api-setup')
          return
        }
      } else {
        targetAccountId = activeAccount.accountId
        setAccountId(targetAccountId)
        cacheSystem.setAccessToken(activeAccount.accessToken)
      }
      
      // アカウントが設定されたら既存データを読み込む（初期は7日分のみ）
      if (targetAccountId) {
        await loadExistingData(targetAccountId, 7)
        setLoadedDays(7)
      }
    } catch (error) {
      console.error('Failed to load account:', error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }
  
  // アカウント選択ハンドラ
  const handleAccountSelect = async (selectedAccountId: string) => {
    setAccountId(selectedAccountId)
    const store = new SimpleAccountStore(convex)
    await store.setActiveAccount(selectedAccountId)
    const account = accounts.find(acc => acc.accountId === selectedAccountId)
    if (account) {
      cacheSystem.setAccessToken(account.accessToken)
    }
    // アカウント切り替え時も既存データを読み込む（7日分）
    await loadExistingData(selectedAccountId, 7)
    setLoadedDays(7)
  }
  
  const loadLastSyncTime = async () => {
    // TODO: Convexから最終同期時刻を取得
    try {
      const stats = await convex.query(api.cache.cacheEntries.getStats, {
        accountId: accountId || undefined
      })
      
      if (stats?.newestEntry) {
        setLastSyncTime(new Date(stats.newestEntry))
      }
    } catch (error) {
      console.error('Failed to load last sync time:', error)
    }
  }
  
  // 既存データを読み込む関数（期間指定可能）
  const loadExistingData = async (targetAccountId: string, daysToLoad: number = 7) => {
    try {
      console.log(`📊 過去${daysToLoad}日分のデータを読み込み中...`)
      setIsLoading(true)
      
      // 日付範囲を計算
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysToLoad)
      const startDateStr = formatDate(startDate)
      const endDateStr = formatDate(endDate)
      
      // 【最適化】既存データ取得を削除（Bandwidth削減のため）
      console.log('⚠️ 既存データ取得をスキップ（Bandwidth削減）')
      const existingEntries = null // 一時的に無効化
      
      if (existingEntries && existingEntries.length > 0) {
        // データを結合（既にフィルタリング済み）
        const allData: any[] = []
        existingEntries.forEach((entry: any) => {
          if (entry.data && Array.isArray(entry.data)) {
            // 配列の場合
            allData.push(...entry.data)
          } else if (entry.data) {
            // 単一のデータオブジェクトの場合
            allData.push(entry.data)
          }
        })
        
        // 日付でソート（新しい順）
        allData.sort((a, b) => {
          const dateA = new Date(a.date_start || '').getTime()
          const dateB = new Date(b.date_start || '').getTime()
          return dateB - dateA
        })
        
        console.log(`✅ ${allData.length}件のデータを読み込みました（過去${daysToLoad}日分）`)
        
        // ダッシュボードのデータを設定
        setDashboardData(allData)
        setInsights(allData)
        setLastUpdateTime(new Date())
        setDataSource('cache')
      } else {
        console.log('📭 保存されたデータが見つかりません')
        // データがない場合は空配列を設定
        setDashboardData([])
        setInsights([])
      }
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 追加データを読み込む関数
  const loadMoreData = async () => {
    if (!accountId) return
    
    setIsLoadingMore(true)
    try {
      // 次の期間を計算（30日、90日、365日と段階的に）
      let nextDays = 30
      if (loadedDays >= 30) nextDays = 90
      if (loadedDays >= 90) nextDays = 365
      
      console.log(`📈 ${loadedDays}日から${nextDays}日分に拡張中...`)
      
      // 新しい期間のデータを読み込む
      await loadExistingData(accountId, nextDays)
      setLoadedDays(nextDays)
      
    } catch (error) {
      console.error('追加データ読み込みエラー:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }
  
  const performWeeklySync = async () => {
    if (!accountId) return
    
    setIsSyncing(true)
    setErrors([])
    setSyncStats({
      totalRecords: 0,
      updatedRecords: 0,
      newRecords: 0,
      failedRecords: 0,
      startTime: new Date()
    })
    
    try {
      // 日付範囲: 過去7日間 + 今日
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      
      console.log('📅 週次同期開始:', {
        accountId,
        dateRange: {
          since: formatDate(startDate),
          until: formatDate(endDate)
        }
      })
      
      // Meta APIからデータ取得
      const fetchResult = await cacheSystem.fetchFromApi(
        accountId,
        'weekly_update',
        {
          since: formatDate(startDate),
          until: formatDate(endDate),
          level: 'ad',
          time_increment: '1',
          fields: [
            'ad_id',
            'ad_name',
            'campaign_id',
            'campaign_name',
            'adset_id',
            'adset_name',
            'impressions',
            'clicks',
            'spend',
            'ctr',
            'cpm',
            'cpc',
            'frequency',
            'reach',
            'conversions',
            'conversion_values',
            'cost_per_conversion',
            'date_start',
            'date_stop'
          ]
        }
      )
      
      if (!fetchResult.data || fetchResult.data.length === 0) {
        throw new Error('最新データが見つかりませんでした')
      }
      
      const totalRecords = fetchResult.data.length
      console.log(`✅ ${totalRecords}件のデータを取得`)
      
      // 既存データを取得して差分を検出
      const diffs: DataDiff[] = []
      let newCount = 0
      let updateCount = 0
      
      // 【最適化】既存データ取得を削除（Bandwidth削減のため）
      console.log('📊 差分計算をスキップ（Bandwidth削減）')
      const existingByKey = new Map() // 空のマップ（全てを新規として扱う）
      
      // 新規データと既存データを比較（全レコードを保持）
      fetchResult.data.forEach((newRecord: any) => {
        const key = `${newRecord.ad_id}_${newRecord.date_start}`
        const existingRecord = existingByKey.get(key)
        
        const diff: DataDiff = {
          adId: newRecord.ad_id,
          adName: newRecord.ad_name || 'Unknown',
          campaignName: newRecord.campaign_name || 'Unknown',
          date: newRecord.date_start,
          type: 'unchanged',
          metrics: {
            impressions: parseInt(newRecord.impressions) || 0,
            clicks: parseInt(newRecord.clicks) || 0,
            spend: parseFloat(newRecord.spend) || 0,
            ctr: parseFloat(newRecord.ctr) || 0,
            conversions: parseInt(newRecord.conversions) || 0
          }
        }
        
        if (!existingRecord) {
          // 新規レコード
          diff.type = 'new'
          newCount++
        } else {
          // 既存レコードと比較
          const changes: any[] = []
          
          // 重要なメトリクスの変更をチェック
          const fieldsToCompare = ['impressions', 'clicks', 'spend', 'ctr', 'conversions']
          fieldsToCompare.forEach(field => {
            const oldVal = existingRecord[field]
            const newVal = newRecord[field]
            
            // 数値として比較
            const oldNum = parseFloat(oldVal) || 0
            const newNum = parseFloat(newVal) || 0
            
            if (Math.abs(oldNum - newNum) > 0.01) {
              changes.push({
                field,
                oldValue: oldVal,
                newValue: newVal
              })
            }
          })
          
          if (changes.length > 0) {
            diff.type = 'updated'
            diff.changes = changes
            updateCount++
          }
        }
        
        // 全レコードを保持（変更なしも含む）
        diffs.push(diff)
      })
      
      // 差分データを保存
      setDataDiffs(diffs)
      
      // ダッシュボード用にデータを設定
      setDashboardData(fetchResult.data || [])
      setInsights(fetchResult.data || [])
      setDataSource('api')
      
      // Convexにバッチ保存
      const batchSize = 50
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = fetchResult.data.slice(i, i + batchSize)
        
        const convexRecords = batch.map((record: any) => ({
          accountId,
          cacheKey: `${accountId}_${record.ad_id}_${record.date_start}`,
          data: record,
          expiresAt: undefined // 永続化
        }))
        
        try {
          await bulkInsertCacheData({ records: convexRecords })
          console.log(`📦 バッチ ${Math.floor(i/batchSize) + 1} 保存完了`)
        } catch (error) {
          console.error('バッチ保存エラー:', error)
          setSyncStats(prev => ({
            ...prev,
            failedRecords: prev.failedRecords + batch.length
          }))
        }
      }
      
      setSyncStats({
        totalRecords,
        updatedRecords: updateCount,
        newRecords: newCount,
        failedRecords: 0,
        endTime: new Date()
      })
      
      setLastSyncTime(new Date())
      console.log('🎉 週次同期完了!')
      
    } catch (error: any) {
      console.error('週次同期エラー:', error)
      setErrors([error.message || '同期中にエラーが発生しました'])
    } finally {
      setIsSyncing(false)
    }
  }
  
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const formatDateTime = (date: Date | null): string => {
    if (!date) return '未実行'
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getTimeSinceLastSync = (): string => {
    if (!lastSyncTime) return '未実行'
    
    const now = new Date()
    const diffMs = now.getTime() - lastSyncTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays}日前`
    } else if (diffHours > 0) {
      return `${diffHours}時間前`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}分前`
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 同期セクション */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* ヘッダー */}
          <div className="border-b pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <CalendarDaysIcon className="h-8 w-8 mr-3 text-indigo-600" />
                  週次データ同期
                </h1>
                <p className="text-gray-600 mt-2">
                  最新1週間のデータを取得して既存データを更新します
                </p>
              </div>
              <button
                onClick={() => navigate('/cache-viewer')}
                className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                データビューア →
              </button>
            </div>
          </div>
          
          {/* 同期ステータス */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">最終同期</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDateTime(lastSyncTime)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {getTimeSinceLastSync()}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">同期間隔</div>
              <div className="text-lg font-semibold text-gray-900">
                毎日推奨
              </div>
              <div className="text-sm text-gray-500 mt-1">
                最大7日分を取得
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">アカウントID</div>
              <div className="text-lg font-semibold text-gray-900">
                {accountId || 'Loading...'}
              </div>
            </div>
          </div>
          
          {/* 同期結果 */}
          {syncStats.startTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                {isSyncing ? '同期中...' : '同期結果'}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {syncStats.totalRecords}
                  </div>
                  <div className="text-sm text-gray-600">取得レコード</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {syncStats.updatedRecords}
                  </div>
                  <div className="text-sm text-gray-600">更新済み</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {syncStats.newRecords}
                  </div>
                  <div className="text-sm text-gray-600">新規追加</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {syncStats.failedRecords}
                  </div>
                  <div className="text-sm text-gray-600">エラー</div>
                </div>
              </div>
              
              {syncStats.endTime && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  実行時間: {Math.round((syncStats.endTime.getTime() - syncStats.startTime.getTime()) / 1000)}秒
                </div>
              )}
            </div>
          )}
          
          {/* 差分データ表示（テーブル形式） */}
          {dataDiffs.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  同期結果の詳細 (全{dataDiffs.length}件)
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                      新規: {syncStats.newRecords}
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                      更新: {syncStats.updatedRecords}
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                      変更なし: {dataDiffs.length - syncStats.newRecords - syncStats.updatedRecords}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {showDiffDetails && (
                      <button
                        onClick={() => setShowUnchanged(!showUnchanged)}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        {showUnchanged ? '変更なしを隠す' : '変更なしも表示'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowDiffDetails(!showDiffDetails)}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      {showDiffDetails ? '詳細を隠す' : '詳細を表示'}
                    </button>
                  </div>
                </div>
              </div>
              
              {showDiffDetails && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {/* フィルター適用時の件数表示 */}
                  {!showUnchanged && dataDiffs.filter(d => d.type === 'unchanged').length > 0 && (
                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 border-b">
                      {dataDiffs.filter(d => d.type === 'unchanged').length}件の変更なしレコードが非表示になっています
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状態
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            日付
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            広告名
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            キャンペーン
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Imp
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Clicks
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Spend (¥)
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CTR (%)
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conv
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            変更詳細
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dataDiffs
                          .filter(diff => showUnchanged || diff.type !== 'unchanged')
                          .map((diff, index) => (
                          <tr 
                            key={index}
                            className={`hover:bg-gray-50 ${
                              diff.type === 'new' 
                                ? 'bg-green-50' 
                                : diff.type === 'updated'
                                ? 'bg-blue-50'
                                : ''
                            }`}
                          >
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                diff.type === 'new'
                                  ? 'bg-green-100 text-green-800'
                                  : diff.type === 'updated'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {diff.type === 'new' ? '新規' : diff.type === 'updated' ? '更新' : '変更なし'}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {diff.date}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-900">
                              <div className="truncate max-w-xs" title={diff.adName}>
                                {diff.adName}
                              </div>
                              <div className="text-xs text-gray-500">ID: {diff.adId}</div>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-900">
                              <div className="truncate max-w-xs" title={diff.campaignName}>
                                {diff.campaignName}
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {diff.metrics?.impressions?.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {diff.metrics?.clicks?.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {diff.metrics?.spend?.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {diff.metrics?.ctr?.toFixed(2)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {diff.metrics?.conversions?.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 text-xs">
                              {diff.changes && diff.changes.length > 0 ? (
                                <div className="space-y-1">
                                  {diff.changes.map((change, i) => (
                                    <div key={i} className="whitespace-nowrap">
                                      <span className="font-medium text-gray-600">{change.field}:</span>
                                      <span className="text-red-600 ml-1">{change.oldValue}</span>
                                      <span className="mx-1 text-gray-400">→</span>
                                      <span className="text-green-600 font-medium">{change.newValue}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* データがない場合のメッセージ */}
                  {dataDiffs.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      同期するデータがありません
                    </div>
                  )}
                  
                  {/* 全て変更なしの場合のメッセージ */}
                  {dataDiffs.length > 0 && 
                   syncStats.newRecords === 0 && 
                   syncStats.updatedRecords === 0 && (
                    <div className="p-4 bg-gray-50 text-center">
                      <CheckCircleOutlineIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        全{dataDiffs.length}件のデータに変更はありませんでした
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* エラー表示 */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">エラー</h3>
                  {errors.map((error, index) => (
                    <p key={index} className="mt-1 text-sm text-red-700">{error}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* アクションボタン */}
          <div className="flex gap-4">
            <button
              onClick={performWeeklySync}
              disabled={isSyncing || !accountId}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                isSyncing || !accountId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isSyncing ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  同期中...
                </>
              ) : (
                <>
                  <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                  週次同期を実行
                </>
              )}
            </button>
            
            <button
              onClick={() => navigate('/meta-api-setup/sync')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              初回同期
            </button>
          </div>
          
          {/* 自動同期の案内 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 <strong>ヒント:</strong> データの鮮度を保つため、毎日または週2-3回の同期を推奨します。
              将来的には自動同期機能の実装も検討してください。
            </p>
          </div>
        </div>
        
        {/* フィルター更新完了メッセージ */}
        {filterUpdateMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">{filterUpdateMessage}</span>
            </div>
          </div>
        )}
        
        {/* ダッシュボードセクション */}
        <div className="bg-white rounded-2xl shadow-xl relative">
          {/* フィルター変更時のローディングオーバーレイ */}
          {isFilterLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">データを読み込み中...</p>
              </div>
            </div>
          )}
          
          <div className="border-b px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">広告パフォーマンス</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      キャンペーン、広告セット、広告の詳細分析
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {dashboardData.length.toLocaleString()}件
                  </div>
                  <div className="text-xs text-gray-500">
                    過去{loadedDays}日分
                    {isFilterLoading && (
                      <span className="ml-2 text-indigo-600">
                        更新中...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <FatigueDashboardPresentation
              // アカウント関連
              accounts={accounts}
              selectedAccountId={accountId}
              isLoadingAccounts={isLoadingAccounts}
              onAccountSelect={handleAccountSelect}
              // データ関連
              data={dashboardData}
              insights={insights}
              isLoading={isLoading || isSyncing}
              isRefreshing={false}
              error={null}
              // アクション
              onRefresh={async () => await performWeeklySync()}
              // メタ情報
              dataSource={dataSource}
              lastUpdateTime={lastSyncTime}
              // 進捗情報
              progress={undefined}
              // フィルター関連
              dateRange={dateRange}
              onDateRangeChange={async (newRange) => {
                setDateRange(newRange)
                setIsFilterLoading(true) // ローディング開始
                
                // 日付範囲に応じてデータを再読み込み
                let days = 7
                if (newRange === 'today') days = 1
                if (newRange === 'yesterday') days = 2
                if (newRange === 'last_7d') days = 7
                if (newRange === 'last_14d') days = 14
                if (newRange === 'last_30d') days = 30
                if (newRange === 'last_month') days = 30
                if (newRange === 'last_90d') days = 90
                if (newRange === 'all') days = 365
                
                try {
                  if (accountId) {
                    await loadExistingData(accountId, days)
                    setLoadedDays(days)
                    
                    // 更新完了メッセージを表示
                    const rangeText = {
                      'today': '今日',
                      'yesterday': '昨日',
                      'last_7d': '過去7日間',
                      'last_14d': '過去14日間', 
                      'last_30d': '過去30日間',
                      'last_month': '先月',
                      'last_90d': '過去90日間',
                      'all': '全期間'
                    }[newRange] || newRange
                    
                    setFilterUpdateMessage(`${rangeText}のデータを表示中`)
                    setTimeout(() => setFilterUpdateMessage(null), 3000) // 3秒後に消す
                  }
                } finally {
                  setIsFilterLoading(false) // ローディング終了
                }
              }}
              totalInsights={dashboardData.length}
              filteredCount={dashboardData.length}
              // 集約関連
              enableAggregation={false}
              aggregatedData={null}
              aggregationMetrics={undefined}
              isAggregating={false}
              // フィルター関連
              onFilterChange={setFilteredData}
              sourceData={dashboardData}
              // キャッシュ情報
              cacheLayerUsed={'L3'}
            />
            
            {/* 追加データ読み込みボタン */}
            {loadedDays < 365 && (
              <div className="px-8 py-6 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    現在: 過去{loadedDays}日分のデータを表示中
                    {loadedDays < 30 && ' • 次: 過去30日分'}
                    {loadedDays >= 30 && loadedDays < 90 && ' • 次: 過去90日分'}
                    {loadedDays >= 90 && loadedDays < 365 && ' • 次: 過去1年分'}
                  </div>
                  <button
                    onClick={loadMoreData}
                    disabled={isLoadingMore}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      isLoadingMore
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {isLoadingMore ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        読み込み中...
                      </>
                    ) : (
                      <>
                        <CalendarDaysIcon className="h-4 w-4 mr-2" />
                        過去のデータをもっと見る
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}