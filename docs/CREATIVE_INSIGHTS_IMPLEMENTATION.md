# クリエイティブインサイト実装ガイド

## 重要な発見事項

### Meta Marketing APIにおけるクリエイティブデータの取得方法

1. **専用エンドポイントは存在しない**
   - `adcreativeinsights`のような専用エンドポイントはありません
   - クリエイティブレベルのデータは通常の`insights`エンドポイントで取得します

2. **正しい実装方法**

```typescript
// 広告レベルでクリエイティブごとのパフォーマンスを取得
const getCreativeInsights = async (adId: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${adId}/insights?` +
      `fields=spend,impressions,clicks,cpm,cpc,ctr` +
      `&level=ad` + // 広告レベルで取得
      `&breakdowns=product_id` + // プロダクトごとに分解（カルーセル広告など）
      `&access_token=${accessToken}`
  )
  return response.json()
}

// クリエイティブ情報を含む広告データの取得
const getAdWithCreative = async (adId: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${adId}?` +
      `fields=id,name,creative{` +
      `id,name,object_story_spec,asset_feed_spec,` +
      `thumbnail_url,effective_object_story_id` +
      `},insights{spend,impressions,clicks}` +
      `&access_token=${accessToken}`
  )
  return response.json()
}
```

## データ構造の理解

### 1. 広告とクリエイティブの関係

- 1つの広告は1つのクリエイティブを使用
- 1つのクリエイティブは複数の広告で使用可能
- クリエイティブは作成後変更不可

### 2. 階層構造

```
Campaign (キャンペーン)
  └── Ad Set (広告セット)
      └── Ad (広告)
          └── Creative (クリエイティブ)
```

### 3. インサイトの取得レベル

- **account**: アカウント全体
- **campaign**: キャンペーンレベル
- **adset**: 広告セットレベル
- **ad**: 広告レベル（クリエイティブパフォーマンスはここで取得）

## 実装における注意点

### 1. APIバージョン

- 最新版v23.0を使用（固定バージョン）
- 古いバージョンは約1年で廃止される
- 自動アップグレード機能があるが、明示的に最新版を指定推奨

### 2. パフォーマンス最適化

```typescript
// バッチリクエストでクリエイティブとインサイトを同時取得
const batchRequest = [
  {
    method: 'GET',
    relative_url: `${adId}?fields=creative{id,name,thumbnail_url}`,
  },
  {
    method: 'GET',
    relative_url: `${adId}/insights?fields=spend,impressions,clicks`,
  },
]
```

### 3. マルチプロダクト広告（カルーセルなど）

```typescript
// product_idでブレークダウンして個別プロダクトの成果を取得
const getProductLevelInsights = async (adId: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${adId}/insights?` +
      `breakdowns=product_id` +
      `&fields=spend,impressions,clicks,actions` +
      `&access_token=${accessToken}`
  )
  return response.json()
}
```

## 推奨される実装アプローチ

1. **広告レベルでデータ取得**
   - クリエイティブIDを含む広告データを取得
   - 同時にインサイトデータも取得

2. **クリエイティブ情報のキャッシュ**
   - クリエイティブは変更されないため、積極的にキャッシュ
   - thumbnail_urlなどの静的データは保存

3. **効率的なデータ構造**

```typescript
interface CreativePerformance {
  creativeId: string
  creativeName: string
  thumbnailUrl: string
  adIds: string[] // このクリエイティブを使用する広告
  aggregatedMetrics: {
    spend: number
    impressions: number
    clicks: number
    ctr: number
    cpc: number
  }
}
```

## 次のステップ

1. 既存の実装を上記の構造に合わせて修正
2. `insights`エンドポイントを使用した実装に変更
3. クリエイティブとパフォーマンスデータの効率的な結合処理を実装
