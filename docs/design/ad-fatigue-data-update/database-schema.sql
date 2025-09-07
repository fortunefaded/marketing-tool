-- ============================================================================
-- 広告疲労度データ更新機能 データベーススキーマ設計
-- Database: Convex (Document Store) 
-- Purpose: キャッシュ、状態管理、メタデータ保存
-- ============================================================================

-- Note: Convexはドキュメントストアのため、このSQLはスキーマ設計の参考資料として記載
-- 実際の実装ではConvexのスキーマ定義ファイル（convex/schema.ts）で定義される

-- ============================================================================
-- Meta Account Management - Meta アカウント管理
-- ============================================================================

-- Meta広告アカウント情報
CREATE TABLE meta_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(50) UNIQUE NOT NULL,           -- Meta Ad Account ID (act_xxxxx)
    name VARCHAR(255) NOT NULL,                       -- アカウント名
    currency CHAR(3) NOT NULL DEFAULT 'JPY',          -- 通貨コード
    status VARCHAR(20) NOT NULL DEFAULT 'active',     -- active, inactive, suspended
    
    -- Access Control
    access_token_hash VARCHAR(255),                   -- 暗号化されたアクセストークン
    token_expires_at TIMESTAMP,                       -- トークン有効期限
    permissions JSON,                                 -- アクセス権限情報
    
    -- Metadata
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',        -- タイムゾーン
    business_id VARCHAR(50),                          -- Meta Business ID
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,                                  -- ユーザーID
    
    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT chk_currency CHECK (LENGTH(currency) = 3)
);

-- インデックス
CREATE INDEX idx_meta_accounts_account_id ON meta_accounts(account_id);
CREATE INDEX idx_meta_accounts_status ON meta_accounts(status);
CREATE INDEX idx_meta_accounts_created_by ON meta_accounts(created_by);

-- ============================================================================
-- Cache Management - キャッシュ管理
-- ============================================================================

-- Meta API レスポンスキャッシュ
CREATE TABLE meta_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache Key Information
    account_id VARCHAR(50) NOT NULL,                  -- Meta Ad Account ID
    cache_key VARCHAR(255) NOT NULL,                  -- キャッシュキー (ハッシュ)
    data_type VARCHAR(50) NOT NULL,                   -- insights, campaigns, ads
    
    -- Cache Data
    raw_data JSONB NOT NULL,                          -- Meta APIの生レスポンス
    processed_data JSONB,                             -- 処理済みデータ
    data_checksum VARCHAR(64),                        -- データ整合性チェック用
    
    -- Cache Metadata  
    request_params JSONB,                             -- リクエストパラメータ
    data_source VARCHAR(20) DEFAULT 'api',           -- api, fallback
    version VARCHAR(20) DEFAULT '1.0',               -- スキーマバージョン
    
    -- Cache Control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,                    -- キャッシュ有効期限
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1,                  -- アクセス回数
    
    -- Data Validation
    is_valid BOOLEAN DEFAULT true,                    -- データ有効性フラグ
    validation_errors JSON,                          -- バリデーションエラー
    
    -- Foreign Keys
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE
);

-- インデックス
CREATE UNIQUE INDEX idx_cache_key_unique ON meta_insights_cache(cache_key);
CREATE INDEX idx_cache_account_type ON meta_insights_cache(account_id, data_type);
CREATE INDEX idx_cache_expires_at ON meta_insights_cache(expires_at);
CREATE INDEX idx_cache_last_accessed ON meta_insights_cache(last_accessed);
CREATE INDEX idx_cache_valid ON meta_insights_cache(is_valid);

-- 期限切れキャッシュ自動削除用パーティション (PostgreSQL例)
-- CREATE TABLE meta_insights_cache_expired PARTITION OF meta_insights_cache 
-- FOR VALUES FROM (CURRENT_TIMESTAMP - INTERVAL '30 days') TO (MAXVALUE);

-- ============================================================================
-- Fatigue Analysis Results - 疲労度分析結果
-- ============================================================================

-- 疲労度分析結果保存
CREATE TABLE fatigue_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Information
    account_id VARCHAR(50) NOT NULL,
    ad_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50),
    adset_id VARCHAR(50),
    
    -- Analysis Results
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    creative_score INTEGER NOT NULL CHECK (creative_score >= 0 AND creative_score <= 100),
    audience_score INTEGER NOT NULL CHECK (audience_score >= 0 AND audience_score <= 100),
    algorithm_score INTEGER NOT NULL CHECK (algorithm_score >= 0 AND algorithm_score <= 100),
    
    -- Status & Classification
    fatigue_status VARCHAR(20) NOT NULL,             -- healthy, warning, critical
    primary_issue VARCHAR(20),                       -- creative, audience, algorithm
    
    -- Raw Metrics
    metrics JSONB NOT NULL,                          -- FatigueMetricsの詳細データ
    baseline_metrics JSONB,                          -- ベースライン比較用データ
    
    -- Recommendations
    recommendations JSON,                             -- 推奨アクション配列
    alerts JSON,                                     -- アラート情報配列
    
    -- Analysis Metadata
    calculation_version VARCHAR(20) DEFAULT '1.0',   -- 計算アルゴリズムバージョン
    data_period_start DATE NOT NULL,                 -- 分析対象期間開始
    data_period_end DATE NOT NULL,                   -- 分析対象期間終了
    
    -- System Fields
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(20) DEFAULT 'api',          -- api, cache
    confidence_score DECIMAL(3,2),                   -- 分析結果信頼度 (0.00-1.00)
    
    -- Foreign Keys
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_fatigue_status CHECK (fatigue_status IN ('healthy', 'warning', 'critical')),
    CONSTRAINT chk_primary_issue CHECK (primary_issue IN ('creative', 'audience', 'algorithm')),
    CONSTRAINT chk_data_period CHECK (data_period_start <= data_period_end)
);

-- インデックス
CREATE INDEX idx_fatigue_account_ad ON fatigue_analysis(account_id, ad_id);
CREATE INDEX idx_fatigue_status ON fatigue_analysis(fatigue_status);
CREATE INDEX idx_fatigue_calculated_at ON fatigue_analysis(calculated_at DESC);
CREATE INDEX idx_fatigue_total_score ON fatigue_analysis(total_score);
CREATE INDEX idx_fatigue_primary_issue ON fatigue_analysis(primary_issue);

-- 複合インデックス (最新分析結果取得用)
CREATE UNIQUE INDEX idx_fatigue_latest ON fatigue_analysis(account_id, ad_id, calculated_at DESC);

-- ============================================================================
-- Update State Management - 更新状態管理
-- ============================================================================

-- データ更新状態トラッキング
CREATE TABLE update_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session Information
    account_id VARCHAR(50) NOT NULL,
    session_key VARCHAR(255) UNIQUE NOT NULL,        -- セッション識別キー
    update_type VARCHAR(50) NOT NULL,                -- manual, scheduled, auto
    
    -- Update State
    status VARCHAR(20) NOT NULL DEFAULT 'running',   -- running, completed, failed, cancelled
    current_phase VARCHAR(50),                       -- fetching, processing, calculating, caching
    progress_percentage INTEGER DEFAULT 0,           -- 0-100
    progress_message TEXT,                           -- 進行状況メッセージ
    
    -- Update Options
    options JSONB,                                   -- UpdateOptionsの設定
    force_refresh BOOLEAN DEFAULT false,
    include_historical BOOLEAN DEFAULT false,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Results & Metrics
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,                             -- エラー詳細配列
    
    -- Performance Metrics
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,                             -- 実行時間 (ミリ秒)
    api_calls_made INTEGER DEFAULT 0,               -- API呼び出し回数
    
    -- Concurrency Control
    locked_by VARCHAR(255),                          -- ロック保持者識別子
    lock_acquired_at TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_update_status CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT chk_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- インデックス
CREATE INDEX idx_update_account_status ON update_sessions(account_id, status);
CREATE INDEX idx_update_started_at ON update_sessions(started_at DESC);
CREATE INDEX idx_update_session_key ON update_sessions(session_key);
CREATE INDEX idx_update_locked_by ON update_sessions(locked_by) WHERE locked_by IS NOT NULL;

-- 実行中セッション用インデックス
CREATE INDEX idx_update_running ON update_sessions(account_id, status) 
WHERE status = 'running';

-- ============================================================================
-- Rate Limiting - レート制限管理  
-- ============================================================================

-- API レート制限トラッキング
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rate Limit Target
    account_id VARCHAR(50) NOT NULL,
    api_type VARCHAR(50) NOT NULL DEFAULT 'meta_graph', -- meta_graph, instagram_graph
    
    -- Rate Limit Status  
    limit_per_hour INTEGER NOT NULL DEFAULT 200,       -- 1時間あたりの制限
    used_requests INTEGER NOT NULL DEFAULT 0,          -- 使用済みリクエスト数
    remaining_requests INTEGER NOT NULL DEFAULT 200,   -- 残りリクエスト数
    
    -- Window Management
    window_start TIMESTAMP NOT NULL,                   -- レート制限ウィンドウ開始時刻
    window_end TIMESTAMP NOT NULL,                     -- レート制限ウィンドウ終了時刻
    next_reset TIMESTAMP NOT NULL,                     -- 次回リセット時刻
    
    -- Usage Tracking
    requests_log JSONB,                                -- リクエスト履歴 (時刻配列)
    last_request_at TIMESTAMP,                         -- 最後のリクエスト時刻
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_requests_valid CHECK (used_requests >= 0 AND remaining_requests >= 0),
    CONSTRAINT chk_window_valid CHECK (window_start < window_end)
);

-- インデックス
CREATE UNIQUE INDEX idx_rate_limit_account_api ON rate_limits(account_id, api_type);
CREATE INDEX idx_rate_limit_next_reset ON rate_limits(next_reset);
CREATE INDEX idx_rate_limit_updated_at ON rate_limits(updated_at);

-- ============================================================================
-- System Configuration - システム設定
-- ============================================================================

-- システム設定管理
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration Identity
    config_key VARCHAR(255) UNIQUE NOT NULL,         -- 設定キー
    config_category VARCHAR(100) NOT NULL,           -- fatigue, cache, api, ui
    
    -- Configuration Data
    config_value JSONB NOT NULL,                     -- 設定値
    config_schema JSONB,                             -- 設定スキーマ (バリデーション用)
    default_value JSONB,                             -- デフォルト値
    
    -- Metadata
    description TEXT,                                -- 設定説明
    config_version VARCHAR(20) DEFAULT '1.0',       -- 設定バージョン
    environment VARCHAR(50) DEFAULT 'production',   -- 環境 (dev, staging, prod)
    
    -- Access Control
    access_level VARCHAR(20) DEFAULT 'admin',       -- admin, user, system
    editable BOOLEAN DEFAULT true,                  -- 編集可能フラグ
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,                                 -- 更新者ID
    
    -- Constraints
    CONSTRAINT chk_config_access_level CHECK (access_level IN ('admin', 'user', 'system')),
    CONSTRAINT chk_config_environment CHECK (environment IN ('development', 'staging', 'production'))
);

-- インデックス
CREATE INDEX idx_config_category ON system_config(config_category);
CREATE INDEX idx_config_environment ON system_config(environment);
CREATE INDEX idx_config_access_level ON system_config(access_level);

-- ============================================================================
-- Audit & Logging - 監査・ログ
-- ============================================================================

-- システム動作ログ
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL,               -- update_start, update_complete, error, etc.
    event_category VARCHAR(50) NOT NULL,            -- system, user, api, cache
    severity VARCHAR(20) NOT NULL DEFAULT 'info',  -- debug, info, warn, error, critical
    
    -- Target Information
    account_id VARCHAR(50),
    user_id UUID,
    session_id UUID,
    
    -- Event Details
    event_data JSONB,                               -- イベント詳細データ
    message TEXT,                                   -- ログメッセージ
    
    -- Request Information
    request_id VARCHAR(255),                        -- リクエスト識別子
    ip_address INET,                               -- IPアドレス
    user_agent TEXT,                               -- ユーザーエージェント
    
    -- System Information
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,                            -- 処理時間
    error_code VARCHAR(100),                       -- エラーコード
    stack_trace TEXT,                              -- スタックトレース
    
    -- Performance Metrics
    memory_usage_mb INTEGER,                       -- メモリ使用量
    cpu_usage_percent DECIMAL(5,2),               -- CPU使用率
    
    -- Constraints
    CONSTRAINT chk_severity CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical'))
);

-- インデックス
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_severity ON audit_logs(severity);
CREATE INDEX idx_audit_account_id ON audit_logs(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_audit_error_code ON audit_logs(error_code) WHERE error_code IS NOT NULL;

-- パーティション (時系列データ用)
-- CREATE TABLE audit_logs_current PARTITION OF audit_logs 
-- FOR VALUES FROM (CURRENT_DATE) TO (CURRENT_DATE + INTERVAL '1 month');

-- ============================================================================
-- Data Retention & Cleanup - データ保持・クリーンアップ
-- ============================================================================

-- データ保持ポリシー設定
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    retention_days INTEGER NOT NULL,
    cleanup_enabled BOOLEAN DEFAULT true,
    last_cleanup TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 基本的な保持ポリシー設定
INSERT INTO retention_policies (table_name, retention_days) VALUES 
('meta_insights_cache', 30),
('fatigue_analysis', 180), 
('update_sessions', 90),
('audit_logs', 365);

-- ============================================================================
-- Functions & Procedures - 関数・プロシージャ
-- ============================================================================

-- キャッシュクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM meta_insights_cache 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (is_valid = false AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO audit_logs (event_type, event_category, message, event_data)
    VALUES ('cache_cleanup', 'system', 'Expired cache cleanup completed', 
            json_build_object('deleted_count', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 疲労度スコア更新トリガー関数
CREATE OR REPLACE FUNCTION update_fatigue_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 統計更新やアラート生成のロジックをここに実装
    -- Convexの場合は対応するaction/mutationで実装
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views - ビュー  
-- ============================================================================

-- 最新の疲労度分析結果ビュー
CREATE VIEW latest_fatigue_analysis AS
SELECT DISTINCT ON (account_id, ad_id) *
FROM fatigue_analysis
ORDER BY account_id, ad_id, calculated_at DESC;

-- アクティブな更新セッションビュー
CREATE VIEW active_update_sessions AS
SELECT *
FROM update_sessions
WHERE status = 'running'
  AND started_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';

-- レート制限状況ビュー
CREATE VIEW rate_limit_status AS
SELECT 
    account_id,
    api_type,
    remaining_requests,
    CASE 
        WHEN remaining_requests = 0 THEN 'blocked'
        WHEN remaining_requests < 10 THEN 'warning'
        ELSE 'ok'
    END as status,
    next_reset
FROM rate_limits
WHERE window_end > CURRENT_TIMESTAMP;

-- ============================================================================
-- Indexes for Performance - パフォーマンス用インデックス
-- ============================================================================

-- 複合インデックス (よく使用されるクエリ用)
CREATE INDEX idx_cache_account_valid_expires ON meta_insights_cache(account_id, is_valid, expires_at);
CREATE INDEX idx_fatigue_account_status_date ON fatigue_analysis(account_id, fatigue_status, calculated_at DESC);
CREATE INDEX idx_updates_account_running ON update_sessions(account_id) WHERE status = 'running';

-- ============================================================================
-- Example Data - サンプルデータ
-- ============================================================================

-- サンプルMeta アカウント
INSERT INTO meta_accounts (account_id, name, currency, status) VALUES
('act_123456789', 'Company A広告アカウント', 'JPY', 'active'),
('act_987654321', 'Company B広告アカウント', 'JPY', 'active');

-- サンプル疲労度設定
INSERT INTO system_config (config_key, config_category, config_value, description) VALUES
('fatigue_thresholds', 'fatigue', 
 '{"creative": {"ctrDeclineWarning": 25, "ctrDeclineCritical": 50}, "audience": {"frequencyWarning": 3.5, "frequencyCritical": 5.0}, "algorithm": {"cpmIncreaseWarning": 20, "cpmIncreaseCritical": 40}}',
 '広告疲労度判定しきい値'),
('cache_ttl_minutes', 'cache', '{"insights": 30, "campaigns": 60, "accounts": 120}', 'キャッシュTTL設定'),
('rate_limits', 'api', '{"meta_graph": 200, "instagram_graph": 200}', 'API レート制限設定');

-- ============================================================================
-- Security & Constraints - セキュリティ・制約
-- ============================================================================

-- Row Level Security (RLS) の有効化例
-- ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fatigue_analysis ENABLE ROW LEVEL SECURITY;

-- セキュリティポリシー例 (実際のConvexでは認証ルールで実装)
-- CREATE POLICY account_isolation ON meta_accounts 
-- FOR ALL USING (created_by = current_user_id());

-- ============================================================================
-- Maintenance - メンテナンス
-- ============================================================================

-- 定期メンテナンスタスク (cron jobやConvex scheduledで実装)
-- 1. 期限切れキャッシュの削除 (1時間毎)
-- 2. 古い監査ログの削除 (日次)  
-- 3. 統計情報の更新 (日次)
-- 4. インデックス再構築 (週次)