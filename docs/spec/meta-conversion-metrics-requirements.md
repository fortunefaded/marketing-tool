# Meta広告コンバージョン指標取得 要件定義書

## 概要

Meta広告のコンバージョン指標（CV、F-CV）をMeta Graph API v23.0から取得し、ダッシュボードに表示する機能を実装する。現在、MainDashboardの広告パフォーマンステーブルでCV（結果）とF-CV（クリックから1日間の最初のコンバージョン）が0またはN/Aと表示されている問題を解決する。

## ユーザストーリー

### ストーリー1: コンバージョンデータの可視化

- **である** マーケティング担当者 **として**
- **私は** Meta広告のコンバージョン数（CV）と初回コンバージョン数（F-CV）を確認 **したい**
- **そうすることで** 広告効果を正確に把握し、最適化の判断ができる

### ストーリー2: アトリビューション期間の統一管理

- **である** 広告運用者 **として**
- **私は** 1日クリックアトリビューションで統一されたコンバージョンデータを取得 **したい**
- **そうすることで** 一貫性のある効果測定が可能になる

## 機能要件（EARS記法）

### 通常要件

- REQ-001: システムは Meta Graph API v23.0 を使用してコンバージョンデータを取得しなければならない
- REQ-002: システムは CV（総コンバージョン数）を広告クリックから1日以内のすべてのコンバージョンとして計算しなければならない
- REQ-003: システムは F-CV（初回コンバージョン数）を広告クリックから1日以内の最初のコンバージョンのみとして計算しなければならない
- REQ-004: システムは CV ≥ F-CV の関係が常に成立することを保証しなければならない
- REQ-005: システムは コンバージョンデータをCreativeTableTab、AggregatedFatigueTable、CampaignTabのすべてに表示しなければならない

### 条件付き要件

- REQ-101: Meta APIから`conversions`フィールドが返された場合、システムは その値をCVとして使用しなければならない
- REQ-102: `conversions`フィールドが存在せず`actions`フィールドが存在する場合、システムは 購入系アクションの合計をCVとして計算しなければならない
- REQ-103: **[暫定実装]** F-CV取得用の明確なAPIフィールドが特定できるまで、システムは CVと同じ値をF-CVとして使用しなければならない
- REQ-104: action_attribution_windows: ['1d_click']を指定した場合、システムは すべてのコンバージョン関連フィールドが1日クリックアトリビューションの値であることを前提としなければならない
- REQ-105: CV < F-CVという不整合が検出された場合、システムは 警告ログを出力し、F-CVをCVと同値に修正しなければならない
- REQ-106: コンバージョン数が0より大きい場合、システムは cost_per_conversion（CPA）を spend ÷ conversions として計算しなければならない
- REQ-107: コンバージョン数が0の場合、システムは cost_per_conversionを0として設定しなければならない

### 状態要件

- REQ-201: APIリクエスト実行中の場合、システムは ローディングインジケーターを表示しなければならない
- REQ-202: データ取得エラーが発生した場合、システムは エラーメッセージを表示し、前回取得したデータがあればそれを保持しなければならない

### オプション要件

- REQ-301: システムは APIレスポンスのコンバージョン関連フィールドをコンソールにログ出力してもよい
- REQ-302: システムは Meta Ad Managerとの数値比較機能を提供してもよい

### 制約要件

- REQ-401: システムは Meta Graph API v23.0 のみを使用しなければならない
- REQ-402: システムは action_attribution_windows パラメータに ['1d_click'] を指定しなければならない
- REQ-403: システムは use_unified_attribution_setting パラメータを true に設定しなければならない
- REQ-404: システムは 購入系アクションの判定において 'purchase'、'omni_purchase'、'custom'を含むconversionを対象としなければならない

## 非機能要件

### パフォーマンス

- NFR-001: コンバージョンデータの取得と表示は既存のデータ取得処理と同時に実行され、追加のAPI呼び出しを発生させてはならない
- NFR-002: データ変換処理（extractConversions関数）は100件のアイテムに対して100ms以内に完了しなければならない

### データ整合性

- NFR-101: CVとF-CVの関係（CV ≥ F-CV）は100%の確率で保証されなければならない
- NFR-102: Meta Ad Managerに表示される数値との差異は±5%以内でなければならない

### ユーザビリティ

- NFR-201: コンバージョン数が0の場合は「0」と表示し、データ取得失敗の場合は「N/A」と表示しなければならない
- NFR-202: 数値は3桁ごとにカンマ区切りで表示されなければならない

## Edgeケース

### エラー処理

- EDGE-001: Meta APIがactions/conversionsフィールドを返さない場合、CVとF-CVは0として処理される
- EDGE-002: action_typeがnullまたはundefinedの場合、該当アクションはスキップされる
- EDGE-003: 数値変換（parseInt/parseFloat）に失敗した場合、0として処理される

### 境界値

- EDGE-101: CVが0の場合、F-CVも必ず0となる
- EDGE-102: CVとF-CVが同じ値の場合、すべてのコンバージョンが初回購入として扱われる
- EDGE-103: 非常に大きな数値（>1,000,000）の場合でも正しく表示される

### APIバージョン差異

- EDGE-201: unique_actionsフィールドが廃止された場合、フォールバック処理により継続動作する
- EDGE-202: 新しいコンバージョン関連フィールドが追加された場合、既存処理に影響を与えない

## 実装詳細

### APIリクエストパラメータ

```typescript
const params = {
  access_token: account.accessToken,
  time_range: JSON.stringify({...}),
  level: 'ad',
  fields: 'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,ctr,cpm,cpc,frequency,reach,date_start,date_stop,conversions,actions,action_values,cost_per_conversion',
  limit: '500',
  action_attribution_windows: ['1d_click'],
  use_unified_attribution_setting: true
}
```

### データ変換関数

```typescript
const extractConversions = (item: any) => {
  try {
    let cv = 0;   // CV: 1日クリックの総コンバージョン
    let fcv = 0;  // F-CV: 1日クリックの最初のコンバージョン（暫定実装）
    
    // デバッグ用: APIレスポンスの構造を確認
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 コンバージョンデータ確認:', {
        conversions: item.conversions,
        actions: item.actions?.map((a: any) => ({ 
          action_type: a.action_type, 
          value: a.value 
        })),
        action_attribution_windows: item.action_attribution_windows,
        all_fields: Object.keys(item)
      });
    }
    
    // CV: 総コンバージョン数の取得
    // action_attribution_windows: ['1d_click']指定により、
    // conversionsフィールドは1日クリックアトリビューションの値
    if (item.conversions) {
      cv = parseInt(item.conversions) || 0;
    } else if (item.actions && Array.isArray(item.actions)) {
      // actionsフィールドから購入系アクションを集計
      item.actions.forEach((action: any) => {
        if (isPurchaseAction(action.action_type)) {
          cv += parseInt(action.value || '0');
        }
      });
    }
    
    // F-CV: 暫定実装
    // 注意: Meta API v23.0では「最初のコンバージョン」を直接取得する
    // 標準フィールドが存在しない可能性が高いため、暫定的にCVと同値とする
    // TODO: 将来的な改善案
    // 1. Meta Conversion APIでカスタムイベントを実装
    // 2. 複数のAPIコールでユーザー単位のデータを取得
    // 3. BigQueryなどでのポストプロセッシング
    fcv = cv; // 暫定実装: すべてのコンバージョンが初回と仮定
    
    // データ整合性チェック: CV ≥ F-CV の保証
    if (fcv > cv) {
      console.warn(`⚠️ データ不整合検出: F-CV (${fcv}) > CV (${cv}), F-CVをCVと同値に修正`);
      fcv = cv;
    }
    
    return {
      conversions: cv,
      conversions_1d_click: fcv
    };
    
  } catch (error) {
    console.error('❌ Conversion extraction failed:', error, { item });
    return { 
      conversions: 0, 
      conversions_1d_click: 0 
    };
  }
};

const isPurchaseAction = (actionType: string): boolean => {
  if (!actionType || typeof actionType !== 'string') return false;
  
  // Meta APIで定義されている購入関連のアクションタイプ
  // 参考: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
  const purchaseTypes = [
    'offsite_conversion.fb_pixel_purchase',        // Facebookピクセル経由の購入
    'offsite_conversion.fb_pixel_initiate_checkout', // チェックアウト開始
    'offsite_conversion.fb_pixel_add_to_cart',     // カート追加（オプション）
    'omni_purchase',                                // オムニチャネル購入
    'purchase',                                     // 一般的な購入
    'mobile_app_purchase',                          // モバイルアプリ内購入
    'onsite_conversion.purchase'                    // サイト内購入
  ];
  
  // 部分一致でチェック（カスタムコンバージョンも考慮）
  const isStandardPurchase = purchaseTypes.some(type => 
    actionType.toLowerCase().includes(type.toLowerCase())
  );
  
  // カスタムコンバージョンのチェック
  const isCustomConversion = actionType.toLowerCase().includes('custom') && 
                            actionType.toLowerCase().includes('conversion');
  
  return isStandardPurchase || isCustomConversion;
};
```

## 受け入れ基準

### 機能テスト

- [ ] MainDashboardの広告パフォーマンステーブルにCV列が表示される
- [ ] MainDashboardの広告パフォーマンステーブルにF-CV列が表示される
- [ ] CV ≥ F-CV の関係が常に成立する
- [ ] コンバージョンがない広告で0が正しく表示される
- [ ] API取得エラー時にN/Aが表示される
- [ ] CreativeTableTabでコンバージョン数が表示される
- [ ] AggregatedFatigueTableでコンバージョン数が表示される
- [ ] CampaignTabでコンバージョン数が表示される

### 統合テスト

- [ ] Meta Graph API v23.0との通信が正常に動作する
- [ ] action_attribution_windowsパラメータが正しく送信される
- [ ] use_unified_attribution_settingがtrueで送信される
- [ ] 購入系アクション（purchase, omni_purchase, custom conversion）が正しく識別される

### 非機能テスト

- [ ] 100件のデータ変換が100ms以内に完了する
- [ ] Meta Ad Managerの数値との差異が±5%以内である
- [ ] 大量データ（>1000件）でも正常に動作する
- [ ] メモリリークが発生しない

### デバッグログ確認

- [ ] コンソールにコンバージョンデータのログが出力される
- [ ] conversions、actions、unique_actions、first_conversionフィールドの存在が確認できる
- [ ] エラー時のスタックトレースが記録される

## 実装優先順位

1. **Phase 1: 基本実装**（必須）
   - APIパラメータの追加
   - extractConversions関数の実装
   - MainDashboardへのデータ表示

2. **Phase 2: 完全実装**（必須）
   - すべてのテーブルコンポーネントへの適用
   - エラーハンドリング
   - データ整合性の保証

3. **Phase 3: 最適化**（オプション）
   - デバッグログの追加
   - パフォーマンス最適化
   - Meta Ad Managerとの比較機能

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| F-CV取得方法の不確実性 | 極高 | 高 | 暫定実装（CV=F-CV）で進め、段階的に改善 |
| unique_actionsの誤解釈 | 高 | 高 | フィールドの用途を正しく理解し、使用を避ける |
| アトリビューション設定の不整合 | 高 | 中 | action_attribution_windows設定の影響をテストで確認 |
| APIレスポンス構造の変更 | 高 | 中 | エラーハンドリングとログ出力で早期発見 |
| 購入アクションタイプの誤認識 | 中 | 中 | 包括的なアクションタイプリストで対応 |
| データ不整合（CV < F-CV） | 高 | 低 | バリデーションと自動修正機能の実装 |
| パフォーマンス劣化 | 中 | 低 | try-catchによるエラー処理で安定性確保 |

## 成功指標

- CV、F-CVの数値が0/N/A以外で表示される割合: 95%以上
- Meta Ad Managerとの数値一致率: 95%以上（CV値のみ）
- ページロード時間の増加: 100ms以内
- エラー発生率: 1%未満

## 重要な注記

### F-CV実装に関する制限事項

1. **現時点での制限**
   - Meta API v23.0には「最初のコンバージョン」を直接取得する標準的な方法が存在しない
   - unique_actionsは「ユニークユーザーによるアクション」であり、「最初のコンバージョン」とは異なる概念
   - first_conversionというフィールドは公式ドキュメントに存在しない

2. **暫定対応**
   - Phase 1では F-CV = CV として実装（すべてのコンバージョンが初回購入と仮定）
   - これにより CV ≥ F-CV の関係は自動的に保証される（CV = F-CV）
   - ダッシュボードには両方の値を表示するが、同じ値になることを明示

3. **将来の改善案**
   - Meta Conversion APIを使用したサーバーサイドイベントトラッキング
   - カスタムイベントパラメータで初回購入フラグを追加
   - BigQueryやデータウェアハウスでのポストプロセッシング
   - 複数のAPIコールを組み合わせたユーザー単位の分析

### APIレスポンスの検証

実装前に以下のフィールドの存在を確認する必要がある：
- `conversions`
- `actions` 配列とその構造
- `action_attribution_windows` の影響
- `use_unified_attribution_setting` の効果

### デバッグモード

開発環境では詳細なログを出力し、以下を確認：
- 実際のAPIレスポンス構造
- 利用可能なフィールド一覧
- アトリビューション設定の影響
- コンバージョン関連データの有無