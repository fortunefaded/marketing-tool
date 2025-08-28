# Meta API 正しいデータ取得システム - API エンドポイント設計

## 概要

Meta Graph API v23.0の既存エンドポイントを正しく活用し、完全なページネーション実装によりデータ取得の確実性を向上させる。

**重要**: 本設計は新規APIエンドポイントの作成ではなく、既存Meta APIの**正しい利用方法**を定義している。

## Meta Graph API エンドポイント仕様

### 1. Ad Insights エンドポイント (主要対象)

#### エンドポイント
```
GET https://graph.facebook.com/v23.0/{ad-account-id}/insights
```

#### 必須パラメータ
```javascript
{
  "fields": [
    "ad_id",
    "ad_name", 
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "date_start",
    "date_stop", 
    "impressions",
    "clicks",
    "spend",
    "reach",
    "frequency",
    "ctr",
    "cpc",
    "cpm",
    "actions"
  ],
  "time_range": {
    "since": "2024-07-29",  // YYYY-MM-DD
    "until": "2024-08-27"   // YYYY-MM-DD  
  },
  "time_increment": "1",    // 日別データ取得
  "level": "ad",            // 広告単位
  "limit": 100              // ページサイズ (最大1000)
}
```

#### レスポンス例
```json
{
  "data": [
    {
      "ad_id": "120203543112345",
      "ad_name": "Sample Ad",
      "campaign_id": "120203543112346", 
      "campaign_name": "Sample Campaign",
      "adset_id": "120203543112347",
      "adset_name": "Sample AdSet",
      "date_start": "2024-07-29",
      "date_stop": "2024-07-29",
      "impressions": "1000",
      "clicks": "50",
      "spend": "10.00",
      "reach": "800",
      "frequency": "1.25",
      "ctr": "5.0",
      "cpc": "0.20",
      "cpm": "12.50",
      "actions": [
        {
          "action_type": "link_click",
          "value": "45"
        }
      ]
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    },
    "next": "https://graph.facebook.com/v23.0/act_123456789/insights?access_token=...&after=MjQZD"
  }
}
```

## 完全ページネーション実装仕様

### 1. 初回リクエスト

#### リクエスト
```http
GET /v23.0/{ad-account-id}/insights
Content-Type: application/json
Authorization: Bearer {access-token}

Query Parameters:
- fields: {上記必須フィールド}
- time_range: {指定期間}
- time_increment: 1
- level: ad
- limit: 100
```

#### レスポンス処理
```javascript
// 成功時の処理フロー
if (response.data && Array.isArray(response.data)) {
  allData.push(...response.data);
  
  // ページネーション継続判定
  if (response.paging?.next) {
    nextUrl = response.paging.next;
    continue; // 次ページ取得
  } else {
    break; // 完了
  }
}
```

### 2. 後続ページリクエスト

#### リクエスト
```http
GET {response.paging.next}
Authorization: Bearer {access-token}
```

**重要**: `paging.next`のURLをそのまま使用し、追加パラメータは付与しない

#### 処理ループ
```javascript
let pageCount = 0;
const maxPages = config.maxPages || Infinity;

while (nextUrl && pageCount < maxPages) {
  pageCount++;
  console.log(`ページ ${pageCount} 取得中...`);
  
  const response = await fetch(nextUrl);
  const data = await response.json();
  
  // データ追加
  allData.push(...data.data);
  
  // 次ページ判定
  nextUrl = data.paging?.next;
  
  // ログ出力
  console.log(`ページ ${pageCount}: ${data.data.length}件取得`);
}

console.log(`全取得完了: ${allData.length}件, ${pageCount}ページ`);
```

## エラーハンドリング仕様

### 1. HTTPステータスコード対応

#### 成功レスポンス
- **200 OK**: 正常取得
- **処理**: データを配列に追加し次ページ判定

#### エラーレスポンス

##### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100
  }
}
```
**対応**: パラメータ見直し、リトライなし

##### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException", 
    "code": 190
  }
}
```
**対応**: トークン更新、リトライなし

##### 429 Too Many Requests
```json
{
  "error": {
    "message": "Application request limit reached",
    "type": "OAuthException",
    "code": 4
  }
}
```
**対応**: レート制限待機、自動リトライ

##### 500 Internal Server Error
```json
{
  "error": {
    "message": "An unknown error occurred",
    "type": "OAuthException",
    "code": 2
  }
}
```
**対応**: 3回までリトライ

### 2. リトライ戦略

```javascript
async function fetchWithRetry(url, attempts = 3, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        // レート制限: 待機時間を倍増
        await sleep(delayMs * Math.pow(2, i));
        continue;
      }
      
      if (response.status >= 500) {
        // サーバーエラー: リトライ
        await sleep(delayMs);
        continue;
      }
      
      // その他エラー: リトライなし
      throw new Error(`HTTP ${response.status}`);
      
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(delayMs);
    }
  }
}
```

## レート制限対応

### Meta API制限
- **制限**: 200コール/時間
- **監視**: 呼び出し回数をトラッキング
- **対応**: 制限到達時は待機

### 実装例
```javascript
class RateLimiter {
  constructor(maxCalls = 200, windowMs = 3600000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = [];
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    
    // 古い呼び出し履歴を削除
    this.calls = this.calls.filter(time => now - time < this.windowMs);
    
    if (this.calls.length >= this.maxCalls) {
      const oldestCall = Math.min(...this.calls);
      const waitTime = this.windowMs - (now - oldestCall);
      
      console.log(`レート制限: ${Math.ceil(waitTime/1000)}秒待機`);
      await sleep(waitTime);
    }
    
    this.calls.push(now);
  }
}
```

## ログ出力仕様

### 1. 基本ログ
```javascript
// 取得開始
console.log(`[Meta API] データ取得開始: ${accountId}`);
console.log(`[Meta API] 期間: ${dateStart} - ${dateEnd} (${totalDays}日間)`);

// ページ取得
console.log(`[Meta API] ページ ${pageNum} 取得: ${itemCount}件`);

// 完了
console.log(`[Meta API] 取得完了: 総計${totalItems}件, ${totalPages}ページ, ${durationMs}ms`);
```

### 2. 配信分析ログ
```javascript
// 配信日数分析
console.log(`[配信分析] 実配信日数: ${actualDays}日/${requestedDays}日 (${ratio}%)`);
console.log(`[配信分析] パターン: ${pattern}`);
console.log(`[配信分析] 配信期間: ${firstDate} - ${lastDate}`);
```

### 3. エラーログ
```javascript
// API呼び出しエラー
console.error(`[Meta API Error] ${error.type}: ${error.message}`);
console.error(`[Meta API Error] URL: ${url}`);
console.error(`[Meta API Error] リトライ: ${retryCount}/${maxRetries}`);
```

## 設定オプション

### 1. PaginationConfig
```typescript
interface PaginationConfig {
  maxPages?: number;        // デフォルト: Infinity
  retryAttempts?: number;   // デフォルト: 3
  retryDelayMs?: number;    // デフォルト: 1000
}
```

### 2. 使用例
```javascript
const config = {
  maxPages: 50,       // 最大50ページまで
  retryAttempts: 3,   // 3回リトライ
  retryDelayMs: 2000  // 2秒間隔
};

const result = await fetchPaginatedData(params, config);
```

## パフォーマンス最適化

### 1. 並列処理の禁止
Meta APIはレート制限があるため、**並列リクエストは行わない**

### 2. 効率的なフィールド指定
不要なフィールドは除外してレスポンスサイズを最小化

### 3. 適切なlimit値
```javascript
// 推奨設定
const params = {
  limit: 100,  // バランスの良いページサイズ
  // limit: 1000は大きすぎる可能性
  // limit: 25は小さすぎて非効率
};
```

## 成功判定

### 完全成功
- 全ページを取得完了
- エラー発生なし
- 期待するデータ件数を取得

### 部分成功  
- 一部ページでエラー発生
- しかし有効なデータを取得
- ユーザーに状況を明示

### 失敗
- 初回リクエストからエラー
- 認証エラー
- 全データ取得不可

この設計により、Meta APIから確実にデータを取得し、透明性の高い情報提供を実現する。