/**
 * TASK-203: Chart Data Transformer - チャートデータ変換器
 * 要件: REQ-002, REQ-003 (媒体別グラフ表示)
 * 
 * EnhancedAdPerformanceDataからRechartsフォーマットへの変換機能
 */

import type { GraphDataPoint, PlatformBreakdownGraph } from '../types/enhanced-data-structure'

/**
 * プラットフォーム名マッピング
 */
const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram', 
  audience_network: 'Audience Network',
  messenger: 'Messenger'
} as const

/**
 * プラットフォーム別デフォルト色設定
 */
const DEFAULT_PLATFORM_COLORS = {
  Facebook: '#1877F2',        // Facebook Blue
  Instagram: '#E4405F',       // Instagram Pink
  'Audience Network': '#42B883', // Green
  Messenger: '#0084FF'        // Messenger Blue
} as const

/**
 * チャートデータ変換オプション
 */
export interface ChartTransformOptions {
  useJapaneseLabels?: boolean
  customColors?: Record<string, string>
  metricConfigs?: Record<string, {
    color?: string
    unit?: string
    decimals?: number
  }>
}

/**
 * Rechartsライン用データ（色設定付き）
 */
export interface RechartsLineDataWithColors {
  data: Record<string, any>[]
  colors: Record<string, string>
}

/**
 * 複数指標データセット
 */
export interface MultiMetricDatasets {
  [metric: string]: Record<string, any>[]
  _metadata?: Record<string, {
    color?: string
    unit?: string
    decimals?: number
  }>
}

/**
 * チャートデータ変換器クラス
 * 
 * 使用例:
 * ```typescript
 * // 基本的な変換
 * const rechartsData = ChartDataTransformer.toRechartsLineData(graphData)
 * 
 * // 色設定付き変換
 * const { data, colors } = ChartDataTransformer.toRechartsLineDataWithColors(graphData)
 * 
 * // 複数指標の変換
 * const datasets = ChartDataTransformer.createMultiMetricDatasets(platformGraphs, ['ctr', 'cpm'])
 * ```
 */
export class ChartDataTransformer {
  
  // パフォーマンス閾値設定
  private static readonly LARGE_DATASET_THRESHOLD = 1000
  private static readonly PERFORMANCE_WARNING_MS = 100
  
  /**
   * GraphDataPointsをRechartsライン用データに変換
   * 
   * @param graphDataPoints - プラットフォーム別グラフデータ配列
   * @param options - 変換オプション（ラベル設定、色設定等）
   * @returns Recharts形式のデータ配列
   */
  static toRechartsLineData(
    graphDataPoints: GraphDataPoint[],
    options: ChartTransformOptions = {}
  ): Record<string, any>[] {
    if (!graphDataPoints || graphDataPoints.length === 0) {
      return []
    }

    // 大量データの場合は最適化メソッドを使用
    if (graphDataPoints.length >= this.LARGE_DATASET_THRESHOLD) {
      return this.toRechartsLineDataOptimized(graphDataPoints, options)
    }

    return graphDataPoints.map(dataPoint => {
      const rechartsPoint: Record<string, any> = {
        date: dataPoint.date
      }

      // 各プラットフォームのデータを変換
      if (dataPoint.facebook !== undefined) {
        rechartsPoint[PLATFORM_LABELS.facebook] = dataPoint.facebook
      }
      if (dataPoint.instagram !== undefined) {
        rechartsPoint[PLATFORM_LABELS.instagram] = dataPoint.instagram
      }
      if (dataPoint.audience_network !== undefined) {
        rechartsPoint[PLATFORM_LABELS.audience_network] = dataPoint.audience_network
      }
      if (dataPoint.messenger !== undefined) {
        rechartsPoint[PLATFORM_LABELS.messenger] = dataPoint.messenger
      }

      return rechartsPoint
    })
  }

  /**
   * 色設定付きRechartsデータを生成
   */
  static toRechartsLineDataWithColors(
    graphDataPoints: GraphDataPoint[],
    options: ChartTransformOptions = {}
  ): RechartsLineDataWithColors {
    const data = this.toRechartsLineData(graphDataPoints, options)
    
    // カスタム色設定がある場合は適用、なければデフォルト使用
    const colors = {
      ...DEFAULT_PLATFORM_COLORS,
      ...options.customColors
    }

    return {
      data,
      colors
    }
  }

  /**
   * 複数指標のチャートデータセットを生成
   * 
   * @param platformGraphs - プラットフォーム別グラフデータ
   * @param requestedMetrics - 変換対象の指標配列
   * @param options - 変換オプション
   * @returns 指標別データセット
   */
  static createMultiMetricDatasets(
    platformGraphs: Partial<PlatformBreakdownGraph>,
    requestedMetrics: string[],
    options: ChartTransformOptions = {}
  ): MultiMetricDatasets {
    if (!platformGraphs || !requestedMetrics || requestedMetrics.length === 0) {
      console.warn('[ChartDataTransformer] Invalid input for createMultiMetricDatasets')
      return {}
    }

    const datasets: MultiMetricDatasets = {}
    const startTime = performance.now()

    // 各指標のデータセットを作成
    for (const metric of requestedMetrics) {
      const graphData = platformGraphs[metric as keyof PlatformBreakdownGraph]
      if (graphData) {
        datasets[metric] = this.toRechartsLineData(graphData, options)
      } else {
        console.warn(`[ChartDataTransformer] No data found for metric: ${metric}`)
      }
    }

    // パフォーマンス測定
    const endTime = performance.now()
    const processingTime = endTime - startTime
    
    if (processingTime > this.PERFORMANCE_WARNING_MS) {
      console.warn(`[ChartDataTransformer] Processing took ${processingTime.toFixed(2)}ms (above ${this.PERFORMANCE_WARNING_MS}ms threshold)`)
    }

    // メタデータ（色・単位・小数点設定）を追加
    if (options.metricConfigs) {
      datasets._metadata = options.metricConfigs
    }

    return datasets
  }

  /**
   * 指標別カスタム設定のデフォルト値
   */
  static getDefaultMetricConfig() {
    return {
      ctr: { color: '#3B82F6', unit: '%', decimals: 2 },
      cpm: { color: '#EF4444', unit: '円', decimals: 0 },
      cpc: { color: '#10B981', unit: '円', decimals: 2 },
      cpa: { color: '#F59E0B', unit: '円', decimals: 0 },
      roas: { color: '#8B5CF6', unit: '', decimals: 2 },
      conversions: { color: '#06B6D4', unit: '件', decimals: 0 },
      impressions: { color: '#84CC16', unit: '回', decimals: 0 },
      spend: { color: '#F97316', unit: '円', decimals: 0 }
    }
  }

  /**
   * プラットフォーム名を表示用ラベルに変換
   */
  static getPlatformLabel(platformKey: string): string {
    return PLATFORM_LABELS[platformKey as keyof typeof PLATFORM_LABELS] || platformKey
  }

  /**
   * プラットフォームのデフォルト色を取得
   */
  static getPlatformColor(platformLabel: string): string {
    return DEFAULT_PLATFORM_COLORS[platformLabel as keyof typeof DEFAULT_PLATFORM_COLORS] || '#6B7280'
  }

  /**
   * データの検証とクリーニング
   */
  static validateAndCleanData(graphDataPoints: GraphDataPoint[]): GraphDataPoint[] {
    if (!Array.isArray(graphDataPoints)) {
      console.warn('[ChartDataTransformer] Invalid input: not an array')
      return []
    }

    return graphDataPoints.filter(point => {
      // 必須のdateフィールドがあることを確認
      if (!point.date) {
        console.warn('[ChartDataTransformer] Skipping data point with missing date')
        return false
      }

      // 少なくとも1つのプラットフォームデータがあることを確認
      const hasData = point.facebook !== undefined || 
                      point.instagram !== undefined || 
                      point.audience_network !== undefined || 
                      point.messenger !== undefined

      if (!hasData) {
        console.warn(`[ChartDataTransformer] Skipping data point for ${point.date} - no platform data`)
        return false
      }

      return true
    })
  }

  /**
   * 大量データ処理用最適化メソッド
   */
  static toRechartsLineDataOptimized(
    graphDataPoints: GraphDataPoint[],
    options: ChartTransformOptions = {}
  ): Record<string, any>[] {
    if (!graphDataPoints || graphDataPoints.length === 0) {
      return []
    }

    // データ検証・クリーニング
    const cleanData = this.validateAndCleanData(graphDataPoints)
    
    // 大量データの場合はバッチ処理
    if (cleanData.length > 1000) {
      console.warn('[ChartDataTransformer] Processing large dataset, performance may be impacted')
    }

    // 最適化されたマッピング処理
    const result = new Array(cleanData.length)
    
    for (let i = 0; i < cleanData.length; i++) {
      const dataPoint = cleanData[i]
      const rechartsPoint: Record<string, any> = {
        date: dataPoint.date
      }

      // プラットフォームデータを効率的に処理
      const platforms = ['facebook', 'instagram', 'audience_network', 'messenger'] as const
      
      for (const platform of platforms) {
        const value = dataPoint[platform]
        if (value !== undefined) {
          rechartsPoint[PLATFORM_LABELS[platform]] = value
        }
      }

      result[i] = rechartsPoint
    }

    return result
  }
}