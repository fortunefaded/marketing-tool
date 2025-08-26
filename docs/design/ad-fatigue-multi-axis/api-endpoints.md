# Ad Fatigue 多軸表示機能 API エンドポイント仕様

## 概要

この機能は主にフロントエンドでのデータ集約で実装されますが、将来的なバックエンド実装を考慮したAPI設計を記載します。また、Meta Graph APIの利用方法も含めます。

## Meta Graph API エンドポイント

### 既存利用エンドポイント

#### GET /v18.0/act_{ad_account_id}/insights
広告クリエイティブレベルのインサイトデータ取得

**パラメータ:**
```
level: 'ad'
fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,impressions,reach,frequency,clicks,spend,conversions,ctr,cpc,cpm,actions'
date_preset: 'last_30d' | 'last_7d' | 'today'
time_increment: '1'
breakdowns: 'publisher_platform'
limit: 100
```

### 追加で必要な情報取得

#### GET /v18.0/act_{ad_account_id}/campaigns
キャンペーン情報の取得（名前、ステータス等）

#### GET /v18.0/act_{ad_account_id}/adsets
広告セット情報の取得（名前、ステータス等）

## 内部API設計（将来的な実装用）

### 集約データ取得

#### POST /api/ad-fatigue/aggregate
表示軸別の集約データを取得

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "viewAxis": "adset" | "campaign",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "status": ["critical", "warning"],
    "minSpend": 1000,
    "campaignIds": ["123", "456"]
  },
  "pagination": {
    "page": 1,
    "limit": 50
  },
  "sort": {
    "field": "fatigueScore",
    "order": "desc"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "adSetId": "23456789",
        "adSetName": "ターゲティングA",
        "campaignId": "12345678",
        "campaignName": "2024年1月キャンペーン",
        "score": 75,
        "status": "warning",
        "creativeCount": 5,
        "metrics": {
          "impressions": 150000,
          "clicks": 3000,
          "spend": 45000,
          "conversions": 50,
          "reach": 100000,
          "frequency": 1.5,
          "ctr": 2.0,
          "cpc": 15,
          "cpm": 300,
          "cvr": 1.67,
          "cpa": 900
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "pages": 1
    },
    "summary": {
      "totalSpend": 500000,
      "averageScore": 45,
      "criticalCount": 2,
      "warningCount": 8
    }
  },
  "meta": {
    "aggregatedAt": "2024-01-15T10:00:00Z",
    "processingTime": 320,
    "dataSource": "realtime"
  }
}
```

### キャッシュ管理

#### GET /api/ad-fatigue/cache/status
キャッシュ状態の確認

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "accountId": "act_123456789",
    "cacheStatus": {
      "creative": {
        "exists": true,
        "lastUpdated": "2024-01-15T09:55:00Z",
        "expiresAt": "2024-01-15T10:00:00Z",
        "size": 1024000,
        "recordCount": 150
      },
      "adset": {
        "exists": true,
        "lastUpdated": "2024-01-15T09:56:00Z",
        "expiresAt": "2024-01-15T10:01:00Z",
        "size": 256000,
        "recordCount": 25
      },
      "campaign": {
        "exists": false
      }
    }
  }
}
```

#### DELETE /api/ad-fatigue/cache
キャッシュのクリア

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "viewAxis": ["adset", "campaign"] // 省略時は全て
}
```

### パフォーマンスメトリクス

#### POST /api/ad-fatigue/metrics
パフォーマンスメトリクスの記録

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "operation": "aggregation",
  "viewAxis": "adset",
  "dataCount": 150,
  "executionTime": 320,
  "memoryUsage": 45.5
}
```

### エクスポート

#### POST /api/ad-fatigue/export
データのエクスポート

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "viewAxis": "campaign",
  "format": "csv" | "xlsx",
  "includeDetails": true
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://example.com/exports/ad-fatigue-campaign-20240115.csv",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

## エラーレスポンス

### 標準エラー形式
```json
{
  "success": false,
  "error": {
    "code": "AGGREGATION_FAILED",
    "message": "データの集約処理に失敗しました",
    "details": {
      "reason": "insufficient_data",
      "minRequired": 10,
      "actualCount": 5
    }
  }
}
```

### エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| `INVALID_VIEW_AXIS` | 無効な表示軸が指定された | 400 |
| `INSUFFICIENT_DATA` | 集約に必要なデータが不足 | 422 |
| `AGGREGATION_FAILED` | 集約処理の失敗 | 500 |
| `CACHE_ERROR` | キャッシュ操作の失敗 | 500 |
| `META_API_ERROR` | Meta APIエラー | 502 |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 | 429 |

## レート制限

- Meta API: 200コール/時間（Meta側の制限に準拠）
- 内部API: 100リクエスト/分/アカウント
- エクスポート: 10リクエスト/時間/アカウント

## セキュリティ

### 認証
- Bearer Token認証（既存の実装に準拠）
- Meta APIトークンは暗号化して保存

### 権限
- アカウントへのアクセス権限チェック
- 表示軸別のアクセス制御（将来的な実装）

### データ保護
- PII（個人識別情報）のマスキング
- ログでのセンシティブ情報除外