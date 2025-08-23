# Meta API v23.0 コンバージョンデータ取得トラブルシューティング

## 確認事項チェックリスト

### 1. Facebook Business Manager側の設定
- [ ] Facebook Pixelが正しく設置されているか
- [ ] Conversions APIが設定されているか
- [ ] イベントマネージャーでコンバージョンイベントが確認できるか
- [ ] アトリビューション設定が適切か

### 2. APIアクセス権限
必要な権限：
- `ads_management`
- `ads_read`
- `business_management`
- `pages_read_engagement`（ページ投稿型広告の場合）

### 3. デバッグ手順

#### ステップ1: 生データの確認
```javascript
// getInsightsメソッドで取得したデータをログ出力
console.log('Raw API Response:', response);
```

#### ステップ2: actionsフィールドの内容確認
```javascript
if (data.actions) {
  console.log('Available action types:', 
    data.actions.map(a => a.action_type)
  );
}
```

#### ステップ3: 特定のコンバージョンタイプを確認
主なコンバージョンタイプ：
- `purchase` - 購入
- `offsite_conversion.fb_pixel_purchase` - Pixel経由の購入
- `onsite_conversion.purchase` - サイト内購入
- `omni_purchase` - オムニチャネル購入
- `app_install` - アプリインストール
- `lead` - リード獲得

### 4. APIコールの修正案

```typescript
// より詳細なパラメータ設定
const params = {
  fields: [
    // 基本フィールド
    'impressions',
    'clicks',
    'spend',
    
    // アクション系（重要）
    'actions',
    'action_values',
    'cost_per_action_type',
    
    // コンバージョン系
    'conversions',
    'conversion_values',
    'cost_per_conversion',
    
    // 追加フィールド
    'website_ctr',
    'website_purchase_roas',
    'purchase_roas'
  ].join(','),
  
  // アトリビューション設定
  use_unified_attribution_setting: true,
  action_attribution_windows: ['1d_click', '7d_click', '1d_view'],
  
  // ブレークダウン
  action_breakdowns: 'action_type,action_target_id,action_destination'
};
```

### 5. よくある問題と対処法

#### 問題1: conversionsフィールドが0または空
**原因**: Pixelイベントが正しく設定されていない
**対処**: 
1. Facebook Events Managerでイベントを確認
2. Test Eventsツールでイベント送信を確認
3. actionsフィールドから手動で集計

#### 問題2: action_valuesが取得できない
**原因**: 値（value）パラメータがイベントに含まれていない
**対処**: Pixelコードで値を送信するよう修正

#### 問題3: 特定の期間のデータが取得できない
**原因**: アトリビューションウィンドウの設定
**対処**: action_attribution_windowsを調整

### 6. 代替アプローチ

actionsフィールドから手動でコンバージョンを集計：
```typescript
const extractConversions = (actions: any[]) => {
  const conversionTypes = [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
    'omni_purchase'
  ];
  
  return actions
    .filter(a => conversionTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value), 0);
};
```

### 7. テスト用最小限のAPIコール

```typescript
// 最小限のテストコール
const testInsights = await metaApi.getInsights({
  level: 'account',
  dateRange: {
    since: '2025-01-01',
    until: '2025-01-01'
  },
  fields: ['actions', 'action_values'],
  limit: 1
});

console.log('Test Response:', JSON.stringify(testInsights, null, 2));
```