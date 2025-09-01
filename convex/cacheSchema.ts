/**
 * Convexベースキャッシュシステム スキーマ定義
 *
 * 3層キャッシュシステムの永続化層（L2）で使用するテーブル定義
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// ============================================================================
// データ鮮度管理テーブル
// ============================================================================

/**
 * データ鮮度状態の管理
 * 各日付範囲のデータがどの鮮度状態にあるかを追跡
 */
export const dataFreshness = defineTable({
  // 識別子
  accountId: v.string(),
  dateRange: v.string(), // "last_7d", "last_30d" など
  startDate: v.string(), // YYYY-MM-DD
  endDate: v.string(), // YYYY-MM-DD

  // 鮮度状態
  freshnessStatus: v.union(
    v.literal('realtime'), // 当日データ（3時間毎更新）
    v.literal('neartime'), // 1-2日前（6時間毎更新）
    v.literal('stabilizing'), // 2-3日前（24時間毎更新）
    v.literal('finalized') // 3日以上前（更新不要）
  ),

  // 更新管理
  lastUpdated: v.number(), // Unix timestamp
  nextUpdateAt: v.number(), // Unix timestamp
  updatePriority: v.number(), // 0-100 (higher = more priority)
  updateCount: v.number(), // 更新回数

  // API使用量追跡
  apiCallsToday: v.number(),
  apiCallsTotal: v.number(),
  lastApiCallAt: v.optional(v.number()),

  // データ品質
  dataCompleteness: v.number(), // 0-100%
  missingDates: v.optional(v.array(v.string())),
  lastVerifiedAt: v.number(),

  // メタデータ
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_account', ['accountId'])
  .index('by_account_range', ['accountId', 'dateRange'])
  .index('by_next_update', ['nextUpdateAt'])
  .index('by_priority', ['updatePriority'])

// ============================================================================
// キャッシュエントリテーブル
// ============================================================================

/**
 * L2永続化キャッシュのメインテーブル
 * 差分更新されたデータを保存
 */
export const cacheEntries = defineTable({
  // 識別子
  cacheKey: v.string(), // 複合キー: accountId_dateRange_hash
  accountId: v.string(),
  dateRange: v.string(),

  // データ本体（圧縮可能）
  data: v.any(), // AdInsight[]の配列
  dataSize: v.number(), // バイト数
  recordCount: v.number(),

  // メタデータ
  createdAt: v.number(),
  updatedAt: v.number(),
  expiresAt: v.number(),
  accessCount: v.number(), // アクセス回数
  lastAccessedAt: v.number(),

  // データ品質
  checksum: v.string(), // データ整合性チェック用
  isComplete: v.boolean(),
  isCompressed: v.boolean(),
  compressionRatio: v.optional(v.number()),

  // パフォーマンス
  fetchTimeMs: v.number(), // 取得にかかった時間
  processTimeMs: v.number(), // 処理にかかった時間
})
  .index('by_cache_key', ['cacheKey'])
  .index('by_account', ['accountId'])
  .index('by_account_range', ['accountId', 'dateRange'])
  .index('by_expires', ['expiresAt'])
  .index('by_last_accessed', ['lastAccessedAt'])

// ============================================================================
// 差分更新履歴テーブル
// ============================================================================

/**
 * 差分更新の実行履歴
 * API使用量削減の効果を測定
 */
export const differentialUpdates = defineTable({
  // 識別子
  updateId: v.string(), // UUID
  accountId: v.string(),
  dateRange: v.string(),

  // 更新範囲
  targetDates: v.array(v.string()), // 更新対象の日付リスト
  actualUpdatedDates: v.array(v.string()), // 実際に更新された日付

  // API使用量
  apiCallsUsed: v.number(),
  apiCallsSaved: v.number(), // 差分更新により削減できたAPI呼び出し数
  reductionRate: v.number(), // 削減率（%）

  // データ変更
  recordsAdded: v.number(),
  recordsUpdated: v.number(),
  recordsDeleted: v.number(),
  totalRecordsAfter: v.number(),

  // パフォーマンス
  startedAt: v.number(),
  completedAt: v.number(),
  durationMs: v.number(),

  // ステータス
  status: v.union(
    v.literal('pending'),
    v.literal('running'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('partial')
  ),
  error: v.optional(v.string()),

  // トリガー
  triggeredBy: v.union(
    v.literal('manual'),
    v.literal('scheduled'),
    v.literal('freshness'),
    v.literal('api')
  ),
})
  .index('by_account', ['accountId'])
  .index('by_account_date', ['accountId', 'startedAt'])
  .index('by_status', ['status'])

// ============================================================================
// システムメトリクステーブル
// ============================================================================

/**
 * キャッシュシステムのパフォーマンスメトリクス
 * 監視とアラートに使用
 */
export const cacheMetrics = defineTable({
  // 時系列データ
  timestamp: v.number(),
  interval: v.union(v.literal('minute'), v.literal('hour'), v.literal('day')),

  // キャッシュ統計
  cacheHitRate: v.number(), // キャッシュヒット率（%）
  memoryHitRate: v.number(), // L1メモリヒット率
  convexHitRate: v.number(), // L2 Convexヒット率
  apiCallRate: v.number(), // L3 API呼び出し率

  // パフォーマンス
  avgResponseTimeMs: v.number(),
  p50ResponseTimeMs: v.number(),
  p95ResponseTimeMs: v.number(),
  p99ResponseTimeMs: v.number(),

  // API使用量
  apiCallsTotal: v.number(),
  apiCallsSaved: v.number(),
  apiReductionRate: v.number(),
  estimatedCostSaved: v.number(), // 推定節約額（USD）

  // データ量
  totalCacheEntries: v.number(),
  totalDataSizeMb: v.number(),
  avgEntrySizeKb: v.number(),

  // エラー率
  errorRate: v.number(),
  apiErrorCount: v.number(),
  cacheErrorCount: v.number(),

  // アクティビティ
  activeAccounts: v.number(),
  totalRequests: v.number(),
  uniqueUsers: v.number(),
})
  .index('by_timestamp', ['timestamp'])
  .index('by_interval', ['interval', 'timestamp'])

// ============================================================================
// スケジュール実行管理テーブル
// ============================================================================

/**
 * 定期更新ジョブの管理
 * Convex Scheduled Functionsと連携
 */
export const updateSchedules = defineTable({
  // 識別子
  scheduleId: v.string(),
  accountId: v.string(),

  // スケジュール設定
  scheduleType: v.union(
    v.literal('freshness'), // 鮮度ベース更新
    v.literal('periodic'), // 定期更新
    v.literal('predictive') // 予測的更新
  ),
  interval: v.string(), // "10m", "1h", "6h", "24h"

  // 実行管理
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  nextRunAt: v.number(),
  consecutiveFailures: v.number(),

  // 実行結果
  lastRunStatus: v.optional(
    v.union(v.literal('success'), v.literal('failed'), v.literal('skipped'))
  ),
  lastRunDurationMs: v.optional(v.number()),
  lastRunRecordsUpdated: v.optional(v.number()),

  // 設定
  config: v.object({
    priorityThreshold: v.optional(v.number()), // 優先度閾値
    maxApiCalls: v.optional(v.number()), // 最大API呼び出し数
    batchSize: v.optional(v.number()), // バッチサイズ
    retryAttempts: v.optional(v.number()), // リトライ回数
  }),

  // メタデータ
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_account', ['accountId'])
  .index('by_next_run', ['nextRunAt'])
  .index('by_enabled', ['enabled', 'nextRunAt'])

// ============================================================================
// エラー・アラートログテーブル
// ============================================================================

/**
 * システムエラーとアラートの記録
 * トラブルシューティングと監視に使用
 */
export const cacheAlerts = defineTable({
  // 識別子
  alertId: v.string(),
  accountId: v.optional(v.string()),

  // アラート情報
  severity: v.union(
    v.literal('info'),
    v.literal('warning'),
    v.literal('error'),
    v.literal('critical')
  ),
  type: v.union(
    v.literal('cache_miss_high'),
    v.literal('api_rate_limit'),
    v.literal('data_corruption'),
    v.literal('sync_failure'),
    v.literal('performance_degradation'),
    v.literal('memory_pressure')
  ),

  // 詳細
  title: v.string(),
  message: v.string(),
  details: v.optional(v.any()),
  stackTrace: v.optional(v.string()),

  // コンテキスト
  component: v.string(), // "memory_cache", "convex_cache", "api_client"
  operation: v.string(), // "fetch", "update", "delete"

  // 解決状況
  isResolved: v.boolean(),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(v.string()),
  resolution: v.optional(v.string()),

  // 自動復旧
  autoRecoveryAttempted: v.boolean(),
  autoRecoverySuccessful: v.optional(v.boolean()),

  // メタデータ
  createdAt: v.number(),
  acknowledgedAt: v.optional(v.number()),
})
  .index('by_severity', ['severity', 'createdAt'])
  .index('by_unresolved', ['isResolved', 'severity'])
  .index('by_account', ['accountId', 'createdAt'])
  .index('by_type', ['type', 'createdAt'])

// ============================================================================
// バックプレッシャー管理テーブル
// ============================================================================

/**
 * API呼び出しのバックプレッシャー管理
 * レート制限とサーキットブレーカーの状態を追跡
 */
export const backpressureState = defineTable({
  // 識別子
  resourceId: v.string(), // "meta_api", "convex_db" など
  accountId: v.optional(v.string()),

  // サーキットブレーカー状態
  circuitState: v.union(
    v.literal('closed'), // 正常動作
    v.literal('open'), // 遮断中
    v.literal('half_open') // 試験的再開
  ),

  // レート制限
  currentRate: v.number(), // 現在のレート（req/min）
  maxRate: v.number(), // 最大レート
  rateLimitRemaining: v.number(), // 残りリクエスト数
  rateLimitResetAt: v.number(), // リセット時刻

  // エラー追跡
  consecutiveErrors: v.number(),
  lastErrorAt: v.optional(v.number()),
  errorRate: v.number(), // 直近1分間のエラー率

  // バックオフ
  backoffMultiplier: v.number(),
  currentBackoffMs: v.number(),
  nextRetryAt: v.optional(v.number()),

  // キュー状態
  queuedRequests: v.number(),
  processingRequests: v.number(),

  // メタデータ
  lastSuccessAt: v.optional(v.number()),
  stateChangedAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_resource', ['resourceId'])
  .index('by_circuit_state', ['circuitState'])

export default {
  dataFreshness,
  cacheEntries,
  differentialUpdates,
  cacheMetrics,
  updateSchedules,
  cacheAlerts,
  backpressureState,
}
