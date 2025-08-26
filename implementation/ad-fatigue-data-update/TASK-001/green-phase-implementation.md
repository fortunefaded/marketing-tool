# TASK-001: GREEN Phase - 最小実装

## 概要

RED Phase で失敗したテストを通すための最小限の実装を行います。拡張された `useMetaApiFetcher` フックに新しいインターフェイス、状態管理、同時実行制限、タイムアウト制御、エラー分類機能を追加します。

## 実装戦略

### Phase 1: 新しいインターフェイス構造
1. 状態管理の追加 (`isLoading`, `isWaiting`, `error` など)
2. 新しい API (`fetchData`, `cancelRequest`)
3. エラー型定義

### Phase 2: コア機能実装
1. 同時実行制限機能
2. タイムアウト制御
3. リクエストキャンセル機能

### Phase 3: エラーハンドリング
1. エラーカテゴリ分類
2. トークン有効期限チェック
3. レスポンスデータ検証

## 実装開始

### 新しい型定義の追加
```typescript
// src/features/meta-api/core/enhanced-types.ts
export interface MetaApiFetcherState {
  isLoading: boolean
  isWaiting: boolean
  error: MetaApiError | null
  lastFetchTime: Date | null
  requestId: string | null
}

export interface MetaApiError {
  category: 'network' | 'auth' | 'ratelimit' | 'data' | 'timeout'
  message: string
  originalError: Error
  retryable: boolean
  actionRequired?: 'reauth' | 'wait' | 'config' | 'contact_support'
}

export interface MetaApiFetcherOptions {
  timeout?: number
  retryAttempts?: number
  validateResponse?: boolean
}

export interface UseMetaApiFetcherResult {
  fetchData: (endpoint: string, params: any) => Promise<any>
  fetchFromApi: () => Promise<{ data: any; error: Error | null }> // 後方互換性
  state: MetaApiFetcherState
  cancelRequest: () => void
}
```

### 拡張された useMetaApiFetcher の実装
```typescript
// src/features/meta-api/hooks/useMetaApiFetcher.ts (更新版)
import { useCallback, useState, useRef } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
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
  const {
    timeout = 30000, // 30秒デフォルト
    retryAttempts = 0,
    validateResponse = true
  } = options
  
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
               error.message?.includes('API Error: 401')) {
      category = 'auth'
      retryable = false
      actionRequired = 'reauth'
    } else if (error.message?.includes('API Error: 400')) {
      category = 'data'
      retryable = false
    } else if (error.code === 4 || error.message?.includes('Rate limit')) {
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
  const validateToken = (token: any): boolean => {
    if (!token || !token.expiresAt) return false
    return token.expiresAt > Date.now()
  }
  
  // レスポンス検証
  const validateResponseData = (data: any): boolean => {
    if (!validateResponse) return true
    
    // 基本構造チェック
    if (!data || !Array.isArray(data.data)) return false
    
    // 各レコードの必須フィールドチェック
    for (const record of data.data) {
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
  }
  
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
        abortController.abort()
      }, timeout)
      
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
        
        // API呼び出し
        const api = new SimpleMetaApi(token, accountId)
        const response = await api.getInsights()
        
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
  }, [accountId, convex, timeout, validateResponse])
  
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
    error: Error | null
  }> => {
    if (!accountId) {
      return { data: null, error: null }
    }
    
    try {
      const response = await fetchData('/insights', {})
      const calculator = new SimpleFatigueCalculator()
      const fatigueData = calculator.calculate(response)
      
      return { data: fatigueData, error: null }
    } catch (error: any) {
      const message = error.message?.includes('No token found') ? ERROR_MESSAGES.NO_TOKEN
        : error.message?.includes('API Error: 400') ? ERROR_MESSAGES.INVALID_REQUEST
        : error.message?.includes('API Error: 401') ? ERROR_MESSAGES.TOKEN_EXPIRED
        : error.message
      
      return { data: null, error: new Error(message) }
    }
  }, [accountId, fetchData])
  
  return {
    fetchData,
    fetchFromApi, // 後方互換性
    state,
    cancelRequest
  }
}
```

## 実装内容の説明

### 新機能の実装

1. **状態管理**: `useState` でリアルタイム状態追跡
2. **同時実行制限**: `useRef` でアクティブリクエスト管理とキュー実装
3. **タイムアウト制御**: `AbortController` と `setTimeout` の組み合わせ
4. **エラー分類**: 詳細なエラーカテゴリ分類とアクション提案
5. **トークン検証**: 有効期限チェック機能
6. **レスポンス検証**: データ構造と値範囲の検証
7. **キャンセル機能**: `AbortController` によるリクエスト中止

### 後方互換性

既存の `fetchFromApi` 関数も維持し、新しい `fetchData` を内部で使用することで互換性を保持します。

## テスト実行結果予測

この実装により、RED Phase で失敗したテストが通るようになります：

- ✅ Interface Structure: 新しいプロパティが追加される
- ✅ State Management: 状態が正しく管理される  
- ✅ Request Cancellation: キャンセル機能が提供される
- ✅ Error Classification: エラーが適切に分類される

## 次のステップ

GREEN Phase完了後、REFACTOR Phaseで：
1. コードの最適化
2. エラーハンドリングの改善
3. パフォーマンスの向上
4. テストカバレッジの拡充