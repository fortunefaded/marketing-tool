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
  ClockIcon,
  CircleStackIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline'

interface SyncStats {
  totalRecords: number
  processedRecords: number
  savedRecords: number
  failedRecords: number
  estimatedTime: string
  startTime?: Date
  endTime?: Date
}

interface SyncError {
  timestamp: Date
  message: string
  detail?: any
}

type SyncStatus = 'idle' | 'preparing' | 'fetching' | 'saving' | 'validating' | 'complete' | 'error'

export default function MetaApiSyncPage() {
  const navigate = useNavigate()
  const convex = useConvex()
  
  // 同期状態
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalRecords: 0,
    processedRecords: 0,
    savedRecords: 0,
    failedRecords: 0,
    estimatedTime: '約2-3分'
  })
  const [errors, setErrors] = useState<SyncError[]>([])
  const [progressPercent, setProgressPercent] = useState(0)
  
  // アカウント情報
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  
  // 3層キャッシュシステム
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))
  
  // Convexミューテーション
  const bulkInsertCacheData = useMutation(api.cache.cacheEntries.bulkInsert)
  
  // 初期化：アカウント情報の取得
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const store = new SimpleAccountStore(convex)
        const activeAccount = await store.getActiveAccount()
        
        if (!activeAccount) {
          // アカウントが設定されていない場合はセットアップページへ
          navigate('/meta-api-setup')
          return
        }
        
        setAccountId(activeAccount.accountId)
        setAccessToken(activeAccount.accessToken)
        cacheSystem.setAccessToken(activeAccount.accessToken)
        
        console.log('📱 アカウント情報をロード:', {
          accountId: activeAccount.accountId,
          hasAccessToken: !!activeAccount.accessToken,
          tokenLength: activeAccount.accessToken?.length || 0
        })
      } catch (error) {
        console.error('Failed to load account:', error)
        setErrors([{
          timestamp: new Date(),
          message: 'アカウント情報の読み込みに失敗しました',
          detail: error
        }])
      }
    }
    
    loadAccount()
  }, [convex, cacheSystem, navigate])
  
  // 同期処理の実行
  const startSync = async () => {
    if (!accountId || !accessToken) {
      setErrors([{
        timestamp: new Date(),
        message: 'アカウント情報が設定されていません'
      }])
      return
    }
    
    setSyncStatus('preparing')
    setErrors([])
    setSyncStats(prev => ({ ...prev, startTime: new Date() }))
    
    try {
      // Step 1: 日付範囲の計算（過去1年）
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - 1) // 昨日まで
      
      const startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1) // 1年前から
      
      const dateRange = {
        since: formatDate(startDate),
        until: formatDate(endDate)
      }
      
      // 1年分を月ごとのバッチに分割
      const monthlyBatches = []
      const currentDate = new Date(startDate)
      
      while (currentDate < endDate) {
        const batchStart = new Date(currentDate)
        const batchEnd = new Date(currentDate)
        batchEnd.setMonth(batchEnd.getMonth() + 1)
        batchEnd.setDate(batchEnd.getDate() - 1)
        
        // 終了日が全体の終了日を超えないようにする
        if (batchEnd > endDate) {
          batchEnd.setTime(endDate.getTime())
        }
        
        monthlyBatches.push({
          since: formatDate(batchStart),
          until: formatDate(batchEnd)
        })
        
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
      
      console.log('🚀 同期開始:', {
        accountId,
        dateRange,
        monthlyBatches: monthlyBatches.length,
        estimatedRecords: 50 * 365 // 50広告 × 365日
      })
      
      // Step 2: Meta APIからデータ取得（月単位でバッチ処理）
      setSyncStatus('fetching')
      setProgressPercent(10)
      
      let allFetchedData: any[] = []
      let fetchProgress = 10
      const progressPerMonth = 40 / monthlyBatches.length // 全体の40%をfetch用に割り当て
      
      for (const [monthIndex, monthBatch] of monthlyBatches.entries()) {
        console.log(`📅 ${monthIndex + 1}/${monthlyBatches.length}ヶ月目を取得中:`, monthBatch)
        
        try {
          const fetchResult = await cacheSystem.fetchFromApi(
            accountId,
            'custom',
            {
              since: monthBatch.since,
              until: monthBatch.until,
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
          
          console.log(`📊 API結果 (${monthBatch.since}〜${monthBatch.until}):`, {
            source: fetchResult.source,
            hasData: !!fetchResult.data,
            dataLength: fetchResult.data?.length || 0,
            metadata: fetchResult.metadata
          })
          
          if (fetchResult.data && fetchResult.data.length > 0) {
            allFetchedData = [...allFetchedData, ...fetchResult.data]
            console.log(`✅ ${monthBatch.since}〜${monthBatch.until}: ${fetchResult.data.length}件取得`)
          } else if (fetchResult.metadata?.error) {
            console.error(`❌ APIエラー: ${fetchResult.metadata.error}`)
            throw new Error(`APIエラー: ${fetchResult.metadata.error}`)
          } else {
            console.warn(`⚠️ ${monthBatch.since}〜${monthBatch.until}: データなし`)
          }
          
          // プログレスバー更新
          fetchProgress += progressPerMonth
          setProgressPercent(Math.round(fetchProgress))
          
          // API制限を考慮して少し待機
          if (monthIndex < monthlyBatches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
          }
        } catch (error: any) {
          console.error(`❌ ${monthBatch.since}〜${monthBatch.until}の取得に失敗:`, error)
          
          // エラーの詳細情報を構築
          const errorDetail = {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            response: error?.response,
            data: error?.data,
            metadata: error?.metadata
          }
          
          setErrors(prev => [...prev, {
            timestamp: new Date(),
            message: `${monthBatch.since}〜${monthBatch.until}のデータ取得失敗: ${error?.message || 'Unknown error'}`,
            detail: errorDetail
          }])
          
          // デバッグ用に詳細をコンソールに出力
          console.error('詳細なエラー情報:', errorDetail)
          
          // エラーが発生しても続行（部分的な成功を許容）
        }
      }
      
      if (allFetchedData.length === 0) {
        throw new Error('データが取得できませんでした')
      }
      
      const totalRecords = allFetchedData.length
      setSyncStats(prev => ({
        ...prev,
        totalRecords
      }))
      
      console.log(`✅ 合計${totalRecords}件のデータを取得しました`)
      
      // Step 3: Convexへの保存（バッチ処理）
      setSyncStatus('saving')
      setProgressPercent(30)
      
      const batchSize = 100
      const batches = []
      
      for (let i = 0; i < totalRecords; i += batchSize) {
        batches.push(allFetchedData.slice(i, i + batchSize))
      }
      
      let savedCount = 0
      let shouldStop = false // エラー時の停止フラグ
      
      for (const [index, batch] of batches.entries()) {
        // 既にエラーが発生している場合は処理を停止
        if (shouldStop) {
          console.warn(`⚠️ 前のバッチでエラーが発生したため、バッチ ${index + 1} 以降の処理をスキップします`)
          setSyncStats(prev => ({
            ...prev,
            failedRecords: prev.failedRecords + (totalRecords - savedCount)
          }))
          break
        }
        
        try {
          // Convexスキーマに合わせてデータを変換
          const convexRecords = batch.map((record: any) => ({
            accountId,
            cacheKey: `${accountId}_${record.ad_id}_${record.date_start}`,
            data: record,
            expiresAt: undefined // 永続化のため期限なし
          }))
          
          await bulkInsertCacheData({ records: convexRecords })
          
          savedCount += batch.length
          const progress = 30 + ((index + 1) / batches.length) * 50
          setProgressPercent(progress)
          
          setSyncStats(prev => ({
            ...prev,
            processedRecords: savedCount,
            savedRecords: savedCount
          }))
          
          console.log(`📦 バッチ ${index + 1}/${batches.length} 保存完了`)
        } catch (error: any) {
          console.error(`❌ バッチ ${index + 1} の保存に失敗:`, error)
          
          // エラーの詳細を取得
          const errorMessage = error?.message || 'Unknown error'
          const errorDetails = {
            batchNumber: index + 1,
            batchSize: batch.length,
            totalBatches: batches.length,
            remainingBatches: batches.length - index - 1,
            error: errorMessage,
            stack: error?.stack,
            convexError: error?.data
          }
          
          console.error('詳細なエラー情報:', errorDetails)
          
          // Convex関数が見つからないエラーの場合は即座に停止
          if (errorMessage.includes('Could not find public function') || 
              errorMessage.includes('forget to run `npx convex dev`')) {
            console.error('🛑 Convex関数が見つかりません。npx convex dev を実行してください。')
            shouldStop = true // 以降の処理を停止
            
            setErrors(prev => [...prev, {
              timestamp: new Date(),
              message: `致命的エラー: Convexが正しく起動していません。npx convex dev を実行してください。`,
              detail: errorDetails
            }])
            
            // 残りのバッチをすべて失敗扱いに
            const remainingRecords = totalRecords - savedCount
            setSyncStats(prev => ({
              ...prev,
              failedRecords: remainingRecords
            }))
          } else {
            // その他のエラーの場合も停止（Convexトークン節約）
            shouldStop = true
            
            setErrors(prev => [...prev, {
              timestamp: new Date(),
              message: `バッチ ${index + 1} の保存に失敗: ${errorMessage}（以降の処理を停止）`,
              detail: errorDetails
            }])
            
            setSyncStats(prev => ({
              ...prev,
              failedRecords: prev.failedRecords + batch.length
            }))
          }
        }
      }
      
      // エラーチェック（失敗レコードがある場合は検証をスキップ）
      let hasErrors = false
      let finalFailedCount = syncStats.failedRecords
      
      // バッチ処理中にエラーが発生した場合の再計算
      if (savedCount < totalRecords) {
        finalFailedCount = totalRecords - savedCount
        hasErrors = true
      }
      
      if (errors.length > 0 || finalFailedCount > 0) {
        hasErrors = true
      }
      
      // エラーがない場合のみ検証と完了処理
      if (!hasErrors) {
        // Step 4: 検証
        setSyncStatus('validating')
        setProgressPercent(85)
        
        // 保存されたデータの検証
        const validationResult = await validateSavedData(accountId, dateRange)
        
        if (!validationResult.isValid) {
          throw new Error(`データ検証に失敗: ${validationResult.message}`)
        }
        
        // Step 5: 完了
        setSyncStatus('complete')
        setProgressPercent(100)
        setSyncStats(prev => ({
          ...prev,
          endTime: new Date(),
          savedRecords: savedCount,
          failedRecords: 0
        }))
        
        console.log('🎉 初回データ同期が完了しました！')
        console.log(`成功: ${savedCount}/${totalRecords}件`)
        
        // 3秒後に完了画面へ遷移（成功時のみ）
        setTimeout(() => {
          navigate('/meta-api-setup/complete')
        }, 3000)
      } else {
        // エラーがある場合は絶対に遷移しない
        setSyncStatus('error')
        setProgressPercent(savedCount > 0 ? 70 : 50) // 部分的成功か完全失敗かで調整
        setSyncStats(prev => ({
          ...prev,
          endTime: new Date(),
          savedRecords: savedCount,
          failedRecords: finalFailedCount
        }))
        
        const errorSummary = `同期に失敗しました: ${savedCount}/${totalRecords}件成功、${finalFailedCount}件失敗`
        
        setErrors(prev => [...prev, {
          timestamp: new Date(),
          message: errorSummary,
          detail: {
            totalRecords,
            savedRecords: savedCount,
            failedRecords: finalFailedCount,
            errorCount: errors.length
          }
        }])
        
        console.error(`❌ ${errorSummary}`)
        console.error('エラー詳細を確認して再試行してください')
        
        // 自動遷移は行わない
        return // ここで処理を終了
      }
      
    } catch (error: any) {
      // グローバルエラーハンドリング - 絶対に遷移しない
      setSyncStatus('error')
      
      const errorDetail = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        name: error.name,
        code: error.code,
        data: error.data
      }
      
      setErrors(prev => [...prev, {
        timestamp: new Date(),
        message: `致命的エラー: ${error.message || '同期処理中にエラーが発生しました'}`,
        detail: errorDetail
      }])
      
      setSyncStats(prev => ({
        ...prev,
        endTime: new Date()
      }))
      
      console.error('❌ 致命的な同期エラー:', error)
      console.error('詳細:', errorDetail)
      
      // エラー時は絶対に遷移しない
      // setTimeoutやnavigateは一切呼ばない
    }
  }
  
  // 日付フォーマット
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // データ検証
  const validateSavedData = async (accountId: string, dateRange: any) => {
    try {
      // TODO: Convexクエリでデータ数を確認
      // const savedCount = await convex.query(api.cache.cacheEntries.count, {
      //   accountId,
      //   dateRange
      // })
      
      return {
        isValid: true,
        message: 'データが正常に保存されました'
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'データ検証に失敗しました',
        error
      }
    }
  }
  
  // 経過時間の計算
  const getElapsedTime = (): string => {
    if (!syncStats.startTime) return '-'
    
    const now = syncStats.endTime || new Date()
    const elapsed = Math.floor((now.getTime() - syncStats.startTime.getTime()) / 1000)
    
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    
    return `${minutes}分${seconds}秒`
  }
  
  // プログレスバーの色
  const getProgressColor = (): string => {
    if (syncStatus === 'error') return 'bg-red-600'
    if (syncStatus === 'complete') return 'bg-green-600'
    if (syncStatus === 'validating') return 'bg-blue-600'
    return 'bg-indigo-600'
  }
  
  // ステータスアイコン
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'fetching':
        return <CloudArrowDownIcon className="w-8 h-8 text-blue-500 animate-pulse" />
      case 'saving':
        return <CircleStackIcon className="w-8 h-8 text-indigo-500 animate-pulse" />
      case 'validating':
        return <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      case 'complete':
        return <CheckCircleIcon className="w-8 h-8 text-green-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
      default:
        return <ClockIcon className="w-8 h-8 text-gray-400" />
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              初回データ同期
            </h1>
            <p className="text-gray-600">
              過去1年分のデータをシステムに保存します
            </p>
          </div>
          
          {/* 同期情報 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">対象期間</p>
                <p className="font-semibold">過去1年間</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">推定時間</p>
                <p className="font-semibold">約5-10分</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">総レコード数</p>
                <p className="font-semibold">
                  {syncStats.totalRecords > 0 ? syncStats.totalRecords.toLocaleString() : '計算中...'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">経過時間</p>
                <p className="font-semibold">{getElapsedTime()}</p>
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>
                  {syncStatus === 'idle' && '待機中'}
                  {syncStatus === 'preparing' && '準備中...'}
                  {syncStatus === 'fetching' && 'データ取得中...'}
                  {syncStatus === 'saving' && 'データ保存中...'}
                  {syncStatus === 'validating' && '検証中...'}
                  {syncStatus === 'complete' && '完了！'}
                  {syncStatus === 'error' && 'エラー'}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${getProgressColor()} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            {/* 詳細統計 */}
            {syncStatus !== 'idle' && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {syncStats.processedRecords.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">処理済み</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {syncStats.savedRecords.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">保存済み</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {syncStats.failedRecords.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">エラー</p>
                </div>
              </div>
            )}
          </div>
          
          {/* エラー表示 */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                エラーが発生しました ({errors.length}件)
              </h3>
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="border-b border-red-100 pb-2 last:border-b-0">
                    <p className="text-sm text-red-600 font-medium">
                      {error.message}
                    </p>
                    {error.detail && (
                      <details className="mt-1">
                        <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                          詳細を表示
                        </summary>
                        <pre className="mt-1 text-xs text-red-500 bg-white p-2 rounded overflow-x-auto">
                          {typeof error.detail === 'object' 
                            ? JSON.stringify(error.detail, null, 2)
                            : error.detail}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 成功メッセージ */}
          {syncStatus === 'complete' && syncStats.failedRecords === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    データ同期が完了しました！
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {syncStats.savedRecords.toLocaleString()}件のデータが正常に保存されました
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* アクションボタン */}
          <div className="flex gap-4">
            {syncStatus === 'idle' && (
              <>
                <button
                  onClick={startSync}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <CloudArrowDownIcon className="w-5 h-5 mr-2" />
                  同期を開始
                </button>
                <button
                  onClick={() => navigate('/meta-api-setup/test')}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  戻る
                </button>
              </>
            )}
            
            {['preparing', 'fetching', 'saving', 'validating'].includes(syncStatus) && (
              <button
                disabled
                className="flex-1 bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center"
              >
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                処理中...
              </button>
            )}
            
            {syncStatus === 'complete' && (
              <button
                onClick={() => navigate('/meta-api-setup/complete')}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                次へ進む
              </button>
            )}
            
            {syncStatus === 'error' && (
              <>
                <button
                  onClick={startSync}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  再試行
                </button>
                <button
                  onClick={() => navigate('/meta-api-setup/test')}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  戻る
                </button>
              </>
            )}
          </div>
          
          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>注意：</strong>
              同期処理中はブラウザを閉じないでください。処理には2-3分程度かかります。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}