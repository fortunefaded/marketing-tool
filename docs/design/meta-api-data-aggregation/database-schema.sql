-- ============================================================================
-- Meta API データ集約システム データベーススキーマ
-- Database: Convex
-- Version: 1.0.0
-- Date: 2025-08-27
-- ============================================================================

-- Note: ConvexはNoSQLデータベースですが、理解しやすさのため
-- SQL風の表記でスキーマ設計を記述しています。
-- 実際の実装はConvexのスキーマ定義に従います。

-- ============================================================================
-- 1. 生データテーブル（Meta APIから取得した生データ）
-- ============================================================================

-- Table: meta_insights_raw
-- Description: Meta APIから取得した生のインサイトデータ
-- Size Estimate: ~90,000 records per fetch (1000 ads × 30 days × 3 platforms)
CREATE TABLE meta_insights_raw (
    -- Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ad Identifiers
    ad_id TEXT NOT NULL,
    ad_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    account_id TEXT NOT NULL,
    
    -- Time Range
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    
    -- Platform Breakdown
    publisher_platform TEXT, -- 'facebook', 'instagram', 'audience_network', 'other'
    
    -- Basic Metrics (stored as TEXT from API)
    impressions TEXT,
    clicks TEXT,
    spend TEXT,
    reach TEXT,
    frequency TEXT,
    unique_clicks TEXT,
    unique_ctr TEXT,
    ctr TEXT,
    cpm TEXT,
    cpc TEXT,
    
    -- Conversion Metrics
    conversions TEXT,
    conversion_values TEXT,
    first_conversions TEXT, -- F-CV
    
    -- Creative Info
    creative_id TEXT,
    creative_name TEXT,
    creative_type TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    image_url TEXT,
    object_type TEXT,
    
    -- Metadata
    fetch_timestamp TIMESTAMP NOT NULL,
    api_version TEXT DEFAULT 'v23.0',
    
    -- Indexes
    INDEX idx_ad_date (ad_id, date_start),
    INDEX idx_campaign (campaign_id),
    INDEX idx_adset (adset_id),
    INDEX idx_account_date (account_id, date_start),
    INDEX idx_fetch_time (fetch_timestamp)
);

-- ============================================================================
-- 2. 集約データテーブル（処理済みの構造化データ）
-- ============================================================================

-- Table: ad_performance_aggregated
-- Description: 広告単位で集約されたパフォーマンスデータ
-- Size Estimate: ~1,000 records (1 per ad)
CREATE TABLE ad_performance_aggregated (
    -- Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ad Identifiers (denormalized for query performance)
    ad_id TEXT NOT NULL UNIQUE,
    ad_name TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    adset_id TEXT NOT NULL,
    adset_name TEXT NOT NULL,
    account_id TEXT NOT NULL,
    
    -- Creative Information (embedded document)
    creative JSONB, -- {id, name, type, thumbnail_url, video_url, image_url, object_type}
    
    -- Summary Metrics (calculated aggregates)
    summary JSONB NOT NULL, -- {
                            --   dateRange: {start, end},
                            --   metrics: {impressions, clicks, spend, reach, frequency, ctr, cpc, cpm, conversions, cpa, roas, first_conversions},
                            --   platformBreakdown: {facebook: {...}, instagram: {...}, audience_network: {...}}
                            -- }
    
    -- Processing Metadata
    last_updated TIMESTAMP NOT NULL,
    data_quality TEXT CHECK (data_quality IN ('complete', 'partial', 'estimated')),
    processing_warnings TEXT[], -- Array of warning messages
    
    -- Cache Control
    cache_key TEXT NOT NULL,
    cache_ttl INTEGER DEFAULT 3600, -- seconds
    
    -- Indexes
    INDEX idx_ad_id (ad_id),
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_adset_id (adset_id),
    INDEX idx_account_id (account_id),
    INDEX idx_last_updated (last_updated),
    INDEX idx_cache_key (cache_key)
);

-- ============================================================================
-- 3. 日別詳細テーブル（時系列データ）
-- ============================================================================

-- Table: daily_performance_metrics
-- Description: 日別のパフォーマンスメトリクス
-- Size Estimate: ~30,000 records (1000 ads × 30 days)
CREATE TABLE daily_performance_metrics (
    -- Composite Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Reference
    ad_id TEXT NOT NULL,
    aggregated_id TEXT REFERENCES ad_performance_aggregated(_id),
    
    -- Date
    date DATE NOT NULL,
    
    -- Daily Metrics
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    spend DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reach INTEGER NOT NULL DEFAULT 0,
    frequency DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    unique_clicks INTEGER DEFAULT 0,
    
    -- Calculated Metrics
    ctr DECIMAL(5, 2),
    cpc DECIMAL(10, 2),
    cpm DECIMAL(10, 2),
    unique_ctr DECIMAL(5, 2),
    
    -- Conversion Metrics
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(10, 2) DEFAULT 0.00,
    cpa DECIMAL(10, 2),
    roas DECIMAL(5, 2),
    first_conversions INTEGER DEFAULT 0,
    
    -- Platform Breakdown (optional)
    platform_breakdown JSONB, -- {facebook: {...}, instagram: {...}, audience_network: {...}}
    
    -- Unique Constraint
    UNIQUE (ad_id, date),
    
    -- Indexes
    INDEX idx_ad_date (ad_id, date),
    INDEX idx_date (date),
    INDEX idx_aggregated (aggregated_id)
);

-- ============================================================================
-- 4. 疲労度分析テーブル
-- ============================================================================

-- Table: fatigue_timeline
-- Description: 広告疲労度の時系列データ
-- Size Estimate: ~30,000 records (1000 ads × 30 days)
CREATE TABLE fatigue_timeline (
    -- Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Reference
    ad_id TEXT NOT NULL,
    
    -- Date
    date DATE NOT NULL,
    
    -- Fatigue Scores
    fatigue_score INTEGER CHECK (fatigue_score BETWEEN 0 AND 100),
    fatigue_status TEXT CHECK (fatigue_status IN ('healthy', 'caution', 'warning', 'critical')),
    
    -- Fatigue Indicators (trend percentages)
    ctr_trend DECIMAL(5, 2),        -- CTR change rate (-100 to +100)
    frequency_trend DECIMAL(5, 2),   -- Frequency change rate
    cpm_trend DECIMAL(5, 2),         -- CPM change rate
    engagement_trend DECIMAL(5, 2),  -- Engagement change rate (optional)
    
    -- Fatigue Factors (0-100 scores)
    creative_fatigue INTEGER CHECK (creative_fatigue BETWEEN 0 AND 100),
    audience_fatigue INTEGER CHECK (audience_fatigue BETWEEN 0 AND 100),
    algorithm_fatigue INTEGER CHECK (algorithm_fatigue BETWEEN 0 AND 100),
    
    -- Analysis Results
    baseline_ctr DECIMAL(5, 2),      -- 7-day moving average baseline
    baseline_cpm DECIMAL(10, 2),     -- 7-day moving average baseline
    anomaly_detected BOOLEAN DEFAULT FALSE,
    recommendation TEXT,              -- Action recommendation
    
    -- Prediction (optional)
    predicted_score INTEGER,          -- Next day prediction
    prediction_confidence DECIMAL(3, 2), -- 0.00 to 1.00
    
    -- Unique Constraint
    UNIQUE (ad_id, date),
    
    -- Indexes
    INDEX idx_ad_date (ad_id, date),
    INDEX idx_date (date),
    INDEX idx_status (fatigue_status),
    INDEX idx_score (fatigue_score)
);

-- ============================================================================
-- 5. キャッシュ管理テーブル
-- ============================================================================

-- Table: cache_metadata
-- Description: キャッシュ管理用メタデータ
CREATE TABLE cache_metadata (
    -- Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cache Key
    cache_key TEXT NOT NULL UNIQUE,
    
    -- Cache Info
    data_type TEXT NOT NULL, -- 'insights', 'aggregated', 'fatigue'
    account_id TEXT,
    date_range TEXT,          -- '7d', '14d', '30d', 'custom'
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP,
    
    -- Statistics
    hit_count INTEGER DEFAULT 0,
    byte_size INTEGER,
    
    -- Data Version
    schema_version TEXT DEFAULT '1.0.0',
    api_version TEXT DEFAULT 'v23.0',
    
    -- Indexes
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at),
    INDEX idx_account (account_id)
);

-- ============================================================================
-- 6. 処理ログテーブル
-- ============================================================================

-- Table: aggregation_log
-- Description: データ集約処理のログ
CREATE TABLE aggregation_log (
    -- Primary Key
    _id TEXT PRIMARY KEY,
    _creationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Process Info
    process_id TEXT NOT NULL,
    process_type TEXT NOT NULL, -- 'fetch', 'aggregate', 'calculate_fatigue'
    account_id TEXT NOT NULL,
    
    -- Timing
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    
    -- Results
    status TEXT CHECK (status IN ('running', 'success', 'partial', 'failed')),
    rows_processed INTEGER,
    ads_processed INTEGER,
    errors_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    
    -- Error Details
    error_messages JSONB,    -- Array of {adId, field, message, severity}
    
    -- Performance Metrics
    memory_used_mb INTEGER,
    cpu_time_ms INTEGER,
    
    -- Indexes
    INDEX idx_process_id (process_id),
    INDEX idx_account (account_id),
    INDEX idx_started (started_at),
    INDEX idx_status (status)
);

-- ============================================================================
-- 7. ビュー定義（仮想テーブル）
-- ============================================================================

-- View: v_current_performance
-- Description: 最新のパフォーマンスサマリー
CREATE VIEW v_current_performance AS
SELECT 
    a.ad_id,
    a.ad_name,
    a.campaign_name,
    a.adset_name,
    a.summary->>'$.metrics.impressions' as total_impressions,
    a.summary->>'$.metrics.clicks' as total_clicks,
    a.summary->>'$.metrics.spend' as total_spend,
    a.summary->>'$.metrics.ctr' as avg_ctr,
    a.summary->>'$.metrics.conversions' as total_conversions,
    a.summary->>'$.metrics.roas' as roas,
    f.fatigue_score,
    f.fatigue_status,
    a.last_updated
FROM ad_performance_aggregated a
LEFT JOIN (
    SELECT DISTINCT ON (ad_id) 
        ad_id, 
        fatigue_score, 
        fatigue_status
    FROM fatigue_timeline
    ORDER BY ad_id, date DESC
) f ON a.ad_id = f.ad_id
WHERE a.data_quality != 'estimated';

-- View: v_fatigue_alerts
-- Description: 疲労度アラートが必要な広告
CREATE VIEW v_fatigue_alerts AS
SELECT 
    f.ad_id,
    a.ad_name,
    a.campaign_name,
    f.fatigue_score,
    f.fatigue_status,
    f.recommendation,
    f.date as alert_date,
    a.summary->>'$.metrics.spend' as daily_spend
FROM fatigue_timeline f
JOIN ad_performance_aggregated a ON f.ad_id = a.ad_id
WHERE f.fatigue_status IN ('warning', 'critical')
  AND f.date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY f.fatigue_score DESC;

-- ============================================================================
-- 8. インデックス最適化
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX idx_insights_account_date_platform 
    ON meta_insights_raw(account_id, date_start, publisher_platform);

CREATE INDEX idx_performance_campaign_updated 
    ON ad_performance_aggregated(campaign_id, last_updated DESC);

CREATE INDEX idx_daily_metrics_date_range 
    ON daily_performance_metrics(date) 
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX idx_fatigue_recent_critical 
    ON fatigue_timeline(ad_id, date DESC) 
    WHERE fatigue_status IN ('warning', 'critical');

-- ============================================================================
-- 9. パーティショニング戦略（大規模データ対応）
-- ============================================================================

-- Note: Convexでは自動的にシャーディングされるため、
-- 明示的なパーティショニングは不要ですが、
-- 将来的な拡張性のため設計を記載

-- Partition by month for historical data
-- PARTITION meta_insights_raw BY RANGE (date_start);
-- PARTITION daily_performance_metrics BY RANGE (date);
-- PARTITION fatigue_timeline BY RANGE (date);

-- ============================================================================
-- 10. データ保持ポリシー
-- ============================================================================

-- 生データ: 90日間保持
-- ALTER TABLE meta_insights_raw 
--     SET (ttl = 'fetch_timestamp + INTERVAL 90 days');

-- 集約データ: 1年間保持
-- ALTER TABLE ad_performance_aggregated 
--     SET (ttl = 'last_updated + INTERVAL 1 year');

-- 日別データ: 180日間保持
-- ALTER TABLE daily_performance_metrics 
--     SET (ttl = 'date + INTERVAL 180 days');

-- 疲労度データ: 90日間保持
-- ALTER TABLE fatigue_timeline 
--     SET (ttl = 'date + INTERVAL 90 days');

-- ログ: 30日間保持
-- ALTER TABLE aggregation_log 
--     SET (ttl = '_creationTime + INTERVAL 30 days');

-- ============================================================================
-- End of Schema Definition
-- ============================================================================