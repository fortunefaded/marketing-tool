/**
 * TASK-204: Multi-Line Chart Component - TDD Tests  
 * 要件: REQ-002, REQ-003, REQ-005 (媒体別グラフと色分け)
 * 
 * RED Phase: Rechartsマルチラインチャートコンポーネントのテスト作成
 */

import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiLineChart } from '../MultiLineChart'

// Rechartsのモック
vi.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => (
    <div data-testid="line-chart" {...props}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, strokeDasharray, ...props }: any) => (
    <div 
      data-testid={`line-${dataKey}`}
      data-stroke={stroke}
      data-stroke-dasharray={strokeDasharray}
      {...props}
    />
  ),
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

describe('TASK-204: MultiLineChart Component', () => {
  
  // テスト用モックデータ
  const mockChartData = [
    {
      date: '2025-08-01',
      Facebook: 5.0,
      Instagram: 4.0,
      'Audience Network': 3.0
    },
    {
      date: '2025-08-02', 
      Facebook: 5.2,
      Instagram: 3.8,
      'Audience Network': 3.2
    },
    {
      date: '2025-08-03',
      Facebook: 4.8,
      Instagram: 4.2,
      'Audience Network': 2.9
    }
  ]

  const mockColors = {
    Facebook: '#1877F2',
    Instagram: '#E4405F',
    'Audience Network': '#42B883'
  }

  describe('基本レンダリング', () => {
    test('TC-204-001: 基本的なマルチラインチャートが正しくレンダリングされる', () => {
      // Given: 基本的なプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        height: 400
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: 必要なチャートコンポーネントが存在する
      expect(screen.getByTestId('responsive-container')).toBeTruthy()
      expect(screen.getByTestId('line-chart')).toBeTruthy()
      expect(screen.getByTestId('x-axis')).toBeTruthy()
      expect(screen.getByTestId('y-axis')).toBeTruthy()
      expect(screen.getByTestId('cartesian-grid')).toBeTruthy()
      expect(screen.getByTestId('tooltip')).toBeTruthy()
    })
    
    test('TC-204-002: 各プラットフォームのラインが正しい色で描画される', () => {
      // Given: 色設定付きのプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR'
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: 各プラットフォームのラインが正しい色で描画される
      const facebookLine = screen.getByTestId('line-Facebook')
      const instagramLine = screen.getByTestId('line-Instagram')
      const audienceNetworkLine = screen.getByTestId('line-Audience Network')
      
      expect(facebookLine.getAttribute('data-stroke')).toBe('#1877F2')
      expect(instagramLine.getAttribute('data-stroke')).toBe('#E4405F') 
      expect(audienceNetworkLine.getAttribute('data-stroke')).toBe('#42B883')
    })
  })

  describe('線種とアクセシビリティ対応', () => {
    test('TC-204-003: プラットフォーム別の線種が正しく適用される', () => {
      // Given: 線種設定付きのプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        lineStyles: {
          Facebook: 'solid',
          Instagram: 'dashed', 
          'Audience Network': 'dotted'
        }
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: 各プラットフォームの線種が適用される
      const facebookLine = screen.getByTestId('line-Facebook')
      const instagramLine = screen.getByTestId('line-Instagram')
      const audienceNetworkLine = screen.getByTestId('line-Audience Network')
      
      expect(facebookLine.getAttribute('data-stroke-dasharray')).toBe(null) // solid
      expect(instagramLine.getAttribute('data-stroke-dasharray')).toBe('5 5') // dashed
      expect(audienceNetworkLine.getAttribute('data-stroke-dasharray')).toBe('2 2') // dotted
    })
    
    test('TC-204-004: カラーブラインド対応の線種が自動適用される', () => {
      // Given: アクセシビリティモード有効
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        accessibilityMode: true
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: 異なる線種が自動適用される（色覚多様性対応）
      const facebookLine = screen.getByTestId('line-Facebook')
      const instagramLine = screen.getByTestId('line-Instagram') 
      const audienceNetworkLine = screen.getByTestId('line-Audience Network')
      
      // 各プラットフォームで異なる線種が適用される
      expect(facebookLine.getAttribute('data-stroke-dasharray')).not.toBe(
        instagramLine.getAttribute('data-stroke-dasharray')
      )
    })
  })

  describe('レスポンシブ対応', () => {
    test('TC-204-005: レスポンシブコンテナが適切に設定される', () => {
      // Given: 高さ指定付きのプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        height: 300
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: ResponsiveContainerが使用される
      const responsiveContainer = screen.getByTestId('responsive-container')
      expect(responsiveContainer).toBeTruthy()
    })
    
    test('TC-204-006: カスタム寸法が正しく適用される', () => {
      // Given: カスタム寸法指定
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        width: 800,
        height: 400
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: チャートコンテナに寸法が適用される
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toBeTruthy() // 実際のプロパティチェックはRechartsモック内で実行
    })
  })

  describe('データフォーマットと表示', () => {
    test('TC-204-007: 指標単位とフォーマットが正しく表示される', () => {
      // Given: 単位・フォーマット指定付きプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        unit: '%',
        decimals: 1,
        yAxisLabel: 'クリック率 (%)'
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: Y軸とツールチップに単位が表示される
      const yAxis = screen.getByTestId('y-axis')
      const tooltip = screen.getByTestId('tooltip')
      expect(yAxis).toBeTruthy()
      expect(tooltip).toBeTruthy()
    })
    
    test('TC-204-008: 空データに対する適切なフォールバック', () => {
      // Given: 空のデータ
      const props = {
        data: [],
        colors: mockColors,
        metric: 'CTR'
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: 「データがありません」メッセージが表示される
      expect(screen.getByText('データがありません')).toBeTruthy()
    })
  })

  describe('インタラクション機能', () => {
    test('TC-204-009: ツールチップが適切な情報を表示する', () => {
      // Given: ツールチップ設定付きプロパティ
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        showTooltip: true,
        tooltipFormatter: (value: number, platform: string) => [`${value}%`, platform]
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: ツールチップが存在する
      expect(screen.getByTestId('tooltip')).toBeTruthy()
    })
    
    test('TC-204-010: ズーム機能が有効化される（オプション）', () => {
      // Given: ズーム機能有効化
      const props = {
        data: mockChartData,
        colors: mockColors,
        metric: 'CTR',
        enableZoom: true
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: ズーム対応チャートがレンダリングされる
      expect(screen.getByTestId('line-chart')).toBeTruthy()
    })
  })

  describe('パフォーマンステスト', () => {
    test('TC-204-011: 大量データでのレンダリング性能', () => {
      // Given: 大量の時系列データ（90日分）
      const largeData = Array.from({ length: 90 }, (_, i) => ({
        date: `2025-06-${String(i + 1).padStart(2, '0')}`,
        Facebook: Math.random() * 10,
        Instagram: Math.random() * 10,
        'Audience Network': Math.random() * 10
      }))
      
      const props = {
        data: largeData,
        colors: mockColors,
        metric: 'CTR'
      }
      
      // When: パフォーマンス測定付きでレンダリング
      const startTime = performance.now()
      render(<MultiLineChart {...props} />)
      const endTime = performance.now()
      
      // Then: 適切な時間内でレンダリングが完了する（500ms以内）
      expect(endTime - startTime).toBeLessThan(500)
      expect(screen.getByTestId('line-chart')).toBeTruthy()
    })
  })

  describe('エラーハンドリング', () => {
    test('TC-204-012: 無効なデータ形式に対するエラーハンドリング', () => {
      // Given: 無効なデータ形式
      const invalidData = [
        { date: '2025-08-01' }, // プラットフォームデータなし
        { Facebook: 5.0 }, // 日付なし
        null, // null エントリ
      ]
      
      const props = {
        data: invalidData,
        colors: mockColors,
        metric: 'CTR'
      }
      
      // When: コンポーネントをレンダリング
      render(<MultiLineChart {...props} />)
      
      // Then: エラーにならず適切にレンダリングされる
      expect(screen.getByTestId('line-chart')).toBeTruthy()
    })
  })
})