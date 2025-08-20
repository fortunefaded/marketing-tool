# Meta広告アカウント取得 - 実装詳細

## 概要

Meta広告アカウント（act\_から始まるID）を取得するための実装ガイド

## 認証フロー

### 1. Facebook OAuth認証

```typescript
// 認証URL生成
const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  scope=ads_read,ads_management,business_management&
  response_type=code`
```

### 2. アクセストークン取得

```typescript
// コールバックでcodeを受け取り、トークンと交換
POST https://graph.facebook.com/v18.0/oauth/access_token
{
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  code: AUTH_CODE,
  redirect_uri: REDIRECT_URI
}
```

### 3. 広告アカウント取得方法

#### 方法1: ユーザー経由

```typescript
GET /me/adaccounts?fields=id,name,account_status,currency
```

#### 方法2: ビジネスマネージャー経由

```typescript
// まずビジネスID取得
GET / me / businesses

// 次にビジネス配下のアカウント取得
GET / { business_id } / owned_ad_accounts
GET / { business_id } / client_ad_accounts
```

#### 方法3: アクセス可能な全アカウント

```typescript
GET /me/adaccounts?fields=id,name,business{id,name}
```

## 重要な権限スコープ

- `ads_read`: 広告データ読み取り
- `ads_management`: 広告管理
- `business_management`: ビジネスマネージャーアクセス
- `pages_read_engagement`: ページインサイト

## アカウントステータス

- 1: ACTIVE（アクティブ）
- 2: DISABLED（無効）
- 3: UNSETTLED（未決済）
- 7: PENDING_RISK_REVIEW（リスクレビュー中）
- 8: PENDING_SETTLEMENT（決済保留中）
- 9: IN_GRACE_PERIOD（猶予期間中）
- 100: PENDING_CLOSURE（閉鎖保留中）
- 101: CLOSED（閉鎖済み）

## エラーハンドリング

### よくあるエラー

1. **Error 190**: アクセストークン期限切れ
2. **Error 200**: 権限不足
3. **Error 17**: レート制限
4. **Error 100**: 無効なパラメータ

### リトライ戦略

```typescript
const fetchWithRetry = async (url: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.status === 429) {
        // Rate limit
        await sleep(Math.pow(2, i) * 1000) // Exponential backoff
        continue
      }
      return response
    } catch (error) {
      if (i === retries - 1) throw error
    }
  }
}
```

## データ構造

```typescript
interface MetaAdAccount {
  id: string // "act_123456789"
  account_id: string // "123456789"
  name: string
  account_status: number
  age: number
  amount_spent: string
  balance: string
  business?: {
    id: string
    name: string
  }
  business_city: string
  business_country_code: string
  business_name: string
  capabilities: string[]
  created_time: string
  currency: string
  disable_reason: number
  end_advertiser: string
  end_advertiser_name: string
  funding_source_details: {
    id: string
    display_string: string
    type: number
  }
  has_migrated_permissions: boolean
  io_number: string
  is_attribution_spec_system_default: boolean
  is_direct_deals_enabled: boolean
  is_notifications_enabled: boolean
  is_personal: number
  is_prepay_account: boolean
  is_tax_id_required: boolean
  min_campaign_group_spend_cap: string
  min_daily_budget: number
  owner: string
  rf_spec: object
  spend_cap: string
  tax_id: string
  tax_id_status: number
  tax_id_type: string
  timezone_id: number
  timezone_name: string
  timezone_offset_hours_utc: number
}
```

## ベストプラクティス

1. **バッチリクエスト**: 複数アカウントを一度に取得
2. **フィールド指定**: 必要なフィールドのみ取得してAPIコール削減
3. **ページネーション**: 大量アカウントの場合は適切にページング
4. **キャッシング**: アカウント情報は頻繁に変わらないため適切にキャッシュ
5. **Webhook**: リアルタイム更新にはWebhookを活用

## セキュリティ考慮事項

1. アクセストークンは暗号化して保存
2. クライアントシークレットは環境変数で管理
3. HTTPS通信の強制
4. CSRFトークンの実装
5. 権限の最小化原則
