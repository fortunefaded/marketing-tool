/**
 * Convex スキーマ定義
 *
 * Convexの実際のスキーマファイル（convex/schema.ts）で使用する定義
 * NoSQL Document Database として最適化された構造
 */

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ===========================================================================
  // metaInsights: 広告インサイトデータの永続化キャッシュ
  // ===========================================================================
  metaInsights: defineTable({
    // 複合ユニークキー（アカウント + 広告 + 日付）
    accountId: v.string(),
    adId: v.string(),
    dateKey: v.string(), // YYYY-MM-DD format

    // キャッシュ識別子
    cacheKey: v.string(),

    // Meta Graph APIから取得した実際のデータ
    insightData: v.object({
      ad_id: v.string(),
      account_id: v.string(),
      campaign_id: v.string(),
      adset_id: v.string(),
      date_start: v.string(),
      date_stop: v.string(),
      impressions: v.number(),
      clicks: v.number(),
      spend: v.number(),
      reach: v.number(),
      frequency: v.number(),
      ctr: v.number(),
      unique_ctr: v.number(),
      inline_link_click_ctr: v.number(),
      cpm: v.number(),
      cpc: v.number(),
      cpp: v.number(),
      // オプショナルフィールド
      actions: v.optional(
        v.array(
          v.object({
            action_type: v.string(),
            value: v.number(),
            '1d_click': v.optional(v.number()),
            '1d_view': v.optional(v.number()),
            '7d_click': v.optional(v.number()),
            '7d_view': v.optional(v.number()),
            '28d_click': v.optional(v.number()),
            '28d_view': v.optional(v.number()),
          })
        )
      ),
      conversion_values: v.optional(
        v.array(
          v.object({
            action_type: v.string(),
            value: v.number(),
            '1d_click': v.optional(v.number()),
            '1d_view': v.optional(v.number()),
            '7d_click': v.optional(v.number()),
            '7d_view': v.optional(v.number()),
            '28d_click': v.optional(v.number()),
            '28d_view': v.optional(v.number()),
          })
        )
      ),
      video_play_curve_actions: v.optional(
        v.array(
          v.object({
            action_type: v.string(),
            value: v.number(),
          })
        )
      ),
      video_avg_time_watched_actions: v.optional(
        v.array(
          v.object({
            action_type: v.string(),
            value: v.number(),
          })
        )
      ),
      created_time: v.optional(v.string()),
      updated_time: v.optional(v.string()),
    }),

    // データ鮮度管理
    dataFreshness: v.union(
      v.literal('realtime'),
      v.literal('neartime'),
      v.literal('stabilizing'),
      v.literal('finalized')
    ),

    // 品質管理
    checksum: v.string(), // SHA-256 ハッシュ
    recordCount: v.number(),
    isComplete: v.boolean(),

    // 更新管理
    lastVerified: v.number(), // Unix timestamp (ms)
    updatePriority: v.number(),
    nextUpdateAt: v.optional(v.number()),

    // パフォーマンス統計
    fetchDurationMs: v.optional(v.number()),
    apiCallsUsed: v.number(),

    // エラー追跡
    lastError: v.optional(v.string()),
    errorCount: v.number(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    // 複合インデックス（ユニーク制約とパフォーマンス最適化）
    .index('by_unique_key', ['accountId', 'adId', 'dateKey'])
    .index('by_account_date', ['accountId', 'dateKey'])
    .index('by_freshness', ['dataFreshness', 'lastVerified'])
    .index('by_cache_key', ['cacheKey'])
    .index('by_update_priority', ['updatePriority', 'nextUpdateAt']),

  // ===========================================================================
  // dataFreshness: データ鮮度と更新スケジュール管理
  // ===========================================================================
  dataFreshness: defineTable({
    // 識別子
    accountId: v.string(),
    dateKey: v.string(), // YYYY-MM-DD format

    // 鮮度ステータス
    status: v.union(
      v.literal('realtime'),
      v.literal('neartime'),
      v.literal('stabilizing'),
      v.literal('finalized')
    ),

    // API取得履歴
    lastApiFetch: v.optional(v.number()),
    apiFetchCount: v.number(),

    // 更新チェック履歴
    lastUpdateCheck: v.number(),
    updateAttempts: v.number(),

    // スケジューリング
    nextScheduledUpdate: v.optional(v.number()),
    updateIntervalMinutes: v.number(),

    // データ統計
    totalAdsCount: v.number(),
    completeAdsCount: v.number(),

    // エラー追跡
    lastError: v.optional(v.string()),
    consecutiveFailures: v.number(),
    lastSuccess: v.optional(v.number()),

    // パフォーマンス
    avgResponseTimeMs: v.optional(v.number()),
    totalApiCalls: v.number(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account_date', ['accountId', 'dateKey'])
    .index('by_account', ['accountId'])
    .index('by_status', ['status', 'nextScheduledUpdate'])
    .index('by_schedule', ['nextScheduledUpdate']),

  // ===========================================================================
  // cacheMetrics: システムパフォーマンス監視データ
  // ===========================================================================
  cacheMetrics: defineTable({
    // 時間軸（時間単位の集約）
    dateKey: v.string(), // YYYY-MM-DD
    hourKey: v.number(), // 0-23
    accountId: v.optional(v.string()), // null = システム全体の統計

    // パフォーマンス指標
    cacheHitCount: v.number(),
    cacheMissCount: v.number(),
    cacheHitRate: v.number(), // 0.0 - 1.0

    // API使用量
    apiCallCount: v.number(),
    apiCallReductionCount: v.number(),
    apiCallReductionRate: v.number(), // 0.0 - 1.0

    // 応答時間統計
    avgResponseTimeMs: v.number(),
    p95ResponseTimeMs: v.number(),
    p99ResponseTimeMs: v.number(),
    maxResponseTimeMs: v.number(),

    // エラー統計
    errorCount: v.number(),
    errorRate: v.number(), // 0.0 - 1.0
    timeoutCount: v.number(),
    rateLimitCount: v.number(),

    // リソース使用量
    memoryUsageMb: v.number(),
    cpuUsagePercent: v.number(),
    activeConnections: v.number(),

    // データ品質
    dataIntegrityChecks: v.number(),
    dataCorruptionCount: v.number(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_time', ['dateKey', 'hourKey', 'accountId'])
    .index('by_date', ['dateKey'])
    .index('by_account_date', ['accountId', 'dateKey']),

  // ===========================================================================
  // systemEvents: システムイベントとアラートログ
  // ===========================================================================
  systemEvents: defineTable({
    // イベント分類
    eventType: v.string(), // 'cache_miss', 'api_error', 'data_update', etc.
    severity: v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('error'),
      v.literal('critical')
    ),

    // イベント詳細
    title: v.string(),
    description: v.string(),

    // 関連データ
    accountId: v.optional(v.string()),
    adId: v.optional(v.string()),
    cacheKey: v.optional(v.string()),

    // エラー詳細（該当する場合）
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    stackTrace: v.optional(v.string()),

    // パフォーマンス詳細
    durationMs: v.optional(v.number()),
    apiCallsUsed: v.optional(v.number()),
    memoryUsageMb: v.optional(v.number()),

    // 追加メタデータ
    metadata: v.optional(v.any()),

    // アラート設定
    requiresNotification: v.boolean(),
    notificationSent: v.boolean(),
    notificationSentAt: v.optional(v.number()),

    // 解決状況
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolutionNote: v.optional(v.string()),

    // 監査フィールド
    createdAt: v.number(),
  })
    .index('by_type_severity', ['eventType', 'severity', 'createdAt'])
    .index('by_account', ['accountId', 'createdAt'])
    .index('by_unresolved', ['isResolved', 'severity', 'createdAt'])
    .index('by_notification', ['requiresNotification', 'notificationSent']),

  // ===========================================================================
  // apiTokens: Meta API認証トークンの安全な保存
  // ===========================================================================
  apiTokens: defineTable({
    // アカウント識別
    accountId: v.string(),
    accountName: v.optional(v.string()),

    // 暗号化されたトークン（AES-256）
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),

    // トークンメタデータ
    tokenType: v.string(), // 'bearer'
    expiresAt: v.number(),
    refreshExpiresAt: v.optional(v.number()),

    // スコープ情報
    grantedScopes: v.array(v.string()),
    requiredScopes: v.array(v.string()),

    // 使用統計
    lastUsedAt: v.optional(v.number()),
    usageCount: v.number(),

    // エラー追跡
    lastError: v.optional(v.string()),
    consecutiveFailures: v.number(),
    isActive: v.boolean(),

    // セキュリティ
    encryptionKeyVersion: v.number(),
    checksum: v.string(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account', ['accountId', 'isActive'])
    .index('by_expires', ['expiresAt', 'isActive']),

  // ===========================================================================
  // scheduledJobs: バックグラウンド処理ジョブの管理
  // ===========================================================================
  scheduledJobs: defineTable({
    // ジョブ識別
    jobName: v.string(),
    jobType: v.string(), // 'data_update', 'cleanup', 'health_check'

    // スケジュール設定
    cronExpression: v.string(),
    nextRunAt: v.number(),
    lastRunAt: v.optional(v.number()),

    // 実行状態
    status: v.union(
      v.literal('scheduled'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),

    // パラメータ
    parameters: v.optional(v.any()),

    // 実行結果
    lastExecutionDurationMs: v.optional(v.number()),
    lastResultSummary: v.optional(v.string()),
    lastError: v.optional(v.string()),

    // 統計
    totalExecutions: v.number(),
    successfulExecutions: v.number(),
    failedExecutions: v.number(),

    // 設定
    isEnabled: v.boolean(),
    maxExecutionTimeMs: v.number(), // デフォルト5分
    retryCount: v.number(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_next_run', ['nextRunAt', 'isEnabled', 'status'])
    .index('by_type_status', ['jobType', 'status', 'lastRunAt']),

  // ===========================================================================
  // fatigueScores: 疲労度スコア計算結果（オプション）
  // ===========================================================================
  fatigueScores: defineTable({
    // 識別子
    adId: v.string(),
    accountId: v.string(),
    dateKey: v.string(),

    // 総合スコア（0-100）
    totalScore: v.number(),
    status: v.union(v.literal('healthy'), v.literal('warning'), v.literal('critical')),

    // 個別スコア
    scores: v.object({
      creativeFatigue: v.number(), // クリエイティブ疲労
      audienceFatigue: v.number(), // 視聴者疲労
      algorithmFatigue: v.number(), // アルゴリズム疲労
    }),

    // ベースライン比較
    baseline: v.object({
      ctrBaseline: v.number(),
      cpmBaseline: v.number(),
      frequencyBaseline: v.number(),
    }),

    // 推奨アクション
    recommendations: v.array(v.string()),

    // 計算メタデータ
    calculatedAt: v.number(),
    calculatorVersion: v.string(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_ad_date', ['adId', 'dateKey'])
    .index('by_account_date', ['accountId', 'dateKey'])
    .index('by_status', ['status', 'totalScore'])
    .index('by_score', ['totalScore']),

  // ===========================================================================
  // aggregatedInsights: 集約データキャッシュ（オプション）
  // ===========================================================================
  aggregatedInsights: defineTable({
    // 集約レベル
    level: v.union(
      v.literal('account'),
      v.literal('campaign'),
      v.literal('adset'),
      v.literal('ad')
    ),
    levelId: v.string(),
    levelName: v.optional(v.string()),

    // 時間範囲
    dateKey: v.string(), // YYYY-MM-DD
    dateRange: v.string(), // 'last_30d', etc.

    // 集約メトリクス
    totalImpressions: v.number(),
    totalClicks: v.number(),
    totalSpend: v.number(),
    averageCtr: v.number(),
    averageCpm: v.number(),
    averageFrequency: v.number(),

    // 疲労度統計
    fatigueDistribution: v.object({
      healthyCount: v.number(),
      warningCount: v.number(),
      criticalCount: v.number(),
      averageScore: v.number(),
    }),

    // 日別内訳（オプション）
    dailyBreakdown: v.optional(
      v.array(
        v.object({
          date: v.string(),
          impressions: v.number(),
          clicks: v.number(),
          spend: v.number(),
          ctr: v.number(),
          cpm: v.number(),
        })
      )
    ),

    // プラットフォーム別内訳（オプション）
    platformBreakdown: v.optional(
      v.array(
        v.object({
          platform: v.union(
            v.literal('facebook'),
            v.literal('instagram'),
            v.literal('audience_network'),
            v.literal('messenger')
          ),
          impressions: v.number(),
          clicks: v.number(),
          spend: v.number(),
          ctr: v.number(),
          cpm: v.number(),
        })
      )
    ),

    // メタデータ
    sourceRecordCount: v.number(),
    lastAggregatedAt: v.number(),

    // 監査フィールド
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_level_id_date', ['level', 'levelId', 'dateKey'])
    .index('by_level_date', ['level', 'dateKey'])
    .index('by_date_range', ['dateRange', 'dateKey']),
})

// ===========================================================================
// 型エクスポート（TypeScriptサポート）
// ===========================================================================

// Convex自動生成型をインポートして使用
import type { Doc, Id } from './_generated/dataModel'

export type MetaInsight = Doc<'metaInsights'>
export type DataFreshness = Doc<'dataFreshness'>
export type CacheMetrics = Doc<'cacheMetrics'>
export type SystemEvent = Doc<'systemEvents'>
export type ApiToken = Doc<'apiTokens'>
export type ScheduledJob = Doc<'scheduledJobs'>
export type FatigueScore = Doc<'fatigueScores'>
export type AggregatedInsight = Doc<'aggregatedInsights'>

// ID型
export type MetaInsightId = Id<'metaInsights'>
export type DataFreshnessId = Id<'dataFreshness'>
export type CacheMetricsId = Id<'cacheMetrics'>
export type SystemEventId = Id<'systemEvents'>
export type ApiTokenId = Id<'apiTokens'>
export type ScheduledJobId = Id<'scheduledJobs'>
export type FatigueScoreId = Id<'fatigueScores'>
export type AggregatedInsightId = Id<'aggregatedInsights'>

// ===========================================================================
// バリデーション関数（オプション）
// ===========================================================================

/**
 * データ鮮度状態の妥当性チェック
 */
export function isValidDataFreshness(status: string): boolean {
  return ['realtime', 'neartime', 'stabilizing', 'finalized'].includes(status)
}

/**
 * イベント重要度の妥当性チェック
 */
export function isValidSeverity(severity: string): boolean {
  return ['info', 'warning', 'error', 'critical'].includes(severity)
}

/**
 * 疲労度ステータスの妥当性チェック
 */
export function isValidFatigueStatus(status: string): boolean {
  return ['healthy', 'warning', 'critical'].includes(status)
}

/**
 * スコア値の妥当性チェック（0-100）
 */
export function isValidScore(score: number): boolean {
  return score >= 0 && score <= 100
}

/**
 * 日付キーのフォーマット妥当性チェック（YYYY-MM-DD）
 */
export function isValidDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && !isNaN(Date.parse(dateKey))
}

/**
 * 時間キーの妥当性チェック（0-23）
 */
export function isValidHourKey(hourKey: number): boolean {
  return Number.isInteger(hourKey) && hourKey >= 0 && hourKey <= 23
}

// ===========================================================================
// インデックス最適化のためのクエリ例
// ===========================================================================

/*
// よく使用されるクエリパターンの例：

// 1. アカウント別の最新データ取得
ctx.db.query("metaInsights")
  .withIndex("by_account_date", q => 
    q.eq("accountId", accountId)
     .gte("dateKey", "2024-01-01")
  )
  .order("desc")
  .take(100)

// 2. 更新が必要なデータの検索
ctx.db.query("dataFreshness") 
  .withIndex("by_schedule", q =>
    q.lte("nextScheduledUpdate", Date.now())
  )
  .take(10)

// 3. エラーイベントの検索
ctx.db.query("systemEvents")
  .withIndex("by_type_severity", q =>
    q.eq("eventType", "api_error")
     .eq("severity", "critical")
  )
  .order("desc")
  .take(50)

// 4. キャッシュパフォーマンス統計
ctx.db.query("cacheMetrics")
  .withIndex("by_date", q =>
    q.gte("dateKey", "2024-01-01")
  )
  .collect()

*/
