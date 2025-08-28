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