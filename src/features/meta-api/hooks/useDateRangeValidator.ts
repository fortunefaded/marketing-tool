/**
 * useDateRangeValidator.ts
 * TASK-005: 日付範囲の妥当性検証フック
 */

import { useCallback } from 'react'
import type { DateRangePreset } from '../utils/date-range-helpers'
import { getDateRangeInfo, isValidDateRangePreset } from '../utils/date-range-helpers'

interface DateRangeValidationResult {
  isValid: boolean
  preset: DateRangePreset
  warnings: string[]
  recommendations: string[]
  metadata: {
    daysCount: number
    isShortTerm: boolean
    displayName: string
    estimatedApiCalls: number
  }
}

/**
 * 日付範囲の妥当性を検証するフック
 */
export function useDateRangeValidator() {
  
  /**
   * 日付範囲プリセットを検証
   */
  const validateDateRange = useCallback((
    preset: string | DateRangePreset,
    accountType: 'test' | 'production' = 'production'
  ): DateRangeValidationResult => {
    const warnings: string[] = []
    const recommendations: string[] = []
    
    // 基本的な妥当性チェック
    if (!preset || typeof preset !== 'string') {
      return {
        isValid: false,
        preset: 'last_30d',
        warnings: ['日付範囲が指定されていません'],
        recommendations: ['last_30dを使用してください'],
        metadata: {
          daysCount: 30,
          isShortTerm: false,
          displayName: '過去30日間（デフォルト）',
          estimatedApiCalls: 1
        }
      }
    }
    
    // プリセット形式の妥当性
    const isValid = isValidDateRangePreset(preset)
    if (!isValid) {
      warnings.push(`無効な日付範囲プリセット: ${preset}`)
      recommendations.push('有効なプリセット（last_7d, last_30d等）を使用してください')
    }
    
    const validPreset = isValid ? (preset as DateRangePreset) : 'last_30d'
    const rangeInfo = getDateRangeInfo(validPreset)
    
    // パフォーマンス関連の警告
    if (rangeInfo.daysCount > 90) {
      warnings.push('長期間のデータ取得はパフォーマンスに影響する可能性があります')
      recommendations.push('必要に応じてlast_30dやlast_90dの使用を検討してください')
    }
    
    // テスト環境での推奨事項
    if (accountType === 'test') {
      if (rangeInfo.daysCount > 7) {
        warnings.push('テスト環境では短期間のデータ使用を推奨します')
        recommendations.push('last_7dまたはyesterdayの使用を検討してください')
      }
    }
    
    // レート制限に関する警告
    const estimatedApiCalls = Math.ceil(rangeInfo.daysCount / 30) // 概算
    if (estimatedApiCalls > 3) {
      warnings.push('多数のAPI呼び出しが必要になる可能性があります')
      recommendations.push('データ取得を段階的に実行することを検討してください')
    }
    
    // 短期間データの特別な考慮事項
    const isShortTerm = rangeInfo.daysCount <= 7
    if (isShortTerm) {
      recommendations.push('短期間データでは統計的な信頼性に注意してください')
    }
    
    return {
      isValid: isValid && warnings.length === 0,
      preset: validPreset,
      warnings,
      recommendations,
      metadata: {
        daysCount: rangeInfo.daysCount,
        isShortTerm,
        displayName: rangeInfo.displayName,
        estimatedApiCalls
      }
    }
  }, [])
  
  /**
   * 複数の日付範囲を比較検証
   */
  const validateDateRangeComparison = useCallback((
    ranges: (string | DateRangePreset)[]
  ): {
    isValid: boolean
    conflicts: string[]
    recommendations: string[]
  } => {
    const conflicts: string[] = []
    const recommendations: string[] = []
    
    if (ranges.length < 2) {
      return { isValid: true, conflicts, recommendations }
    }
    
    const validatedRanges = ranges.map(range => validateDateRange(range))
    const daysCounts = validatedRanges.map(v => v.metadata.daysCount)
    
    // 期間長の差が大きすぎる場合の警告
    const maxDays = Math.max(...daysCounts)
    const minDays = Math.min(...daysCounts)
    
    if (maxDays / minDays > 10) {
      conflicts.push('比較対象の期間長に大きな差があります')
      recommendations.push('類似した期間長での比較を推奨します')
    }
    
    // 短期間と長期間の混在チェック
    const hasShortTerm = validatedRanges.some(v => v.metadata.isShortTerm)
    const hasLongTerm = validatedRanges.some(v => !v.metadata.isShortTerm)
    
    if (hasShortTerm && hasLongTerm) {
      conflicts.push('短期間データと長期間データが混在しています')
      recommendations.push('統計的信頼性のため、同程度の期間での比較を推奨します')
    }
    
    return {
      isValid: conflicts.length === 0,
      conflicts,
      recommendations
    }
  }, [validateDateRange])
  
  /**
   * 日付範囲の自動修正提案
   */
  const suggestOptimalDateRange = useCallback((
    currentPreset: string | DateRangePreset,
    context: {
      dataVolume?: 'low' | 'medium' | 'high'
      analysisType?: 'trend' | 'comparison' | 'fatigue'
      userExperience?: 'beginner' | 'advanced'
    } = {}
  ): {
    suggested: DateRangePreset
    reason: string
    alternatives: DateRangePreset[]
  } => {
    const { dataVolume = 'medium', analysisType = 'trend', userExperience = 'beginner' } = context
    
    // 現在のプリセットの検証
    const validation = validateDateRange(currentPreset)
    
    // デフォルトの推奨
    let suggested: DateRangePreset = 'last_30d'
    let reason = '一般的な分析に適した期間です'
    let alternatives: DateRangePreset[] = ['last_7d', 'last_14d']
    
    // 分析タイプ別の推奨
    switch (analysisType) {
      case 'fatigue':
        if (dataVolume === 'high') {
          suggested = 'last_14d'
          reason = '疲労度分析には2週間程度が適切です'
          alternatives = ['last_7d', 'last_30d']
        } else {
          suggested = 'last_7d'
          reason = '疲労度の変化を敏感に捉えられます'
          alternatives = ['last_14d', 'yesterday']
        }
        break
        
      case 'trend':
        suggested = 'last_30d'
        reason = 'トレンド分析には十分なデータ量が必要です'
        alternatives = ['last_14d', 'last_90d']
        break
        
      case 'comparison':
        suggested = 'last_14d'
        reason = '比較分析にはバランスの取れた期間です'
        alternatives = ['last_7d', 'last_30d']
        break
    }
    
    // ユーザー経験レベル別の調整
    if (userExperience === 'beginner') {
      if (suggested === 'last_90d') {
        suggested = 'last_30d'
        reason = '初心者には扱いやすい期間です'
      }
    }
    
    // データ量別の調整
    if (dataVolume === 'low' && validation.metadata.daysCount > 14) {
      suggested = 'last_14d'
      reason = '少ないデータ量に適した期間です'
    }
    
    return {
      suggested,
      reason,
      alternatives
    }
  }, [validateDateRange])
  
  return {
    validateDateRange,
    validateDateRangeComparison,
    suggestOptimalDateRange
  }
}