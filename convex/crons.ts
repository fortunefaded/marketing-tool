/**
 * TASK-301: Convex Cron Jobs設定
 * 定期実行のスケジュール定義
 */

import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// ============================================================================
// 日次データ更新スケジュール
// ============================================================================

// 毎朝9時（JST）に昨日のデータを更新
crons.daily(
  'updateYesterdayData',
  {
    hourUTC: 0,  // UTC 0時 = JST 9時
    minuteUTC: 0,
  },
  internal.scheduledFunctions.updateYesterdayData
)

// 1時間ごとに当日データを更新（ビジネスアワー中）
crons.hourly(
  'updateTodayData', 
  {
    minuteUTC: 0, // 毎時0分
  },
  internal.scheduledFunctions.updateTodayData
)

// ============================================================================
// 既存の疲労度分析スケジュール
// ============================================================================

// 15分ごとに広告疲労度を分析
crons.interval(
  'analyzeAdFatigue',
  { minutes: 15 },
  internal.scheduledFunctions.analyzeAdFatigue
)

// ============================================================================
// メンテナンススケジュール  
// ============================================================================

// 毎日深夜に古いキャッシュをクリーンアップ
crons.daily(
  'cleanupOldCache',
  {
    hourUTC: 15,  // UTC 15時 = JST 0時（深夜）
    minuteUTC: 0,
  },
  internal.scheduledFunctions.cleanupOldCache
)

// 週次でデータ整合性チェック（日曜深夜）
crons.weekly(
  'dataIntegrityCheck',
  {
    dayOfWeek: 'sunday',
    hourUTC: 16,  // UTC 16時 = JST 1時
    minuteUTC: 0,
  },
  internal.scheduledFunctions.dataIntegrityCheck
)

export default crons