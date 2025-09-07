# ECForce統合機能 実装概要

## 実装完了項目

### 1. ECForce APIクライアント (`src/features/ecforce-api/core/api-client.ts`)
- ECForce Admin API v2対応
- 認証機能
- 注文データ取得
- 顧客データ取得
- データ集計機能
- レート制限対策

### 2. Convexデータベース関数 (`convex/ecforce.ts`)
- 設定管理 (saveConfig, getConfig)
- 注文データ保存 (saveOrders)
- データ検索 (searchOrders)
- 売上分析 (getRevenueAnalytics)
- 顧客ランキング (getTopCustomers)
- 広告ROI分析 (getAdvertisingROI)
- インポート履歴管理

### 3. ダッシュボードコンポーネント (`ECForceDashboard`)
- 概要タブ：売上サマリー、日別推移グラフ
- 顧客分析タブ：顧客売上ランキング
- 広告効果タブ：ROI/ROAS分析
- 設定タブ：API設定、同期設定

### 4. 統合フック (`src/features/ecforce-api/hooks/useECForceIntegration.ts`)
- useECForceIntegration: Meta広告とのコンバージョン分析
- useECForceSync: データ同期処理
- useECForceRealtime: リアルタイムデータ取得
- useECForceMetrics: 期間別メトリクス集計

## 主要機能

### データ集計
- 期間指定での売上集計
- 日別/週別/月別グループ化
- 商品別、顧客別、広告主別の分析

### Meta広告との統合
- 広告コード/URLでのマッチング
- コンバージョン率の算出
- ROI/ROASの自動計算
- クロスチャネル分析

### リアルタイム同期
- 自動同期設定（時間/日次/週次）
- 手動同期トリガー
- インポート履歴管理
- エラーハンドリング

## 使用方法

### 1. 初期設定
```typescript
// ECForce API設定を保存
await saveConfig({
  apiUrl: 'https://your-shop.ec-force.com',
  apiKey: 'your-api-key',
  shopId: 'your-shop-id',
  syncEnabled: true,
  syncInterval: 'daily'
});
```

### 2. ダッシュボードの表示
```tsx
import ECForceDashboard from '@/features/ecforce-api/components/ECForceDashboard';

function App() {
  return <ECForceDashboard />;
}
```

### 3. データ同期の実行
```typescript
const { syncData } = useECForceSync();

// 手動同期
await syncData({
  from: '2024-01-01',
  to: '2024-12-31'
});
```

### 4. コンバージョン分析
```typescript
const { conversionData } = useECForceIntegration({
  from: '2024-01-01',
  to: '2024-01-31'
});

// Meta広告とECForce注文のマッチング結果を取得
console.log(conversionData);
```

## データフロー

1. **ECForce API** → APIクライアント
2. APIクライアント → データ集計・変換
3. 変換データ → **Convex DB**保存
4. Convex DB → Reactフック経由でフロントエンド
5. フロントエンド → ダッシュボード表示

## 拡張ポイント

- Webhook対応でリアルタイム更新
- 他のECプラットフォーム対応
- 詳細な商品分析機能
- 予測分析機能の追加
- メール/Slack通知機能

## 注意事項

- ECForce APIのレート制限（1秒1リクエスト、1日10,000リクエスト）
- 大量データの場合はバッチ処理推奨
- APIキーは環境変数で管理推奨