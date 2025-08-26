-- ============================================================================
-- 広告疲労度スコアリングシステム データベーススキーマ設計
-- Database: Convex (Document Store)
-- Purpose: 疲労度分析、メトリクス集約、ECforce統合、KPI横断表示
-- ============================================================================

-- Note: Convexはドキュメントストアのため、このSQLはスキーマ設計の参考資料として記載
-- 実際の実装ではConvexのスキーマ定義ファイル（convex/schema.ts）で定義される

-- ============================================================================
-- Meta Account & Campaign Management - Meta アカウント・キャンペーン管理
-- ============================================================================

-- Meta広告アカウント情報
CREATE TABLE meta_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(50) UNIQUE NOT NULL,           -- Meta Ad Account ID (act_xxxxx)
    name VARCHAR(255) NOT NULL,                       -- アカウント名
    currency CHAR(3) NOT NULL DEFAULT 'JPY',          -- 通貨コード
    business_id VARCHAR(50),                          -- Meta Business Manager ID
    status VARCHAR(20) NOT NULL DEFAULT 'active',     -- active, inactive, suspended
    
    -- Access Control
    access_token_hash VARCHAR(255),                   -- 暗号化されたアクセストークン
    token_expires_at TIMESTAMP,                       -- トークン有効期限
    permissions JSON,                                 -- アクセス権限情報
    
    -- Account Metadata
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',        -- タイムゾーン
    industry VARCHAR(100),                            -- 業界カテゴリ
    account_type VARCHAR(50),                         -- 個人/法人
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,                                  -- ユーザーID
    
    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT chk_currency CHECK (LENGTH(currency) = 3)
);

-- Meta キャンペーン情報
CREATE TABLE meta_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(50) UNIQUE NOT NULL,          -- Meta Campaign ID
    account_id VARCHAR(50) NOT NULL,                  -- 所属アカウント
    name VARCHAR(255) NOT NULL,                       -- キャンペーン名
    
    -- Campaign Configuration
    objective VARCHAR(50) NOT NULL,                   -- CONVERSIONS, TRAFFIC, AWARENESS等
    status VARCHAR(20) NOT NULL,                      -- ACTIVE, PAUSED, DELETED
    buying_type VARCHAR(20),                          -- AUCTION, RESERVATION
    
    -- Budget & Bidding
    daily_budget DECIMAL(10,2),                       -- 日予算
    lifetime_budget DECIMAL(10,2),                    -- 総予算
    bid_strategy VARCHAR(50),                         -- LOWEST_COST_WITHOUT_CAP等
    
    -- Targeting
    targeting_spec JSON,                              -- ターゲティング仕様
    geo_locations JSON,                               -- 地域ターゲティング
    
    -- Schedule
    start_time TIMESTAMP,
    stop_time TIMESTAMP,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_campaign_status CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED')),
    CONSTRAINT chk_budget_positive CHECK (daily_budget > 0 OR lifetime_budget > 0)
);

-- Meta 広告セット情報
CREATE TABLE meta_adsets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adset_id VARCHAR(50) UNIQUE NOT NULL,             -- Meta AdSet ID
    campaign_id VARCHAR(50) NOT NULL,                 -- 所属キャンペーン
    account_id VARCHAR(50) NOT NULL,                  -- 所属アカウント
    name VARCHAR(255) NOT NULL,                       -- 広告セット名
    
    -- AdSet Configuration
    status VARCHAR(20) NOT NULL,                      -- ACTIVE, PAUSED, DELETED
    optimization_goal VARCHAR(50),                    -- CONVERSIONS, CLICKS等
    billing_event VARCHAR(50),                        -- IMPRESSIONS, CLICKS等
    
    -- Budget & Schedule
    daily_budget DECIMAL(10,2),
    lifetime_budget DECIMAL(10,2),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Targeting (詳細)
    targeting JSON,                                   -- 詳細ターゲティング
    age_min INTEGER,
    age_max INTEGER,
    genders JSON,                                     -- 性別ターゲティング
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE
);

-- Meta 広告情報（クリエイティブ単位）
CREATE TABLE meta_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id VARCHAR(50) UNIQUE NOT NULL,                -- Meta Ad ID
    adset_id VARCHAR(50) NOT NULL,                    -- 所属広告セット
    campaign_id VARCHAR(50) NOT NULL,                 -- 所属キャンペーン
    account_id VARCHAR(50) NOT NULL,                  -- 所属アカウント
    name VARCHAR(255) NOT NULL,                       -- 広告名
    
    -- Ad Configuration
    status VARCHAR(20) NOT NULL,                      -- ACTIVE, PAUSED, DELETED
    
    -- Creative Information
    creative_id VARCHAR(50),                          -- Meta Creative ID
    ad_format VARCHAR(50),                            -- SINGLE_IMAGE, VIDEO, CAROUSEL等
    creative_type VARCHAR(50),                        -- image, video, text, carousel
    
    -- Creative Assets
    image_url VARCHAR(500),                           -- 画像URL
    video_url VARCHAR(500),                           -- 動画URL  
    title VARCHAR(255),                               -- タイトル
    body TEXT,                                        -- 本文
    call_to_action VARCHAR(50),                       -- CTA種別
    
    -- Creative Metadata
    image_hash VARCHAR(64),                           -- 画像ハッシュ（重複検出用）
    video_duration INTEGER,                           -- 動画長（秒）
    creative_size VARCHAR(20),                        -- クリエイティブサイズ
    
    -- Platform & Placement
    platforms JSON,                                   -- facebook, instagram, audience_network
    placements JSON,                                  -- feed, story, reels, etc
    
    -- Tracking
    tracking_specs JSON,                              -- コンバージョントラッキング
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (adset_id) REFERENCES meta_adsets(adset_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE
);

-- ============================================================================
-- Metrics & Performance Data - メトリクス・パフォーマンスデータ
-- ============================================================================

-- 日次パフォーマンスメトリクス（Meta API insights統合）
CREATE TABLE daily_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Information
    ad_id VARCHAR(50) NOT NULL,
    adset_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    
    -- Date Information
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    
    -- Basic Performance Metrics
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Conversion Metrics
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0.00,
    cost_per_conversion DECIMAL(8,2) DEFAULT 0.00,
    
    -- Rate Metrics
    ctr DECIMAL(8,4) NOT NULL DEFAULT 0.0000,        -- Click Through Rate
    unique_ctr DECIMAL(8,4) DEFAULT 0.0000,          -- Unique Click Through Rate
    inline_link_click_ctr DECIMAL(8,4) DEFAULT 0.0000, -- Inline Link Click Through Rate
    cpc DECIMAL(8,2) DEFAULT 0.00,                   -- Cost Per Click
    cpm DECIMAL(8,2) DEFAULT 0.00,                   -- Cost Per Mille
    cpp DECIMAL(8,2) DEFAULT 0.00,                   -- Cost Per Purchase
    
    -- Advanced Metrics
    video_views INTEGER DEFAULT 0,
    video_view_rate DECIMAL(8,4) DEFAULT 0.0000,
    video_avg_time_watched_seconds DECIMAL(8,2) DEFAULT 0.00,
    
    -- KPI Metrics
    roas DECIMAL(8,4) DEFAULT 0.0000,                -- Return on Ad Spend
    cpa DECIMAL(8,2) DEFAULT 0.00,                   -- Cost Per Acquisition
    
    -- Instagram Specific Metrics
    instagram_profile_views INTEGER DEFAULT 0,
    instagram_follows INTEGER DEFAULT 0,
    instagram_saves INTEGER DEFAULT 0,
    instagram_shares INTEGER DEFAULT 0,
    instagram_comments INTEGER DEFAULT 0,
    instagram_likes INTEGER DEFAULT 0,
    
    -- Engagement Metrics
    engagement_rate DECIMAL(8,4) DEFAULT 0.0000,
    profile_visit_rate DECIMAL(8,4) DEFAULT 0.0000,
    follow_rate DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Data Quality & Metadata
    data_completeness DECIMAL(3,2) DEFAULT 1.00,     -- データ完全性 (0.00-1.00)
    api_version VARCHAR(10),                          -- Meta API バージョン
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (ad_id) REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
    FOREIGN KEY (adset_id) REFERENCES meta_adsets(adset_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_date_order CHECK (date_start <= date_stop),
    CONSTRAINT chk_positive_metrics CHECK (impressions >= 0 AND clicks >= 0 AND spend >= 0)
);

-- ============================================================================
-- ECforce Integration - ECforce統合
-- ============================================================================

-- ECforce オーダーデータ
CREATE TABLE ecforce_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Order Information
    order_id VARCHAR(50) UNIQUE NOT NULL,             -- ECforce オーダーID
    customer_id VARCHAR(50),                          -- 顧客ID
    
    -- Order Details
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(50),                               -- 注文ステータス
    total_amount DECIMAL(12,2) NOT NULL,              -- 注文総額
    tax_amount DECIMAL(12,2) DEFAULT 0.00,           -- 税額
    shipping_amount DECIMAL(12,2) DEFAULT 0.00,      -- 送料
    discount_amount DECIMAL(12,2) DEFAULT 0.00,      -- 割引額
    
    -- Customer Information
    customer_email VARCHAR(255),
    customer_age INTEGER,
    customer_gender VARCHAR(10),
    customer_prefecture VARCHAR(20),
    
    -- Attribution Data
    utm_source VARCHAR(100),                          -- 流入元
    utm_medium VARCHAR(100),                          -- メディア
    utm_campaign VARCHAR(100),                        -- キャンペーン
    utm_content VARCHAR(100),                         -- 広告コンテンツ
    fb_click_id VARCHAR(100),                         -- Facebook Click ID (fbc)
    fb_browser_id VARCHAR(100),                       -- Facebook Browser ID (fbp)
    
    -- Product Information
    products JSON,                                    -- 購入商品詳細
    product_categories JSON,                          -- 商品カテゴリ
    
    -- System Fields
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_order_amount_positive CHECK (total_amount >= 0)
);

-- ECforce 商品マスタ
CREATE TABLE ecforce_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(50) UNIQUE NOT NULL,           -- ECforce 商品ID
    name VARCHAR(255) NOT NULL,                       -- 商品名
    category VARCHAR(100),                            -- カテゴリ
    price DECIMAL(10,2) NOT NULL,                     -- 単価
    cost DECIMAL(10,2),                               -- 原価
    margin_rate DECIMAL(5,4),                         -- 粗利率
    
    -- Product Metadata
    sku VARCHAR(100),
    jan_code VARCHAR(13),
    description TEXT,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Fatigue Analysis Results - 疲労度分析結果
-- ============================================================================

-- ベースライン計算結果
CREATE TABLE fatigue_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Information
    ad_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    
    -- Baseline Metrics (30-day average)
    baseline_ctr DECIMAL(8,4) NOT NULL,
    baseline_unique_ctr DECIMAL(8,4) NOT NULL,
    baseline_inline_link_click_ctr DECIMAL(8,4) NOT NULL,
    baseline_cpm DECIMAL(8,2) NOT NULL,
    baseline_frequency DECIMAL(8,4) NOT NULL,
    baseline_engagement_rate DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Calculation Period
    calculation_start_date DATE NOT NULL,
    calculation_end_date DATE NOT NULL,
    days_included INTEGER NOT NULL,                   -- 実際にデータがあった日数
    
    -- Quality Indicators
    data_quality DECIMAL(3,2) NOT NULL,              -- データ品質 (0.00-1.00)
    confidence DECIMAL(3,2) NOT NULL,                -- 信頼度 (0.00-1.00)
    is_industry_average BOOLEAN DEFAULT FALSE,       -- 業界平均値使用フラグ
    
    -- Calculation Metadata
    calculation_version VARCHAR(20) DEFAULT '1.0',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (ad_id) REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_baseline_period CHECK (calculation_start_date <= calculation_end_date),
    CONSTRAINT chk_baseline_quality CHECK (data_quality >= 0.0 AND data_quality <= 1.0),
    CONSTRAINT chk_baseline_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- 疲労度分析結果
CREATE TABLE fatigue_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id VARCHAR(50) UNIQUE NOT NULL,          -- 分析結果ID
    
    -- Target Information
    ad_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    
    -- Overall Fatigue Score
    total_score INTEGER NOT NULL,                     -- 総合疲労度スコア (0-100)
    creative_score INTEGER NOT NULL,                  -- クリエイティブ疲労スコア (0-100)
    audience_score INTEGER NOT NULL,                  -- 視聴者疲労スコア (0-100)
    algorithm_score INTEGER NOT NULL,                 -- アルゴリズム疲労スコア (0-100)
    
    -- Status & Classification
    fatigue_status VARCHAR(20) NOT NULL,             -- healthy, warning, critical
    primary_issue VARCHAR(20),                       -- creative, audience, algorithm
    
    -- Detailed Metrics
    creative_metrics JSON NOT NULL,                   -- CreativeFatigueMetrics
    audience_metrics JSON NOT NULL,                   -- AudienceFatigueMetrics
    algorithm_metrics JSON NOT NULL,                  -- AlgorithmFatigueMetrics
    instagram_metrics JSON,                           -- InstagramMetrics (optional)
    
    -- Analysis Results
    identified_issues JSON,                           -- 特定された問題点
    recommendations JSON,                             -- 推奨アクション
    alerts JSON,                                      -- アラート情報
    
    -- Quality & Confidence
    confidence DECIMAL(3,2) NOT NULL,                -- 分析信頼度 (0.00-1.00)
    data_quality DECIMAL(3,2) NOT NULL,              -- データ品質 (0.00-1.00)
    
    -- Analysis Metadata
    analysis_version VARCHAR(20) DEFAULT '1.0',      -- 分析アルゴリズムバージョン
    config_used JSON,                                -- 使用した設定
    processing_time INTEGER,                         -- 処理時間（ミリ秒）
    
    -- System Fields
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (ad_id) REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_fatigue_scores CHECK (
        total_score >= 0 AND total_score <= 100 AND
        creative_score >= 0 AND creative_score <= 100 AND
        audience_score >= 0 AND audience_score <= 100 AND
        algorithm_score >= 0 AND algorithm_score <= 100
    ),
    CONSTRAINT chk_fatigue_status CHECK (fatigue_status IN ('healthy', 'warning', 'critical')),
    CONSTRAINT chk_primary_issue CHECK (primary_issue IN ('creative', 'audience', 'algorithm'))
);

-- ============================================================================
-- Aggregated KPI Views - KPI集約ビュー
-- ============================================================================

-- 日次KPI集約（広告単位）
CREATE TABLE daily_ad_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target & Date
    ad_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    
    -- Creative Classification
    creative_type VARCHAR(50),                        -- image, video, text, carousel
    ad_format VARCHAR(50),                            -- SINGLE_IMAGE, VIDEO, CAROUSEL
    
    -- Core KPIs
    spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0.00,
    
    -- Calculated KPIs
    ctr DECIMAL(8,4) DEFAULT 0.0000,
    cpc DECIMAL(8,2) DEFAULT 0.00,
    cpm DECIMAL(8,2) DEFAULT 0.00,
    cpa DECIMAL(8,2) DEFAULT 0.00,                    -- Cost Per Acquisition
    roas DECIMAL(8,4) DEFAULT 0.0000,                -- Return on Ad Spend
    
    -- ECforce Attribution (when available)
    attributed_orders INTEGER DEFAULT 0,
    attributed_revenue DECIMAL(12,2) DEFAULT 0.00,
    
    -- Fatigue Score (latest)
    fatigue_score INTEGER,                           -- 最新の疲労度スコア
    fatigue_status VARCHAR(20),                      -- healthy, warning, critical
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (ad_id) REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE(ad_id, date),
    CONSTRAINT chk_kpi_positive CHECK (spend >= 0 AND impressions >= 0 AND clicks >= 0)
);

-- キャンペーン単位日次KPI集約
CREATE TABLE daily_campaign_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target & Date
    campaign_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    
    -- Aggregate Metrics
    total_spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_impressions BIGINT NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_conversion_value DECIMAL(12,2) DEFAULT 0.00,
    
    -- Creative Type Breakdown
    video_spend DECIMAL(12,2) DEFAULT 0.00,
    image_spend DECIMAL(12,2) DEFAULT 0.00,
    text_spend DECIMAL(12,2) DEFAULT 0.00,
    carousel_spend DECIMAL(12,2) DEFAULT 0.00,
    
    video_conversions INTEGER DEFAULT 0,
    image_conversions INTEGER DEFAULT 0,
    text_conversions INTEGER DEFAULT 0,
    carousel_conversions INTEGER DEFAULT 0,
    
    -- Average KPIs
    avg_ctr DECIMAL(8,4) DEFAULT 0.0000,
    avg_cpc DECIMAL(8,2) DEFAULT 0.00,
    avg_cpm DECIMAL(8,2) DEFAULT 0.00,
    avg_cpa DECIMAL(8,2) DEFAULT 0.00,
    avg_roas DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Fatigue Analysis
    ads_healthy INTEGER DEFAULT 0,
    ads_warning INTEGER DEFAULT 0,
    ads_critical INTEGER DEFAULT 0,
    avg_fatigue_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (campaign_id) REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE(campaign_id, date)
);

-- ============================================================================
-- Alert & Notification System - アラート・通知システム
-- ============================================================================

-- アラート定義・ルール
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Rule Conditions
    metric VARCHAR(50) NOT NULL,                      -- fatigue_score, ctr, cpa等
    operator VARCHAR(10) NOT NULL,                    -- gt, lt, eq, gte, lte
    threshold_value DECIMAL(12,4) NOT NULL,
    duration_minutes INTEGER DEFAULT 0,              -- 持続時間条件
    
    -- Scope
    account_id VARCHAR(50),                          -- NULL = 全アカウント適用
    campaign_id VARCHAR(50),                         -- NULL = 全キャンペーン適用
    
    -- Actions
    alert_level VARCHAR(20) NOT NULL,                -- info, warning, critical
    notification_channels JSON,                      -- email, webhook, dashboard
    
    -- Rule Status
    enabled BOOLEAN DEFAULT TRUE,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    -- Constraints
    CONSTRAINT chk_alert_operator CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
    CONSTRAINT chk_alert_level CHECK (alert_level IN ('info', 'warning', 'critical'))
);

-- 発生したアラート
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(50) UNIQUE NOT NULL,
    rule_id VARCHAR(50) NOT NULL,
    
    -- Target Information
    ad_id VARCHAR(50),
    campaign_id VARCHAR(50),
    account_id VARCHAR(50) NOT NULL,
    
    -- Alert Details
    alert_level VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Trigger Information
    triggered_by_metric VARCHAR(50) NOT NULL,
    current_value DECIMAL(12,4) NOT NULL,
    threshold_value DECIMAL(12,4) NOT NULL,
    comparison_type VARCHAR(10) NOT NULL,
    
    -- Alert Status
    status VARCHAR(20) DEFAULT 'active',              -- active, acknowledged, resolved
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID,
    resolved_at TIMESTAMP,
    
    -- Notification Status
    notifications_sent JSON,                         -- 送信済み通知の記録
    
    -- System Fields
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (rule_id) REFERENCES alert_rules(rule_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES meta_accounts(account_id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

-- ============================================================================
-- Data Import & Sync Management - データインポート・同期管理
-- ============================================================================

-- データインポート履歴
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Job Configuration
    job_type VARCHAR(50) NOT NULL,                    -- meta_api, ecforce_csv, manual
    data_source VARCHAR(100),                         -- API endpoint or file path
    
    -- Target Information
    account_id VARCHAR(50),
    date_range_start DATE,
    date_range_end DATE,
    
    -- Job Status
    status VARCHAR(20) NOT NULL,                      -- running, completed, failed
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSON,
    
    -- Performance
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    -- Constraints
    CONSTRAINT chk_import_status CHECK (status IN ('running', 'completed', 'failed')),
    CONSTRAINT chk_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- ============================================================================
-- System Configuration & Settings - システム設定
-- ============================================================================

-- システム設定
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_category VARCHAR(100) NOT NULL,           -- fatigue, kpi, integration, ui
    
    -- Setting Value
    setting_value JSON NOT NULL,
    default_value JSON,
    setting_type VARCHAR(50),                         -- string, number, boolean, json
    
    -- Validation
    validation_rules JSON,                            -- バリデーションルール
    
    -- Access Control
    access_level VARCHAR(20) DEFAULT 'admin',         -- admin, user, system
    editable BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    description TEXT,
    environment VARCHAR(50) DEFAULT 'production',
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- ============================================================================
-- Indexes for Performance - パフォーマンス用インデックス
-- ============================================================================

-- Meta Accounts
CREATE INDEX idx_meta_accounts_status ON meta_accounts(status);
CREATE INDEX idx_meta_accounts_business_id ON meta_accounts(business_id);

-- Meta Campaigns  
CREATE INDEX idx_meta_campaigns_account_status ON meta_campaigns(account_id, status);
CREATE INDEX idx_meta_campaigns_objective ON meta_campaigns(objective);

-- Meta Ads
CREATE INDEX idx_meta_ads_campaign_id ON meta_ads(campaign_id);
CREATE INDEX idx_meta_ads_creative_type ON meta_ads(creative_type);
CREATE INDEX idx_meta_ads_status ON meta_ads(status);

-- Daily Performance Metrics
CREATE INDEX idx_daily_metrics_ad_date ON daily_performance_metrics(ad_id, date_start DESC);
CREATE INDEX idx_daily_metrics_campaign_date ON daily_performance_metrics(campaign_id, date_start DESC);
CREATE INDEX idx_daily_metrics_account_date ON daily_performance_metrics(account_id, date_start DESC);
CREATE INDEX idx_daily_metrics_spend ON daily_performance_metrics(spend DESC);
CREATE INDEX idx_daily_metrics_roas ON daily_performance_metrics(roas DESC);

-- ECforce Orders
CREATE INDEX idx_ecforce_orders_date ON ecforce_orders(order_date DESC);
CREATE INDEX idx_ecforce_orders_customer ON ecforce_orders(customer_id);
CREATE INDEX idx_ecforce_orders_utm_campaign ON ecforce_orders(utm_campaign);
CREATE INDEX idx_ecforce_orders_fb_click_id ON ecforce_orders(fb_click_id);

-- Fatigue Analysis
CREATE INDEX idx_fatigue_analysis_ad_analyzed ON fatigue_analysis_results(ad_id, analyzed_at DESC);
CREATE INDEX idx_fatigue_analysis_status ON fatigue_analysis_results(fatigue_status);
CREATE INDEX idx_fatigue_analysis_total_score ON fatigue_analysis_results(total_score);

-- Daily KPIs
CREATE INDEX idx_daily_ad_kpis_ad_date ON daily_ad_kpis(ad_id, date DESC);
CREATE INDEX idx_daily_ad_kpis_creative_type ON daily_ad_kpis(creative_type, date DESC);
CREATE INDEX idx_daily_campaign_kpis_campaign_date ON daily_campaign_kpis(campaign_id, date DESC);

-- Alerts
CREATE INDEX idx_alerts_account_status ON alerts(account_id, status);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_level ON alerts(alert_level);

-- ============================================================================
-- Views for Analysis - 分析用ビュー
-- ============================================================================

-- 最新疲労度分析結果ビュー
CREATE VIEW latest_fatigue_analysis AS
SELECT DISTINCT ON (ad_id) 
    ad_id,
    campaign_id,
    account_id,
    total_score,
    creative_score,
    audience_score,
    algorithm_score,
    fatigue_status,
    primary_issue,
    confidence,
    analyzed_at
FROM fatigue_analysis_results
ORDER BY ad_id, analyzed_at DESC;

-- クリエイティブ種別別パフォーマンスビュー
CREATE VIEW creative_performance_summary AS
SELECT 
    m.account_id,
    m.campaign_id,
    m.creative_type,
    COUNT(DISTINCT m.ad_id) as ad_count,
    SUM(k.spend) as total_spend,
    SUM(k.impressions) as total_impressions,
    SUM(k.clicks) as total_clicks,
    SUM(k.conversions) as total_conversions,
    AVG(k.ctr) as avg_ctr,
    AVG(k.cpc) as avg_cpc,
    AVG(k.cpm) as avg_cpm,
    AVG(k.cpa) as avg_cpa,
    AVG(k.roas) as avg_roas,
    AVG(f.total_score) as avg_fatigue_score
FROM meta_ads m
JOIN daily_ad_kpis k ON m.ad_id = k.ad_id
LEFT JOIN latest_fatigue_analysis f ON m.ad_id = f.ad_id
WHERE k.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.account_id, m.campaign_id, m.creative_type;

-- アカウント横断KPIビュー
CREATE VIEW cross_account_kpi_summary AS
SELECT 
    ma.account_id,
    ma.name as account_name,
    COUNT(DISTINCT mc.campaign_id) as campaign_count,
    COUNT(DISTINCT m.ad_id) as ad_count,
    SUM(k.spend) as total_spend,
    SUM(k.conversions) as total_conversions,
    SUM(k.conversion_value) as total_revenue,
    AVG(k.roas) as avg_roas,
    AVG(k.cpa) as avg_cpa,
    -- クリエイティブ種別内訳
    SUM(CASE WHEN m.creative_type = 'video' THEN k.spend ELSE 0 END) as video_spend,
    SUM(CASE WHEN m.creative_type = 'image' THEN k.spend ELSE 0 END) as image_spend,
    SUM(CASE WHEN m.creative_type = 'text' THEN k.spend ELSE 0 END) as text_spend,
    SUM(CASE WHEN m.creative_type = 'carousel' THEN k.spend ELSE 0 END) as carousel_spend,
    -- 疲労度集約
    AVG(f.total_score) as avg_fatigue_score,
    COUNT(CASE WHEN f.fatigue_status = 'critical' THEN 1 END) as critical_ads,
    COUNT(CASE WHEN f.fatigue_status = 'warning' THEN 1 END) as warning_ads,
    COUNT(CASE WHEN f.fatigue_status = 'healthy' THEN 1 END) as healthy_ads
FROM meta_accounts ma
JOIN meta_campaigns mc ON ma.account_id = mc.account_id
JOIN meta_ads m ON mc.campaign_id = m.campaign_id
JOIN daily_ad_kpis k ON m.ad_id = k.ad_id
LEFT JOIN latest_fatigue_analysis f ON m.ad_id = f.ad_id
WHERE k.date >= CURRENT_DATE - INTERVAL '30 days'
  AND ma.status = 'active'
GROUP BY ma.account_id, ma.name;

-- ============================================================================
-- Sample Data & Configuration - サンプルデータ・設定
-- ============================================================================

-- システム設定のサンプル
INSERT INTO system_settings (setting_key, setting_category, setting_value, description) VALUES
('fatigue_calculation_config', 'fatigue', 
 '{"creative": {"ctrDeclineWarning": 25, "ctrDeclineCritical": 50, "weights": {"ctr": 2.0, "uniqueCtr": 1.5, "linkClickCtr": 1.0}}, "audience": {"frequencyWarning": 3.5, "frequencyCritical": 5.0, "weights": {"frequency": 3.0, "firstImpression": 2.0}}, "algorithm": {"cpmIncreaseWarning": 20, "cpmIncreaseCritical": 40, "weights": {"cpmIncrease": 2.5, "deliveryVolume": 1.5}}, "overallWeights": {"creative": 0.4, "audience": 0.35, "algorithm": 0.25}}',
 '疲労度計算設定'),
('kpi_thresholds', 'kpi',
 '{"roas_warning": 2.0, "roas_critical": 1.0, "cpa_warning": 5000, "cpa_critical": 10000, "ctr_warning": 0.01, "ctr_critical": 0.005}',
 'KPI閾値設定'),
('instagram_benchmarks', 'integration',
 '{"feed_engagement_rate": 0.007, "reel_engagement_rate": 0.0123, "story_engagement_rate": 0.005}',
 'Instagram ベンチマーク値'),
('data_retention_days', 'system',
 '{"raw_metrics": 365, "fatigue_analysis": 180, "alerts": 90, "import_jobs": 30}',
 'データ保持期間設定');

-- 基本アラートルールのサンプル
INSERT INTO alert_rules (rule_id, name, metric, operator, threshold_value, alert_level, notification_channels) VALUES
('fatigue_critical', '疲労度クリティカル', 'fatigue_score', 'lt', 50, 'critical', '["email", "dashboard"]'),
('fatigue_warning', '疲労度警告', 'fatigue_score', 'lt', 70, 'warning', '["dashboard"]'),
('roas_low', 'ROAS低下', 'roas', 'lt', 2.0, 'warning', '["email", "dashboard"]'),
('cpa_high', 'CPA高騰', 'cpa', 'gt', 5000, 'warning', '["dashboard"]');

-- ============================================================================
-- Maintenance & Cleanup - メンテナンス・クリーンアップ
-- ============================================================================

-- データ保持ポリシー関数（例）
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- 古い日次メトリクスの削除（365日超）
    DELETE FROM daily_performance_metrics 
    WHERE date_start < CURRENT_DATE - INTERVAL '365 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- 古い疲労度分析の削除（180日超）
    DELETE FROM fatigue_analysis_results 
    WHERE analyzed_at < CURRENT_TIMESTAMP - INTERVAL '180 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- 解決済みアラートの削除（90日超）
    DELETE FROM alerts 
    WHERE status = 'resolved' 
    AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;