-- Ad Fatigue 多軸表示機能 データベーススキーマ
-- 注: この機能は主にクライアントサイドで実装されるため、
-- ここではConvexまたはローカルストレージでのキャッシュ構造を示す

-- ==================== Convexスキーマ（疑似SQL表現） ====================

-- Meta APIレスポンスキャッシュ
CREATE TABLE meta_api_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'insights', 'campaigns', 'adsets'
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(account_id, cache_key)
);

-- 集約済みデータキャッシュ
CREATE TABLE aggregated_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    view_axis VARCHAR(20) NOT NULL, -- 'creative', 'adset', 'campaign'
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    aggregated_data JSONB NOT NULL,
    aggregation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_count INTEGER NOT NULL,
    processing_time_ms INTEGER,
    UNIQUE(account_id, view_axis, date_range_start, date_range_end)
);

-- ユーザー設定
CREATE TABLE user_display_settings (
    user_id VARCHAR(255) PRIMARY KEY,
    default_view_axis VARCHAR(20) DEFAULT 'creative',
    items_per_page INTEGER DEFAULT 50,
    show_warnings BOOLEAN DEFAULT true,
    auto_refresh_interval INTEGER, -- milliseconds, NULL = disabled
    last_selected_axis VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- パフォーマンスメトリクス（分析用）
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'aggregation', 'tab_switch', 'data_fetch'
    view_axis VARCHAR(20),
    data_count INTEGER,
    execution_time_ms INTEGER NOT NULL,
    memory_usage_mb DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== インデックス ====================

-- キャッシュ検索の高速化
CREATE INDEX idx_meta_cache_lookup ON meta_api_cache(account_id, cache_key, expires_at);
CREATE INDEX idx_aggregated_cache_lookup ON aggregated_data_cache(account_id, view_axis, date_range_start, date_range_end);

-- パフォーマンス分析用
CREATE INDEX idx_performance_metrics_analysis ON performance_metrics(account_id, operation_type, timestamp);

-- ==================== ローカルストレージ構造（JSON形式） ====================

/*
localStorage構造例:

"adFatigue_settings": {
  "defaultAxis": "creative",
  "lastSelectedAxis": "adset",
  "itemsPerPage": 50,
  "showWarnings": true
}

"adFatigue_cache_{accountId}": {
  "creative": {
    "data": [...],
    "timestamp": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-15T10:05:00Z"
  },
  "adset": {
    "data": [...],
    "timestamp": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-15T10:05:00Z"
  },
  "campaign": {
    "data": [...],
    "timestamp": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-15T10:05:00Z"
  }
}

"adFatigue_performance": {
  "lastAggregation": {
    "creative": { "time": 150, "count": 100 },
    "adset": { "time": 320, "count": 20 },
    "campaign": { "time": 280, "count": 5 }
  }
}
*/

-- ==================== データ保持ポリシー ====================

-- キャッシュクリーンアップ（定期実行）
-- 1. 期限切れキャッシュの削除
DELETE FROM meta_api_cache WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM aggregated_data_cache WHERE aggregation_timestamp < CURRENT_TIMESTAMP - INTERVAL '1 hour';

-- 2. 古いパフォーマンスメトリクスの削除（30日以上）
DELETE FROM performance_metrics WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ==================== ビュー定義 ====================

-- キャッシュ利用状況ビュー
CREATE VIEW cache_usage_stats AS
SELECT 
    account_id,
    COUNT(*) as cache_entries,
    SUM(LENGTH(raw_data::text)) as total_size_bytes,
    MAX(created_at) as last_cache_time,
    MIN(expires_at) as next_expiry
FROM meta_api_cache
GROUP BY account_id;

-- パフォーマンス統計ビュー
CREATE VIEW performance_stats AS
SELECT 
    account_id,
    view_axis,
    operation_type,
    AVG(execution_time_ms) as avg_execution_time,
    MAX(execution_time_ms) as max_execution_time,
    COUNT(*) as operation_count,
    DATE_TRUNC('hour', timestamp) as hour
FROM performance_metrics
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY account_id, view_axis, operation_type, DATE_TRUNC('hour', timestamp);