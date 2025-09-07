# API エンドポイント仕様 - 広告疲労度データ更新機能

## 概要

広告疲労度データ更新機能で使用するAPIエンドポイントの詳細仕様。Convex HTTP Actionsとして実装される内部API と、Meta Graph APIとの連携インターフェースを定義する。

## 認証・セキュリティ

### 認証方式
- **内部API**: Convex Auth + JWT Token
- **Meta API**: OAuth2 App Access Token (暗号化保存)
- **通信方式**: HTTPS強制、CORS設定済み

### レート制限
- **Meta Graph API**: 200リクエスト/時間/アカウント
- **内部API**: 1000リクエスト/分/ユーザー

---

## 内部API エンドポイント (Convex Actions/Mutations)

### データ更新制御

#### POST /api/fatigue/refresh
広告疲労度データの手動更新実行

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "options": {
    "forceRefresh": true,
    "includeHistorical": false,
    "timeout": 30
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "status": "running",
    "progress": {
      "phase": "fetching",
      "message": "Meta APIからデータを取得中...",
      "percentage": 0
    }
  }
}
```

**エラーレスポンス例:**
```json
{
  "success": false,
  "error": {
    "code": "CONCURRENT_UPDATE_ERROR",
    "message": "このアカウントは既に更新処理中です",
    "details": {
      "existingSessionId": "session_def456",
      "estimatedCompletion": "2024-01-31T12:15:00Z"
    },
    "recoverable": true,
    "userAction": {
      "label": "待機して再試行",
      "action": "retry",
      "retryAfter": 120
    }
  }
}
```

#### GET /api/fatigue/refresh/:sessionId
更新セッションの状態確認

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "status": "running",
    "progress": {
      "phase": "calculating",
      "message": "疲労度スコアを計算中...",
      "percentage": 75
    },
    "startedAt": "2024-01-31T12:00:00Z",
    "estimatedCompletion": "2024-01-31T12:02:30Z",
    "metrics": {
      "recordsProcessed": 150,
      "recordsSucceeded": 140,
      "recordsFailed": 10
    }
  }
}
```

#### DELETE /api/fatigue/refresh/:sessionId
更新処理のキャンセル

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "status": "cancelled",
    "cancelledAt": "2024-01-31T12:01:30Z",
    "reason": "user_requested"
  }
}
```

### データ取得

#### GET /api/fatigue/data/:accountId
疲労度分析結果取得

**クエリパラメーター:**
- `dataSource`: `cache` | `api` | `any` (デフォルト: any)
- `maxAge`: キャッシュ最大経過時間（分）
- `includeRaw`: 生データも含めるか

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "adId": "123456789",
      "campaignName": "夏季キャンペーン2024",
      "adName": "クリエイティブA_動画",
      "adType": "video",
      "score": {
        "total": 72,
        "breakdown": {
          "creative": 85,
          "audience": 70,
          "algorithm": 45
        },
        "primaryIssue": "algorithm",
        "status": "warning"
      },
      "metrics": {
        "baselineCtr": 2.5,
        "currentCtr": 1.8,
        "ctrDeclineRate": 0.28,
        "frequency": 3.2,
        "firstTimeImpressionRatio": 0.35,
        "baselineCpm": 450.0,
        "currentCpm": 620.0,
        "cpmIncreaseRate": 0.38
      },
      "recommendations": [
        "CPM上昇が顕著です。ターゲティングの見直しを検討してください。",
        "新しいクリエイティブのテストを推奨します。"
      ],
      "alerts": [
        {
          "level": "warning", 
          "message": "CPM上昇率が警告レベルに達しています",
          "action": "ターゲティング最適化"
        }
      ],
      "calculatedAt": "2024-01-31T12:00:00Z",
      "dataSource": "api"
    }
  ],
  "metadata": {
    "totalRecords": 1,
    "dataSource": "api",
    "cacheAge": 0,
    "lastUpdated": "2024-01-31T12:00:00Z"
  }
}
```

#### GET /api/fatigue/summary/:accountId
疲労度サマリー統計取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalAds": 156,
    "statusBreakdown": {
      "healthy": 89,
      "warning": 45,
      "critical": 22
    },
    "averageScore": 67.8,
    "topIssues": [
      {"issue": "algorithm", "count": 67},
      {"issue": "audience", "count": 34},
      {"issue": "creative", "count": 23}
    ],
    "trends": {
      "scoreChange": -5.2,
      "periodComparison": "vs_last_week"
    }
  }
}
```

### キャッシュ管理

#### POST /api/cache/invalidate
キャッシュ無効化

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "cacheTypes": ["insights", "fatigue_analysis"],
  "olderThan": "2024-01-31T00:00:00Z"
}
```

#### GET /api/cache/status/:accountId
キャッシュ状況確認

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "insights": {
      "hasCache": true,
      "cacheAge": 25,
      "isStale": false,
      "expiresAt": "2024-01-31T12:30:00Z",
      "recordCount": 150
    },
    "fatigue_analysis": {
      "hasCache": true,
      "cacheAge": 15,
      "isStale": false,
      "expiresAt": "2024-01-31T12:45:00Z",
      "recordCount": 150
    }
  }
}
```

---

## 外部API連携 (Meta Graph API)

### Meta Insights API 連携

#### Meta API: GET /{ad-id}/insights
Meta広告インサイトデータ取得

**Convex内部での呼び出し例:**
```typescript
// Convex HTTP Action内での実装
export const fetchMetaInsights = httpAction(async (ctx, { accountId, adIds, dateRange }) => {
  const token = await getDecryptedToken(ctx, accountId)
  
  const batchRequests = adIds.map(adId => ({
    method: 'GET',
    relative_url: `${adId}/insights?fields=impressions,clicks,spend,ctr,cpm,frequency&date_preset=${dateRange}`
  }))
  
  const response = await fetch('https://graph.facebook.com/v18.0', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      batch: batchRequests
    })
  })
  
  return processMetaApiResponse(response)
})
```

**Meta APIレスポンス例:**
```json
{
  "data": [
    {
      "impressions": "15420",
      "clicks": "385", 
      "spend": "54320.50",
      "ctr": "2.496753",
      "cpm": "3523.123",
      "frequency": "3.2145",
      "date_start": "2024-01-01",
      "date_stop": "2024-01-31"
    }
  ],
  "paging": {
    "cursors": {
      "before": "cursor_before",
      "after": "cursor_after"
    }
  }
}
```

### Instagram Insights API 連携

#### Meta API: GET /{media-id}/insights
Instagram投稿インサイト取得

**特殊メトリクス取得:**
```json
{
  "data": [
    {
      "name": "profile_views",
      "period": "lifetime", 
      "values": [{"value": 1245}]
    },
    {
      "name": "follower_count", 
      "period": "lifetime",
      "values": [{"value": 12450}]
    },
    {
      "name": "impressions",
      "period": "lifetime",
      "values": [{"value": 25680}]
    },
    {
      "name": "reach",
      "period": "lifetime", 
      "values": [{"value": 18920}]
    }
  ]
}
```

---

## エラーハンドリング

### 共通エラー形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けエラーメッセージ",
    "details": {
      "field": "具体的なフィールド",
      "originalError": "内部エラー詳細"
    },
    "recoverable": true,
    "retryAfter": 30,
    "userAction": {
      "label": "アクションボタンラベル",
      "action": "retry" | "navigate" | "contact",
      "href": "/meta-api-setup",
      "onClick": "function"
    }
  },
  "metadata": {
    "timestamp": "2024-01-31T12:00:00Z",
    "requestId": "req_abc123",
    "version": "1.0"
  }
}
```

### エラーコード一覧

| コード | 説明 | 対処法 |
|--------|------|--------|
| `NO_TOKEN` | アクセストークンが設定されていない | Meta API設定画面へ |
| `TOKEN_EXPIRED` | トークンの有効期限切れ | 再認証が必要 |
| `INVALID_REQUEST` | リクエスト形式エラー | パラメータ確認 |
| `NETWORK_ERROR` | ネットワーク接続エラー | 再試行推奨 |
| `RATE_LIMIT_EXCEEDED` | API制限超過 | 待機が必要 |
| `API_MAINTENANCE` | Meta APIメンテナンス中 | キャッシュで代用 |
| `DATA_VALIDATION_ERROR` | データ検証エラー | データ確認が必要 |
| `CONCURRENT_UPDATE_ERROR` | 同時更新エラー | 待機して再試行 |
| `TIMEOUT_ERROR` | 処理タイムアウト | 再試行または分割処理 |

---

## パフォーマンス考慮

### バッチ処理最適化

```typescript
// 広告データの分割取得
export const fetchAdsBatch = httpAction(async (ctx, { accountId, adIds }) => {
  const BATCH_SIZE = 50 // Meta APIの制限に合わせて調整
  const batches = chunk(adIds, BATCH_SIZE)
  
  const results = await Promise.allSettled(
    batches.map(batch => fetchBatch(ctx, accountId, batch))
  )
  
  return consolidateResults(results)
})
```

### キャッシュ戦略

```typescript
// スマートキャッシュ判定
export const getInsightsWithCache = query({
  args: { accountId: v.string(), maxAge: v.optional(v.number()) },
  handler: async (ctx, { accountId, maxAge = 30 }) => {
    const cached = await getCacheEntry(ctx, accountId, 'insights')
    
    if (cached && !isCacheStale(cached, maxAge)) {
      return { data: cached.data, source: 'cache' }
    }
    
    // Stale-while-revalidate pattern
    if (cached && maxAge > 60) {
      // 古いデータを返しつつ、バックグラウンドで更新
      scheduleBackgroundRefresh(ctx, accountId)
      return { data: cached.data, source: 'stale' }
    }
    
    return null // APIから取得が必要
  }
})
```

### レート制限管理

```typescript
// レート制限チェック
export const checkRateLimit = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const rateLimit = await getRateLimit(ctx, accountId)
    
    return {
      canMakeRequest: rateLimit.remaining > 0,
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime,
      waitSeconds: rateLimit.remaining === 0 ? 
        Math.ceil((new Date(rateLimit.resetTime) - new Date()) / 1000) : 0
    }
  }
})
```

---

## セキュリティ考慮

### トークン管理

```typescript
// アクセストークンの安全な保存
export const storeAccessToken = mutation({
  args: { accountId: v.string(), token: v.string() },
  handler: async (ctx, { accountId, token }) => {
    // トークンは暗号化して保存
    const encryptedToken = await encrypt(token)
    
    await ctx.db.insert('meta_tokens', {
      accountId,
      tokenHash: encryptedToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000) // 1時間
    })
  }
})
```

### 入力検証

```typescript
// リクエスト検証
const validateUpdateRequest = (input: any): UpdateOptions => {
  if (!input.accountId || typeof input.accountId !== 'string') {
    throw new Error('有効なアカウントIDが必要です')
  }
  
  if (input.timeout && (input.timeout < 5 || input.timeout > 300)) {
    throw new Error('タイムアウトは5-300秒の範囲で設定してください')
  }
  
  return {
    forceRefresh: Boolean(input.options?.forceRefresh),
    includeHistorical: Boolean(input.options?.includeHistorical),
    timeout: Math.min(Math.max(input.timeout || 30, 5), 300)
  }
}
```

---

## 監視・ログ

### APIコール監視

```typescript
// API呼び出しメトリクス収集
export const logApiCall = mutation({
  args: { 
    endpoint: v.string(),
    method: v.string(), 
    duration: v.number(),
    status: v.number(),
    accountId: v.optional(v.string())
  },
  handler: async (ctx, metrics) => {
    await ctx.db.insert('api_metrics', {
      ...metrics,
      timestamp: Date.now()
    })
  }
})
```

### エラー追跡

```typescript
// エラーログ記録
export const logError = mutation({
  args: { 
    error: v.object({
      code: v.string(),
      message: v.string(),
      stack: v.optional(v.string())
    }),
    context: v.object({
      accountId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      userAgent: v.optional(v.string())
    })
  },
  handler: async (ctx, { error, context }) => {
    await ctx.db.insert('error_logs', {
      ...error,
      ...context,
      timestamp: Date.now(),
      severity: determineSeverity(error.code)
    })
  }
})
```

---

## テスト用エンドポイント

### 開発・テスト環境専用

#### POST /api/test/simulate-meta-api
Meta API レスポンスシミュレーション

```json
{
  "scenario": "success" | "rate_limit" | "token_expired" | "maintenance",
  "delay": 1000,
  "accountId": "act_test123"
}
```

#### GET /api/test/health
システムヘルスチェック

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "healthy",
      "metaApi": "healthy", 
      "cache": "healthy"
    },
    "metrics": {
      "activeUpdates": 2,
      "cacheHitRate": 0.85,
      "averageResponseTime": 245
    }
  }
}
```