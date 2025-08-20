# Meta APIエラーハンドリング・レート制限ガイド

## 概要

このガイドでは、Meta APIのエラーハンドリングとレート制限への対応方法について説明します。

## エラーハンドリング

### 実装済みのエラー対策

#### 1. 自動リトライ機能

```typescript
// 実装例
async makeRequestWithRetry(request: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await request()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      // 指数バックオフで待機
      const delay = Math.min(1000 * Math.pow(2, i), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

#### 2. エラー種別による処理分岐

- **認証エラー (401)**: トークン再取得を促す
- **権限エラー (403)**: 必要な権限を表示
- **レート制限 (429)**: 自動的に待機
- **サーバーエラー (5xx)**: 自動リトライ

### エラーシナリオテスト

エラーハンドリングが正しく動作することを確認：

```bash
npm run test:error-scenarios
```

テストされるシナリオ：

- 無効なアクセストークン
- 期限切れトークン
- 権限不足エラー
- 存在しないリソース
- 不正なパラメータ
- レート制限エラー
- ネットワークタイムアウト
- JSONパースエラー
- バッチリクエストの部分的失敗
- サーバーエラー（5xx）

## レート制限対策

### Meta APIのレート制限

Meta APIには以下のレート制限があります：

1. **アプリレベル**
   - 1時間あたり200回のAPI呼び出し（デフォルト）
   - ビジネス認証で制限緩和可能

2. **広告アカウントレベル**
   - アカウントごとの使用制限
   - 広告費用に応じて制限が変動

3. **ユーザーレベル**
   - ユーザートークンごとの制限

### 実装済みの対策

#### 1. レート制限監視

```typescript
// レート制限状態の監視
const rateLimitStatus = {
  callCount: 0,
  windowStart: Date.now(),
  windowCalls: 0,
}
```

#### 2. 自動スロットリング

- API呼び出し間隔の自動調整
- レート制限に近づいたら警告

#### 3. バッチリクエスト

```typescript
// 複数のリクエストを1つにまとめる
const batch = await client.batchRequest([
  { method: 'GET', relative_url: 'campaigns' },
  { method: 'GET', relative_url: 'insights' },
])
```

### レート制限テスト

レート制限への対応を検証：

```bash
npm run test:rate-limiting
```

テスト内容：

- バーストリクエスト（短時間の大量リクエスト）
- 持続的負荷（長時間の継続的リクエスト）
- レート制限ヘッダーの確認
- アダプティブレート制限（自動調整）

## ベストプラクティス

### 1. エラーハンドリング

```typescript
try {
  const data = await client.getCampaigns()
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // レート制限の場合は待機
    await delay(60000)
  } else if (error.code === 'INVALID_TOKEN') {
    // トークン再取得
    await refreshToken()
  } else {
    // その他のエラー
    console.error('API Error:', error)
  }
}
```

### 2. レート制限回避

#### バッチリクエストの活用

```typescript
// 悪い例：個別リクエスト
const campaigns = await client.getCampaigns()
const insights = await client.getInsights()
const creatives = await client.getCreatives()

// 良い例：バッチリクエスト
const [campaigns, insights, creatives] = await client.batchRequest([
  { method: 'GET', relative_url: 'campaigns' },
  { method: 'GET', relative_url: 'insights' },
  { method: 'GET', relative_url: 'creatives' },
])
```

#### キャッシュの実装

```typescript
const cache = new Map()
const CACHE_TTL = 60000 // 1分

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

#### フィールドフィルタリング

```typescript
// 必要なフィールドのみ取得
const campaigns = await client.getCampaigns({
  fields: ['name', 'status', 'objective'], // 必要なフィールドのみ
})
```

### 3. モニタリング

レート制限の状態を定期的に確認：

```typescript
const status = client.getRateLimitStatus()
console.log(`API呼び出し回数: ${status.callCount}`)
console.log(`現在のウィンドウ: ${status.windowCalls}`)

if (status.windowCalls > 150) {
  console.warn('レート制限に近づいています')
}
```

## トラブルシューティング

### よくある問題

#### 1. "User request limit reached"

**原因**: ユーザーレベルのレート制限
**解決策**:

- システムユーザートークンの使用
- リクエスト間隔を増やす

#### 2. "Application request limit reached"

**原因**: アプリレベルのレート制限
**解決策**:

- ビジネス認証を申請
- バッチAPIを使用

#### 3. "Too many calls to this ad account"

**原因**: 広告アカウントレベルの制限
**解決策**:

- キャッシュを実装
- 不要なAPIコールを削減

## 参考情報

- [Meta API Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
- [Error Codes Reference](https://developers.facebook.com/docs/graph-api/guides/error-handling)
- [Batch Requests](https://developers.facebook.com/docs/graph-api/making-multiple-requests)
