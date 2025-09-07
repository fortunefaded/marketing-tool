# API エンドポイント仕様

## 認証 (Authentication)

### POST /auth/login
ユーザーログイン

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "田中太郎",
      "role": "manager"
    },
    "token": "jwt-token-here",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

### POST /auth/logout
ユーザーログアウト

### GET /auth/me
現在のユーザー情報取得

---

## メタ広告アカウント管理 (Meta Accounts)

### GET /api/meta/accounts
メタ広告アカウント一覧取得

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "accountId": "act_123456789",
      "name": "Company A広告アカウント",
      "currency": "JPY",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/meta/accounts
新しいメタ広告アカウントを追加

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "accessToken": "access_token_here"
}
```

### GET /api/meta/accounts/:accountId
特定アカウントの詳細取得

### PUT /api/meta/accounts/:accountId
アカウント情報更新

### DELETE /api/meta/accounts/:accountId
アカウント削除

---

## キャンペーン管理 (Campaigns)

### GET /api/meta/accounts/:accountId/campaigns
キャンペーン一覧取得

**クエリパラメーター:**
- `status`: active, paused, deleted
- `limit`: 結果の制限数 (デフォルト: 50)
- `offset`: オフセット

### GET /api/meta/campaigns/:campaignId
特定キャンペーンの詳細取得

### GET /api/meta/campaigns/:campaignId/adsets
キャンペーン内の広告セット一覧取得

### GET /api/meta/campaigns/:campaignId/ads
キャンペーン内の広告一覧取得

---

## 広告メトリクス (Ad Metrics)

### GET /api/metrics/ads/:adId
特定広告のメトリクス取得

**クエリパラメーター:**
- `dateRange`: today, yesterday, last_7_days, last_30_days, custom
- `since`: YYYY-MM-DD (dateRange=customの場合)
- `until`: YYYY-MM-DD (dateRange=customの場合)
- `breakdown`: age, gender, country, placement

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "adId": "123456789",
    "dateRange": {
      "since": "2024-01-01",
      "until": "2024-01-31"
    },
    "summary": {
      "impressions": 15420,
      "clicks": 385,
      "spend": 54320.50,
      "conversions": 28,
      "ctr": 2.49,
      "cpc": 141.09,
      "cpm": 3523.12,
      "roas": 4.25
    },
    "timeSeries": [
      {
        "date": "2024-01-01",
        "impressions": 512,
        "clicks": 12,
        "spend": 1823.45
      }
    ]
  }
}
```

### POST /api/metrics/batch
複数広告のメトリクスを一括取得

**リクエスト:**
```json
{
  "adIds": ["123456", "789012"],
  "dateRange": {
    "since": "2024-01-01",
    "until": "2024-01-31"
  },
  "fields": ["impressions", "clicks", "spend", "ctr"]
}
```

---

## 広告疲労度分析 (Ad Fatigue Analysis)

### GET /api/fatigue/ads/:adId
特定広告の疲労度分析取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "adId": "123456",
    "score": {
      "total": 72,
      "breakdown": {
        "audience": 85,
        "creative": 70,
        "algorithm": 45
      },
      "primaryIssue": "audience",
      "status": "warning"
    },
    "metrics": {
      "frequency": 3.8,
      "firstTimeRatio": 0.28,
      "ctrDeclineRate": 0.32,
      "cpmIncreaseRate": 0.42
    },
    "recommendations": [
      "オーディエンスの飽和が深刻です。新しいターゲティングセグメントの追加を検討してください。",
      "フリークエンシーキャップの設定を検討してください。"
    ],
    "calculatedAt": "2024-01-31T12:00:00Z"
  }
}
```

### GET /api/fatigue/accounts/:accountId/analysis
アカウント全体の疲労度分析

### GET /api/fatigue/alerts
アクティブな疲労度アラート一覧

### POST /api/fatigue/alerts/:alertId/acknowledge
アラートの確認済みマーク

### GET /api/fatigue/trends/:adId
疲労度トレンド取得

---

## ダッシュボードデータ (Dashboard)

### POST /api/dashboard/data
ダッシュボード用データの複合取得

**リクエスト:**
```json
{
  "accountIds": ["act_123", "act_456"],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metrics": ["spend", "impressions", "clicks", "conversions"],
  "groupBy": ["campaign", "date"],
  "includeWebster": true
}
```

### GET /api/dashboard/summary/:accountId
アカウントサマリー取得

### GET /api/dashboard/top-performers/:accountId
トップパフォーマー広告取得

---

## ECForce統合 (ECForce Integration)

### POST /api/ecforce/import
ECForceデータのインポート

**リクエスト:**
```json
{
  "type": "orders",
  "fileUrl": "https://example.com/data.csv",
  "mapping": {
    "orderId": "order_id",
    "customerId": "customer_id",
    "totalAmount": "total"
  }
}
```

### GET /api/ecforce/orders
ECForce注文データ取得

### GET /api/ecforce/customers/:customerId
特定顧客の情報取得

### POST /api/ecforce/attribution
広告とECForce売上の紐付け分析

---

## レポート・エクスポート (Reports & Export)

### GET /api/reports
レポート設定一覧取得

### POST /api/reports
新しいレポート設定作成

**リクエスト:**
```json
{
  "name": "月次パフォーマンスレポート",
  "type": "performance",
  "format": "excel",
  "schedule": {
    "frequency": "monthly",
    "time": "09:00",
    "recipients": ["manager@example.com"]
  },
  "filters": {
    "accountIds": ["act_123"],
    "dateRange": {
      "type": "last_month"
    }
  }
}
```

### POST /api/export
データエクスポート実行

**リクエスト:**
```json
{
  "format": "csv",
  "data": {
    "type": "ad_metrics",
    "filters": {
      "accountId": "act_123",
      "dateRange": {
        "since": "2024-01-01",
        "until": "2024-01-31"
      }
    }
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://example.com/exports/metrics_20240131.csv",
    "filename": "metrics_20240131.csv",
    "size": 2048576,
    "expiresAt": "2024-02-07T23:59:59Z"
  }
}
```

### GET /api/export/history
エクスポート履歴取得

---

## データ同期 (Data Sync)

### POST /api/sync/meta/:accountId
Meta APIデータの手動同期

### GET /api/sync/status/:accountId
同期ステータス取得

### GET /api/sync/logs
同期ログ取得

---

## システム設定 (System Configuration)

### GET /api/config
システム設定取得 (管理者のみ)

### PUT /api/config
システム設定更新 (管理者のみ)

### GET /api/health
システムヘルスチェック

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-31T12:00:00Z",
    "services": {
      "database": "healthy",
      "metaApi": "healthy",
      "ecforceApi": "healthy"
    }
  }
}
```

---

## エラーレスポンス

全エンドポイントで共通のエラーフォーマット:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "リクエストの形式が正しくありません",
    "details": {
      "field": "accountId",
      "issue": "必須フィールドが不足しています"
    }
  }
}
```

## 共通エラーコード

- `AUTHENTICATION_REQUIRED`: 認証が必要
- `AUTHORIZATION_FAILED`: 認可失敗
- `INVALID_REQUEST`: リクエスト形式エラー
- `RESOURCE_NOT_FOUND`: リソースが見つからない
- `RATE_LIMIT_EXCEEDED`: レート制限超過
- `EXTERNAL_API_ERROR`: 外部API（Meta, ECForce）エラー
- `INTERNAL_SERVER_ERROR`: サーバー内部エラー

## レスポンス形式

全てのAPIレスポンスは以下の基本形式に従います:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    total?: number
    page?: number  
    pageSize?: number
    hasMore?: boolean
  }
}
```