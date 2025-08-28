# API エンドポイント仕様

## 概要

Meta広告疲労度分析ダッシュボード UI/UX改善における API エンドポイント設計。既存のMeta API Clientと Convex Functions を拡張し、媒体別データの効率的な取得と集約処理を実現する。

## 基本設計方針

- 既存APIとの互換性維持 (REQ-401, REQ-403準拠)
- 媒体別データの効率的な取得 (REQ-003対応)
- データ整合性の保証 (REQ-006, REQ-007対応)
- パフォーマンス要件への対応 (NFR-001~003準拠)

## ============================================================================
## ENHANCED META API CLIENT ENDPOINTS
## ============================================================================

### 1. 拡張された広告インサイト取得

#### GET /api/meta/insights/enhanced
既存のinsightsエンドポイントを拡張し、媒体別データを含む詳細な情報を取得

**リクエスト:**
```typescript
interface EnhancedInsightsRequest {
  adIds: string[]
  dateRange: {
    start: string  // YYYY-MM-DD
    end: string    // YYYY-MM-DD
  }
  metrics: string[]
  // 新規: 媒体別データ要求
  includePlatformBreakdown: boolean
  platforms?: ('facebook' | 'instagram' | 'audience_network')[]
  // データ整合性チェック
  validateConsistency: boolean
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "ad_id": "123456789",
      "ad_name": "Sample Ad",
      "campaign_id": "987654321",
      "campaign_name": "Sample Campaign",
      "date_start": "2025-01-01",
      "date_stop": "2025-01-01",
      
      // 全体メトリクス
      "total_metrics": {
        "impressions": 2000,
        "clicks": 100,
        "spend": 50.0,
        "ctr": 5.0,
        "cpm": 25.0,
        "conversions": 10,
        "first_conversions": 8
      },
      
      // 媒体別メトリクス (REQ-003対応)
      "platform_breakdown": {
        "facebook": {
          "impressions": 1000,
          "clicks": 50,
          "spend": 25.0,
          "ctr": 5.0,
          "cpm": 25.0,
          "conversions": 6,
          "first_conversions": 5
        },
        "instagram": {
          "impressions": 800,
          "clicks": 40,
          "spend": 20.0,
          "ctr": 5.0,
          "cpm": 25.0,
          "conversions": 3,
          "first_conversions": 2
        },
        "audience_network": {
          "impressions": 200,
          "clicks": 10,
          "spend": 5.0,
          "ctr": 5.0,
          "cpm": 25.0,
          "conversions": 1,
          "first_conversions": 1
        }
      },
      
      // データ整合性情報 (REQ-006, REQ-007対応)
      "consistency_check": {
        "is_consistent": true,
        "total_mismatch": 0.0,
        "adjustment_applied": false,
        "platform_checks": {
          "facebook": { "is_valid": true, "original_value": 1000 },
          "instagram": { "is_valid": true, "original_value": 800 },
          "audience_network": { "is_valid": true, "original_value": 200 }
        },
        "timestamp": "2025-08-28T10:00:00Z"
      }
    }
  ],
  "metadata": {
    "processing_time_ms": 850,
    "total_records": 1,
    "api_version": "v23.0",
    "cache_hit": false
  }
}
```

### 2. 媒体別時系列データ取得

#### GET /api/meta/insights/platform-timeseries
チャート表示用の媒体別時系列データを効率的に取得

**リクエスト:**
```typescript
interface PlatformTimeSeriesRequest {
  adId: string
  dateRange: {
    start: string
    end: string
  }
  metric: 'spend' | 'impressions' | 'ctr' | 'frequency' | 'clicks' | 'conversions'
  platforms: ('facebook' | 'instagram' | 'audience_network')[]
  aggregation: 'daily' | 'weekly' | 'monthly'
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "facebook": 25.0,
      "instagram": 20.0,
      "audience_network": 5.0,
      "total": 50.0,
      "_metadata": {
        "calculated_total": 50.0,
        "adjustment_applied": false
      }
    },
    {
      "date": "2025-01-02",
      "facebook": 30.0,
      "instagram": 25.0,
      "audience_network": 8.0,
      "total": 63.0,
      "_metadata": {
        "calculated_total": 63.0,
        "adjustment_applied": false
      }
    }
  ],
  "chart_config": {
    "colors": {
      "facebook": "#1877F2",
      "instagram": "#E4405F",
      "audience_network": "#42B883"
    },
    "line_styles": {
      "facebook": "solid",
      "instagram": "dashed",
      "audience_network": "dotted"
    }
  },
  "metadata": {
    "metric_type": "spend",
    "date_range_days": 2,
    "processing_time_ms": 423
  }
}
```

## ============================================================================
## CONVEX FUNCTIONS (Backend Processing)
## ============================================================================

### 3. データ集約と整合性チェック

#### POST /api/convex/aggregate-platform-data
Convex関数として実装される集約処理エンドポイント

**Function:** `aggregatePlatformData`

**引数:**
```typescript
interface AggregationArgs {
  rawInsights: MetaApiInsight[]
  options: {
    groupBy: 'ad' | 'adset' | 'campaign'
    includePlatformBreakdown: boolean
    includeDailyBreakdown: boolean
    validateConsistency: boolean
    adjustForRounding: boolean  // REQ-007対応
  }
}
```

**戻り値:**
```typescript
interface AggregationResult {
  aggregated_data: EnhancedAdPerformanceData[]
  processing_summary: {
    input_records: number
    output_records: number
    processing_time_ms: number
    consistency_checks_passed: number
    consistency_checks_failed: number
    adjustments_applied: number
  }
  errors: Array<{
    type: string
    message: string
    ad_id?: string
    severity: 'warning' | 'error'
  }>
}
```

### 4. 疲労度スコア計算（媒体別対応）

#### POST /api/convex/calculate-platform-fatigue
媒体別の疲労度スコアを計算する Convex 関数

**Function:** `calculatePlatformFatigue`

**引数:**
```typescript
interface PlatformFatigueArgs {
  adId: string
  platformData: Record<PlatformType, BaseMetrics[]>
  baselineMetrics: BaselineMetrics
  options: {
    include_platform_specific: boolean
    calculation_method: 'weighted_average' | 'individual'
  }
}
```

**戻り値:**
```typescript
interface PlatformFatigueResult {
  overall_score: number
  overall_status: 'healthy' | 'caution' | 'warning' | 'critical'
  platform_scores: Record<PlatformType, {
    score: number
    status: string
    contributing_factors: {
      frequency: number
      ctr_decline: number
      cpm_increase: number
    }
  }>
  calculation_metadata: {
    algorithm_version: string
    calculation_date: string
    confidence_level: number
  }
}
```

## ============================================================================
## CHART DATA ENDPOINTS
## ============================================================================

### 5. チャート用データ変換

#### GET /api/chart/multi-line-data
マルチラインチャート表示用にフォーマットされたデータを取得

**リクエスト:**
```typescript
interface ChartDataRequest {
  adId: string
  metric: ChartMetricType
  dateRange: { start: string; end: string }
  platforms: PlatformType[]
  options: {
    include_total_line: boolean  // REQ-301対応
    enable_tooltip_data: boolean
    responsive_mode: 'desktop' | 'tablet' | 'mobile'
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "chart_data": {
    "data": [
      {
        "date": "2025-01-01",
        "facebook": 25.0,
        "instagram": 20.0,
        "audience_network": 5.0,
        "total": 50.0
      }
    ],
    "config": {
      "colors": {
        "facebook": "#1877F2",
        "instagram": "#E4405F", 
        "audience_network": "#42B883",
        "total": "#666666"
      },
      "line_styles": {
        "facebook": "solid",
        "instagram": "dashed",
        "audience_network": "dotted",
        "total": "solid"
      },
      "accessibility": {
        "aria_labels": {
          "facebook": "Facebook performance data",
          "instagram": "Instagram performance data",
          "audience_network": "Audience Network performance data"
        },
        "screen_reader_description": "Multi-platform advertising performance chart showing data for Facebook, Instagram, and Audience Network"
      }
    }
  },
  "tooltip_data": [
    {
      "date": "2025-01-01",
      "metric": "spend",
      "values": {
        "facebook": {
          "value": 25.0,
          "formatted": "$25.00",
          "change": { "value": 2.5, "percentage": 11.1, "direction": "up" }
        },
        "instagram": {
          "value": 20.0,
          "formatted": "$20.00",
          "change": { "value": -1.0, "percentage": -4.8, "direction": "down" }
        },
        "audience_network": {
          "value": 5.0,
          "formatted": "$5.00",
          "change": { "value": 0.5, "percentage": 11.1, "direction": "up" }
        }
      },
      "total": {
        "value": 50.0,
        "formatted": "$50.00",
        "change": { "value": 2.0, "percentage": 4.2, "direction": "up" }
      }
    }
  ]
}
```

### 6. リアルタイムデータ更新

#### WebSocket: /ws/chart-updates
リアルタイムでのチャートデータ更新（オプション機能）

**接続:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/chart-updates');
ws.send(JSON.stringify({
  type: 'SUBSCRIBE_AD_CHART',
  adId: '123456789',
  metrics: ['spend', 'impressions']
}));
```

**受信メッセージ:**
```json
{
  "type": "CHART_DATA_UPDATE",
  "ad_id": "123456789",
  "metric": "spend",
  "new_data_point": {
    "date": "2025-01-03",
    "facebook": 28.0,
    "instagram": 22.0,
    "audience_network": 6.0,
    "total": 56.0
  },
  "timestamp": "2025-08-28T12:00:00Z"
}
```

## ============================================================================
## ERROR HANDLING ENDPOINTS
## ============================================================================

### 7. エラー処理とフォールバック

#### GET /api/errors/platform-data-status
媒体別データの可用性チェック (EDGE-001対応)

**レスポンス:**
```json
{
  "success": true,
  "platform_status": {
    "facebook": {
      "available": true,
      "last_updated": "2025-08-28T11:30:00Z",
      "data_completeness": 100
    },
    "instagram": {
      "available": true,
      "last_updated": "2025-08-28T11:25:00Z",
      "data_completeness": 95,
      "issues": ["Some engagement metrics delayed"]
    },
    "audience_network": {
      "available": false,
      "last_updated": "2025-08-28T10:00:00Z",
      "data_completeness": 0,
      "error": "API rate limit exceeded",
      "estimated_recovery": "2025-08-28T13:00:00Z"
    }
  },
  "fallback_options": {
    "use_cached_data": true,
    "estimate_missing_platforms": false,
    "show_partial_data": true
  }
}
```

#### POST /api/errors/report-chart-error
チャート表示エラーの報告

**リクエスト:**
```json
{
  "error_type": "RENDER_ERROR",
  "error_message": "Chart failed to render with large dataset",
  "context": {
    "ad_id": "123456789",
    "metric": "impressions",
    "data_points": 1500,
    "browser": "Chrome 120.0",
    "screen_resolution": "1920x1080"
  },
  "stack_trace": "Error: Canvas rendering failed...",
  "user_action": "Switched to simplified view"
}
```

## ============================================================================
## CONFIGURATION AND SETTINGS
## ============================================================================

### 8. チャート設定管理

#### GET /api/settings/chart-config
ユーザーのチャート設定を取得

**リクエスト Parameters:**
- `account_id`: string (required)
- `user_id`: string (optional)

**レスポンス:**
```json
{
  "success": true,
  "config": {
    "default_platforms": {
      "facebook": true,
      "instagram": true,
      "audience_network": true
    },
    "default_metric": "spend",
    "show_total_line": false,
    "accessibility": {
      "high_contrast_mode": false,
      "screen_reader_enabled": false,
      "keyboard_navigation": true
    },
    "responsive_settings": {
      "mobile_simplified_view": true,
      "tablet_legend_position": "top"
    }
  }
}
```

#### PUT /api/settings/chart-config
チャート設定を更新

**リクエスト:**
```json
{
  "account_id": "act_123456789",
  "config": {
    "default_platforms": {
      "facebook": true,
      "instagram": false,
      "audience_network": true
    },
    "show_total_line": true,
    "accessibility": {
      "high_contrast_mode": true
    }
  }
}
```

## ============================================================================
## PERFORMANCE AND CACHING
## ============================================================================

### 9. キャッシュ管理

#### GET /api/cache/chart-data
チャートデータのキャッシュ状況確認

**リクエスト Parameters:**
- `ad_id`: string
- `metric`: string  
- `date_range`: string

**レスポンス:**
```json
{
  "cache_status": "HIT",
  "cached_at": "2025-08-28T11:00:00Z",
  "expires_at": "2025-08-28T12:00:00Z",
  "data_freshness": "fresh",
  "cache_key": "chart_data_123456789_spend_20250101_20250107"
}
```

#### DELETE /api/cache/invalidate
キャッシュの無効化

**リクエスト:**
```json
{
  "cache_keys": [
    "chart_data_123456789_*",
    "aggregated_data_123456789_*"
  ],
  "reason": "Data refresh requested by user"
}
```

### 10. パフォーマンス監視

#### POST /api/performance/metrics
パフォーマンス指標の記録 (NFR-001~003対応)

**リクエスト:**
```json
{
  "chart_render_time_ms": 850,
  "toggle_response_time_ms": 120,
  "tooltip_display_time_ms": 50,
  "data_aggregation_time_ms": 300,
  "context": {
    "chart_type": "multi_line",
    "platform_count": 3,
    "data_points": 30,
    "device_type": "desktop",
    "browser": "Chrome"
  }
}
```

## ============================================================================
## AUTHENTICATION AND AUTHORIZATION
## ============================================================================

### Headers
すべてのAPIエンドポイントで以下のヘッダーが必要:

```
Authorization: Bearer <meta_access_token>
Content-Type: application/json
X-Account-ID: act_123456789
X-API-Version: v23.0
```

### Rate Limiting
- Meta API Client: Meta Graph APIのレート制限に準拠
- Convex Functions: アカウントあたり 1000 req/min
- Chart Endpoints: ユーザーあたり 100 req/min

### Error Response Format
すべてのエンドポイントで統一されたエラーレスポンス:

```json
{
  "success": false,
  "error": {
    "code": "PLATFORM_DATA_UNAVAILABLE",
    "message": "Instagram data is temporarily unavailable",
    "details": {
      "affected_platforms": ["instagram"],
      "estimated_recovery": "2025-08-28T13:00:00Z",
      "fallback_available": true
    },
    "request_id": "req_abc123def456"
  }
}
```

## ============================================================================
## TESTING AND DEVELOPMENT
## ============================================================================

### Mock Endpoints (開発環境)

#### GET /api/dev/mock-platform-data
テスト用のモックデータを生成

**リクエスト Parameters:**
- `ad_count`: number (default: 10)
- `date_range_days`: number (default: 30)
- `include_inconsistencies`: boolean (default: false)

#### POST /api/dev/simulate-error
エラー条件をシミュレート

**リクエスト:**
```json
{
  "error_type": "PLATFORM_UNAVAILABLE",
  "affected_platforms": ["audience_network"],
  "duration_minutes": 5
}
```

## 実装優先順位

### Phase 1 (必須 - 1日)
1. `/api/meta/insights/enhanced` - 基本的な媒体別データ取得
2. `/api/convex/aggregate-platform-data` - データ集約処理
3. `/api/errors/platform-data-status` - エラーハンドリング

### Phase 2 (主要機能 - 3-4日)  
1. `/api/meta/insights/platform-timeseries` - チャート用データ
2. `/api/chart/multi-line-data` - チャートフォーマット
3. `/api/settings/chart-config` - ユーザー設定

### Phase 3 (最適化 - オプション)
1. WebSocket `/ws/chart-updates` - リアルタイム更新
2. `/api/performance/metrics` - パフォーマンス監視
3. `/api/cache/*` - キャッシュ最適化