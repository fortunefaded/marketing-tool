-- ============================================================================
-- Meta広告疲労度分析ダッシュボード UI/UX改善
-- データベーススキーマ設計
-- 
-- Target: Convex Database + 拡張テーブル設計
-- Version: 1.0.0
-- Date: 2025-08-28
-- ============================================================================

-- 既存テーブル: metaInsights (変更なし - REQ-401準拠)
-- 既存の metaInsights テーブル構造は維持
-- 新規フィールドを追加して媒体別データをサポート

-- ============================================================================
-- ENHANCED META INSIGHTS (既存テーブルの拡張)
-- ============================================================================

-- 既存のmetaInsightsテーブルに媒体別データフィールドを追加
-- Note: Convexでは既存データとの互換性を保ちながら段階的にスキーマ拡張可能

/**
 * Meta Insights Enhanced Schema
 * 要件: REQ-003, REQ-006対応 (媒体別データ + 整合性保証)
 */
CREATE TABLE IF NOT EXISTS meta_insights_enhanced (
    -- 基本識別子 (既存互換)
    _id TEXT PRIMARY KEY,
    ad_id TEXT NOT NULL,
    ad_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    account_id TEXT,
    
    -- 日付情報
    date_start TEXT NOT NULL,
    date_stop TEXT NOT NULL,
    
    -- 既存メトリクス (互換性維持)
    impressions REAL DEFAULT 0,
    clicks REAL DEFAULT 0,
    spend REAL DEFAULT 0,
    reach REAL DEFAULT 0,
    frequency REAL DEFAULT 0,
    ctr REAL DEFAULT 0,
    cpm REAL DEFAULT 0,
    cpc REAL DEFAULT 0,
    conversions REAL DEFAULT 0,
    conversion_value REAL DEFAULT 0,
    first_conversions REAL DEFAULT 0,
    unique_clicks REAL DEFAULT 0,
    unique_ctr REAL DEFAULT 0,
    unique_inline_link_click_ctr REAL DEFAULT 0,
    
    -- 新規: 媒体識別 (REQ-003対応)
    publisher_platform TEXT,
    
    -- 新規: 媒体別メトリクス (JSON形式で格納)
    -- 要件: REQ-003準拠 (Facebook/Instagram/Audience Network別)
    platform_breakdown TEXT, -- JSON: { facebook: {...}, instagram: {...}, audience_network: {...} }
    
    -- クリエイティブ情報
    creative_id TEXT,
    creative_name TEXT, 
    creative_type TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    image_url TEXT,
    
    -- データ品質管理
    data_quality TEXT DEFAULT 'complete', -- 'complete' | 'partial' | 'estimated'
    last_updated INTEGER DEFAULT (strftime('%s', 'now')),
    api_version TEXT DEFAULT 'v23.0',
    
    -- データ整合性チェック (REQ-006, REQ-007対応)
    consistency_check TEXT, -- JSON: { isValid: boolean, adjustments: {...} }
    
    -- インデックス用フィールド
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- PLATFORM-SPECIFIC AGGREGATED DATA (新規テーブル)
-- ============================================================================

/**
 * 媒体別集約データテーブル
 * 要件: REQ-002, REQ-003対応 (媒体別グラフ表示用)
 */
CREATE TABLE IF NOT EXISTS platform_aggregated_metrics (
    _id TEXT PRIMARY KEY,
    
    -- 基本識別子
    ad_id TEXT NOT NULL,
    ad_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    account_id TEXT,
    
    -- 集約期間
    date_start TEXT NOT NULL,
    date_stop TEXT NOT NULL,
    aggregation_period TEXT DEFAULT 'daily', -- 'daily' | 'weekly' | 'monthly'
    
    -- Facebook メトリクス
    facebook_impressions REAL DEFAULT 0,
    facebook_clicks REAL DEFAULT 0,
    facebook_spend REAL DEFAULT 0,
    facebook_reach REAL DEFAULT 0,
    facebook_frequency REAL DEFAULT 0,
    facebook_ctr REAL DEFAULT 0,
    facebook_cpm REAL DEFAULT 0,
    facebook_cpc REAL DEFAULT 0,
    facebook_conversions REAL DEFAULT 0,
    facebook_first_conversions REAL DEFAULT 0,
    
    -- Instagram メトリクス  
    instagram_impressions REAL DEFAULT 0,
    instagram_clicks REAL DEFAULT 0,
    instagram_spend REAL DEFAULT 0,
    instagram_reach REAL DEFAULT 0,
    instagram_frequency REAL DEFAULT 0,
    instagram_ctr REAL DEFAULT 0,
    instagram_cpm REAL DEFAULT 0,
    instagram_cpc REAL DEFAULT 0,
    instagram_conversions REAL DEFAULT 0,
    instagram_first_conversions REAL DEFAULT 0,
    
    -- Audience Network メトリクス
    audience_network_impressions REAL DEFAULT 0,
    audience_network_clicks REAL DEFAULT 0,
    audience_network_spend REAL DEFAULT 0,
    audience_network_reach REAL DEFAULT 0,
    audience_network_frequency REAL DEFAULT 0,
    audience_network_ctr REAL DEFAULT 0,
    audience_network_cpm REAL DEFAULT 0,
    audience_network_cpc REAL DEFAULT 0,
    audience_network_conversions REAL DEFAULT 0,
    audience_network_first_conversions REAL DEFAULT 0,
    
    -- 合計値 (検証用)
    total_impressions REAL DEFAULT 0,
    total_clicks REAL DEFAULT 0,
    total_spend REAL DEFAULT 0,
    total_reach REAL DEFAULT 0,
    total_conversions REAL DEFAULT 0,
    total_first_conversions REAL DEFAULT 0,
    
    -- 計算メトリクス
    total_ctr REAL GENERATED ALWAYS AS (
        CASE WHEN total_impressions > 0 
        THEN (total_clicks / total_impressions) * 100 
        ELSE 0 END
    ) STORED,
    total_cpc REAL GENERATED ALWAYS AS (
        CASE WHEN total_clicks > 0 
        THEN total_spend / total_clicks 
        ELSE 0 END
    ) STORED,
    total_cpm REAL GENERATED ALWAYS AS (
        CASE WHEN total_impressions > 0 
        THEN (total_spend / total_impressions) * 1000 
        ELSE 0 END
    ) STORED,
    
    -- データ整合性フラグ (REQ-006, REQ-007対応)
    is_consistent BOOLEAN DEFAULT TRUE,
    adjustment_applied BOOLEAN DEFAULT FALSE,
    consistency_details TEXT, -- JSON: 調整の詳細
    
    -- メタデータ
    processing_time_ms INTEGER,
    data_source TEXT DEFAULT 'meta_api',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- FATIGUE SCORING ENHANCED (既存拡張)
-- ============================================================================

/**
 * 疲労度スコア拡張テーブル
 * 要件: REQ-402準拠 (既存疲労度計算機能は変更しない)
 */
CREATE TABLE IF NOT EXISTS ad_fatigue_scores_enhanced (
    _id TEXT PRIMARY KEY,
    
    -- 基本識別子
    ad_id TEXT NOT NULL,
    ad_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    
    -- 疲労度スコア (既存互換)
    fatigue_score REAL NOT NULL,
    fatigue_status TEXT NOT NULL, -- 'healthy' | 'caution' | 'warning' | 'critical'
    
    -- 媒体別疲労度 (新規追加)
    facebook_fatigue_score REAL,
    instagram_fatigue_score REAL,
    audience_network_fatigue_score REAL,
    
    -- 疲労度構成要素 (既存互換)
    frequency_score REAL,
    ctr_decline_score REAL,
    cpm_increase_score REAL,
    
    -- 媒体別構成要素
    platform_specific_scores TEXT, -- JSON: 各媒体の詳細スコア
    
    -- 計算メタデータ
    calculation_date TEXT NOT NULL,
    baseline_period TEXT, -- ベースライン期間
    algorithm_version TEXT DEFAULT 'v1.0',
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- CHART CONFIGURATION (新規テーブル)
-- ============================================================================

/**
 * チャート設定保存テーブル
 * 要件: REQ-101, REQ-102対応 (ユーザー設定の永続化)
 */
CREATE TABLE IF NOT EXISTS chart_configurations (
    _id TEXT PRIMARY KEY,
    
    -- ユーザー識別 (将来の拡張に備えて)
    user_id TEXT,
    account_id TEXT,
    
    -- チャート設定
    chart_type TEXT NOT NULL, -- 'multi_line' | 'stacked' | 'area'
    default_metric TEXT DEFAULT 'spend', -- デフォルト表示メトリクス
    
    -- プラットフォーム表示設定 (REQ-201対応: 全媒体表示で開始)
    facebook_visible BOOLEAN DEFAULT TRUE,
    instagram_visible BOOLEAN DEFAULT TRUE,
    audience_network_visible BOOLEAN DEFAULT TRUE,
    
    -- 表示オプション
    show_legend BOOLEAN DEFAULT TRUE,
    show_tooltip BOOLEAN DEFAULT TRUE,
    show_total_line BOOLEAN DEFAULT FALSE, -- REQ-301対応
    
    -- アクセシビリティ設定 (NFR-202対応)
    high_contrast_mode BOOLEAN DEFAULT FALSE,
    screen_reader_enabled BOOLEAN DEFAULT FALSE,
    keyboard_navigation BOOLEAN DEFAULT TRUE,
    
    -- レスポンシブ設定
    mobile_simplified_view BOOLEAN DEFAULT TRUE,
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- ERROR LOGGING AND DEBUGGING (新規テーブル)  
-- ============================================================================

/**
 * エラーログテーブル
 * 要件: EDGE-001, EDGE-002, EDGE-003対応
 */
CREATE TABLE IF NOT EXISTS chart_error_logs (
    _id TEXT PRIMARY KEY,
    
    -- エラー分類
    error_type TEXT NOT NULL, -- 'DATA_MISSING' | 'PLATFORM_UNAVAILABLE' | 'CALCULATION_ERROR' | 'RENDER_ERROR'
    error_code TEXT,
    error_message TEXT NOT NULL,
    
    -- コンテキスト情報
    ad_id TEXT,
    affected_platforms TEXT, -- JSON array
    metric_type TEXT,
    
    -- エラー詳細
    stack_trace TEXT,
    user_agent TEXT,
    browser_version TEXT,
    
    -- 復旧情報
    is_recoverable BOOLEAN,
    fallback_applied BOOLEAN,
    resolution_status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'ignored'
    
    -- タイムスタンプ
    occurred_at INTEGER DEFAULT (strftime('%s', 'now')),
    resolved_at INTEGER
);

/**
 * パフォーマンスメトリクステーブル
 * 要件: NFR-001, NFR-002, NFR-003対応
 */
CREATE TABLE IF NOT EXISTS chart_performance_metrics (
    _id TEXT PRIMARY KEY,
    
    -- パフォーマンス指標
    chart_render_time_ms REAL, -- 要件: 1秒以内 (NFR-001)
    toggle_response_time_ms REAL, -- 要件: 500ms以内 (NFR-002)
    tooltip_display_time_ms REAL, -- 要件: 200ms以内 (NFR-003)
    
    -- データ処理時間
    data_aggregation_time_ms REAL,
    data_transformation_time_ms REAL,
    
    -- データサイズ
    input_data_points INTEGER,
    rendered_data_points INTEGER,
    
    -- ユーザー環境
    device_type TEXT, -- 'desktop' | 'tablet' | 'mobile'
    screen_resolution TEXT,
    browser TEXT,
    
    -- コンテキスト
    chart_type TEXT,
    platform_count INTEGER,
    date_range_days INTEGER,
    
    measured_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- メイン検索用インデックス
CREATE INDEX IF NOT EXISTS idx_meta_insights_enhanced_ad_date 
ON meta_insights_enhanced(ad_id, date_start);

CREATE INDEX IF NOT EXISTS idx_meta_insights_enhanced_campaign 
ON meta_insights_enhanced(campaign_id, date_start);

CREATE INDEX IF NOT EXISTS idx_meta_insights_enhanced_platform 
ON meta_insights_enhanced(publisher_platform, date_start);

-- 集約データ用インデックス
CREATE INDEX IF NOT EXISTS idx_platform_aggregated_ad_period 
ON platform_aggregated_metrics(ad_id, date_start, date_stop);

CREATE INDEX IF NOT EXISTS idx_platform_aggregated_campaign_period 
ON platform_aggregated_metrics(campaign_id, date_start, date_stop);

-- 疲労度スコア用インデックス
CREATE INDEX IF NOT EXISTS idx_fatigue_scores_ad_date 
ON ad_fatigue_scores_enhanced(ad_id, calculation_date);

-- チャート設定用インデックス
CREATE INDEX IF NOT EXISTS idx_chart_config_account 
ON chart_configurations(account_id, user_id);

-- エラーログ用インデックス
CREATE INDEX IF NOT EXISTS idx_error_logs_type_date 
ON chart_error_logs(error_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_error_logs_ad 
ON chart_error_logs(ad_id, occurred_at);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date 
ON chart_performance_metrics(measured_at);

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

/**
 * データ整合性チェックトリガー
 * 要件: REQ-006, REQ-007対応
 */
CREATE TRIGGER IF NOT EXISTS validate_platform_totals_insert
AFTER INSERT ON platform_aggregated_metrics
BEGIN
    -- 媒体別合算値と総計値の整合性をチェック
    UPDATE platform_aggregated_metrics 
    SET 
        is_consistent = (
            ABS(
                (NEW.facebook_impressions + NEW.instagram_impressions + NEW.audience_network_impressions) 
                - NEW.total_impressions
            ) < 0.01
        ),
        adjustment_applied = (
            ABS(
                (NEW.facebook_impressions + NEW.instagram_impressions + NEW.audience_network_impressions) 
                - NEW.total_impressions
            ) >= 0.01
        )
    WHERE _id = NEW._id;
END;

/**
 * 更新タイムスタンプトリガー
 */
CREATE TRIGGER IF NOT EXISTS update_platform_aggregated_timestamp
AFTER UPDATE ON platform_aggregated_metrics
BEGIN
    UPDATE platform_aggregated_metrics 
    SET updated_at = strftime('%s', 'now')
    WHERE _id = NEW._id;
END;

CREATE TRIGGER IF NOT EXISTS update_chart_config_timestamp
AFTER UPDATE ON chart_configurations
BEGIN
    UPDATE chart_configurations 
    SET updated_at = strftime('%s', 'now')
    WHERE _id = NEW._id;
END;

-- ============================================================================
-- VIEWS FOR SIMPLIFIED DATA ACCESS
-- ============================================================================

/**
 * 媒体別集約ビュー (グラフ表示用)
 * 要件: REQ-002, REQ-003対応
 */
CREATE VIEW IF NOT EXISTS platform_chart_data AS
SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_impressions as facebook,
    instagram_impressions as instagram,
    audience_network_impressions as audience_network,
    total_impressions as total,
    'impressions' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics

UNION ALL

SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_spend as facebook,
    instagram_spend as instagram,
    audience_network_spend as audience_network,
    total_spend as total,
    'spend' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics

UNION ALL

SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_clicks as facebook,
    instagram_clicks as instagram,
    audience_network_clicks as audience_network,
    total_clicks as total,
    'clicks' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics

UNION ALL

SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_ctr as facebook,
    instagram_ctr as instagram,
    audience_network_ctr as audience_network,
    total_ctr as total,
    'ctr' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics

UNION ALL

SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_frequency as facebook,
    instagram_frequency as instagram,
    audience_network_frequency as audience_network,
    (facebook_frequency + instagram_frequency + audience_network_frequency) / 3 as total,
    'frequency' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics

UNION ALL

SELECT 
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    date_start as date,
    facebook_conversions as facebook,
    instagram_conversions as instagram,
    audience_network_conversions as audience_network,
    total_conversions as total,
    'conversions' as metric,
    is_consistent,
    created_at
FROM platform_aggregated_metrics;

/**
 * データ品質サマリービュー
 */
CREATE VIEW IF NOT EXISTS data_quality_summary AS
SELECT 
    date_start,
    COUNT(*) as total_records,
    SUM(CASE WHEN is_consistent THEN 1 ELSE 0 END) as consistent_records,
    SUM(CASE WHEN adjustment_applied THEN 1 ELSE 0 END) as adjusted_records,
    AVG(processing_time_ms) as avg_processing_time,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as latest_update
FROM platform_aggregated_metrics
GROUP BY date_start;

-- ============================================================================
-- SAMPLE DATA AND TESTING
-- ============================================================================

/**
 * テスト用サンプルデータ挿入
 * 開発・テスト環境でのみ使用
 */
-- 
-- INSERT INTO platform_aggregated_metrics (
--     _id, ad_id, ad_name, campaign_id, campaign_name, 
--     date_start, date_stop,
--     facebook_impressions, facebook_clicks, facebook_spend,
--     instagram_impressions, instagram_clicks, instagram_spend,
--     audience_network_impressions, audience_network_clicks, audience_network_spend,
--     total_impressions, total_clicks, total_spend
-- ) VALUES (
--     'test_001', 'ad_123', 'Test Ad', 'campaign_456', 'Test Campaign',
--     '2025-01-01', '2025-01-01',
--     1000, 50, 25.0,
--     800, 40, 20.0,  
--     200, 10, 5.0,
--     2000, 100, 50.0
-- );

-- ============================================================================
-- MIGRATION SCRIPTS (将来の拡張用)
-- ============================================================================

/**
 * 既存データ移行用のプレースホルダー
 * 実装時に具体的な移行スクリプトを追加
 */

-- 既存のmetaInsightsからの移行
-- INSERT INTO meta_insights_enhanced (...) 
-- SELECT ..., NULL as platform_breakdown, ...
-- FROM existing_meta_insights;

-- 集約データの初期計算
-- INSERT INTO platform_aggregated_metrics (...) 
-- SELECT ... FROM meta_insights_enhanced 
-- WHERE publisher_platform IN ('facebook', 'instagram', 'audience_network')
-- GROUP BY ad_id, date_start;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

/**
 * 古いデータのクリーンアップ（定期実行用）
 */

-- 3ヶ月以上古いエラーログを削除
-- DELETE FROM chart_error_logs 
-- WHERE occurred_at < strftime('%s', 'now', '-3 months');

-- 1週間以上古いパフォーマンスメトリクスを削除  
-- DELETE FROM chart_performance_metrics
-- WHERE measured_at < strftime('%s', 'now', '-7 days');

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

/*
スキーマ設計方針:
1. 既存システムとの互換性を最優先 (REQ-401, REQ-403)
2. 媒体別データの効率的な格納と取得
3. データ整合性の自動チェックと調整 (REQ-006, REQ-007)
4. パフォーマンス要件への対応 (NFR-001~003)
5. 将来の拡張性を考慮した設計

主要な設計決定:
- 既存のmetaInsightsテーブルは変更せず、拡張テーブルを追加
- 媒体別データは正規化された形式で格納
- 集約データは別テーブルで管理（クエリパフォーマンス向上）
- データ整合性チェックはトリガーで自動化
- エラーログとパフォーマンスメトリクスで運用サポート
*/