# Convexベースキャッシュシステム アーキテクチャ設計

## システム概要

現在の/ad-fatigueページにおけるデータ不整合問題を解決するため、Convexリアルタイムデータベースを活用した3層キャッシュアーキテクチャを実装する。本システムは広告パフォーマンスデータの一貫性確保、API使用量90%削減、応答速度80%向上を実現する。

## アーキテクチャパターン

- **パターン**: 3層キャッシュアーキテクチャ + イベントドリブン
- **理由**: 
  - パフォーマンス最適化（メモリ・永続化・API の段階的フォールバック）
  - データ一貫性保証（Convexのリアクティブクエリ）
  - コスト効率（差分更新による API 呼び出し最小化）

## システム全体アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Convex        │    │   Meta API      │
│   (React)       │    │   (Database)    │    │   (External)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • 3層キャッシュ  │◄──►│ • metaInsights  │◄──►│ • Ad Insights   │
│ • リアクティブ   │    │ • dataFreshness │    │ • Rate Limiting │
│ • 疲労度計算    │    │ • Scheduler     │    │ • Authentication│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
    WebSocket              Reactive Queries        HTTP Requests
    (< 100ms)              (Real-time Sync)        (Differential)
```

## コンポーネント構成

### フロントエンド層

**フレームワーク**: React 18 with TypeScript
**状態管理**: Convex Reactive Queries + React Hooks
**キャッシュ戦略**: 3層キャッシュシステム

```typescript
// L1: メモリキャッシュ (In-Memory)
const memoryCache = useRef<Map<string, CacheEntry>>(new Map())

// L2: Convex永続化キャッシュ (Persistent + Real-time)
const convexCache = useQuery(api.cache.getInsights, { accountId, dateRange })

// L3: Meta API (Differential Fetch)
const metaApi = useCallback(async () => {
  // 差分取得ロジック
}, [])
```

**主要コンポーネント**:
- `ConvexCacheProvider`: 3層キャッシュの統合管理
- `DifferentialUpdater`: 差分更新エンジン
- `DataFreshnessManager`: データ鮮度管理
- `FatigueCalculator`: 疲労度計算エンジン

### バックエンド層（Convex）

**フレームワーク**: Convex Serverless Functions
**認証方式**: Meta OAuth 2.0 + Convex Auth
**スケジューラー**: Convex Scheduled Functions

```javascript
// convex/cache.js
export const getInsights = query({
  args: { accountId: v.string(), dateRange: v.string() },
  handler: async (ctx, { accountId, dateRange }) => {
    // 差分チェック + データ取得
  }
})

// convex/scheduler.js  
export const updateStaleData = internalMutation({
  handler: async (ctx) => {
    // 10分間隔でのデータ鮮度チェック
  }
})
```

### データベース層（Convex）

**DBMS**: Convex（MongoDB-like Document Store）
**リアルタイム同期**: WebSocket + Reactive Queries
**キャッシュ**: 多層キャッシュ戦略

## データフロー設計

### 1. 通常のデータ取得フロー

```
User Request → L1 Check → L2 Query → L3 API (if needed) → Response
    ↓              ↓         ↓              ↓              ↓
  Component    Memory    Convex     Meta API      Real-time UI
  (< 10ms)    (< 50ms)  (< 100ms)   (< 2000ms)    Update
```

### 2. 差分更新フロー

```
Scheduler → Data Freshness Check → Differential API Call → Convex Update → WebSocket Broadcast
    ↓              ↓                      ↓                    ↓               ↓
 10分間隔      鮮度判定           必要なデータのみ取得        DB更新         全クライアント同期
                                  (90% API削減)                           (< 100ms)
```

### 3. エラー時フォールバックフロー

```
API Error → Exponential Backoff → Retry (3回) → Cache Fallback → User Notification
    ↓              ↓                   ↓              ↓               ↓
Rate Limit    指数的待機        自動リトライ      キャッシュ表示    ステータス通知
```

## スケーラビリティ設計

### 並行処理対応
- **最大同時アカウント**: 10アカウント
- **リクエスト分散**: Convex の自動スケーリング
- **メモリ管理**: タブあたり50MB制限（LRU削除）

### パフォーマンス最適化
- **キャッシュヒット率**: 95%以上維持
- **API削減率**: 90%以上達成
- **応答時間**: L1/L2 100ms以下、L3 3秒以下

## セキュリティアーキテクチャ

### 認証・認可
```typescript
// Meta API認証
interface MetaToken {
  accessToken: string      // AES-256暗号化
  refreshToken: string     // AES-256暗号化  
  expiresAt: Date
  accountId: string        // アクセス制御キー
}

// Convexアクセス制御
export const getInsights = query({
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error("Unauthorized")
    
    // アカウント単位のアクセス制御
    return await ctx.db.query("metaInsights")
      .filter(q => q.eq("accountId", user.accountId))
      .collect()
  }
})
```

### データプライバシー
- **暗号化**: Meta APIトークンのAES-256暗号化
- **ログ管理**: 30日間保持、機密情報除外
- **監査**: アクセスログの完全追跡

## 監視・運用設計

### メトリクス収集
```typescript
interface SystemMetrics {
  cacheHitRate: number        // 目標: 95%以上
  apiCallReduction: number    // 目標: 90%以上
  responseTime: {
    p50: number              // 目標: < 50ms
    p95: number              // 目標: < 100ms
    p99: number              // 目標: < 200ms
  }
  memoryUsage: number        // 目標: < 50MB/tab
  errorRate: number          // 目標: < 0.1%
}
```

### アラート設定
- **Critical**: API呼び出し失敗率 > 5%
- **Warning**: キャッシュヒット率 < 90%
- **Info**: データ更新完了通知

## 災害復旧設計

### バックアップ戦略
- **頻度**: 日次自動バックアップ
- **保持期間**: 30日間
- **復旧目標**: RTO < 4時間, RPO < 1時間

### 自動復旧
```typescript
// 自動復旧ロジック
const autoRecovery = {
  convexConnectionLoss: () => {
    // WebSocket再接続 + データ再同期
  },
  metaApiFailure: () => {
    // 指数バックオフ + キャッシュフォールバック
  },
  dataCorruption: () => {
    // バックアップからの自動復元
  }
}
```

## 技術的制約・前提

### Convex制約
- **データサイズ**: 1ドキュメント 最大1MB
- **クエリ制限**: 1リクエスト 最大16MB
- **同時接続**: プランに依存（Proプラン推奨）

### Meta API制約  
- **レート制限**: アプリレベル 200req/hour
- **APIバージョン**: v23.0固定使用
- **データ保持**: 最大37ヶ月

### パフォーマンス制約
- **メモリ**: ブラウザタブあたり50MB
- **ネットワーク**: 3G環境でも3秒以内
- **CPU**: バックグラウンド処理でUI阻害なし

## 拡張性設計

### 将来拡張ポイント
1. **他のプラットフォーム対応**: Google Ads, TikTok Ads
2. **AIベース予測**: 疲労度予測アルゴリズム
3. **リアルタイム通知**: Slack/Email統合
4. **ダッシュボード機能**: カスタムレポート生成

### モジュラー設計
```typescript
// プラグイン可能なアーキテクチャ
interface DataProvider {
  fetchInsights(params: FetchParams): Promise<AdInsight[]>
  getDifferentialUpdates(lastSync: Date): Promise<AdInsight[]>
}

class MetaDataProvider implements DataProvider { /* ... */ }
class GoogleAdsProvider implements DataProvider { /* ... */ }
```

この設計により、要求される全ての機能・非機能要件を満たしながら、将来の拡張性も確保している。