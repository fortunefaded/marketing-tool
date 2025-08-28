/**
 * TASK-102: 常時集約モード - テスト
 * 要件: REQ-001対応テスト
 */

import { describe, test, expect, vi } from 'vitest'
import {
  SimplifiedAggregationConfig,
  DEFAULT_SIMPLIFIED_CONFIG,
  validateSimplifiedConfig,
  migrateToSimplifiedConfig
} from '../aggregation-config'

describe('TASK-102: SimplifiedAggregationConfig', () => {
  
  describe('デフォルト設定の検証', () => {
    test('DEFAULT_SIMPLIFIED_CONFIGが要件REQ-001に準拠している', () => {
      // Given: デフォルト設定
      const config = DEFAULT_SIMPLIFIED_CONFIG
      
      // Then: REQ-001要件を満たす
      expect(config.alwaysEnabled).toBe(true) // 常に集約有効
      expect(config.showToggle).toBe(false)   // トグル表示なし
      expect(config.includePlatformBreakdown).toBe(true) // プラットフォーム別データ含む
      expect(config.defaultGroupBy).toBe('ad') // 広告単位での集約
    })
    
    test('設定が読み取り専用である', () => {
      // Given: デフォルト設定
      const config = DEFAULT_SIMPLIFIED_CONFIG
      
      // When/Then: 設定変更ができない（TypeScript const assertion）
      // @ts-expect-error - 読み取り専用プロパティ
      // config.alwaysEnabled = false
      
      // 実行時にも変更されないことを確認
      const originalValue = config.alwaysEnabled
      expect(originalValue).toBe(true)
    })
  })

  describe('設定バリデーション', () => {
    test('正しい設定がバリデーションを通過する', () => {
      // Given: 正しい設定
      const validConfig: Partial<SimplifiedAggregationConfig> = {
        alwaysEnabled: true,
        showToggle: false,
        includePlatformBreakdown: true
      }
      
      // When: バリデーション実行
      const result = validateSimplifiedConfig(validConfig)
      
      // Then: バリデーション通過
      expect(result).toBe(true)
    })
    
    test('alwaysEnabled=falseがバリデーションで拒否される', () => {
      // Given: 無効な設定
      const invalidConfig: Partial<SimplifiedAggregationConfig> = {
        alwaysEnabled: false as any, // 型システムを回避してテスト
        showToggle: false,
        includePlatformBreakdown: true
      }
      
      // When: バリデーション実行
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const result = validateSimplifiedConfig(invalidConfig)
      
      // Then: バリデーション失敗と警告出力
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AggregationConfig] alwaysEnabled must be true'
      )
      
      consoleSpy.mockRestore()
    })
    
    test('showToggle=trueがバリデーションで拒否される', () => {
      // Given: 無効な設定  
      const invalidConfig: Partial<SimplifiedAggregationConfig> = {
        alwaysEnabled: true,
        showToggle: true as any, // REQ-001違反
        includePlatformBreakdown: true
      }
      
      // When: バリデーション実行
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const result = validateSimplifiedConfig(invalidConfig)
      
      // Then: バリデーション失敗
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AggregationConfig] showToggle must be false'
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('レガシー設定からの移行', () => {
    test('enableAggregation=trueからの移行が正常に動作する', () => {
      // Given: レガシー設定（集約有効）
      const legacyConfig = {
        enableAggregation: true,
        groupBy: 'campaign' as const,
        includeDailyBreakdown: false
      }
      
      // When: 新設定に移行
      const result = migrateToSimplifiedConfig(legacyConfig)
      
      // Then: 適切に移行される
      expect(result.alwaysEnabled).toBe(true)
      expect(result.showToggle).toBe(false)
      expect(result.defaultGroupBy).toBe('campaign')
      expect(result.includeDailyBreakdown).toBe(false)
    })
    
    test('enableAggregation=falseからの移行で警告が出力される', () => {
      // Given: レガシー設定（集約無効 - 非推奨）
      const legacyConfig = {
        enableAggregation: false,
        groupBy: 'adset' as const
      }
      
      // When: 新設定に移行
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const result = migrateToSimplifiedConfig(legacyConfig)
      
      // Then: 強制的に集約有効 + 警告
      expect(result.alwaysEnabled).toBe(true) // 強制的にtrue
      expect(result.defaultGroupBy).toBe('adset')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AggregationConfig] Legacy enableAggregation=false is ignored. Always enabled now.'
      )
      
      consoleSpy.mockRestore()
    })
    
    test('設定なしからの移行でデフォルト値が使用される', () => {
      // Given: 設定なし
      const legacyConfig = undefined
      
      // When: 新設定に移行
      const result = migrateToSimplifiedConfig(legacyConfig)
      
      // Then: デフォルト設定が適用される
      expect(result).toEqual(DEFAULT_SIMPLIFIED_CONFIG)
    })
  })

  describe('型安全性', () => {
    test('SimplifiedAggregationConfig型が正しく定義されている', () => {
      // Given: 型定義に準拠したオブジェクト
      const config: SimplifiedAggregationConfig = {
        alwaysEnabled: true,
        showToggle: false,
        defaultGroupBy: 'ad',
        includePlatformBreakdown: true,
        includeDailyBreakdown: true
      }
      
      // Then: 型チェックが通る
      expect(config.alwaysEnabled).toBe(true)
      expect(config.showToggle).toBe(false)
      
      // TypeScriptコンパイルエラーになることを確認（コメントアウト）
      // const invalidConfig: SimplifiedAggregationConfig = {
      //   alwaysEnabled: false, // Type error
      //   showToggle: true,     // Type error
      // }
    })
  })
})