-- ========================================
-- Meta Marketing API Tables
-- ========================================

-- Meta広告アカウント
CREATE TABLE meta_accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'JPY',
    timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャンペーン
CREATE TABLE campaigns (
    campaign_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'deleted')),
    daily_budget DECIMAL(12, 2),
    lifetime_budget DECIMAL(12, 2),
    start_time TIMESTAMP,
    stop_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 広告セット
CREATE TABLE ad_sets (
    ad_set_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'deleted')),
    daily_budget DECIMAL(12, 2),
    lifetime_budget DECIMAL(12, 2),
    targeting_spec JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 広告
CREATE TABLE ads (
    ad_id TEXT PRIMARY KEY,
    ad_set_id TEXT NOT NULL REFERENCES ad_sets(ad_set_id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'deleted')),
    creative_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 広告メトリクス（日次）
CREATE TABLE ad_metrics (
    id SERIAL PRIMARY KEY,
    ad_id TEXT NOT NULL REFERENCES ads(ad_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(12, 2),
    frequency DECIMAL(6, 2) NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    ctr DECIMAL(6, 4) NOT NULL DEFAULT 0,
    cpc DECIMAL(8, 4) NOT NULL DEFAULT 0,
    cpm DECIMAL(8, 4) NOT NULL DEFAULT 0,
    cpp DECIMAL(8, 4),
    roas DECIMAL(8, 2),
    cpa DECIMAL(8, 2),
    
    -- Instagram特有のメトリクス
    profile_views INTEGER,
    follows INTEGER,
    engagements INTEGER,
    saves INTEGER,
    shares INTEGER,
    
    -- 動画特有のメトリクス
    video_views INTEGER,
    video_completion_rate DECIMAL(6, 4),
    average_watch_time DECIMAL(6, 2),
    sound_on_rate DECIMAL(6, 4),
    three_second_views INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ad_id, date)
);

-- ========================================
-- 広告疲労度分析テーブル
-- ========================================

-- 疲労度分析
CREATE TABLE fatigue_analysis (
    id SERIAL PRIMARY KEY,
    ad_id TEXT NOT NULL REFERENCES ads(ad_id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    audience_score INTEGER NOT NULL CHECK (audience_score >= 0 AND audience_score <= 100),
    creative_score INTEGER NOT NULL CHECK (creative_score >= 0 AND creative_score <= 100),
    algorithm_score INTEGER NOT NULL CHECK (algorithm_score >= 0 AND algorithm_score <= 100),
    primary_issue TEXT NOT NULL CHECK (primary_issue IN ('audience', 'creative', 'algorithm')),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'caution', 'warning', 'critical')),
    
    -- メトリクス詳細
    frequency DECIMAL(6, 2) NOT NULL,
    first_time_ratio DECIMAL(6, 4) NOT NULL,
    ctr_decline_rate DECIMAL(6, 4) NOT NULL,
    cpm_increase_rate DECIMAL(6, 4) NOT NULL,
    
    recommendations TEXT[],
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ad_id, calculated_at::DATE)
);

-- 疲労度アラート
CREATE TABLE fatigue_alerts (
    id SERIAL PRIMARY KEY,
    ad_id TEXT NOT NULL REFERENCES ads(ad_id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('healthy', 'caution', 'warning', 'critical')),
    type TEXT NOT NULL CHECK (type IN ('audience', 'creative', 'algorithm')),
    message TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by TEXT
);

-- 疲労度トレンド（7日間移動平均）
CREATE TABLE fatigue_trends (
    id SERIAL PRIMARY KEY,
    ad_id TEXT NOT NULL REFERENCES ads(ad_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_score INTEGER NOT NULL,
    audience_score INTEGER NOT NULL,
    creative_score INTEGER NOT NULL,
    algorithm_score INTEGER NOT NULL,
    frequency DECIMAL(6, 2) NOT NULL,
    ctr DECIMAL(6, 4) NOT NULL,
    cpm DECIMAL(8, 4) NOT NULL,
    first_time_ratio DECIMAL(6, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ad_id, date)
);

-- ========================================
-- ECForce統合テーブル
-- ========================================

-- ECForce顧客
CREATE TABLE ecforce_customers (
    customer_id TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    registration_date TIMESTAMP,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
    average_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    last_order_date TIMESTAMP,
    ltv DECIMAL(12, 2) NOT NULL DEFAULT 0,
    segment TEXT CHECK (segment IN ('new', 'returning', 'vip', 'at_risk')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ECForce注文
CREATE TABLE ecforce_orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ecforce_customers(customer_id) ON DELETE SET NULL,
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'JPY',
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ECForce注文商品
CREATE TABLE ecforce_order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES ecforce_orders(order_id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL
);

-- ========================================
-- レポート・エクスポート
-- ========================================

-- レポート設定
CREATE TABLE report_configs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dashboard', 'fatigue', 'performance', 'custom')),
    format TEXT NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),
    
    -- スケジュール設定
    schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
    schedule_time TIME,
    recipients TEXT[],
    
    filters JSONB NOT NULL,
    template TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- エクスポート履歴
CREATE TABLE export_history (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES report_configs(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    format TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    expires_at TIMESTAMP,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ユーザー管理
-- ========================================

-- ユーザー
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'analyst', 'viewer')),
    permissions JSONB,
    accessible_accounts TEXT[], -- Meta account IDs
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー設定
CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    language TEXT NOT NULL DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
    currency TEXT NOT NULL DEFAULT 'JPY',
    default_date_range INTEGER NOT NULL DEFAULT 30,
    dashboard_layout JSONB,
    email_notifications JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- システム設定
-- ========================================

-- システム設定
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データ同期ログ
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('meta_api', 'ecforce', 'csv')),
    account_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    records_processed INTEGER,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- インデックス
-- ========================================

-- 基本検索用インデックス
CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_ad_sets_campaign_id ON ad_sets(campaign_id);  
CREATE INDEX idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX idx_ads_campaign_id ON ads(campaign_id);

-- メトリクス検索用インデックス
CREATE INDEX idx_ad_metrics_ad_id ON ad_metrics(ad_id);
CREATE INDEX idx_ad_metrics_date ON ad_metrics(date);
CREATE INDEX idx_ad_metrics_ad_id_date ON ad_metrics(ad_id, date);

-- 疲労度分析用インデックス
CREATE INDEX idx_fatigue_analysis_ad_id ON fatigue_analysis(ad_id);
CREATE INDEX idx_fatigue_analysis_status ON fatigue_analysis(status);
CREATE INDEX idx_fatigue_analysis_calculated_at ON fatigue_analysis(calculated_at);
CREATE INDEX idx_fatigue_alerts_ad_id ON fatigue_alerts(ad_id);
CREATE INDEX idx_fatigue_alerts_is_active ON fatigue_alerts(is_active);
CREATE INDEX idx_fatigue_trends_ad_id_date ON fatigue_trends(ad_id, date);

-- ECForce用インデックス
CREATE INDEX idx_ecforce_orders_customer_id ON ecforce_orders(customer_id);
CREATE INDEX idx_ecforce_orders_order_date ON ecforce_orders(order_date);
CREATE INDEX idx_ecforce_orders_utm_campaign ON ecforce_orders(utm_campaign);
CREATE INDEX idx_ecforce_order_items_order_id ON ecforce_order_items(order_id);

-- レポート用インデックス
CREATE INDEX idx_export_history_created_at ON export_history(created_at);
CREATE INDEX idx_sync_logs_source_account_id ON sync_logs(source, account_id);

-- ========================================
-- パーティショニング（大量データ対応）
-- ========================================

-- メトリクスデータの月次パーティショニング（PostgreSQL 10+）
-- CREATE TABLE ad_metrics_y2024m01 PARTITION OF ad_metrics 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ========================================
-- 初期データ
-- ========================================

-- システム設定の初期値
INSERT INTO system_config (key, value, description) VALUES 
('meta_api_config', '{"appId": "", "appSecret": "", "apiVersion": "v19.0", "rateLimits": {"requestsPerHour": 200, "requestsPerDay": 4800}}', 'Meta API設定'),
('ecforce_config', '{"apiEndpoint": "", "apiKey": "", "rateLimits": {"requestsPerMinute": 60}}', 'ECForce API設定'),
('fatigue_thresholds', '{"critical": 20, "warning": 40, "caution": 60}', '疲労度アラート閾値'),
('data_retention', '{"rawMetrics": 730, "aggregatedData": 1095, "exportFiles": 30}', 'データ保持期間（日数）');