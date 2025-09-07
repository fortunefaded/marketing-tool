/**
 * TASK-201: Enhanced Data Structure - 拡張データ構造
 * 要件: REQ-003 (媒体別指標表示), REQ-006, REQ-007 (データ整合性)
 * 
 * 媒体別グラフ表示とデータ整合性チェックのための型定義
 */

import type { AdPerformanceData, CalculatedMetrics, PlatformType } from '../../core/ad-data-aggregator'

/**
 * プラットフォーム別メトリクス
 * Facebook、Instagram、Audience Network別の詳細指標
 */
export interface PlatformSpecificMetrics {
  facebook: CalculatedMetrics
  instagram: CalculatedMetrics
  audience_network: CalculatedMetrics
  messenger?: CalculatedMetrics // オプショナル
}

/**
 * グラフ用データポイント
 * 日別 × プラットフォーム別の単一指標値
 */
export interface GraphDataPoint {
  date: string
  facebook: number
  instagram: number
  audience_network: number
  messenger?: number // オプショナル
}

/**
 * プラットフォーム別グラフデータ
 * 各指標ごとの時系列データ配列
 */
export interface PlatformBreakdownGraph {
  ctr: GraphDataPoint[]
  cpm: GraphDataPoint[]
  cpc: GraphDataPoint[]
  cpa: GraphDataPoint[]
  roas: GraphDataPoint[]
  conversions: GraphDataPoint[]
  impressions: GraphDataPoint[]
  spend: GraphDataPoint[]
}

/**
 * 拡張されたAdPerformanceData
 * 既存データ + プラットフォーム別グラフ用データ
 */
export interface EnhancedAdPerformanceData extends AdPerformanceData {
  // 新規追加: グラフ表示用のプラットフォーム別時系列データ
  platformGraphs: Partial<PlatformBreakdownGraph>
  
  // 新規追加: 詳細なプラットフォーム別メトリクス
  detailedPlatformMetrics?: PlatformSpecificMetrics
}

/**
 * データ不整合詳細情報
 */
export interface DataDiscrepancy {
  platform: PlatformType
  metric: keyof CalculatedMetrics
  expected: number
  actual: number
  variance: number // パーセント
  severity: 'low' | 'medium' | 'high'
}

/**
 * データ整合性チェック結果
 */
export interface DataConsistencyResult {
  isConsistent: boolean
  discrepancies: DataDiscrepancy[]
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    overallVariance: number // 平均分散パーセント
  }
}

/**
 * 拡張集約オプション
 * 既存のAggregationOptionsに拡張機能を追加
 */
export interface EnhancedAggregationOptions {
  // 基本オプション
  groupBy: 'ad' | 'adset' | 'campaign'
  includePlatformBreakdown: boolean
  includeDailyBreakdown: boolean
  calculateFatigue: boolean
  
  // 拡張オプション
  includeGraphData: boolean // グラフ用データ生成
  performConsistencyCheck: boolean // データ整合性チェック
  graphMetrics: (keyof PlatformBreakdownGraph)[] // 生成する指標
}

/**
 * 拡張集約結果
 */
export interface EnhancedAggregationResult {
  data: EnhancedAdPerformanceData[]
  consistencyResults: DataConsistencyResult[]
  metadata: {
    totalInputRows: number
    totalOutputRows: number
    processingTimeMs: number
    dataReduction: string
    graphDataGenerated: boolean
    consistencyCheckPerformed: boolean
  }
}