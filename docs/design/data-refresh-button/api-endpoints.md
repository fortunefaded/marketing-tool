# API エンドポイント仕様

## Meta API Integration

### GET /v23.0/{account-id}/insights

Meta APIから広告インサイトデータを取得

**リクエスト**:
```http
GET https://graph.facebook.com/v23.0/{account-id}/insights
  ?fields=ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,
          impressions,clicks,spend,reach,frequency,cpc,cpm,ctr,
          conversions,actions,video_avg_time_watched
  &level=ad
  &time_range={"since":"2024-01-01","until":"2024-01-31"}
  &limit=100
  &access_token={access-token}
```

**レスポンス**:
```json
{
  "data": [
    {
      "ad_id": "123456789",
      "ad_name": "Summer Campaign - Image 1",
      "campaign_id": "987654321",
      "campaign_name": "Summer Sale 2024",
      "adset_id": "456789123",
      "adset_name": "Target Audience A",
      "impressions": "15234",
      "clicks": "423",
      "spend": "1250.50",
      "reach": "12450",
      "frequency": "1.22",
      "cpc": "2.96",
      "cpm": "82.12",
      "ctr": "2.78",
      "conversions": "45",
      "date_start": "2024-01-01",
      "date_stop": "2024-01-31"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    },
    "next": "https://graph.facebook.com/v23.0/..."
  }
}
```

**エラーレスポンス**:
```json
{
  "error": {
    "message": "Invalid OAuth 2.0 Access Token",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 463,
    "fbtrace_id": "A2sHTT9yXZC4qtY"
  }
}
```

## Convex Functions

### mutation: importInsights

Meta APIから取得したインサイトデータをConvexに保存

**入力**:
```typescript
{
  insights: Array<{
    accountId: string;
    date_start: string;
    date_stop: string;
    campaign_id?: string;
    campaign_name?: string;
    adset_id?: string;      // 新規追加
    adset_name?: string;    // 新規追加
    ad_id?: string;
    ad_name?: string;
    impressions?: number;
    clicks?: number;
    spend?: number;
    // ... other metrics
  }>;
  strategy: "replace" | "merge";
}
```

**出力**:
```typescript
{
  imported: number;
  updated: number;
  skipped: number;
  total: number;
}
```

### query: getInsights

保存されたインサイトデータを取得

**入力**:
```typescript
{
  accountId: string;
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  adsetId?: string;      // 新規追加
  adId?: string;
  limit?: number;
  cursor?: string;
}
```

**出力**:
```typescript
{
  items: AdInsight[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### mutation: clearAccountData

アカウントのデータをクリア

**入力**:
```typescript
{
  accountId: string;
}
```

**出力**:
```typescript
{
  deleted: number;
}
```

### query: getSyncStatus

同期ステータスを取得

**入力**:
```typescript
{
  accountId: string;
}
```

**出力**:
```typescript
{
  accountId: string;
  lastFullSync?: string;
  lastIncrementalSync?: string;
  totalRecords: number;
  earliestDate?: string;
  latestDate?: string;
  updatedAt: string;
}
```

## Internal API Calls (Frontend Hooks)

### useAdFatigueSimplified.refetch()

データ更新処理のメインエントリーポイント

**処理フロー**:
1. アカウントID検証
2. 更新状態チェック
3. キャッシュクリア（オプション）
4. Meta API データ取得
5. Convexへの保存
6. クリエイティブデータのエンリッチ
7. UI状態の更新

**パラメータ**:
```typescript
interface RefetchOptions {
  clearCache?: boolean;
  force?: boolean;
}
```

**エラーハンドリング**:
- `AccountNotSelectedError`: アカウント未選択
- `TokenExpiredError`: 認証トークン期限切れ
- `NetworkError`: ネットワーク接続エラー
- `DataSaveError`: Convex保存エラー

## エラーコード一覧

| コード | 説明 | ユーザーメッセージ | 対処法 |
|--------|------|-------------------|---------|
| `AUTH_001` | トークン期限切れ | Meta広告のアクセストークンが期限切れです | 再認証が必要 |
| `AUTH_002` | トークン未設定 | Meta広告アカウントが接続されていません | 初回設定が必要 |
| `NET_001` | ネットワークタイムアウト | サーバーへの接続がタイムアウトしました | 再試行 |
| `NET_002` | ネットワーク切断 | インターネット接続を確認してください | 接続確認 |
| `DATA_001` | データ保存失敗 | データの保存に失敗しました | 再試行 |
| `DATA_002` | データ形式エラー | 取得したデータの形式が不正です | サポート連絡 |
| `VAL_001` | アカウント未選択 | アカウントを選択してください | アカウント選択 |
| `VAL_002` | 無効なパラメータ | リクエストパラメータが不正です | 入力確認 |

## レート制限

### Meta API
- 時間あたり200コール
- バーストリミット: 100コール/秒
- レート制限時は自動的にバックオフ

### Convex
- 書き込み: 1000 mutations/秒
- 読み取り: 10000 queries/秒
- バッチ処理で最適化

## セキュリティ考慮事項

1. **認証トークン**
   - Convexの環境変数で管理
   - クライアントサイドには露出しない
   - 定期的な更新が必要

2. **CORS設定**
   - Meta APIへの直接アクセスは不可
   - プロキシ経由でのアクセス

3. **データ検証**
   - 入力データの型チェック
   - SQLインジェクション対策
   - XSS対策

4. **監査ログ**
   - 全てのデータ更新操作を記録
   - エラーの詳細情報を保存