-- =============================================================================
-- Convexベースキャッシュシステム データベーススキーマ
-- 
-- 注意：ConvexはNoSQLデータベースのため、このSQLスキーマは概念的な設計です。
-- 実際のConvex実装ではschema.tsファイルでスキーマを定義します。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- テーブル 1: metaInsights
-- 広告インサイトデータの永続化キャッシュ
-- -----------------------------------------------------------------------------

CREATE TABLE meta_insights (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- 複合ユニークキー（アカウント + 広告 + 日付）
    account_id VARCHAR(100) NOT NULL,
    ad_id VARCHAR(100) NOT NULL,
    date_key VARCHAR(10) NOT NULL,  -- YYYY-MM-DD format
    
    -- キャッシュ識別子
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    
    -- Meta Graph APIから取得した実際のデータ（JSON）
    insight_data JSONB NOT NULL,
    
    -- データ鮮度管理
    data_freshness VARCHAR(20) NOT NULL CHECK (
        data_freshness IN ('realtime', 'neartime', 'stabilizing', 'finalized')
    ),
    
    -- 品質管理
    checksum VARCHAR(64) NOT NULL,  -- SHA-256 ハッシュ
    record_count INTEGER NOT NULL DEFAULT 1,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    
    -- 更新管理
    last_verified BIGINT NOT NULL,
    update_priority INTEGER NOT NULL DEFAULT 0,
    next_update_at BIGINT NULL,
    
    -- パフォーマンス統計
    fetch_duration_ms INTEGER NULL,
    api_calls_used INTEGER NOT NULL DEFAULT 1,
    
    -- エラー追跡
    last_error TEXT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 複合ユニークインデックス（重複防止）
CREATE UNIQUE INDEX idx_meta_insights_unique 
ON meta_insights (account_id, ad_id, date_key);

-- クエリパフォーマンス用インデックス
CREATE INDEX idx_meta_insights_account_date 
ON meta_insights (account_id, date_key);

CREATE INDEX idx_meta_insights_freshness 
ON meta_insights (data_freshness, last_verified);

CREATE INDEX idx_meta_insights_cache_key 
ON meta_insights (cache_key);

CREATE INDEX idx_meta_insights_update_priority 
ON meta_insights (update_priority DESC, next_update_at ASC);

-- -----------------------------------------------------------------------------
-- テーブル 2: dataFreshness  
-- データ鮮度と更新スケジュール管理
-- -----------------------------------------------------------------------------

CREATE TABLE data_freshness (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- 識別子
    account_id VARCHAR(100) NOT NULL,
    date_key VARCHAR(10) NOT NULL,  -- YYYY-MM-DD format
    
    -- 鮮度ステータス
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('realtime', 'neartime', 'stabilizing', 'finalized')
    ),
    
    -- API取得履歴
    last_api_fetch BIGINT NULL,
    api_fetch_count INTEGER NOT NULL DEFAULT 0,
    
    -- 更新チェック履歴
    last_update_check BIGINT NOT NULL,
    update_attempts INTEGER NOT NULL DEFAULT 0,
    
    -- スケジューリング
    next_scheduled_update BIGINT NULL,
    update_interval_minutes INTEGER NOT NULL,
    
    -- データ統計
    total_ads_count INTEGER NOT NULL DEFAULT 0,
    complete_ads_count INTEGER NOT NULL DEFAULT 0,
    
    -- エラー追跡
    last_error TEXT NULL,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_success BIGINT NULL,
    
    -- パフォーマンス
    avg_response_time_ms INTEGER NULL,
    total_api_calls INTEGER NOT NULL DEFAULT 0,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_data_freshness_unique 
ON data_freshness (account_id, date_key);

-- クエリパフォーマンス用インデックス
CREATE INDEX idx_data_freshness_account 
ON data_freshness (account_id);

CREATE INDEX idx_data_freshness_status 
ON data_freshness (status, next_scheduled_update);

CREATE INDEX idx_data_freshness_schedule 
ON data_freshness (next_scheduled_update ASC) 
WHERE next_scheduled_update IS NOT NULL;

-- -----------------------------------------------------------------------------
-- テーブル 3: cacheMetrics
-- システムパフォーマンス監視データ
-- -----------------------------------------------------------------------------

CREATE TABLE cache_metrics (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- 時間軸（時間単位の集約）
    date_key VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
    hour_key INTEGER NOT NULL CHECK (hour_key >= 0 AND hour_key <= 23),
    account_id VARCHAR(100) NULL,  -- NULL = システム全体の統計
    
    -- パフォーマンス指標
    cache_hit_count INTEGER NOT NULL DEFAULT 0,
    cache_miss_count INTEGER NOT NULL DEFAULT 0,
    cache_hit_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    
    -- API使用量
    api_call_count INTEGER NOT NULL DEFAULT 0,
    api_call_reduction_count INTEGER NOT NULL DEFAULT 0,
    api_call_reduction_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    
    -- 応答時間統計
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    p95_response_time_ms INTEGER NOT NULL DEFAULT 0,
    p99_response_time_ms INTEGER NOT NULL DEFAULT 0,
    max_response_time_ms INTEGER NOT NULL DEFAULT 0,
    
    -- エラー統計
    error_count INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    timeout_count INTEGER NOT NULL DEFAULT 0,
    rate_limit_count INTEGER NOT NULL DEFAULT 0,
    
    -- リソース使用量
    memory_usage_mb INTEGER NOT NULL DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    active_connections INTEGER NOT NULL DEFAULT 0,
    
    -- データ品質
    data_integrity_checks INTEGER NOT NULL DEFAULT 0,
    data_corruption_count INTEGER NOT NULL DEFAULT 0,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- ユニークインデックス（時間 + アカウント単位）
CREATE UNIQUE INDEX idx_cache_metrics_unique 
ON cache_metrics (date_key, hour_key, COALESCE(account_id, ''));

-- クエリパフォーマンス用インデックス
CREATE INDEX idx_cache_metrics_date 
ON cache_metrics (date_key DESC);

CREATE INDEX idx_cache_metrics_account_date 
ON cache_metrics (account_id, date_key DESC) 
WHERE account_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- テーブル 4: systemEvents
-- システムイベントとアラートログ
-- -----------------------------------------------------------------------------

CREATE TABLE system_events (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- イベント分類
    event_type VARCHAR(50) NOT NULL,  -- 'cache_miss', 'api_error', 'data_update', etc.
    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('info', 'warning', 'error', 'critical')
    ),
    
    -- イベント詳細
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- 関連データ
    account_id VARCHAR(100) NULL,
    ad_id VARCHAR(100) NULL,
    cache_key VARCHAR(255) NULL,
    
    -- エラー詳細（該当する場合）
    error_code VARCHAR(100) NULL,
    error_message TEXT NULL,
    stack_trace TEXT NULL,
    
    -- パフォーマンス詳細
    duration_ms INTEGER NULL,
    api_calls_used INTEGER NULL,
    memory_usage_mb INTEGER NULL,
    
    -- 追加メタデータ（JSON）
    metadata JSONB NULL,
    
    -- アラート設定
    requires_notification BOOLEAN NOT NULL DEFAULT false,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_sent_at BIGINT NULL,
    
    -- 解決状況
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at BIGINT NULL,
    resolution_note TEXT NULL,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL
);

-- クエリパフォーマンス用インデックス
CREATE INDEX idx_system_events_type_severity 
ON system_events (event_type, severity, created_at DESC);

CREATE INDEX idx_system_events_account 
ON system_events (account_id, created_at DESC) 
WHERE account_id IS NOT NULL;

CREATE INDEX idx_system_events_unresolved 
ON system_events (is_resolved, severity, created_at DESC) 
WHERE is_resolved = false;

CREATE INDEX idx_system_events_notification 
ON system_events (requires_notification, notification_sent) 
WHERE requires_notification = true AND notification_sent = false;

-- -----------------------------------------------------------------------------
-- テーブル 5: apiTokens
-- Meta API認証トークンの安全な保存
-- -----------------------------------------------------------------------------

CREATE TABLE api_tokens (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- アカウント識別
    account_id VARCHAR(100) NOT NULL UNIQUE,
    account_name VARCHAR(255) NULL,
    
    -- 暗号化されたトークン（AES-256）
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NULL,
    
    -- トークンメタデータ
    token_type VARCHAR(50) NOT NULL DEFAULT 'bearer',
    expires_at BIGINT NOT NULL,
    refresh_expires_at BIGINT NULL,
    
    -- スコープ情報
    granted_scopes TEXT[] NOT NULL,
    required_scopes TEXT[] NOT NULL,
    
    -- 使用統計
    last_used_at BIGINT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- エラー追跡
    last_error TEXT NULL,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- セキュリティ
    encryption_key_version INTEGER NOT NULL DEFAULT 1,
    checksum VARCHAR(64) NOT NULL,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- セキュリティ用インデックス
CREATE INDEX idx_api_tokens_account 
ON api_tokens (account_id) 
WHERE is_active = true;

CREATE INDEX idx_api_tokens_expires 
ON api_tokens (expires_at ASC) 
WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- テーブル 6: scheduledJobs
-- バックグラウンド処理ジョブの管理
-- -----------------------------------------------------------------------------

CREATE TABLE scheduled_jobs (
    -- Convex内部フィールド
    _id VARCHAR(255) PRIMARY KEY,
    _creation_time BIGINT NOT NULL,
    
    -- ジョブ識別
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,  -- 'data_update', 'cleanup', 'health_check'
    
    -- スケジュール設定
    cron_expression VARCHAR(100) NOT NULL,
    next_run_at BIGINT NOT NULL,
    last_run_at BIGINT NULL,
    
    -- 実行状態
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')
    ),
    
    -- パラメータ（JSON）
    parameters JSONB NULL,
    
    -- 実行結果
    last_execution_duration_ms INTEGER NULL,
    last_result_summary TEXT NULL,
    last_error TEXT NULL,
    
    -- 統計
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    
    -- 設定
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_execution_time_ms INTEGER NOT NULL DEFAULT 300000,  -- 5分
    retry_count INTEGER NOT NULL DEFAULT 3,
    
    -- 監査フィールド
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- スケジューリング用インデックス
CREATE INDEX idx_scheduled_jobs_next_run 
ON scheduled_jobs (next_run_at ASC) 
WHERE is_enabled = true AND status = 'scheduled';

CREATE INDEX idx_scheduled_jobs_type_status 
ON scheduled_jobs (job_type, status, last_run_at DESC);

-- -----------------------------------------------------------------------------
-- ビュー: システム全体の健康状態
-- -----------------------------------------------------------------------------

CREATE VIEW system_health_summary AS
SELECT 
    -- 現在時刻
    EXTRACT(EPOCH FROM NOW()) * 1000 AS current_timestamp,
    
    -- キャッシュパフォーマンス（直近1時間）
    (SELECT AVG(cache_hit_rate) 
     FROM cache_metrics 
     WHERE _creation_time > (EXTRACT(EPOCH FROM NOW()) - 3600) * 1000
    ) AS avg_cache_hit_rate,
    
    -- API使用量削減率（直近1時間）
    (SELECT AVG(api_call_reduction_rate) 
     FROM cache_metrics 
     WHERE _creation_time > (EXTRACT(EPOCH FROM NOW()) - 3600) * 1000
    ) AS avg_api_reduction_rate,
    
    -- 平均応答時間（直近1時間）
    (SELECT AVG(avg_response_time_ms) 
     FROM cache_metrics 
     WHERE _creation_time > (EXTRACT(EPOCH FROM NOW()) - 3600) * 1000
    ) AS avg_response_time_ms,
    
    -- アクティブなエラー数
    (SELECT COUNT(*) 
     FROM system_events 
     WHERE severity IN ('error', 'critical') 
     AND is_resolved = false
    ) AS active_error_count,
    
    -- データ鮮度分布
    (SELECT COUNT(*) FROM data_freshness WHERE status = 'realtime') AS realtime_count,
    (SELECT COUNT(*) FROM data_freshness WHERE status = 'neartime') AS neartime_count,
    (SELECT COUNT(*) FROM data_freshness WHERE status = 'stabilizing') AS stabilizing_count,
    (SELECT COUNT(*) FROM data_freshness WHERE status = 'finalized') AS finalized_count,
    
    -- システム全体の統計
    (SELECT COUNT(*) FROM meta_insights) AS total_cache_entries,
    (SELECT COUNT(DISTINCT account_id) FROM meta_insights) AS active_accounts,
    (SELECT COUNT(*) FROM api_tokens WHERE is_active = true) AS active_tokens;

-- -----------------------------------------------------------------------------
-- ビュー: アカウント別パフォーマンス
-- -----------------------------------------------------------------------------

CREATE VIEW account_performance_summary AS
SELECT 
    account_id,
    
    -- キャッシュ統計
    COUNT(*) AS total_cache_entries,
    AVG(CASE WHEN data_freshness = 'realtime' THEN 1 ELSE 0 END) AS realtime_ratio,
    
    -- 最新更新情報
    MAX(updated_at) AS last_updated,
    MIN(last_verified) AS oldest_verification,
    
    -- エラー統計
    SUM(error_count) AS total_errors,
    AVG(error_count) AS avg_error_rate,
    
    -- パフォーマンス統計
    AVG(fetch_duration_ms) AS avg_fetch_duration,
    SUM(api_calls_used) AS total_api_calls,
    
    -- データ品質
    AVG(CASE WHEN is_complete THEN 1 ELSE 0 END) AS completion_rate,
    COUNT(DISTINCT date_key) AS covered_date_range

FROM meta_insights 
GROUP BY account_id;

-- =============================================================================
-- インデックス最適化とメンテナンス
-- =============================================================================

-- 定期的なクリーンアップ用関数（概念的 - Convexでは別途実装）
-- 
-- 1. 古いメトリクスデータの削除（90日以上前）
-- 2. 解決済みシステムイベントの アーカイブ（30日以上前）
-- 3. 期限切れAPIトークンの削除
-- 4. 統計データの再計算とインデックス最適化

-- =============================================================================
-- 制約とトリガー（概念的設計）
-- =============================================================================

-- 制約事項:
-- 1. meta_insights.data_freshness の状態遷移ルール
-- 2. cache_metrics の集計データ整合性チェック
-- 3. api_tokens の暗号化検証
-- 4. system_events の重複防止ロジック

-- データ整合性保証:
-- 1. 外部キー制約（アカウントID の妥当性）
-- 2. チェック制約（数値範囲、列挙値）
-- 3. 一意制約（重複データ防止）
-- 4. NOT NULL 制約（必須フィールド）