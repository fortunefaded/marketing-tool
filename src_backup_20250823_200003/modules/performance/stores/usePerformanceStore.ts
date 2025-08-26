import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import shallow from 'zustand/shallow'

interface PerformanceState {
  // UI状態
  selectedAccountId: string | null
  dateRange: { since: string; until: string }
  filters: {
    status: 'all' | 'active' | 'paused'
    objective: string
    searchQuery: string
    minSpend: number
    maxSpend: number
  }
  viewMode: 'grid' | 'list' | 'chart'
  
  // パフォーマンス設定
  enableVirtualization: boolean
  batchSize: number
  cacheEnabled: boolean
  
  // アクション
  setSelectedAccount: (accountId: string | null) => void
  setDateRange: (range: { since: string; until: string }) => void
  updateFilters: (filters: Partial<PerformanceState['filters']>) => void
  setViewMode: (mode: 'grid' | 'list' | 'chart') => void
  toggleVirtualization: () => void
  setBatchSize: (size: number) => void
  reset: () => void
}

// 初期状態
const initialState = {
  selectedAccountId: null,
  dateRange: {
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    until: new Date().toISOString().split('T')[0]
  },
  filters: {
    status: 'all' as const,
    objective: 'all',
    searchQuery: '',
    minSpend: 0,
    maxSpend: Infinity
  },
  viewMode: 'grid' as const,
  enableVirtualization: true,
  batchSize: 50,
  cacheEnabled: true
}

// Zustandストア（devtools, immer, subscribeWithSelector付き）
export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    subscribeWithSelector(
      immer((set) => ({
        ...initialState,
        
        setSelectedAccount: (accountId) =>
          set((state) => {
            state.selectedAccountId = accountId
          }),
        
        setDateRange: (range) =>
          set((state) => {
            state.dateRange = range
          }),
        
        updateFilters: (filters) =>
          set((state) => {
            Object.assign(state.filters, filters)
          }),
        
        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode
          }),
        
        toggleVirtualization: () =>
          set((state) => {
            state.enableVirtualization = !state.enableVirtualization
          }),
        
        setBatchSize: (size) =>
          set((state) => {
            state.batchSize = Math.max(10, Math.min(100, size))
          }),
        
        reset: () => set(() => initialState)
      }))
    ),
    {
      name: 'performance-store' // DevTools用の名前
    }
  )
)

// セレクター（再レンダリング最小化）
export const useSelectedAccount = () => 
  usePerformanceStore((state) => state.selectedAccountId)

export const useDateRange = () =>
  usePerformanceStore((state) => state.dateRange, shallow)

export const useFilters = () =>
  usePerformanceStore((state) => state.filters, shallow)

export const useViewMode = () =>
  usePerformanceStore((state) => state.viewMode)

export const usePerformanceSettings = () =>
  usePerformanceStore(
    (state) => ({
      enableVirtualization: state.enableVirtualization,
      batchSize: state.batchSize,
      cacheEnabled: state.cacheEnabled
    }),
    shallow
  )

// アクション
export const usePerformanceActions = () =>
  usePerformanceStore(
    (state) => ({
      setSelectedAccount: state.setSelectedAccount,
      setDateRange: state.setDateRange,
      updateFilters: state.updateFilters,
      setViewMode: state.setViewMode,
      toggleVirtualization: state.toggleVirtualization,
      setBatchSize: state.setBatchSize,
      reset: state.reset
    }),
    shallow
  )

// ミドルウェア：状態変更の監視
usePerformanceStore.subscribe(
  (state) => state.selectedAccountId,
  (accountId) => {
    // アカウント変更時にキャッシュクリア
    if (accountId) {
      console.log('Account changed, clearing cache...')
      // キャッシュクリアロジック
    }
  }
)

// ミドルウェア：パフォーマンス設定の永続化
usePerformanceStore.subscribe(
  (state) => ({
    enableVirtualization: state.enableVirtualization,
    batchSize: state.batchSize,
    cacheEnabled: state.cacheEnabled
  }),
  (settings) => {
    localStorage.setItem('performance-settings', JSON.stringify(settings))
  }
)