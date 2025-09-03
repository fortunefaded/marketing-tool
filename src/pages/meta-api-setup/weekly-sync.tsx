import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ThreeLayerCache } from '../../features/meta-api/core/three-layer-cache'
import { SimpleAccountStore } from '../../features/meta-api/account/account-store'
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline'

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
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))
  
  // Convexミューテーション
  const bulkInsertCacheData = useMutation(api.cache.cacheEntries.bulkInsert)
  
  // 初期化
  useEffect(() => {
    loadAccountInfo()
    loadLastSyncTime()
  }, [])
  
  const loadAccountInfo = async () => {
    try {
      const store = new SimpleAccountStore(convex)
      const activeAccount = await store.getActiveAccount()
      
      if (!activeAccount) {
        navigate('/meta-api-setup')
        return
      }
      
      setAccountId(activeAccount.accountId)
      cacheSystem.setAccessToken(activeAccount.accessToken)
    } catch (error) {
      console.error('Failed to load account:', error)
    }
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
      
      // 既存データを取得（過去7日分）
      const existingData = await convex.query(api.cache.cacheEntries.getByAccount, {
        accountId,
        includeExpired: false
      })
      
      // キーでインデックス化
      const existingByKey = new Map()
      existingData?.forEach((entry: any) => {
        if (entry.data) {
          const key = `${entry.data.ad_id}_${entry.data.date_start}`
          existingByKey.set(key, entry.data)
        }
      })
      
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
                      <CheckCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
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
      </div>
    </div>
  )
}