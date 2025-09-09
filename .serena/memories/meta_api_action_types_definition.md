# Meta Ads API アクション指標の詳細定義

## post_engagement と post_reaction の正確な定義

### 実データから判明した内訳

#### あなたのデータ：
```json
{
  "post_engagement": 198567,
  "post_reaction": 198,
  "comment": 4,
  "onsite_conversion.post_save": 56,
  "link_click": 10075,
  "video_view": 188234
}
```

#### Stack Overflowの例（参考）：
```json
{
  "post_engagement": 602,
  "post_reaction": 29,
  "comment": 12,
  "like": 2,
  "post": 3,
  "video_view": 558
}
```

## 各指標の詳細定義

### 1. post_reaction（投稿リアクション）
**定義**: 投稿に対するすべてのリアクション（感情表現）の合計
- いいね（Like）
- 超いいね（Love）
- うけるね（Haha）
- すごいね（Wow）
- 悲しいね（Sad）
- ひどいね（Angry）
- 応援してます（Care）

**あなたのデータ**: 198件

### 2. post_engagement（投稿エンゲージメント）
**定義**: 投稿に対するすべてのインタラクションの合計
- post_reaction（すべてのリアクション）
- comment（コメント）
- share/post（シェア）
- link_click（リンククリック）
- video_view（動画視聴）
- photo_view（写真表示）
- その他の投稿インタラクション

**計算式の推定**:
```
post_engagement = post_reaction + comment + saves + link_clicks + video_views + その他
```

### 3. page_engagement（ページエンゲージメント）
**定義**: ページレベルのすべてのエンゲージメント
- post_engagement（投稿エンゲージメント）
- ページのいいね
- ページへのメッセージ送信
- その他のページインタラクション

## あなたのデータの内訳分析

### post_engagement (198,567) の内訳推定：
```
video_view:        188,234  (94.8%)
link_click:         10,075  (5.1%)
post_reaction:         198  (0.1%)
post_save:              56  (0.03%)
comment:                 4  (0.002%)
-----------------------------------
合計:              198,567
```

**重要な発見**:
- post_engagementの大部分（94.8%）は動画視聴
- post_reactionは198件で、これがすべてのリアクション（いいね含む）の合計
- shareは別途action_typeとして存在しない（post_engagementに含まれる可能性）

## 利用可能な指標と計算方法

### 確実に計算可能な指標：

1. **リアクション率**
```typescript
const reactionRate = (post_reaction / reach) * 100
// = (198 / reach) * 100
```

2. **保存率**
```typescript
const saveRate = (onsite_conversion.post_save / reach) * 100
// = (56 / reach) * 100
```

3. **コメント率**
```typescript
const commentRate = (comment / reach) * 100
// = (4 / reach) * 100
```

4. **総合エンゲージメント率**
```typescript
const engagementRate = (post_engagement / reach) * 100
// = (198,567 / reach) * 100
```

5. **動画除外エンゲージメント率**
```typescript
const nonVideoEngagementRate = ((post_engagement - video_view) / reach) * 100
// = ((198,567 - 188,234) / reach) * 100
// = (10,333 / reach) * 100
```

## 注意事項

1. **「いいね」の個別数は取得不可**
   - post_reaction（198）に含まれるが、個別の内訳は不明
   
2. **「シェア」の数は不明**
   - 別途action_typeとして存在しない
   - post_engagementの「その他」に含まれる可能性

3. **post_engagementの完全な内訳は不可能**
   - 一部の要素が見えないため、完全な再構成は困難

## 実装推奨事項

確実に使える指標のみを実装：
- ✅ post_reaction（リアクション総数）
- ✅ comment（コメント数）
- ✅ onsite_conversion.post_save（保存数）
- ✅ link_click（リンククリック数）
- ✅ video_view（動画視聴数）
- ✅ post_engagement（総エンゲージメント）

内訳が不明な指標は使用しない：
- ❌ 個別のいいね数
- ❌ シェア数（単独では取得不可）
