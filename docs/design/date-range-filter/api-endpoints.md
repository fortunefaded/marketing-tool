# API エンドポイント仕様

## 概要

日付範囲フィルター機能で使用するMeta Graph API v23.0のエンドポイント仕様と、内部APIの設計を定義します。

## Meta Graph API エンドポイント

### 基本情報

- **Base URL**: `https://graph.facebook.com/v23.0`
- **認証**: OAuth 2.0 Bearer Token
- **Content-Type**: `application/json`
- **レート制限**: 200 calls/hour per user

### 1. 時系列インサイトデータ取得

#### GET /{ad-account-id}/insights

広告アカウントの時系列パフォーマンスデータを取得します。

**リクエスト**

```http
GET /v23.0/act_{account_id}/insights?
  access_token={token}&
  level=ad&
  fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,
         impressions,clicks,spend,ctr,cpc,cpm,frequency,reach,
         date_start,date_stop&
  time_increment=1&
  date_preset=last_30d&
  limit=500
```

**パラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| access_token | string | ✓ | アクセストークン |
| level | string | ✓ | 集計レベル (ad/adset/campaign) |
| fields | string | ✓ | 取得するフィールド（カンマ区切り） |
| time_increment | number |  | 時系列データの粒度（1=日別） |
| date_preset | string |  | プリセット期間 |
| time_range | object |  | カスタム期間 {since, until} |
| limit | number |  | 1ページあたりの件数（最大500） |

**日付プリセット値**

- `today`: 今日
- `yesterday`: 昨日
- `last_7d`: 過去7日間
- `last_14d`: 過去14日間
- `last_30d`: 過去30日間（デフォルト）
- `last_90d`: 過去90日間
- `this_month`: 今月
- `last_month`: 先月

**カスタム日付範囲**

```json
{
  "time_range": {
    "since": "2024-08-01",
    "until": "2024-08-31"
  }
}
```

**レスポンス**

```json
{
  "data": [
    {
      "ad_id": "1234567890",
      "ad_name": "Summer Campaign Ad 1",
      "adset_id": "2345678901",
      "adset_name": "Target Audience A",
      "campaign_id": "3456789012",
      "campaign_name": "Summer 2024 Campaign",
      "impressions": "10000",
      "clicks": "150",
      "spend": "50.00",
      "ctr": "1.5",
      "cpc": "0.33",
      "cpm": "5.00",
      "frequency": "1.2",
      "reach": "8333",
      "date_start": "2024-08-01",
      "date_stop": "2024-08-01"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    },
    "next": "https://graph.facebook.com/v23.0/..."
  },
  "summary": {
    "total_count": 1500
  }
}
```

**エラーレスポンス**

```json
{
  "error": {
    "message": "Error validating access token",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 460,
    "fbtrace_id": "A2xq7..."
  }
}
```

### 2. プラットフォーム別ブレークダウン取得

#### GET /{ad-account-id}/insights?breakdowns=publisher_platform

プラットフォーム別の詳細データを取得します。

**注意**: `time_increment`と`breakdowns`は同時使用不可

**リクエスト**

```http
GET /v23.0/act_{account_id}/insights?
  access_token={token}&
  level=ad&
  fields=ad_id,ad_name,impressions,clicks,spend&
  breakdowns=publisher_platform&
  date_preset=last_30d&
  limit=500
```

**レスポンス**

```json
{
  "data": [
    {
      "ad_id": "1234567890",
      "ad_name": "Summer Campaign Ad 1",
      "publisher_platform": "facebook",
      "impressions": "6000",
      "clicks": "90",
      "spend": "30.00"
    },
    {
      "ad_id": "1234567890",
      "ad_name": "Summer Campaign Ad 1",
      "publisher_platform": "instagram",
      "impressions": "4000",
      "clicks": "60",
      "spend": "20.00"
    }
  ]
}
```

## 内部API設計

### APIクライアントクラス

```typescript
class SimpleMetaApi {
  /**
   * 時系列インサイトデータを取得
   */
  async getTimeSeriesInsights(options?: {
    datePreset?: string;
    dateStart?: string;
    dateStop?: string;
    maxPages?: number;
    onProgress?: (count: number) => void;
  }): Promise<PaginatedResult>;

  /**
   * プラットフォーム別データを取得
   */
  async getPlatformBreakdown(options?: {
    datePreset?: string;
    adIds?: string[];
  }): Promise<Record<string, PlatformData>>;

  /**
   * ページング継続取得
   */
  async fetchInsightsContinuation(
    nextPageUrl: string,
    options?: {
      onProgress?: (count: number) => void;
    }
  ): Promise<PaginatedResult>;
}
```

### エラーコード一覧

| コード | 説明 | 対処法 |
|--------|------|--------|
| 4 | Application request limit reached | レート制限。待機後リトライ |
| 17 | User request limit reached | ユーザーレート制限 |
| 190 | Invalid OAuth access token | トークン再取得 |
| 200 | Permissions error | 権限の再確認 |
| 100 | Invalid parameter | パラメータ修正 |

## データ集約API

### 集約処理

```typescript
interface AggregationAPI {
  /**
   * 時系列データを広告名で集約
   */
  aggregateTimeSeriesData(
    data: AdInsight[]
  ): AggregatedInsight[];

  /**
   * 加重平均を計算
   */
  calculateWeightedMetrics(
    insights: AdInsight[]
  ): {
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
  };
}
```

### 集約ルール

1. **同一広告名でグループ化**
   - ad_nameが同じデータを集約
   - 日付範囲を統合

2. **メトリクス計算**
   - impressions, clicks, spend: 合計
   - CTR: (総クリック / 総インプレッション) × 100
   - CPC: 総費用 / 総クリック
   - CPM: (総費用 / 総インプレッション) × 1000
   - Frequency: インプレッション加重平均

## キャッシュAPI

### キャッシュキー生成

```typescript
function generateCacheKey(
  accountId: string,
  dateRange: DateRangeFilter,
  timestamp?: number
): string {
  return `meta-insights-cache-${accountId}-${dateRange}-${timestamp || Date.now()}`;
}
```

### キャッシュ操作

```typescript
interface CacheAPI {
  /**
   * キャッシュ取得
   */
  getCachedData(accountId: string): AdInsight[] | null;

  /**
   * キャッシュ保存
   */
  setCachedData(
    accountId: string,
    data: AdInsight[],
    nextPageUrl?: string,
    isComplete?: boolean
  ): void;

  /**
   * キャッシュクリア
   */
  clearCache(accountId: string): void;

  /**
   * キャッシュメタデータ取得
   */
  getCacheMetadata(): {
    size: number;
    entries: number;
    oldestEntry: Date;
  };
}
```

## レート制限対策

### リトライ戦略

```typescript
interface RetryStrategy {
  maxRetries: 3;
  baseDelay: 2000; // 2秒
  maxDelay: 60000; // 60秒
  
  calculateDelay(attempt: number): number {
    // エクスポネンシャルバックオフ
    return Math.min(
      this.baseDelay * Math.pow(2, attempt),
      this.maxDelay
    );
  }
}
```

### レート制限ヘッダー

```http
X-Business-Use-Case-Usage: {
  "{business_id}": [
    {
      "type": "ads_insights",
      "call_count": 28,
      "total_cputime": 25,
      "total_time": 25,
      "estimated_time_to_regain_access": 0
    }
  ]
}
```

## パフォーマンス最適化

### バッチ処理

複数の独立したリクエストを並列実行：

```typescript
async function fetchDataInParallel() {
  const [timeSeriesData, platformData, creativeData] = await Promise.all([
    getTimeSeriesInsights(),
    getPlatformBreakdown(),
    getCreativeDetails()
  ]);
  
  return mergeData(timeSeriesData, platformData, creativeData);
}
```

### プログレッシブローディング

```typescript
interface ProgressiveLoadingStrategy {
  // 初回: 直近7日分を高速取得
  initialLoad: 'last_7d';
  
  // 次回: 残りのデータをバックグラウンドで取得
  backgroundLoad: 'remaining_days';
  
  // 表示: 取得済みデータから順次表示
  renderStrategy: 'progressive';
}
```

## セキュリティ考慮事項

### トークン管理

- アクセストークンは環境変数またはセキュアストレージに保存
- ログ出力時はトークンをマスキング
- トークンの有効期限を監視し、自動更新

### データサニタイゼーション

```typescript
function sanitizeApiResponse(data: any): AdInsight {
  return {
    ad_id: String(data.ad_id || ''),
    ad_name: sanitizeString(data.ad_name || ''),
    impressions: sanitizeNumber(data.impressions),
    // ... 他のフィールド
  };
}
```

## テスト用モックエンドポイント

### モックサーバー設定

```typescript
interface MockEndpoints {
  '/insights': {
    method: 'GET',
    response: MockInsightsResponse,
    delay: 100
  },
  '/insights/error': {
    method: 'GET',
    response: MockErrorResponse,
    status: 429
  }
}
```

---

*作成日: 2024年12月*
*バージョン: 1.0*
*API Version: Meta Graph API v23.0*