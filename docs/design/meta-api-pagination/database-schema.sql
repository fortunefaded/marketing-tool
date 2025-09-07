-- Meta API 正しいデータ取得システム - Convex データベーススキーマ設計
-- 
-- 注意: ConvexはNoSQLデータベースのため、実際の実装では
-- convex/schema.ts でスキーマを定義します。
-- このSQLは設計理解のための参考資料として作成しています。

-- ============================================================================
-- データ取得履歴テーブル (data_retrieval_history)
-- ============================================================================
-- 各API呼び出しの詳細な履歴を記録
CREATE TABLE data_retrieval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本情報
    account_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255) NOT NULL, -- 単一の取得リクエストを識別
    
    -- リクエスト情報
    requested_date_start DATE NOT NULL,
    requested_date_end DATE NOT NULL,
    requested_days INTEGER NOT NULL, -- 通常30日
    
    -- 取得結果
    total_api_calls INTEGER NOT NULL,
    total_pages INTEGER NOT NULL,
    total_data_items INTEGER NOT NULL,
    
    -- 配信分析結果
    actual_delivery_days INTEGER NOT NULL,
    delivery_ratio DECIMAL(5,4) NOT NULL, -- 0.0000 - 1.0000
    delivery_pattern VARCHAR(20) NOT NULL, -- continuous, partial, intermittent, single, none
    first_delivery_date DATE,
    last_delivery_date DATE,
    
    -- パフォーマンス情報
    processing_time_ms INTEGER NOT NULL,
    rate_limit_hits INTEGER DEFAULT 0,
    
    -- 状態
    status VARCHAR(20) NOT NULL, -- success, partial_success, failed
    error_count INTEGER DEFAULT 0,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- API呼び出し詳細テーブル (api_call_details)
-- ============================================================================
-- 各ページ取得の詳細を記録
CREATE TABLE api_call_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 関連
    retrieval_history_id UUID REFERENCES data_retrieval_history(id),
    
    -- 呼び出し情報
    page_number INTEGER NOT NULL,
    api_url TEXT NOT NULL,
    request_params JSONB NOT NULL,
    
    -- レスポンス情報
    response_status INTEGER NOT NULL, -- HTTP status code
    items_in_page INTEGER NOT NULL,
    has_next_page BOOLEAN NOT NULL,
    
    -- パフォーマンス
    response_time_ms INTEGER NOT NULL,
    
    -- エラー情報
    error_type VARCHAR(50), -- network, auth, rate_limit, api, unknown
    error_message TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 配信パターン分析テーブル (delivery_pattern_analysis)
-- ============================================================================
-- 広告ごとの配信パターンを詳細分析
CREATE TABLE delivery_pattern_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 関連
    retrieval_history_id UUID REFERENCES data_retrieval_history(id),
    
    -- 広告情報
    ad_id VARCHAR(255) NOT NULL,
    ad_name VARCHAR(500),
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500),
    
    -- 配信分析
    delivery_days INTEGER NOT NULL,
    total_requested_days INTEGER NOT NULL,
    delivery_ratio DECIMAL(5,4) NOT NULL,
    delivery_pattern VARCHAR(20) NOT NULL,
    
    -- 配信期間
    first_delivery_date DATE,
    last_delivery_date DATE,
    delivery_date_list TEXT[], -- 配信があった日付の配列
    
    -- 集計値
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_spend DECIMAL(15,2) DEFAULT 0,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- エラーログテーブル (error_logs)
-- ============================================================================
-- 詳細なエラー情報を記録
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 関連
    retrieval_history_id UUID REFERENCES data_retrieval_history(id),
    api_call_detail_id UUID REFERENCES api_call_details(id),
    
    -- エラー情報
    error_type VARCHAR(50) NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT NOT NULL,
    error_details JSONB,
    
    -- コンテキスト
    page_number INTEGER,
    retry_attempt INTEGER,
    
    -- 重要度
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    
    -- 解決状態
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_method VARCHAR(100), -- retry_success, manual_fix, ignored
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================================================
-- タイムラインデータテーブル (timeline_data)
-- ============================================================================
-- 日別の配信状況を記録
CREATE TABLE timeline_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本情報
    account_id VARCHAR(255) NOT NULL,
    ad_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    
    -- 日付情報
    delivery_date DATE NOT NULL,
    
    -- 配信状態
    has_delivery BOOLEAN NOT NULL,
    delivery_intensity SMALLINT DEFAULT 0, -- 0-5のレベル
    
    -- メトリクス
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(15,2) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(8,4) DEFAULT 0,
    ctr DECIMAL(8,6) DEFAULT 0,
    cpc DECIMAL(12,2) DEFAULT 0,
    cpm DECIMAL(12,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(8,6) DEFAULT 0,
    
    -- 比較フラグ
    vs_yesterday VARCHAR(20), -- up, down, stable, no_data
    vs_last_week VARCHAR(20),
    vs_baseline VARCHAR(20), -- normal, warning, critical
    change_rate_daily DECIMAL(8,4),
    change_rate_weekly DECIMAL(8,4),
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 複合ユニーク制約
    UNIQUE(account_id, ad_id, delivery_date)
);

-- ============================================================================
-- 異常検知テーブル (anomaly_detections)
-- ============================================================================
-- 検出された異常パターンを記録
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本情報
    account_id VARCHAR(255) NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL, -- sudden_stop, performance_drop, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    
    -- 検出情報
    detected_at TIMESTAMP NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    
    -- 影響範囲
    affected_ad_ids TEXT[], -- 配列型で複数のad_idを格納
    affected_campaign_ids TEXT[],
    
    -- 詳細情報
    message TEXT NOT NULL,
    recommendation TEXT,
    confidence DECIMAL(5,4) NOT NULL, -- 0-1の信頼度スコア
    
    -- メトリクス
    impact_score INTEGER DEFAULT 0, -- 0-100
    affected_spend DECIMAL(15,2) DEFAULT 0,
    lost_opportunities INTEGER DEFAULT 0,
    deviation_from_baseline DECIMAL(8,4),
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, acknowledged
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 配信ギャップ分析テーブル (gap_analysis)
-- ============================================================================
-- 配信停止期間の分析結果を記録
CREATE TABLE gap_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本情報
    account_id VARCHAR(255) NOT NULL,
    ad_id VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    
    -- ギャップ期間
    gap_start_date DATE NOT NULL,
    gap_end_date DATE NOT NULL,
    duration_days INTEGER NOT NULL,
    
    -- 分析結果
    severity VARCHAR(20) NOT NULL, -- minor, major, critical
    possible_cause VARCHAR(50), -- budget_exhausted, manual_pause, etc.
    cause_confidence DECIMAL(5,4),
    
    -- 影響メトリクス
    missed_impressions BIGINT DEFAULT 0,
    missed_spend DECIMAL(15,2) DEFAULT 0,
    missed_conversions INTEGER DEFAULT 0,
    
    -- 推定情報
    inferred_from_pattern TEXT, -- パターンベースの原因推定詳細
    
    -- ステータス
    is_active BOOLEAN DEFAULT TRUE,
    resolution_action TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- ============================================================================
-- タイムラインキャッシュ統合テーブル (timeline_cache)
-- ============================================================================
-- タイムライン機能のキャッシュ管理
CREATE TABLE timeline_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- キャッシュキー
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    account_id VARCHAR(255) NOT NULL,
    
    -- キャッシュデータ
    timeline_data JSONB NOT NULL, -- タイムラインデータ全体
    gaps JSONB, -- ギャップ分析結果
    anomalies JSONB, -- 異常検知結果
    baseline_metrics JSONB, -- ベースライン計算結果
    
    -- キャッシュ管理
    cache_layer VARCHAR(20) NOT NULL, -- memory, localStorage, convex
    ttl_seconds INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    
    -- データ品質
    data_completeness DECIMAL(5,4), -- 0-1
    quality_score INTEGER, -- 0-100
    quality_issues JSONB,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- パフォーマンス統計テーブル (performance_stats)
-- ============================================================================
-- システムパフォーマンスの統計情報
CREATE TABLE performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 期間
    stats_date DATE NOT NULL,
    stats_hour INTEGER, -- NULL = 日次統計, 0-23 = 時間別統計
    
    -- API呼び出し統計
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- データ取得統計
    total_data_items BIGINT DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    
    -- パフォーマンス統計
    avg_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    
    -- レート制限統計
    rate_limit_hits INTEGER DEFAULT 0,
    
    -- 配信パターン統計
    continuous_delivery_count INTEGER DEFAULT 0,
    partial_delivery_count INTEGER DEFAULT 0,
    intermittent_delivery_count INTEGER DEFAULT 0,
    single_delivery_count INTEGER DEFAULT 0,
    no_delivery_count INTEGER DEFAULT 0,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- インデックス設計
-- ============================================================================

-- data_retrieval_history のインデックス
CREATE INDEX idx_data_retrieval_history_account_id ON data_retrieval_history(account_id);
CREATE INDEX idx_data_retrieval_history_request_id ON data_retrieval_history(request_id);
CREATE INDEX idx_data_retrieval_history_created_at ON data_retrieval_history(created_at DESC);
CREATE INDEX idx_data_retrieval_history_status ON data_retrieval_history(status);

-- api_call_details のインデックス
CREATE INDEX idx_api_call_details_retrieval_id ON api_call_details(retrieval_history_id);
CREATE INDEX idx_api_call_details_page_number ON api_call_details(page_number);
CREATE INDEX idx_api_call_details_response_status ON api_call_details(response_status);

-- delivery_pattern_analysis のインデックス
CREATE INDEX idx_delivery_pattern_analysis_retrieval_id ON delivery_pattern_analysis(retrieval_history_id);
CREATE INDEX idx_delivery_pattern_analysis_ad_id ON delivery_pattern_analysis(ad_id);
CREATE INDEX idx_delivery_pattern_analysis_pattern ON delivery_pattern_analysis(delivery_pattern);
CREATE INDEX idx_delivery_pattern_analysis_campaign_id ON delivery_pattern_analysis(campaign_id);

-- error_logs のインデックス
CREATE INDEX idx_error_logs_retrieval_id ON error_logs(retrieval_history_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- timeline_data のインデックス
CREATE INDEX idx_timeline_data_account_ad ON timeline_data(account_id, ad_id);
CREATE INDEX idx_timeline_data_date ON timeline_data(delivery_date DESC);
CREATE INDEX idx_timeline_data_has_delivery ON timeline_data(has_delivery);
CREATE INDEX idx_timeline_data_campaign ON timeline_data(campaign_id);

-- anomaly_detections のインデックス
CREATE INDEX idx_anomaly_detections_account ON anomaly_detections(account_id);
CREATE INDEX idx_anomaly_detections_type ON anomaly_detections(anomaly_type);
CREATE INDEX idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX idx_anomaly_detections_status ON anomaly_detections(status);
CREATE INDEX idx_anomaly_detections_detected_at ON anomaly_detections(detected_at DESC);

-- gap_analysis のインデックス
CREATE INDEX idx_gap_analysis_account_ad ON gap_analysis(account_id, ad_id);
CREATE INDEX idx_gap_analysis_dates ON gap_analysis(gap_start_date, gap_end_date);
CREATE INDEX idx_gap_analysis_severity ON gap_analysis(severity);
CREATE INDEX idx_gap_analysis_active ON gap_analysis(is_active);

-- timeline_cache のインデックス
CREATE INDEX idx_timeline_cache_account ON timeline_cache(account_id);
CREATE INDEX idx_timeline_cache_expires ON timeline_cache(expires_at);
CREATE INDEX idx_timeline_cache_layer ON timeline_cache(cache_layer);

-- performance_stats のインデックス
CREATE UNIQUE INDEX idx_performance_stats_date_hour ON performance_stats(stats_date, stats_hour);
CREATE INDEX idx_performance_stats_date ON performance_stats(stats_date DESC);

-- ============================================================================
-- Convex Schema 実装のための参考情報
-- ============================================================================

/*
Convex での実装時は以下のような schema.ts になります:

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  dataRetrievalHistory: defineTable({
    accountId: v.string(),
    requestId: v.string(),
    requestedDateStart: v.string(),
    requestedDateEnd: v.string(),
    requestedDays: v.number(),
    totalApiCalls: v.number(),
    totalPages: v.number(),
    totalDataItems: v.number(),
    actualDeliveryDays: v.number(),
    deliveryRatio: v.number(),
    deliveryPattern: v.union(
      v.literal("continuous"),
      v.literal("partial"),
      v.literal("intermittent"),
      v.literal("single"),
      v.literal("none")
    ),
    firstDeliveryDate: v.optional(v.string()),
    lastDeliveryDate: v.optional(v.string()),
    processingTimeMs: v.number(),
    rateLimitHits: v.number(),
    status: v.union(
      v.literal("success"),
      v.literal("partial_success"), 
      v.literal("failed")
    ),
    errorCount: v.number(),
  })
    .index("by_account_id", ["accountId"])
    .index("by_request_id", ["requestId"])
    .index("by_status", ["status"]),
  
  apiCallDetails: defineTable({
    retrievalHistoryId: v.id("dataRetrievalHistory"),
    pageNumber: v.number(),
    apiUrl: v.string(),
    requestParams: v.object({
      fields: v.array(v.string()),
      timeRange: v.object({
        since: v.string(),
        until: v.string()
      }),
      level: v.string()
    }),
    responseStatus: v.number(),
    itemsInPage: v.number(),
    hasNextPage: v.boolean(),
    responseTimeMs: v.number(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_retrieval_id", ["retrievalHistoryId"])
    .index("by_page_number", ["pageNumber"]),
});
*/

-- ============================================================================
-- データ保持ポリシー
-- ============================================================================

-- パフォーマンス統計: 1年間保持
-- データ取得履歴: 6ヶ月保持
-- API呼び出し詳細: 3ヶ月保持
-- エラーログ: 1年間保持（解決済みは6ヶ月）
-- 配信パターン分析: 6ヶ月保持

-- ============================================================================
-- クエリ例
-- ============================================================================

-- 最新の取得結果サマリー
/*
SELECT 
    account_id,
    delivery_pattern,
    COUNT(*) as count,
    AVG(delivery_ratio) as avg_ratio,
    AVG(processing_time_ms) as avg_processing_time
FROM data_retrieval_history 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY account_id, delivery_pattern
ORDER BY account_id, count DESC;
*/

-- エラー頻度分析
/*
SELECT 
    error_type,
    COUNT(*) as frequency,
    AVG(retry_attempt) as avg_retries
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY frequency DESC;
*/