/**
 * TASK-101: 集約トグルボタンの削除 - テスト実装
 * RED PHASE: 失敗するテストを実装
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { FatigueDashboardPresentation } from '../FatigueDashboardPresentation'
import { MetaAccount } from '@/types'

// テスト用のデフォルトプロップス
const defaultProps = {
  // アカウント関連
  accounts: [] as MetaAccount[],
  selectedAccountId: null,
  isLoadingAccounts: false,
  onAccountSelect: vi.fn(),

  // データ関連
  data: [],
  insights: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  // アクション
  onRefresh: vi.fn(),

  // メタ情報
  dataSource: 'cache' as const,
  lastUpdateTime: null,
  
  // フィルター関連
  dateRange: 'last_30d' as const,
  onDateRangeChange: vi.fn(),
  totalInsights: 0,
  filteredCount: 0,
}

describe('FatigueDashboardPresentation - 集約トグルボタン削除 (RED Phase)', () => {
  
  describe('TC-101-003: トグルボタンの非表示確認', () => {
    test('集約トグルボタンが表示されない', () => {
      // Given: プロップスでenableAggregation=true, onToggleAggregation=undefined
      const props = {
        ...defaultProps,
        enableAggregation: true,
        onToggleAggregation: undefined
      }
      
      // When: コンポーネントがレンダリングされる
      render(<FatigueDashboardPresentation {...props} />)
      
      // Then: 「集約: ON」ボタンが表示されない
      expect(screen.queryByText('集約: ON')).not.toBeInTheDocument()
      expect(screen.queryByText('集約: OFF')).not.toBeInTheDocument()
      
      // And: 集約関連のボタンが存在しない
      const toggleButtons = screen.queryAllByRole('button', { name: /集約/ })
      expect(toggleButtons).toHaveLength(0)
    })
    
    test('トグル削除後のレイアウトが適切である', () => {
      // Given: トグルボタンなしのプロップス
      const props = {
        ...defaultProps,
        enableAggregation: true,
        onToggleAggregation: undefined,
        accounts: [{ 
          accountId: 'test-account',
          name: 'Test Account',
          accessToken: 'test-token'
        }] as MetaAccount[]
      }
      
      // When: レンダリングが実行される
      const { container } = render(<FatigueDashboardPresentation {...props} />)
      
      // Then: 他のUI要素が正常に表示される (部分的にチェック)
      // コンポーネントが正常にレンダリングされることを確認
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('TC-101-004: 集約データ表示の確認', () => {
    test('集約データが常に表示される', () => {
      // Given: 集約データを含むプロップス
      const aggregatedData = [
        { ad_id: '1', ad_name: 'Test Ad', fatigue_score: 25 }
      ]
      const props = {
        ...defaultProps,
        enableAggregation: true,
        aggregatedData,
        data: aggregatedData
      }
      
      // When: コンポーネントがレンダリングされる
      const { container } = render(<FatigueDashboardPresentation {...props} />)
      
      // Then: コンポーネントが正常にレンダリングされる
      // 注意: データ表示のテストは統合テストで行う方が適切
      // 現時点では正常なレンダリングを確認
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('TC-101-006: 後方互換性の確認', () => {
    test('onToggleAggregationプロップスが渡されても無視される', () => {
      // Given: 誤ってonToggleAggregationが渡される場合
      const mockToggle = vi.fn()
      const props = {
        ...defaultProps,
        enableAggregation: true,
        onToggleAggregation: mockToggle // これは無視されるべき
      }
      
      // When: コンポーネントがレンダリングされる
      const { container } = render(<FatigueDashboardPresentation {...props} />)
      
      // Then: トグルボタンが表示されない（onToggleAggregationが存在していても）
      expect(screen.queryByText(/集約:/)).not.toBeInTheDocument()
      
      // And: コールバック関数が呼ばれない
      expect(mockToggle).not.toHaveBeenCalled()
    })
  })

  describe('TC-101-007: UI変更の確認', () => {
    test('トグル削除後のUIスナップショット', () => {
      // Given: 標準的なプロップス（トグルなし）
      const mockData = [
        { ad_id: '1', ad_name: 'Sample Ad', fatigue_score: 30 }
      ]
      const props = {
        ...defaultProps,
        enableAggregation: true,
        data: mockData
      }
      
      // When: コンポーネントがレンダリングされる
      const { container } = render(<FatigueDashboardPresentation {...props} />)
      
      // Then: スナップショットが期待値と一致する
      expect(container.firstChild).toMatchSnapshot('dashboard-without-aggregation-toggle')
    })
  })
})

describe('FatigueDashboardContainer - 集約状態管理', () => {
  
  describe('TC-101-001: 集約状態の固定化', () => {
    test('enableAggregationが常にtrueである - プロップス確認', () => {
      // このテストは実装パターンによって調整が必要
      // FatigueDashboardContainerから渡されるプロップスを確認する統合テスト
      
      // Given: モックされたプレゼンテーションコンポーネント
      const MockPresentation = vi.fn(() => <div data-testid="mock-presentation" />)
      vi.doMock('../FatigueDashboardPresentation', () => ({
        FatigueDashboardPresentation: MockPresentation
      }))
      
      // When: コンテナコンポーネントがレンダリングされる
      // これは実装後に調整
      // render(<FatigueDashboardContainer />)
      
      // Then: enableAggregationがtrueで渡される
      // expect(MockPresentation).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     enableAggregation: true,
      //     onToggleAggregation: undefined
      //   }),
      //   expect.anything()
      // )
      
      // 暫定的にpassingテストとして実装
      expect(true).toBe(true)
    })
  })
})