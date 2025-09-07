-- ============================================
-- Convex Schema Definition for Data Refresh Feature
-- ============================================
-- Note: This is a conceptual schema representation
-- Convex uses its own schema definition syntax
-- ============================================

-- Meta Accounts Table
-- Stores Facebook/Instagram business account information
CREATE TABLE metaAccounts (
    _id TEXT PRIMARY KEY,
    accountId TEXT UNIQUE NOT NULL,
    accountName TEXT NOT NULL,
    isActive BOOLEAN DEFAULT true,
    tokenId TEXT REFERENCES tokens(_id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastSyncedAt TIMESTAMP,
    
    INDEX idx_accountId (accountId),
    INDEX idx_isActive (isActive)
);

-- Meta Insights Table (Updated)
-- Stores advertising insights data from Meta API
CREATE TABLE metaInsights (
    _id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    
    -- Dates
    date_start TEXT,
    date_stop TEXT,
    
    -- Campaign hierarchy
    campaign_id TEXT,
    campaign_name TEXT,
    adset_id TEXT,          -- NEW: Added for ad set tracking
    adset_name TEXT,        -- NEW: Added for ad set tracking
    ad_id TEXT,
    ad_name TEXT,
    
    -- Creative information
    creative_id TEXT,
    creative_name TEXT,
    creative_type TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    carousel_cards JSON,
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5, 2) DEFAULT 0,
    cpc DECIMAL(10, 4) DEFAULT 0,
    cpm DECIMAL(10, 4) DEFAULT 0,
    ctr DECIMAL(5, 4) DEFAULT 0,
    
    -- Conversion metrics
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0,
    cost_per_conversion DECIMAL(10, 2) DEFAULT 0,
    
    -- Engagement metrics
    engagement_rate DECIMAL(5, 4) DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    video_view_rate DECIMAL(5, 4) DEFAULT 0,
    
    -- Instagram specific metrics
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    profile_visits INTEGER DEFAULT 0,
    follows INTEGER DEFAULT 0,
    
    -- Metadata
    publisher_platform TEXT,
    placement TEXT,
    importedAt TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_account_date (accountId, date_start),
    INDEX idx_campaign (campaign_id),
    INDEX idx_adset (adset_id),        -- NEW: Index for ad set queries
    INDEX idx_ad (ad_id),
    INDEX idx_creative (creative_id),
    UNIQUE INDEX idx_unique_insight (accountId, date_start, campaign_id, adset_id, ad_id)
);

-- Sync Status Table
-- Tracks synchronization status and history
CREATE TABLE metaSyncStatus (
    _id TEXT PRIMARY KEY,
    accountId TEXT UNIQUE NOT NULL,
    lastFullSync TIMESTAMP,
    lastIncrementalSync TIMESTAMP,
    totalRecords INTEGER DEFAULT 0,
    earliestDate TEXT,
    latestDate TEXT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_accountId (accountId)
);

-- Token Storage Table
-- Securely stores API tokens
CREATE TABLE tokens (
    _id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    accessToken TEXT NOT NULL,  -- Should be encrypted
    tokenType TEXT DEFAULT 'bearer',
    expiresAt TIMESTAMP,
    scopes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_accountId (accountId),
    INDEX idx_expiresAt (expiresAt)
);

-- Refresh Log Table (for debugging)
-- Tracks all data refresh attempts
CREATE TABLE refreshLogs (
    _id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    startedAt TIMESTAMP NOT NULL,
    completedAt TIMESTAMP,
    status TEXT CHECK (status IN ('started', 'success', 'error', 'timeout')),
    recordsProcessed INTEGER DEFAULT 0,
    errorMessage TEXT,
    errorCode TEXT,
    debugInfo JSON,
    
    INDEX idx_account_time (accountId, startedAt DESC),
    INDEX idx_status (status)
);

-- Error Log Table
-- Detailed error tracking for troubleshooting
CREATE TABLE errorLogs (
    _id TEXT PRIMARY KEY,
    accountId TEXT,
    errorType TEXT NOT NULL,
    errorCode TEXT,
    message TEXT NOT NULL,
    stackTrace TEXT,
    context JSON,
    occurredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    
    INDEX idx_account_error (accountId, errorType),
    INDEX idx_occurred (occurredAt DESC),
    INDEX idx_resolved (resolved)
);

-- ============================================
-- Views for Common Queries
-- ============================================

-- Active accounts with latest sync info
CREATE VIEW active_accounts_status AS
SELECT 
    a._id,
    a.accountId,
    a.accountName,
    a.isActive,
    s.lastFullSync,
    s.lastIncrementalSync,
    s.totalRecords,
    CASE 
        WHEN s.lastFullSync IS NULL THEN 'never'
        WHEN s.lastFullSync < datetime('now', '-1 day') THEN 'stale'
        ELSE 'fresh'
    END as dataStatus
FROM metaAccounts a
LEFT JOIN metaSyncStatus s ON a.accountId = s.accountId
WHERE a.isActive = true;

-- Recent refresh attempts summary
CREATE VIEW recent_refresh_summary AS
SELECT 
    accountId,
    COUNT(*) as attemptCount,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount,
    AVG(CASE 
        WHEN completedAt IS NOT NULL 
        THEN TIMESTAMPDIFF(SECOND, startedAt, completedAt) 
        ELSE NULL 
    END) as avgDurationSeconds,
    MAX(startedAt) as lastAttempt
FROM refreshLogs
WHERE startedAt > datetime('now', '-7 days')
GROUP BY accountId;

-- ============================================
-- Migration Notes
-- ============================================
-- 1. Add adset_id and adset_name to existing metaInsights table
-- 2. Update unique constraint to include adset_id
-- 3. Create index on adset_id for query performance
-- 4. Backfill adset data from Meta API if needed