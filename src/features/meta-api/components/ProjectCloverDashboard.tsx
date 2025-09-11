import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useConvex } from 'convex/react'
import { Link } from 'react-router-dom'
import { ThreeLayerCache } from '../core/three-layer-cache'
import { SimpleAccountStore } from '../account/account-store'
import { MetaAccount } from '@/types'
import type { DateRangeFilter } from '../hooks/useAdFatigueSimplified'
import type { CacheResult } from '../core/three-layer-cache'
import { ArrowPathIcon, BoltIcon, TrashIcon, BugAntIcon, ChevronDownIcon, ChevronUpIcon, TableCellsIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { ProjectCloverHierarchyView } from './ProjectCloverHierarchyView'

/**
 * データ取得モード
 */
type RefreshMode = 'smart' | 'force' | 'clear'

/**
 * キャッシュ層の状態
 */
interface CacheLayerStatus {
  hasData: boolean
  size: number
  lastHit?: Date
  hitCount: number
}

/**
 * フェッチ情報
 */
interface FetchInfo {
  source: 'L1' | 'L2' | 'L3' | 'miss'
  responseTime: number
  timestamp: Date
  recordCount?: number
  metadata?: any  // ページング情報を含む
}

/**
 * キャッシュ統計拡張版
 */
interface ExtendedCacheStats {
  totalKeys: number
  overallHitRate: number
  memorySize: number
  layers: {
    L1: CacheLayerStatus
    L2: CacheLayerStatus
    L3: CacheLayerStatus
  }
}

/**
 * デバッグログエントリ
 */
interface DebugLogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'success' | 'debug'
  message: string
  data?: any
}

/**
 * プロジェクト・クローバー用ダッシュボード
 * 3層キャッシュシステムを完全活用した理想的な実装
 */
export function ProjectCloverDashboard() {
  const convex = useConvex()
  
  // アカウント管理
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [, setIsLoadingAccounts] = useState(true) // isLoadingAccounts未使用
  
  // データとフィルター
  const [dateRange] = useState<DateRangeFilter | 'august_2025'>('august_2025') // 8月固定、setDateRange未使用
  const [apiData, setApiData] = useState<any>(null)
  const [selectedAdForValidation, setSelectedAdForValidation] = useState<any>(null)
  const [showValidationPanel, setShowValidationPanel] = useState(true) // デフォルトで展開
  const [csvData, setCsvData] = useState<any[]>([])
  const [missingData, setMissingData] = useState<any[]>([])
  const [csvFileName, setCsvFileName] = useState<string>('')
  const [comparisonDetails, setComparisonDetails] = useState<any>(null)
  
  // 3層キャッシュシステム
  const [cacheSystem] = useState(() => new ThreeLayerCache(convex))
  
  // フェッチ状態
  const [isFetching, setIsFetching] = useState(false)
  const [lastFetchInfo, setLastFetchInfo] = useState<FetchInfo | null>(null)
  const [cacheStats, setCacheStats] = useState<ExtendedCacheStats | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastApiUrl, setLastApiUrl] = useState<string>('')  // API URLを保存
  
  // パフォーマンス計測
  const fetchStartTime = useRef<number>(0)
  
  // デバッグログ
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  const maxLogs = 200 // 最大ログ数（差分分析のため増やす）
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set()) // 展開された行の管理
  
  // ビュー切り替え
  const [currentView, setCurrentView] = useState<'hierarchy' | 'comparison' | 'debug'>('hierarchy')
  
  // LocalStorage キー
  const STORAGE_KEY = 'project_clover_csv_data'

  // デバッグログ追加関数
  const addDebugLog = useCallback((level: DebugLogEntry['level'], message: string, data?: any) => {
    const entry: DebugLogEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    }
    
    setDebugLogs(prev => {
      const newLogs = [entry, ...prev]
      // 最大ログ数を超えたら古いものを削除
      return newLogs.slice(0, maxLogs)
    })
    
    // コンソールにも出力
    const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[logMethod](`[${level.toUpperCase()}] ${message}`, data || '')
  }, [maxLogs])

  // CSVデータの保存
  const saveCSVToStorage = useCallback((data: any[], fileName: string) => {
    try {
      const storageData = {
        fileName,
        data,
        savedAt: new Date().toISOString(),
        recordCount: data.length
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
      addDebugLog('success', 'CSVデータを保存しました', {
        fileName,
        recordCount: data.length
      })
    } catch (error) {
      addDebugLog('error', 'CSV保存エラー', error)
    }
  }, [addDebugLog])

  // CSVデータの読み込み
  const loadCSVFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { fileName, data, savedAt, recordCount } = JSON.parse(stored)
        setCsvData(data)
        setCsvFileName(fileName)
        addDebugLog('info', '保存済みCSVデータを読み込みました', {
          fileName,
          recordCount,
          savedAt
        })
        return true
      }
    } catch (error) {
      addDebugLog('error', 'CSV読み込みエラー', error)
    }
    return false
  }, [addDebugLog])

  // 詳細な差分分析
  const performDetailedComparison = useCallback(() => {
    if (!apiData || !csvData.length) {
      addDebugLog('warn', '比較するデータが不足しています')
      return
    }

    addDebugLog('info', '詳細な差分分析を開始')
    
    // APIデータをキャンペーン・広告単位で集約
    const apiAggregated = new Map()
    apiData.forEach((item: any) => {
      const key = `${item.campaign_name}_${item.ad_name}`
      
      if (!apiAggregated.has(key)) {
        apiAggregated.set(key, {
          campaign_name: item.campaign_name,
          ad_name: item.ad_name,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          frequency: 0,
          ctr: 0,
          cpm: 0,
          cpp: 0,
          date_count: 0
        })
      }
      
      const aggregated = apiAggregated.get(key)
      aggregated.impressions += Number(item.impressions || 0)
      aggregated.clicks += Number(item.clicks || 0)
      aggregated.spend += Number(item.spend || 0)
      aggregated.reach += Number(item.reach || 0)
      aggregated.date_count += 1
    })
    
    // 集約データの平均値・率を計算
    apiAggregated.forEach((value) => {
      if (value.impressions > 0) {
        value.ctr = (value.clicks / value.impressions) * 100
        value.cpm = (value.spend / value.impressions) * 1000
      }
      if (value.reach > 0) {
        value.cpp = value.spend / value.reach
        value.frequency = value.impressions / value.reach
      }
    })
    
    addDebugLog('info', 'APIデータ集約完了', {
      originalCount: apiData.length,
      aggregatedCount: apiAggregated.size,
      sample: [...apiAggregated.values()].slice(0, 3)
    })
    
    // CSVデータをマップ化（カラム名の変換を考慮）
    // 注意：CSVは既に期間集約されているので、そのまま使用
    const csvMap = new Map()
    const csvAggregated = new Map()
    
    csvData.forEach((item: any) => {
      // CSVのカラム名をAPIと合わせる（日本語カラム名に対応）
      const campaignName = item['広告セット名'] || item['キャンペーン名'] || item['campaign_name'] || ''
      const adName = item['広告の名前'] || item['広告名'] || item['ad_name'] || ''
      const reportingStarts = item['レポート開始日'] || item['reporting_starts'] || ''
      const reportingEnds = item['レポート終了日'] || item['reporting_ends'] || ''
      
      if (campaignName && adName) {
        // CSVの各行は既に期間集約されているため、期間を含めたキーを作成
        const key = `${campaignName}_${adName}_${reportingStarts}_${reportingEnds}`
        csvMap.set(key, item)
        
        // 比較用に期間を含まないキーも作成
        const compareKey = `${campaignName}_${adName}`
        
        // 同じ広告名でも異なる期間のデータは別々に扱う
        if (!csvAggregated.has(compareKey)) {
          csvAggregated.set(compareKey, [])
        }
        csvAggregated.get(compareKey).push(item)
      }
    })
    
    addDebugLog('debug', 'CSV集約状況', {
      totalRecords: csvData.length,
      uniqueAds: csvAggregated.size,
      multiPeriodAds: Array.from(csvAggregated.entries())
        .filter(([_, items]) => items.length > 1)
        .map(([key, items]) => ({
          key,
          periods: items.length,
          dates: items.map(item => ({
            start: item['レポート開始日'],
            end: item['レポート終了日']
          }))
        }))
    })
    
    // 比較用キーセットを作成（期間を含まない）
    const apiKeys = new Set(apiAggregated.keys())
    const csvCompareKeys = new Set(csvAggregated.keys())
    
    // 差分分析（キャンペーン名と広告名で比較）
    const onlyInAPI = [...apiKeys].filter(key => !csvCompareKeys.has(key))
    const onlyInCSV = [...csvCompareKeys].filter(key => !apiKeys.has(key))
    const inBoth = [...apiKeys].filter(key => csvCompareKeys.has(key))
    
    // 値の不一致を検出
    const valueMismatches: any[] = []
    inBoth.forEach(key => {
      const apiItem = apiAggregated.get(key)
      const csvItems = csvAggregated.get(key) || []
      
      // CSVの複数期間のデータを合計
      const csvTotal = {
        impressions: 0,
        clicks: 0,
        spend: 0
      }
      
      csvItems.forEach((csvItem: any) => {
        // CSVのカラム名から値を取得（日本語カラム名に対応）
        const impressions = Number(csvItem['インプレッション'] || csvItem['impressions'] || 0)
        // CSVには「クリック」カラムがないため、結果から推定するか、0とする
        const clicks = Number(csvItem['クリック'] || csvItem['clicks'] || 0)
        // 消化金額は引用符で囲まれている場合があるので処理
        const spendValue = csvItem['消化金額 (JPY)'] || csvItem['"消化金額 (JPY)"'] || csvItem['消化金額'] || csvItem['spend'] || '0'
        const spend = Number(spendValue.replace(/[",]/g, ''))
        
        csvTotal.impressions += impressions
        csvTotal.clicks += clicks
        csvTotal.spend += spend
      })
      
      // CTRを再計算
      const csvCtr = csvTotal.impressions > 0 ? (csvTotal.clicks / csvTotal.impressions) * 100 : 0
      
      // 値を比較
      const mismatches: any = {}
      
      if (Math.abs(apiItem.impressions - csvTotal.impressions) > 0.01) {
        mismatches.impressions = {
          api: apiItem.impressions,
          csv: csvTotal.impressions,
          diff: apiItem.impressions - csvTotal.impressions
        }
      }
      
      if (Math.abs(apiItem.clicks - csvTotal.clicks) > 0.01) {
        mismatches.clicks = {
          api: apiItem.clicks,
          csv: csvTotal.clicks,
          diff: apiItem.clicks - csvTotal.clicks
        }
      }
      
      if (Math.abs(apiItem.spend - csvTotal.spend) > 0.01) {
        mismatches.spend = {
          api: apiItem.spend,
          csv: csvTotal.spend,
          diff: apiItem.spend - csvTotal.spend
        }
      }
      
      if (Math.abs(apiItem.ctr - csvCtr) > 0.01) {
        mismatches.ctr = {
          api: apiItem.ctr,
          csv: csvCtr,
          diff: apiItem.ctr - csvCtr
        }
      }
      
      if (Object.keys(mismatches).length > 0) {
        valueMismatches.push({
          key,
          campaign_name: apiItem.campaign_name,
          ad_name: apiItem.ad_name,
          csvPeriods: csvItems.length,
          mismatches
        })
      }
    })
    
    const details = {
      apiCount: apiKeys.size,
      csvCount: csvCompareKeys.size,
      csvTotalRecords: csvData.length,
      matchCount: inBoth.length,
      onlyInAPI: onlyInAPI.length,
      onlyInCSV: onlyInCSV.length,
      valueMismatches: valueMismatches.length,
      samples: {
        onlyInAPI: onlyInAPI.slice(0, 5).map(key => apiAggregated.get(key)),
        onlyInCSV: onlyInCSV.slice(0, 5).map(key => {
          const items = csvAggregated.get(key) || []
          return {
            key,
            periods: items.length,
            records: items
          }
        }),
        valueMismatches: valueMismatches.slice(0, 5)
      }
    }
    
    setComparisonDetails(details)
    
    // デバッグログに詳細を記録
    addDebugLog('success', '差分分析完了', details)
    
    if (onlyInAPI.length > 0) {
      addDebugLog('warn', `APIのみに存在するデータ: ${onlyInAPI.length}件`, {
        samples: details.samples.onlyInAPI
      })
    }
    
    if (onlyInCSV.length > 0) {
      addDebugLog('warn', `CSVのみに存在するデータ: ${onlyInCSV.length}件`, {
        samples: details.samples.onlyInCSV
      })
    }
    
    if (valueMismatches.length > 0) {
      addDebugLog('error', `値の不一致: ${valueMismatches.length}件`, {
        samples: details.samples.valueMismatches
      })
    }
    
    if (onlyInAPI.length === 0 && onlyInCSV.length === 0 && valueMismatches.length === 0) {
      addDebugLog('success', '🎉 完全一致！APIとCSVのデータは完全に一致しています')
    }
    
    // 欠損データの更新
    setMissingData(onlyInCSV.map(key => csvMap.get(key)))
    
  }, [apiData, csvData, addDebugLog])

  // 初期化時に保存済みCSVを読み込み
  useEffect(() => {
    loadCSVFromStorage()
  }, [loadCSVFromStorage])

  // APIデータ取得時に自動比較
  useEffect(() => {
    if (apiData && csvData.length > 0) {
      performDetailedComparison()
    }
  }, [apiData, csvData, performDetailedComparison])

  // アカウント読み込み
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true)
      addDebugLog('info', 'アカウント読み込み開始')
      
      try {
        const store = new SimpleAccountStore(convex)
        addDebugLog('debug', 'SimpleAccountStore初期化完了', { convex: !!convex })
        
        const accountsList = await store.getAccounts()
        addDebugLog('success', `アカウント一覧取得成功`, { count: accountsList.length })
        setAccounts(accountsList)

        const activeAccount = await store.getActiveAccount()
        if (activeAccount) {
          addDebugLog('info', 'アクティブアカウント検出', { accountId: activeAccount.accountId })
          setSelectedAccountId(activeAccount.accountId)
        } else if (accountsList.length > 0) {
          addDebugLog('info', 'デフォルトアカウント設定', { accountId: accountsList[0].accountId })
          setSelectedAccountId(accountsList[0].accountId)
        } else {
          addDebugLog('warn', 'アカウントが見つかりません')
        }
      } catch (error) {
        addDebugLog('error', 'アカウント読み込みエラー', error)
        console.error('Failed to load accounts:', error)
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [convex, addDebugLog])

  // アクセストークン設定
  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const account = accounts.find(acc => acc.accountId === selectedAccountId)
      addDebugLog('debug', 'アクセストークン確認', { 
        selectedAccountId, 
        hasAccount: !!account,
        hasToken: !!account?.accessToken,
        tokenLength: account?.accessToken?.length 
      })
      
      if (account?.accessToken) {
        cacheSystem.setAccessToken(account.accessToken)
        addDebugLog('success', 'アクセストークン設定完了', { accountId: selectedAccountId })
      } else {
        addDebugLog('warn', 'アクセストークンが見つかりません', { accountId: selectedAccountId })
      }
    }
  }, [selectedAccountId, accounts, cacheSystem, addDebugLog])

  // キャッシュキー生成
  const generateCacheKey = useCallback((accountId: string, dateRange: string): string => {
    return `${accountId}_${dateRange}`
  }, [])

  // キャッシュ統計を拡張形式に変換
  const buildExtendedStats = useCallback((basicStats: any): ExtendedCacheStats => {
    // この実装は簡略化されています。実際にはより詳細な統計が必要
    return {
      totalKeys: basicStats.totalKeys || 0,
      overallHitRate: basicStats.overallHitRate || 0,
      memorySize: basicStats.memorySize || 0,
      layers: {
        L1: {
          hasData: basicStats.memorySize > 0,
          size: basicStats.memorySize || 0,
          hitCount: 0,
        },
        L2: {
          hasData: false,
          size: 0,
          hitCount: 0,
        },
        L3: {
          hasData: false,
          size: 0,
          hitCount: 0,
        },
      },
    }
  }, [])

  // 3層キャッシュからのデータ取得
  const fetchDataWithCache = useCallback(
    async (mode: RefreshMode) => {
      addDebugLog('info', `データ取得開始 - モード: ${mode}`)
      
      if (!selectedAccountId) {
        const error = 'アカウントが選択されていません'
        addDebugLog('error', error)
        setFetchError(error)
        return
      }

      const account = accounts.find(acc => acc.accountId === selectedAccountId)
      addDebugLog('debug', 'アカウント情報確認', {
        accountId: selectedAccountId,
        hasAccount: !!account,
        hasAccessToken: !!account?.accessToken,
        tokenLength: account?.accessToken?.length
      })
      
      if (!account?.accessToken) {
        const error = 'アクセストークンが設定されていません'
        addDebugLog('error', error, { accountId: selectedAccountId })
        setFetchError(error)
        return
      }

      setIsFetching(true)
      setFetchError(null)
      fetchStartTime.current = performance.now()

      try {
        addDebugLog('info', `🚀 データ取得処理開始`, { mode, dateRange })

        // モードに応じた処理
        if (mode === 'clear') {
          addDebugLog('info', '全キャッシュクリア開始')
          await cacheSystem.clearAll()
          addDebugLog('success', '全キャッシュクリア完了')
        }

        // キャッシュキー生成
        const cacheKey = generateCacheKey(selectedAccountId, dateRange)
        addDebugLog('debug', 'キャッシュキー生成', { cacheKey })

        // データ取得オプション
        const options = {
          forceRefresh: mode === 'force' || mode === 'clear',
          skipL1: false,
          skipL2: false,
        }
        addDebugLog('debug', 'データ取得オプション', options)

        // 3層キャッシュからデータ取得
        addDebugLog('info', '3層キャッシュからデータ取得開始')
        
        // API URLを生成（デバッグ用）
        const debugUrl = `https://graph.facebook.com/v23.0/act_${selectedAccountId}/insights?` +
          `since=2025-07-30&until=2025-09-01&` +
          `fields=campaign_name,ad_name,impressions,clicks,spend&` +
          `level=ad&limit=1000&time_increment=1&` +
          `filtering=[{"field":"ad.effective_status","operator":"IN","value":["ACTIVE","PAUSED","DELETED","ARCHIVED"]}]`
        setLastApiUrl(debugUrl)
        addDebugLog('info', '🔍 API URL (デバッグ用)', { url: debugUrl })
        
        const result: CacheResult<any> = await cacheSystem.get(cacheKey, options)
        addDebugLog('debug', 'キャッシュ取得結果', {
          source: result.source,
          hasData: !!result.data,
          dataLength: result.data?.length,
          metadata: result.metadata
        })
        
        // ページング情報を確認
        if ((result.metadata as any)?.hasNextPage) {
          addDebugLog('error', '🚨 警告: 次のページが存在します！', {
            message: '全データを取得できていません。1000件の制限に達している可能性があります。',
            paging: result.metadata.paging
          })
        }

        // 取得時間計算
        const responseTime = performance.now() - fetchStartTime.current

        // フェッチ情報更新
        setLastFetchInfo({
          source: result.source,
          responseTime,
          timestamp: new Date(),
          recordCount: result.data?.length || 0,
          metadata: result.metadata  // ページング情報を含む
        })

        // データ設定
        if (result.data) {
          setApiData(result.data)
          addDebugLog('success', `${result.source}からデータ取得成功`, {
            recordCount: result.data.length,
            responseTime: `${responseTime.toFixed(0)}ms`
          })
          
          // データの最初の数件をログに出力して確認
          addDebugLog('debug', 'データサンプル（最初の3件）', {
            sample: result.data.slice(0, 3)
          })
          
          // APIデータの状態を確認
          addDebugLog('debug', 'APIデータ設定完了', {
            isArray: Array.isArray(result.data),
            length: result.data.length,
            firstItemKeys: result.data[0] ? Object.keys(result.data[0]) : []
          })
        } else if (result.source === 'miss') {
          const error = 'データ取得失敗 - キャッシュミス'
          addDebugLog('warn', error, { result })
          setFetchError(error)
        }

        // キャッシュ統計更新
        const stats = cacheSystem.getStats()
        addDebugLog('debug', 'キャッシュ統計', stats)
        setCacheStats(buildExtendedStats(stats))

        // ソースごとのログ
        switch (result.source) {
          case 'L1':
            addDebugLog('info', '⚡ メモリキャッシュから高速取得')
            break
          case 'L2':
            addDebugLog('info', '💾 Convexデータベースから取得')
            break
          case 'L3':
            addDebugLog('info', '🌐 Meta APIから最新データ取得')
            break
          case 'miss':
            addDebugLog('error', '❌ キャッシュミス - データなし')
            break
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'データ取得中にエラーが発生しました'
        const errorDetails = error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
        
        addDebugLog('error', `データ取得エラー: ${errorMessage}`, errorDetails)
        setFetchError(errorMessage)
      } finally {
        setIsFetching(false)
        const totalTime = performance.now() - fetchStartTime.current
        addDebugLog('info', `データ取得処理完了`, { 
          totalTime: `${totalTime.toFixed(0)}ms`,
          success: !fetchError 
        })
      }
    },
    [selectedAccountId, accounts, dateRange, cacheSystem, generateCacheKey, buildExtendedStats, addDebugLog]
  )

  // アカウント選択ハンドラ - 未使用
  // const _handleAccountSelect = async (accountId: string) => {
  //   setSelectedAccountId(accountId)
  //   const store = new SimpleAccountStore(convex)
  //   await store.setActiveAccount(accountId)
  // }
  
  // エクスポート機能
  const exportComparisonData = () => {
    if (!csvData || csvData.length === 0) {
      alert('エクスポートするデータがありません')
      return
    }

    const exportData: any[] = []
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    
    // ヘッダー情報
    exportData.push(['プロジェクト・クローバー 差分レポート'])
    exportData.push([`生成日時: ${new Date().toLocaleString('ja-JP')}`])
    exportData.push([`対象期間: 2025年8月`])
    exportData.push([`CSVレコード数: ${csvData.length}件`])
    exportData.push([`APIレコード数: ${apiData?.length || 0}件`])
    exportData.push([''])
    
    // 統計情報
    if (comparisonDetails) {
      exportData.push(['=== 比較統計 ==='])
      exportData.push([`完全一致: ${comparisonDetails.matchCount}件`])
      exportData.push([`APIのみ: ${comparisonDetails.onlyInAPI}件`])
      exportData.push([`CSVのみ: ${comparisonDetails.onlyInCSV}件`])
      exportData.push([`値の不一致: ${comparisonDetails.valueMismatches}件`])
      exportData.push([''])
    }
    
    // データテーブルヘッダー
    exportData.push([
      'ステータス',
      '広告セット名',
      '広告の名前',
      '期間',
      'CSV_インプレッション',
      'API_インプレッション',
      '差分_インプレッション',
      '誤差率_インプレッション(%)',
      'CSV_消化金額',
      'API_消化金額',
      '差分_消化金額',
      '誤差率_消化金額(%)',
      'CSV_リーチ',
      'API_リーチ',
      '差分_リーチ'
    ])
    
    // データ行を生成
    csvData.forEach((csvRow: any) => {
      const campaignName = csvRow['広告セット名'] || ''
      const adName = csvRow['広告の名前'] || ''
      const startDate = csvRow['レポート開始日'] || ''
      const endDate = csvRow['レポート終了日'] || ''
      const csvImpressions = Number(csvRow['インプレッション'] || 0)
      const csvSpendStr = csvRow['消化金額 (JPY)'] || csvRow['"消化金額 (JPY)"'] || '0'
      const csvSpend = Number(csvSpendStr.replace(/[",]/g, ''))
      const csvReach = Number(csvRow['リーチ'] || 0)
      
      // APIデータとマッチング
      let apiMatch = null
      if (apiData) {
        const aggregated = new Map()
        apiData.forEach((row: any) => {
          const key = `${row.campaign_name}_${row.ad_name}`
          if (!aggregated.has(key)) {
            aggregated.set(key, {
              impressions: 0,
              spend: 0,
              reach: 0
            })
          }
          const agg = aggregated.get(key)
          agg.impressions += Number(row.impressions || 0)
          agg.spend += Number(row.spend || 0)
          agg.reach += Number(row.reach || 0)
        })
        apiMatch = aggregated.get(`${campaignName}_${adName}`)
      }
      
      // 差分計算
      const impDiff = apiMatch ? apiMatch.impressions - csvImpressions : null
      const spendDiff = apiMatch ? apiMatch.spend - csvSpend : null
      const reachDiff = apiMatch ? apiMatch.reach - csvReach : null
      
      // 誤差率計算
      const impErrorRate = csvImpressions > 0 && impDiff !== null 
        ? Math.abs(impDiff / csvImpressions * 100) 
        : null
      const spendErrorRate = csvSpend > 0 && spendDiff !== null 
        ? Math.abs(spendDiff / csvSpend * 100) 
        : null
      
      // ステータス判定
      let status = 'CSVのみ'
      if (apiMatch) {
        const maxError = Math.max(impErrorRate || 0, spendErrorRate || 0)
        if (maxError < 5) {
          status = '一致'
        } else if (maxError < 10) {
          status = '差異あり'
        } else {
          status = '要確認'
        }
      }
      
      exportData.push([
        status,
        campaignName,
        adName,
        `${startDate}~${endDate}`,
        csvImpressions,
        apiMatch ? apiMatch.impressions : 'N/A',
        impDiff !== null ? impDiff : 'N/A',
        impErrorRate !== null ? impErrorRate.toFixed(2) : 'N/A',
        csvSpend,
        apiMatch ? Math.round(apiMatch.spend) : 'N/A',
        spendDiff !== null ? Math.round(spendDiff) : 'N/A',
        spendErrorRate !== null ? spendErrorRate.toFixed(2) : 'N/A',
        csvReach,
        apiMatch ? apiMatch.reach : 'N/A',
        reachDiff !== null ? reachDiff : 'N/A'
      ])
    })
    
    // TSV形式に変換（Excelで開きやすい）
    const tsvContent = exportData.map(row => row.join('\t')).join('\n')
    
    // ダウンロード
    const blob = new Blob(['\uFEFF' + tsvContent], { type: 'text/tab-separated-values;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `project_clover_report_${timestamp}.tsv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    addDebugLog('success', 'レポートをエクスポートしました', { 
      fileName: link.download,
      records: csvData.length 
    })
  }

  // ===== 重複広告の調査機能 =====
  const investigateDuplicateAds = useCallback(() => {
    console.log('🔍 重複広告の調査開始...\n')
    
    // 問題のある広告名
    const problemAds = ['250809_早く始めればよかった', '250809_メモ風']
    
    // 1. APIデータから問題広告を抽出
    const problemAdData = apiData.filter(d => 
      problemAds.some(name => d.ad_name?.includes(name))
    )
    
    console.log(`📊 問題広告の総レコード数: ${problemAdData.length}`)
    
    // 2. 広告名ごとにグループ化
    const groupedByAdName = problemAdData.reduce((acc, item) => {
      const adName = item.ad_name || 'unknown'
      if (!acc[adName]) {
        acc[adName] = {
          records: [],
          campaigns: new Set(),
          totalImpressions: 0,
          totalSpend: 0,
          dateRange: {
            earliest: item.date_start,
            latest: item.date_start
          }
        }
      }
      
      acc[adName].records.push(item)
      acc[adName].campaigns.add(item.campaign_name)
      acc[adName].totalImpressions += Number(item.impressions || 0)
      acc[adName].totalSpend += Number(item.spend || 0)
      
      // 日付範囲を更新
      if (item.date_start < acc[adName].dateRange.earliest) {
        acc[adName].dateRange.earliest = item.date_start
      }
      if (item.date_start > acc[adName].dateRange.latest) {
        acc[adName].dateRange.latest = item.date_start
      }
      
      return acc
    }, {} as Record<string, any>)
    
    // 3. 結果を表示
    Object.entries(groupedByAdName).forEach(([adName, data]) => {
      console.log(`\n📌 広告: ${adName}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`  レコード数: ${data.records.length}`)
      console.log(`  キャンペーン数: ${data.campaigns.size}`)
      console.log(`  キャンペーン一覧: ${Array.from(data.campaigns).join(', ')}`)
      console.log(`  合計インプレッション: ${data.totalImpressions.toLocaleString()}`)
      console.log(`  合計消化金額: ¥${data.totalSpend.toLocaleString()}`)
      console.log(`  日付範囲: ${data.dateRange.earliest} 〜 ${data.dateRange.latest}`)
      
      // キャンペーンごとの内訳
      const byCampaign = data.records.reduce((acc: any, record: any) => {
        const campaign = record.campaign_name || 'unknown'
        if (!acc[campaign]) {
          acc[campaign] = {
            impressions: 0,
            spend: 0,
            count: 0,
            dates: []
          }
        }
        acc[campaign].impressions += Number(record.impressions || 0)
        acc[campaign].spend += Number(record.spend || 0)
        acc[campaign].count++
        acc[campaign].dates.push(record.date_start)
        return acc
      }, {})
      
      console.log('\n  キャンペーン別内訳:')
      Object.entries(byCampaign).forEach(([campaign, stats]: [string, any]) => {
        console.log(`    ${campaign}:`)
        console.log(`      - インプレッション: ${stats.impressions.toLocaleString()}`)
        console.log(`      - 消化金額: ¥${stats.spend.toLocaleString()}`)
        console.log(`      - レコード数: ${stats.count}`)
        console.log(`      - 日付: ${[...new Set(stats.dates)].sort().join(', ')}`)
      })
    })
    
    // 4. CSVデータとの照合
    console.log('\n\n📋 CSVデータとの照合結果:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const csvProblemAds = csvData.filter(csv => 
      problemAds.some(name => csv.ad_name?.includes(name))
    )
    
    csvProblemAds.forEach(csv => {
      const apiMatch = groupedByAdName[csv.ad_name]
      if (apiMatch) {
        const impDiff = apiMatch.totalImpressions - Number(csv.impressions || 0)
        const spendDiff = apiMatch.totalSpend - Number(csv.spend || 0)
        const impDiffPercent = ((impDiff / Number(csv.impressions || 1)) * 100).toFixed(1)
        const spendDiffPercent = ((spendDiff / Number(csv.spend || 1)) * 100).toFixed(1)
        
        console.log(`\n広告: ${csv.ad_name}`)
        console.log(`  CSVキャンペーン: ${csv.campaign_name}`)
        console.log(`  APIキャンペーン: ${Array.from(apiMatch.campaigns).join(', ')}`)
        console.log(`  インプレッション差異: ${impDiff.toLocaleString()} (${impDiffPercent}%)`)
        console.log(`  消化金額差異: ¥${spendDiff.toLocaleString()} (${spendDiffPercent}%)`)
        
        if (Math.abs(Number(impDiffPercent)) > 10) {
          console.log(`  ⚠️ 大きな差異が検出されました！`)
        }
      }
    })
    
    // 5. 推奨アクション
    console.log('\n\n💡 推奨アクション:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('1. Meta Ad Managerで広告の変更履歴を確認')
    console.log('2. 8月中のキャンペーン間移動の有無を確認')
    console.log('3. 広告IDレベルでのマッチングを実装')
    
  }, [apiData, csvData])

  // バイト数フォーマット
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // 問題広告の自動調査
  useEffect(() => {
    // APIデータとCSVデータが両方ある場合に自動実行（null/undefinedチェック追加）
    if (apiData && apiData.length > 0 && csvData && csvData.length > 0) {
      // 問題広告の存在確認
      const hasProblemAds = apiData.some(d => 
        d.ad_name?.includes('250809_早く始めればよかった') ||
        d.ad_name?.includes('250809_メモ風')
      )
      
      if (hasProblemAds) {
        console.log('⚠️ 問題広告を検出しました。調査を開始します...')
        investigateDuplicateAds()
      }
    }
  }, [apiData, csvData, investigateDuplicateAds])

  // レスポンス時間の色分け
  const getResponseTimeColor = (time: number): string => {
    if (time < 10) return 'text-green-600'
    if (time < 100) return 'text-blue-600'
    if (time < 1000) return 'text-yellow-600'
    return 'text-red-600'
  }


  // ログレベルの色分け
  const getLogLevelColor = (level: DebugLogEntry['level']): string => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'success': return 'text-green-600 bg-green-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      case 'debug': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // ログレベルのアイコン
  const getLogLevelIcon = (level: DebugLogEntry['level']): string => {
    switch (level) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      case 'debug': return '🔍'
      default: return '📝'
    }
  }

  return (
    <div className="space-y-6">
      {/* デバッグログパネル */}
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <BugAntIcon className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">デバッグコンソール</h3>
            <span className="text-xs text-gray-400">({debugLogs.length} logs)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDebugLogs([])}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              クリア
            </button>
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showDebugPanel ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {showDebugPanel && (
          <div className="h-64 overflow-y-auto bg-gray-900 p-2 font-mono text-xs">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">ログがありません</div>
            ) : (
              <div className="space-y-1">
                {debugLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${getLogLevelColor(log.level)} border border-opacity-20`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0">{getLogLevelIcon(log.level)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs opacity-75">
                            {log.timestamp.toLocaleTimeString('ja-JP', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit',
                              fractionalSecondDigits: 3 
                            })}
                          </span>
                          <span className="font-semibold">{log.message}</span>
                        </div>
                        {log.data && (
                          <pre className="text-xs opacity-90 overflow-x-auto whitespace-pre-wrap break-all">
                            {typeof log.data === 'object' 
                              ? JSON.stringify(log.data, null, 2)
                              : String(log.data)
                            }
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ビュー切り替えタブ */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentView('hierarchy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'hierarchy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            階層ビュー
          </button>
          <button
            onClick={() => setCurrentView('comparison')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'comparison'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TableCellsIcon className="w-5 h-5" />
            比較ビュー
          </button>
          <button
            onClick={() => setCurrentView('debug')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'debug'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BugAntIcon className="w-5 h-5" />
            デバッグ
          </button>
        </div>
      </div>

      {/* 階層ビュー */}
      {currentView === 'hierarchy' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ProjectCloverHierarchyView 
            data={apiData || []} 
            isLoading={isFetching}
          />
        </div>
      )}

      {/* API URL情報パネル（デバッグビューの一部） */}
      {currentView === 'debug' && lastApiUrl && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-4">
            🔍 API URL デバッグ情報
          </h2>
          <div className="space-y-3">
            <div className="bg-white rounded p-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">実行されたAPI URL:</p>
              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                {lastApiUrl}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded p-3">
                <p className="text-xs text-gray-600">開始日 (since)</p>
                <p className="font-bold text-lg">2025-07-30</p>
                <p className="text-xs text-gray-500">※タイムゾーン対策で2日前から</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-xs text-gray-600">終了日 (until)</p>
                <p className="font-bold text-lg">2025-09-01</p>
                <p className="text-xs text-gray-500">※タイムゾーン対策で1日後まで</p>
              </div>
              <div className="bg-white rounded p-3">
                <p className="text-xs text-gray-600">取得件数</p>
                <p className="font-bold text-lg">{apiData?.length || 0}件</p>
                <p className="text-xs text-gray-500">削除済み広告も含む</p>
              </div>
            </div>
            {apiData && apiData.length > 0 && (
              <>
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">実際に取得されたデータの日付範囲:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600">最初のデータ</p>
                      <p className="font-mono text-sm font-bold">{apiData[0]?.date_start || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">最後のデータ</p>
                      <p className="font-mono text-sm font-bold">{apiData[apiData.length - 1]?.date_start || 'N/A'}</p>
                    </div>
                  </div>
                  {/* 日付の異常を検出 */}
                  {apiData[0]?.date_start > '2025-08-01' && (
                    <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-300">
                      <p className="text-xs text-orange-700 font-semibold">
                        ⚠️ 8月1日からのデータがありません（最初: {apiData[0]?.date_start}）
                      </p>
                    </div>
                  )}
                  {apiData[apiData.length - 1]?.date_start > '2025-08-31' && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-300">
                      <p className="text-xs text-red-700 font-semibold">
                        🚨 9月のデータが含まれています（最後: {apiData[apiData.length - 1]?.date_start}）
                      </p>
                    </div>
                  )}
                </div>
                
                {/* ページング警告 */}
                {lastFetchInfo?.metadata?.hasNextPage && (
                  <div className="bg-red-100 border-2 border-red-400 rounded p-3">
                    <p className="text-sm font-bold text-red-800 mb-2">
                      🚨 重要: データが完全に取得できていません
                    </p>
                    <p className="text-xs text-red-700">
                      1000件の制限に達しました。次のページが存在します。
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      8月1日、2日のデータは次のページにある可能性があります。
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* コントロールパネル（常に表示） */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-green-800 mb-4">
          🍀 データ取得コントロール（2025年8月データ）
        </h2>
        
        {/* 8月データ専用メッセージ */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            📅 <strong>2025年8月（8/1-8/31）</strong>の確定データを取得します。
            このデータは変更されないため、CSVとの完全一致を確認できます。
          </p>
        </div>

        {/* アカウント未設定の警告 */}
        {!selectedAccountId && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded">
            <p className="text-yellow-800">
              アカウントが選択されていません。
              <Link to="/settings/meta-api" className="ml-2 text-blue-600 underline">
                設定ページへ
              </Link>
            </p>
          </div>
        )}

        {/* データ取得ボタン */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => fetchDataWithCache('smart')}
            disabled={isFetching || !selectedAccountId}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${isFetching || !selectedAccountId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow hover:shadow-lg'
              }
            `}
          >
            <ArrowPathIcon className={`inline w-5 h-5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            スマート取得
          </button>

          <button
            onClick={() => fetchDataWithCache('force')}
            disabled={isFetching || !selectedAccountId}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${isFetching || !selectedAccountId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700 shadow hover:shadow-lg'
              }
            `}
          >
            <BoltIcon className="inline w-5 h-5 mr-2" />
            強制更新
          </button>

          <button
            onClick={() => fetchDataWithCache('clear')}
            disabled={isFetching || !selectedAccountId}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${isFetching || !selectedAccountId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow hover:shadow-lg'
              }
            `}
          >
            <TrashIcon className="inline w-5 h-5 mr-2" />
            キャッシュクリア
          </button>
        </div>

        {/* エラー表示 */}
        {fetchError && (
          <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded">
            <p className="text-red-800 flex items-center">
              <XCircleIcon className="w-5 h-5 mr-2" />
              {fetchError}
            </p>
          </div>
        )}

        {/* キャッシュ層の状態表示 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* L1: メモリキャッシュ */}
          <div className={`
            border-2 rounded-lg p-4 transition-all
            ${lastFetchInfo?.source === 'L1' 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
            }
          `}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">L1: メモリ</h3>
              {lastFetchInfo?.source === 'L1' && (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className="text-xs text-gray-600">超高速アクセス</p>
            <p className="text-xs mt-1">
              サイズ: {cacheStats ? formatBytes(cacheStats.memorySize) : '0 B'}
            </p>
          </div>

          {/* L2: Convex */}
          <div className={`
            border-2 rounded-lg p-4 transition-all
            ${lastFetchInfo?.source === 'L2' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
            }
          `}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">L2: Convex</h3>
              {lastFetchInfo?.source === 'L2' && (
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-gray-600">永続化ストレージ</p>
            <p className="text-xs mt-1">
              リアルタイム同期
            </p>
          </div>

          {/* L3: Meta API */}
          <div className={`
            border-2 rounded-lg p-4 transition-all
            ${lastFetchInfo?.source === 'L3' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 bg-gray-50'
            }
          `}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">L3: Meta API</h3>
              {lastFetchInfo?.source === 'L3' && (
                <CheckCircleIcon className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <p className="text-xs text-gray-600">最新データソース</p>
            <p className="text-xs mt-1">
              レート制限あり
            </p>
          </div>
        </div>

        {/* パフォーマンスメトリクス */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">📊 パフォーマンス</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 最後の取得情報 */}
            {lastFetchInfo && (
              <>
                <div>
                  <p className="text-xs text-gray-500">ソース</p>
                  <p className="text-sm font-medium">{lastFetchInfo.source}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">レスポンス</p>
                  <p className={`text-sm font-medium ${getResponseTimeColor(lastFetchInfo.responseTime)}`}>
                    {lastFetchInfo.responseTime.toFixed(0)}ms
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">取得件数</p>
                  <p className="text-sm font-medium">{lastFetchInfo.recordCount || 0}件</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">取得時刻</p>
                  <p className="text-sm font-medium">
                    {lastFetchInfo.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* キャッシュ統計 */}
          {cacheStats && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">ヒット率</p>
                  <p className="text-sm font-medium">
                    {cacheStats.overallHitRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">総キー数</p>
                  <p className="text-sm font-medium">{cacheStats.totalKeys}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">メモリ使用</p>
                  <p className="text-sm font-medium">
                    {formatBytes(cacheStats.memorySize)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV比較パネル */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          📄 CSVデータ比較（2025年8月）
        </h2>
        
        <div className="space-y-4">
          {/* 保存済みCSV情報 */}
          {csvFileName && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">📁 保存済みCSV</p>
                  <p className="text-xs text-green-600">{csvFileName} ({csvData.length}件)</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY)
                    setCsvData([])
                    setCsvFileName('')
                    setComparisonDetails(null)
                    addDebugLog('info', 'CSVデータをクリアしました')
                  }}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  削除
                </button>
              </div>
            </div>
          )}
          
          {/* CSVアップロード */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">CSVファイルをアップロード</h3>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    try {
                      const text = event.target?.result as string
                      const lines = text.split('\n')
                      
                      // CSV解析（カンマを含む値に対応）
                      const parseCSVLine = (line: string): string[] => {
                        const result = []
                        let current = ''
                        let inQuotes = false
                        
                        for (let i = 0; i < line.length; i++) {
                          const char = line[i]
                          
                          if (char === '"') {
                            inQuotes = !inQuotes
                          } else if (char === ',' && !inQuotes) {
                            result.push(current.trim())
                            current = ''
                          } else {
                            current += char
                          }
                        }
                        result.push(current.trim())
                        return result
                      }
                      
                      // ヘッダーを正しく解析
                      const headers = parseCSVLine(lines[0])
                      
                      addDebugLog('info', 'CSVファイル読み込み', {
                        fileName: file.name,
                        lines: lines.length,
                        headerCount: headers.length,
                        headers: headers.slice(0, 10), // 最初の10カラムを表示
                        firstDataLine: lines[1] ? lines[1].substring(0, 200) : ''
                      })
                      
                      const csvRows = lines.slice(1).filter(line => line.trim()).map(line => {
                        const values = parseCSVLine(line)
                        const row: any = {}
                        headers.forEach((header, index) => {
                          row[header.trim()] = values[index]?.trim() || ''
                        })
                        return row
                      })
                      
                      addDebugLog('debug', 'CSVパース結果', {
                        totalRows: csvRows.length,
                        headers: headers,
                        samples: csvRows.slice(0, 5),
                        allRows: csvRows.length <= 10 ? csvRows : undefined
                      })
                      
                      setCsvData(csvRows)
                      setCsvFileName(file.name)
                      saveCSVToStorage(csvRows, file.name)
                      
                      addDebugLog('success', 'CSV解析完了', {
                        rowCount: csvRows.length,
                        sample: csvRows[0]
                      })
                      
                      // APIデータがあれば自動で比較
                      if (apiData && apiData.length > 0) {
                        setTimeout(() => performDetailedComparison(), 100)
                      }
                    } catch (error) {
                      addDebugLog('error', 'CSV解析エラー', error)
                    }
                  }
                  reader.readAsText(file)
                }
              }}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-2">
              Meta Ad Managerからエクスポートした8月分のCSVファイルを選択してください
            </p>
          </div>
          
          {/* 比較結果詳細 */}
          {comparisonDetails && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">📊 詳細比較結果</h3>
              
              {/* サマリー */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-gray-600">完全一致</p>
                  <p className="text-lg font-bold text-green-600">
                    {comparisonDetails.matchCount}件
                  </p>
                  <p className="text-xs text-gray-500">
                    {((comparisonDetails.matchCount / Math.max(comparisonDetails.apiCount, comparisonDetails.csvCount)) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-gray-600">APIのみ</p>
                  <p className="text-lg font-bold text-blue-600">
                    {comparisonDetails.onlyInAPI}件
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs text-gray-600">CSVのみ</p>
                  <p className="text-lg font-bold text-orange-600">
                    {comparisonDetails.onlyInCSV}件
                  </p>
                </div>
              </div>
              
              {/* 値の不一致 */}
              {comparisonDetails.valueMismatches > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    ⚠️ 値の不一致: {comparisonDetails.valueMismatches}件
                  </p>
                  {comparisonDetails.samples.valueMismatches.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="text-xs bg-white rounded p-2 mb-1">
                      <p className="font-medium">{item.campaign_name} / {item.ad_name}</p>
                      {item.mismatches && typeof item.mismatches === 'object' && Object.entries(item.mismatches).map(([field, values]: [string, any]) => (
                        <p key={field} className="text-red-600">
                          {field}: API={values?.api?.toFixed(2) || 'N/A'}, CSV={values?.csv?.toFixed(2) || 'N/A'} (差分: {values?.diff?.toFixed(2) || 'N/A'})
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 完全一致の場合 */}
              {comparisonDetails.onlyInAPI === 0 && 
               comparisonDetails.onlyInCSV === 0 && 
               comparisonDetails.valueMismatches === 0 && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-700 font-semibold text-center">
                    ✅ 完全一致！データは100%一致しています
                  </p>
                </div>
              )}
              
              <div className="mt-3 flex gap-2">
                <button
                  onClick={performDetailedComparison}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  再分析
                </button>
                <button
                  onClick={investigateDuplicateAds}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  disabled={!apiData || apiData.length === 0 || !csvData || csvData.length === 0}
                >
                  🔍 重複広告を調査
                </button>
              </div>
            </div>
          )}
          
          {/* 簡易比較（詳細分析前） */}
          {csvData.length > 0 && apiData && !comparisonDetails && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📊 データ読み込み完了</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-gray-600">API取得データ:</p>
                  <p className="font-bold text-blue-600">{apiData.length}件</p>
                </div>
                <div>
                  <p className="text-gray-600">CSVデータ:</p>
                  <p className="font-bold text-green-600">{csvData.length}件</p>
                </div>
              </div>
              <button
                onClick={performDetailedComparison}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                詳細比較を実行
              </button>
            </div>
          )}
          
          {/* 欠損データ表示 */}
          {missingData.length > 0 && missingData[0] && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-red-700">
                ❌ CSVには存在するがAPIで取得できなかったデータ（{missingData.length}件）
              </h3>
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full text-xs">
                  <thead className="bg-red-100">
                    <tr>
                      {Object.keys(missingData[0] || {}).slice(0, 5).map(key => (
                        <th key={key} className="px-2 py-1 text-left">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {missingData.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b">
                        {item && Object.values(item).slice(0, 5).map((value: any, idx) => (
                          <td key={idx} className="px-2 py-1">{value || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {missingData.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  他 {missingData.length - 10} 件の欠損データがあります
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSV差分比較テーブル（比較ビュー） */}
      {currentView === 'comparison' && csvData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              📊 CSVデータ & API差分比較
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                CSV: {csvData.length}件 / API: {apiData?.length || 0}件
              </span>
            </div>
          </div>
          
          {/* ステータス凡例とエクスポートボタン */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-green-600">✅</span> 一致(誤差5%未満)
              </span>
              <span className="flex items-center gap-1">
                <span className="text-yellow-600">⚠️</span> 差異あり(5-10%)
              </span>
              <span className="flex items-center gap-1">
                <span className="text-orange-600">🔺</span> 要確認(10%以上)
              </span>
              <span className="flex items-center gap-1">
                <span className="text-red-600">❌</span> CSVのみ
              </span>
              <span className="flex items-center gap-1">
                <span className="text-blue-600">🔵</span> APIのみ
              </span>
            </div>
            <button
              onClick={() => exportComparisonData()}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              エクスポート
            </button>
          </div>
          
          {/* テーブル */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    広告セット名
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    広告の名前
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期間
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    インプレッション
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    消化金額(JPY)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リーチ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {csvData.map((csvRow: any, index: number) => {
                  // CSVデータから必要な値を取得
                  const campaignName = csvRow['広告セット名'] || ''
                  const adName = csvRow['広告の名前'] || ''
                  const startDate = csvRow['レポート開始日'] || ''
                  const endDate = csvRow['レポート終了日'] || ''
                  const csvImpressions = Number(csvRow['インプレッション'] || 0)
                  const csvSpendStr = csvRow['消化金額 (JPY)'] || csvRow['"消化金額 (JPY)"'] || '0'
                  const csvSpend = Number(csvSpendStr.replace(/[",]/g, ''))
                  const csvReach = Number(csvRow['リーチ'] || 0)
                  
                  // APIデータとマッチング（集約データから検索）
                  let apiMatch = null
                  let debugInfo = null
                  if (apiData) {
                    // まず日別データを集約
                    const aggregated = new Map()
                    apiData.forEach((row: any) => {
                      const key = `${row.campaign_name}_${row.ad_name}`
                      if (!aggregated.has(key)) {
                        aggregated.set(key, {
                          campaign_name: row.campaign_name,
                          ad_name: row.ad_name,
                          impressions: 0,
                          spend: 0,
                          reach: 0
                        })
                      }
                      const agg = aggregated.get(key)
                      agg.impressions += Number(row.impressions || 0)
                      agg.spend += Number(row.spend || 0)
                      agg.reach += Number(row.reach || 0)
                    })
                    
                    // 完全一致でマッチング
                    const apiKey = `${campaignName}_${adName}`
                    apiMatch = aggregated.get(apiKey)
                    
                    // 完全一致しない場合、広告名だけでマッチング試行
                    if (!apiMatch) {
                      // 広告名だけで検索
                      const possibleMatches = Array.from(aggregated.entries())
                        .filter(([_key, value]) => value.ad_name === adName)
                      
                      if (possibleMatches.length > 0) {
                        // 広告名は一致するが、キャンペーン名が異なる
                        apiMatch = possibleMatches[0][1]
                        debugInfo = `広告名一致、キャンペーン名不一致: API="${possibleMatches[0][1].campaign_name}" CSV="${campaignName}"`
                      } else {
                        // 部分一致検索（広告名の先頭部分）
                        const partialMatches = Array.from(aggregated.entries())
                          .filter(([_key, value]) => {
                            // 250809 のような日付部分で検索
                            const csvAdPrefix = adName.substring(0, 6) // "250809"
                            return value.ad_name.startsWith(csvAdPrefix)
                          })
                        
                        if (partialMatches.length > 0) {
                          debugInfo = `部分一致候補あり: ${partialMatches.map(m => m[1].ad_name).join(', ')}`
                        }
                      }
                    }
                  }
                  
                  // 差分計算
                  const impDiff = apiMatch ? apiMatch.impressions - csvImpressions : null
                  const spendDiff = apiMatch ? apiMatch.spend - csvSpend : null
                  const reachDiff = apiMatch ? apiMatch.reach - csvReach : null
                  
                  // 誤差率計算
                  const impErrorRate = csvImpressions > 0 && impDiff !== null 
                    ? Math.abs(impDiff / csvImpressions * 100) 
                    : null
                  const spendErrorRate = csvSpend > 0 && spendDiff !== null 
                    ? Math.abs(spendDiff / csvSpend * 100) 
                    : null
                  
                  // ステータス判定
                  let status = '❌' // CSVのみ
                  let statusColor = 'text-red-600'
                  if (apiMatch) {
                    const maxError = Math.max(impErrorRate || 0, spendErrorRate || 0)
                    if (maxError < 5) {
                      status = '✅'
                      statusColor = 'text-green-600'
                    } else if (maxError < 10) {
                      status = '⚠️'
                      statusColor = 'text-yellow-600'
                    } else {
                      status = '🔺'
                      statusColor = 'text-orange-600'
                    }
                  }
                  
                  // APIの日別データを取得
                  const apiDailyData = apiData ? apiData.filter((row: any) => 
                    row.campaign_name === (apiMatch?.campaign_name || campaignName) && 
                    row.ad_name === (apiMatch?.ad_name || adName)
                  ) : []
                  
                  const isExpanded = expandedRows.has(index)
                  
                  return (
                    <React.Fragment key={index}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                      const newExpanded = new Set(expandedRows)
                      if (isExpanded) {
                        newExpanded.delete(index)
                      } else {
                        newExpanded.add(index)
                      }
                      setExpandedRows(newExpanded)
                    }}>
                      <td className={`px-3 py-4 whitespace-nowrap text-lg ${statusColor}`}>
                        {status}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaignName}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {adName}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                        {startDate && endDate ? `${startDate.slice(5)} ~ ${endDate.slice(5)}` : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {csvImpressions.toLocaleString()}
                          </div>
                          {apiMatch && (
                            <div className={`text-xs ${impDiff && impDiff !== 0 ? (impDiff > 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-400'}`}>
                              API: {apiMatch.impressions.toLocaleString()} 
                              {impDiff !== null && impDiff !== 0 && (
                                <span> ({impDiff > 0 ? '+' : ''}{impDiff.toLocaleString()})</span>
                              )}
                            </div>
                          )}
                          {!apiMatch && (
                            <div>
                              <div className="text-xs text-gray-400">API: データなし</div>
                              {debugInfo && (
                                <div className="text-xs text-orange-500 mt-1" title={debugInfo}>
                                  ⚠️ {debugInfo.length > 50 ? debugInfo.substring(0, 50) + '...' : debugInfo}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            ¥{csvSpend.toLocaleString()}
                          </div>
                          {apiMatch && (
                            <div className={`text-xs ${spendDiff && spendDiff !== 0 ? (spendDiff > 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-400'}`}>
                              API: ¥{Math.round(apiMatch.spend).toLocaleString()}
                              {spendDiff !== null && spendDiff !== 0 && (
                                <span> ({spendDiff > 0 ? '+' : ''}{Math.round(spendDiff).toLocaleString()})</span>
                              )}
                            </div>
                          )}
                          {!apiMatch && (
                            <div>
                              <div className="text-xs text-gray-400">API: データなし</div>
                              {debugInfo && (
                                <div className="text-xs text-orange-500 mt-1" title={debugInfo}>
                                  ⚠️ {debugInfo.length > 50 ? debugInfo.substring(0, 50) + '...' : debugInfo}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {csvReach.toLocaleString()}
                          </div>
                          {apiMatch && apiMatch.reach > 0 && (
                            <div className={`text-xs ${reachDiff && reachDiff !== 0 ? (reachDiff > 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-400'}`}>
                              API: {apiMatch.reach.toLocaleString()}
                              {reachDiff !== null && reachDiff !== 0 && (
                                <span> ({reachDiff > 0 ? '+' : ''}{reachDiff.toLocaleString()})</span>
                              )}
                            </div>
                          )}
                          {apiMatch && apiMatch.reach === 0 && (
                            <div className="text-xs text-gray-400">API: 0</div>
                          )}
                          {!apiMatch && (
                            <div>
                              <div className="text-xs text-gray-400">API: データなし</div>
                              {debugInfo && (
                                <div className="text-xs text-orange-500 mt-1" title={debugInfo}>
                                  ⚠️ {debugInfo.length > 50 ? debugInfo.substring(0, 50) + '...' : debugInfo}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && apiDailyData.length > 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <div className="font-semibold text-sm text-gray-700">
                              📊 APIの日別生データ（{apiDailyData.length}件）
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">日付</th>
                                    <th className="px-2 py-1 text-left">キャンペーン</th>
                                    <th className="px-2 py-1 text-left">広告名</th>
                                    <th className="px-2 py-1 text-right">インプレッション</th>
                                    <th className="px-2 py-1 text-right">クリック</th>
                                    <th className="px-2 py-1 text-right">消化金額</th>
                                    <th className="px-2 py-1 text-right">CTR</th>
                                    <th className="px-2 py-1 text-right">CPM</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {apiDailyData.map((row: any, idx: number) => (
                                    <tr key={idx} className="border-b">
                                      <td className="px-2 py-1">{row.date_start || '-'}</td>
                                      <td className="px-2 py-1">{row.campaign_name}</td>
                                      <td className="px-2 py-1">{row.ad_name}</td>
                                      <td className="px-2 py-1 text-right">{Number(row.impressions || 0).toLocaleString()}</td>
                                      <td className="px-2 py-1 text-right">{Number(row.clicks || 0).toLocaleString()}</td>
                                      <td className="px-2 py-1 text-right">¥{Math.round(Number(row.spend || 0)).toLocaleString()}</td>
                                      <td className="px-2 py-1 text-right">{Number(row.ctr || 0).toFixed(2)}%</td>
                                      <td className="px-2 py-1 text-right">¥{Number(row.cpm || 0).toFixed(0)}</td>
                                    </tr>
                                  ))}
                                  <tr className="font-semibold bg-gray-100">
                                    <td className="px-2 py-1" colSpan={3}>合計</td>
                                    <td className="px-2 py-1 text-right">
                                      {apiDailyData.reduce((sum: number, row: any) => sum + Number(row.impressions || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      {apiDailyData.reduce((sum: number, row: any) => sum + Number(row.clicks || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      ¥{Math.round(apiDailyData.reduce((sum: number, row: any) => sum + Number(row.spend || 0), 0)).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1 text-right" colSpan={2}>-</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 比較ビューでCSVデータがない場合のメッセージ */}
      {currentView === 'comparison' && csvData.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            CSVデータがアップロードされていません。比較を行うにはCSVファイルをアップロードしてください。
          </p>
        </div>
      )}

      {/* Meta Ad Manager データ検証パネル（デバッグビュー） */}
      {currentView === 'debug' && apiData && apiData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              🔍 Meta Ad Manager データ検証（2025年8月）
            </h2>
            <button
              onClick={() => setShowValidationPanel(!showValidationPanel)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showValidationPanel ? '閉じる' : '展開'}
            </button>
          </div>
          
          {showValidationPanel && (
            <div className="space-y-4">
              {/* データサマリー */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">📊 取得データサマリー</h3>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">総レコード数:</span>
                    <span className="ml-2 font-medium">{apiData.length}件</span>
                  </div>
                  <div>
                    <span className="text-gray-600">期間:</span>
                    <span className="ml-2 font-medium">2025年8月 (8/1-8/31)</span>
                  </div>
                  <div>
                    <span className="text-gray-600">アカウントID:</span>
                    <span className="ml-2 font-medium text-xs">act_{selectedAccountId}</span>
                  </div>
                </div>
                
                {/* 合計値（Meta Ad Managerとの照合用） */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">📊 期間合計（Meta Ad Managerの合計値と比較）</h4>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-500">総インプレッション</p>
                      <p className="font-bold text-blue-600">
                        {apiData.reduce((sum: number, item: any) => sum + Number(item.impressions), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-500">総クリック</p>
                      <p className="font-bold text-green-600">
                        {apiData.reduce((sum: number, item: any) => sum + Number(item.clicks), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-500">総消化金額</p>
                      <p className="font-bold text-red-600">
                        ¥{apiData.reduce((sum: number, item: any) => sum + Number(item.spend), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-500">平均CTR</p>
                      <p className="font-bold text-purple-600">
                        {(apiData.reduce((sum: number, item: any) => sum + Number(item.clicks), 0) / 
                          apiData.reduce((sum: number, item: any) => sum + Number(item.impressions), 0) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ※ これらの値をMeta Ad Managerの同期間の合計値と照合してください
                  </p>
                </div>
              </div>

              {/* 最新データ（確認用） */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">📌 最新3件のデータ（Meta Ad Managerと比較してください）</h3>
                <div className="space-y-3">
                  {apiData.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">キャンペーン:</span>
                        <span className="ml-2 text-sm font-medium">{item.campaign_name}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">広告名:</span>
                        <span className="ml-2 text-sm font-medium text-blue-600">{item.ad_name}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">日付:</span>
                        <span className="ml-2 text-sm font-medium">{item.date_start}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
                        <div>
                          <p className="text-xs text-gray-500">インプレッション</p>
                          <p className="font-semibold">{Number(item.impressions).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">クリック</p>
                          <p className="font-semibold">{Number(item.clicks).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CTR</p>
                          <p className="font-semibold">{Number(item.ctr).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">消化金額</p>
                          <p className="font-semibold">¥{Number(item.spend).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-xs text-gray-500">CPM</p>
                          <p className="font-semibold">¥{Number(item.cpm).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">フリークエンシー</p>
                          <p className="font-semibold">{Number(item.frequency).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">ユニークCTR</p>
                          <p className="font-semibold">{Number(item.unique_ctr).toFixed(2)}%</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedAdForValidation(item)}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        この広告の全期間データを見る
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 選択された広告の詳細 */}
              {selectedAdForValidation && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">
                    📈 「{selectedAdForValidation.ad_name}」の全期間データ
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="px-3 py-2 text-left">日付</th>
                          <th className="px-3 py-2 text-right">インプレッション</th>
                          <th className="px-3 py-2 text-right">クリック</th>
                          <th className="px-3 py-2 text-right">CTR(%)</th>
                          <th className="px-3 py-2 text-right">消化金額(¥)</th>
                          <th className="px-3 py-2 text-right">CPM(¥)</th>
                          <th className="px-3 py-2 text-right">フリークエンシー</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiData
                          .filter((item: any) => item.ad_name === selectedAdForValidation.ad_name)
                          .sort((a: any, b: any) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
                          .slice(0, 10)
                          .map((item: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-green-50">
                              <td className="px-3 py-2">{item.date_start}</td>
                              <td className="px-3 py-2 text-right">{Number(item.impressions).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right">{Number(item.clicks).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right">{Number(item.ctr).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{Number(item.spend).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right">{Number(item.cpm).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{Number(item.frequency).toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => setSelectedAdForValidation(null)}
                    className="mt-3 text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* データ状態サマリー */}
      <div className="bg-gray-100 rounded p-2 mb-4 text-xs">
        <span className="font-semibold">データ状態:</span>
        <span className="ml-2">APIデータ: {apiData ? `${apiData.length}件` : '未取得'}</span>
        <span className="ml-4">CSVデータ: {csvData.length}件</span>
        <span className="ml-4">取得中: {String(isFetching)}</span>
      </div>
    </div>
  )
}