import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore, TokenInfo } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { SimpleFatigueCalculator } from '../fatigue/calculator'
import { FatigueData } from '@/types'
import { ERROR_MESSAGES } from '../constants'
import { 
  MetaApiFetcherState, 
  MetaApiError, 
  MetaApiFetcherOptions,
  UseMetaApiFetcherResult 
} from '../core/enhanced-types'

export function useMetaApiFetcher(
  accountId?: string,
  options: MetaApiFetcherOptions = {}
): UseMetaApiFetcherResult {
  const convex = useConvex()
  // オプションのマージとメモ化
  const DEFAULT_OPTIONS = useMemo(() => ({
    timeout: 30000,
    retryAttempts: 0,
    validateResponse: true
  }), [])
  
  const mergedOptions = useMemo(() => ({
    ...DEFAULT_OPTIONS,
    ...options
  }), [DEFAULT_OPTIONS, options])
  
  // ログ関数（開発環境でのみ動作）
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console[level](`[useMetaApiFetcher] ${message}`, data)
    }
  }, [])
  
  // 状態管理
  const [state, setState] = useState<MetaApiFetcherState>({
    isLoading: false,
    isWaiting: false,
    error: null,
    lastFetchTime: null,
    requestId: null
  })
  
  // 同時実行制限のための参照
  const activeRequestRef = useRef<AbortController | null>(null)
  const requestQueueRef = useRef<Array<() => void>>([])
  
  // エラーカテゴリ分類関数
  const classifyError = (error: any): MetaApiError => {
    let category: MetaApiError['category'] = 'network'
    let retryable = true
    let actionRequired: MetaApiError['actionRequired'] | undefined
    
    if (error.name === 'AbortError') {
      category = 'timeout'
      retryable = false
    } else if (error.message?.includes('No token found') || 
               error.message?.includes('API Error: 401') ||
               error.message?.includes('Token expired or invalid')) {
      category = 'auth'
      retryable = false
      actionRequired = 'reauth'
    } else if (error.message?.includes('API Error: 400')) {
      category = 'data'
      retryable = false
    } else if (error.code === 'RATE_LIMIT' || error.code === 4 || error.message?.includes('Rate limit')) {
      category = 'ratelimit'
      retryable = true
      actionRequired = 'wait'
    }
    
    return {
      category,
      message: error.message || 'Unknown error',
      originalError: error,
      retryable,
      actionRequired
    }
  }
  
  // トークン有効期限チェック
  const validateToken = (token: TokenInfo): boolean => {
    if (!token || !token.accessToken) return false
    return token.isValid !== false
  }
  
  // レスポンス検証
  const validateResponseData = useCallback((data: any): boolean => {
    if (!mergedOptions.validateResponse) return true
    
    // 基本構造チェック - APIレスポンスは直接配列形式
    if (!data || !Array.isArray(data)) return false
    
    // 空配列も有効なレスポンス
    if (data.length === 0) return true
    
    // 各レコードの必須フィールドチェック
    for (const record of data) {
      // 最低限必要なフィールドの存在確認
      if (!record.ad_id || !record.ad_name) return false
      
      const requiredFields = ['impressions', 'clicks', 'ctr', 'cpm']
      for (const field of requiredFields) {
        if (!(field in record)) return false
      }
      
      // 数値フィールドの妥当性チェック
      const numericFields = ['impressions', 'clicks', 'cpm']
      for (const field of numericFields) {
        const value = parseFloat(record[field])
        if (isNaN(value) || value < 0) return false
      }
      
      // CTRの範囲チェック（0-100%）
      const ctr = parseFloat(record.ctr)
      if (isNaN(ctr) || ctr < 0 || ctr > 100) return false
    }
    
    return true
  }, [mergedOptions.validateResponse])
  
  // メインのデータ取得関数
  const fetchData = useCallback(async (endpoint: string, params: any = {}): Promise<any> => {
    const requestId = Math.random().toString(36).substring(7)
    
    // 同時実行制限チェック
    if (activeRequestRef.current) {
      // 待機状態に設定
      setState(prev => ({ ...prev, isWaiting: true }))
      
      // キューに追加して待機
      await new Promise<void>((resolve) => {
        requestQueueRef.current.push(resolve)
      })
    }
    
    // リクエスト開始
    const abortController = new AbortController()
    activeRequestRef.current = abortController
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      isWaiting: false,
      error: null,
      requestId
    }))
    
    try {
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        log('warn', `Request ${requestId} timed out after ${mergedOptions.timeout}ms`)
        abortController.abort()
      }, mergedOptions.timeout)
      
      // トークン取得と検証
      if (accountId) {
        const tokenStore = new SimpleTokenStore(convex)
        const token = await tokenStore.getToken(accountId)
        
        if (!validateToken(token)) {
          throw Object.assign(new Error('Token expired or invalid'), {
            category: 'auth',
            actionRequired: 'reauth'
          })
        }
        
        // API呼び出し（データ更新時はforceRefresh=trueを設定）
        const api = new SimpleMetaApi(token.accessToken, accountId)
        
        // リトライロジック付きでAPI呼び出し
        let lastError: any = null
        let retryCount = 0
        const maxRetries = mergedOptions.retryAttempts || 0
        
        while (retryCount <= maxRetries) {
          try {
            const response = await api.getInsights({ 
              forceRefresh: true,
              datePreset: 'last_30d'
            })
            
            // 成功したら結果を返す
            clearTimeout(timeoutId)
            
            // レスポンス検証
            if (!validateResponseData(response)) {
              throw Object.assign(new Error('Invalid response data structure'), {
                category: 'data'
              })
            }
            
            // 成功時の状態更新
            setState(prev => ({
              ...prev,
              isLoading: false,
              lastFetchTime: new Date(),
              requestId: null
            }))
            
            return response
            
          } catch (error: any) {
            lastError = error
            
            // レート制限エラーの場合はリトライ
            if (error.code === 'RATE_LIMIT' && retryCount < maxRetries) {
              const waitTime = error.retryAfter || 60
              log('warn', `Rate limit hit. Waiting ${waitTime}s before retry ${retryCount + 1}/${maxRetries}`)
              
              // 待機時間を表示
              setState(prev => ({
                ...prev,
                error: classifyError(error),
                isWaiting: true
              }))
              
              // 指定時間待機
              await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
              
              retryCount++
              continue
            }
            
            // その他のエラーまたはリトライ上限に達した場合
            throw error
          }
        }
        
        // すべてのリトライが失敗した場合
        throw lastError
      }
      
      return { data: [], error: null }
      
    } catch (error: any) {
      // エラー分類と状態更新
      const classifiedError = classifyError(error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: classifiedError,
        requestId: null
      }))
      
      throw classifiedError
      
    } finally {
      // リクエスト完了処理
      activeRequestRef.current = null
      
      // キューから次のリクエストを実行
      const nextRequest = requestQueueRef.current.shift()
      if (nextRequest) {
        setTimeout(nextRequest, 0)
      }
    }
  }, [accountId, convex, mergedOptions.timeout, validateToken, validateResponseData, classifyError, log])
  
  // キャンセル機能
  const cancelRequest = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort()
      activeRequestRef.current = null
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isWaiting: false,
        error: null,
        requestId: null
      }))
    }
  }, [])
  
  // 後方互換性のためのfetchFromApi
  const fetchFromApi = useCallback(async (): Promise<{
    data: FatigueData[] | null
    insights: any[] | null  // 元データも返す
    error: Error | null
  }> => {
    if (!accountId) {
      return { data: null, insights: null, error: null }
    }
    
    try {
      const response = await fetchData('/insights', {})
      const calculator = new SimpleFatigueCalculator()
      const fatigueData = calculator.calculate(response)
      
      return { data: fatigueData, insights: response, error: null }
    } catch (error: any) {
      const message = error.message?.includes('No token found') ? ERROR_MESSAGES.NO_TOKEN
        : error.message?.includes('API Error: 400') ? ERROR_MESSAGES.INVALID_REQUEST
        : error.message?.includes('API Error: 401') ? ERROR_MESSAGES.TOKEN_EXPIRED
        : error.message
      
      return { data: null, insights: null, error: new Error(message) }
    }
  }, [accountId, fetchData])
  
  // クリーンアップ関数
  const cleanup = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort()
      activeRequestRef.current = null
    }
    requestQueueRef.current = []
  }, [])
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return cleanup
  }, [cleanup])
  
  return {
    fetchData,
    fetchFromApi,
    state,
    cancelRequest
  }
}