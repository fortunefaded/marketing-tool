# Facebook Pixel F-CV（First Conversion）実装ガイド

## 📋 概要
Meta広告ダッシュボードでのコンバージョン指標取得において、F-CV（最初のコンバージョン）の取得にはFacebook Pixelのカスタムイベント実装が必要。

## 🎯 現状
### 解決済み：CV（通常のコンバージョン）
- **正しい値**: 278
- **取得方法**: `offsite_conversion.fb_pixel_purchase` の `1d_click` 値を使用
- **問題だった点**: 複数のpurchase系action_typeを重複カウントしていた（3214という誤った値）

### 未解決：F-CV（クリックから1日間 最初のコンバージョン）
- **目標値**: 169  
- **現状**: Meta Graph API v23.0では直接取得不可能
- **原因**: プライバシー保護のためAPIではユーザーレベルのデータ提供なし

## 💡 解決策：カスタムイベント「FirstTimePurchase」

### WEB実装（必須）

#### 1. Pixel基本コード（全ページ）
```html
<script>
!function(f,b,e,v,n,t,s){...}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

#### 2. 購入完了ページ
```javascript
// 通常の購入イベント
fbq('track', 'Purchase', {
  value: amount,
  currency: 'JPY'
});

// 初回購入の場合のみ
if (isFirstPurchase) {
  fbq('trackCustom', 'FirstTimePurchase', {
    value: amount,
    currency: 'JPY',
    content_type: 'product',
    content_ids: productIds
  });
}

// 強化版：Cookie/LocalStorage併用
function enhancedFirstPurchaseCheck() {
  const serverCheck = window.isFirstPurchase || false;
  const localCheck = !localStorage.getItem('has_purchased');
  return serverCheck && localCheck;
}
```

### サーバー側実装

#### PHP例
```php
function isFirstPurchase($userId) {
    $sql = "SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'completed'";
    $result = $db->query($sql, [$userId]);
    return $result['count'] == 0;
}
```

#### Conversion API併用（推奨）
```php
use FacebookAds\Object\ServerSide\Event;
use FacebookAds\Object\ServerSide\UserData;
use FacebookAds\Object\ServerSide\CustomData;

function sendFirstPurchaseEvent($userId, $amount) {
    $user_data = (new UserData())
        ->setClientIpAddress($_SERVER['REMOTE_ADDR'])
        ->setClientUserAgent($_SERVER['HTTP_USER_AGENT'])
        ->setFbc($_COOKIE['_fbc'] ?? null)
        ->setFbp($_COOKIE['_fbp'] ?? null);
    
    $custom_data = (new CustomData())
        ->setValue($amount)
        ->setCurrency('JPY')
        ->setCustomProperties(['first_purchase' => true]);
    
    $event = (new Event())
        ->setEventName('FirstTimePurchase')
        ->setEventTime(time())
        ->setUserData($user_data)
        ->setCustomData($custom_data);
    
    $request->setEvents([$event])->execute();
}
```

### ダッシュボード側実装

```javascript
const extractConversionData = (item: any) => {
  let cv = 0;
  let fcv = 0;
  
  // CV: 既存のロジック
  const fbPixelPurchase = item.actions?.find(
    a => a.action_type === 'offsite_conversion.fb_pixel_purchase'
  );
  if (fbPixelPurchase) {
    cv = parseInt(fbPixelPurchase['1d_click'] || '0');
  }
  
  // F-CV: カスタムイベントから取得
  const firstPurchase = item.actions?.find(
    a => a.action_type === 'offsite_conversion.custom.FirstTimePurchase'
  );
  if (firstPurchase) {
    fcv = parseInt(firstPurchase['1d_click'] || '0');
  }
  
  // フォールバック（移行期間中）
  if (!firstPurchase && cv > 0) {
    const estimatedFirstPurchaseRate = 0.608; // 169/278
    fcv = Math.round(cv * estimatedFirstPurchaseRate);
    console.warn('F-CV is estimated. Actual Pixel implementation required.');
  }
  
  return { cv, fcv, isEstimated: !firstPurchase };
};
```

## 📅 実装ステップ

1. **Meta Business Manager準備**（1日）
   - Pixel ID取得
   - カスタムイベント「FirstTimePurchase」設定
   
2. **WEBサイト実装**（1週間）
   - 基本Pixelコード設置
   - 購入判定ロジック実装
   - イベント発火コード実装
   
3. **動作確認**（3日）
   - Meta Pixel Helper（Chrome拡張）で確認
   - イベントマネージャーでデータ受信確認
   - テストイベントコード使用：`testEventCode: 'TEST12345'`
   
4. **ダッシュボード連携**（3日）
   - APIでカスタムイベント取得確認
   - F-CV表示実装

## ⚠️ 注意事項

- Pixel設置から24-48時間はデータが不安定
- iOS14.5以降はATT制限でデータ不完全の可能性
- カスタムイベントのAPI取得にタイムラグあり
- GDPR/CCPA対応：必要に応じて同意管理実装
- 重複排除：同一セッション内の複数イベント送信防止
- エラーハンドリング：Pixel読み込み失敗時のフォールバック

## 📊 期待される結果

- **CV**: 278（現在取得可能）
- **F-CV**: 169（Pixel実装後に取得可能）
- **CV ≥ F-CV**: 常に成立

## 🔍 APIレスポンス構造（参考）

```json
{
  "actions": [
    {
      "action_type": "offsite_conversion.fb_pixel_purchase",
      "value": "278",
      "1d_click": "278",
      "7d_click": "301"
    },
    {
      "action_type": "offsite_conversion.custom.FirstTimePurchase",
      "value": "169",
      "1d_click": "169"  // Pixel実装後に取得可能
    }
  ]
}
```

## 🔗 参考リソース

- Meta Pixel実装ガイド: https://developers.facebook.com/docs/meta-pixel
- Conversion API: https://developers.facebook.com/docs/marketing-api/conversions-api
- イベントマネージャー: https://business.facebook.com/events_manager
- Meta Pixel Helper（Chrome拡張）: デバッグ用ツール

## 🚀 優先タスク

1. **今週中**: Meta Business ManagerでPixel ID取得、テスト環境実装
2. **来週まで**: 初回購入判定ロジック実装とテスト
3. **2週間以内**: 本番環境展開、APIデータ取得確認