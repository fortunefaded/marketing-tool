# 数値表示問題 調査レポート

## 調査日時
2025-09-01

## 問題の概要
広告費用やインプレッションなどの数値が、実際のデータよりも桁違いに大きな値（例：¥32,856,392,046,811,460,000,000,000...）として表示される問題。

## 調査結果

### 1. Meta API レスポンスのデータ型と処理

#### 1.1 APIレスポンス形式
Meta Graph API v23.0から返されるデータは、**すべて文字列型**として提供される：

```json
{
  "impressions": "12345",
  "clicks": "456", 
  "spend": "7890.50",
  "ctr": "3.69",
  "cpm": "639.63"
}
```

#### 1.2 初期データ処理（api-client.ts）
`SimpleMetaApi.processInsightData()`メソッドで数値変換を実施：

```typescript
// api-client.ts:391-407
private validateNumeric(value: string | number | undefined, decimals?: number): number {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  const num = parseFloat(String(value))
  if (isNaN(num)) {
    vibe.warn('数値変換エラー', { value, type: typeof value })
    return 0
  }
  if (decimals !== undefined) {
    return parseFloat(num.toFixed(decimals))
  }
  return num
}
```

**評価**: ✅ この時点では正しく数値型に変換されている

### 2. データ集約処理の問題点

#### 2.1 問題箇所1: aggregate-time-series.ts

時系列データの合算処理で、**数値を再び文字列に変換している**：

```typescript
// aggregate-time-series.ts:106-112
function sumField(insights: AdInsight[], field: keyof AdInsight): string {
  const sum = insights.reduce((total, insight) => {
    const value = parseFloat(String(insight[field] || 0))
    return total + (isNaN(value) ? 0 : value)
  }, 0)
  return String(sum)  // ⚠️ 問題: 数値を文字列に変換
}
```

**影響**: 
- 合算後のデータが文字列型として返される
- 後続処理で文字列連結が発生する可能性

#### 2.2 問題箇所2: useAdFatigueWithAggregation.ts

データ型変換時に、**すべての数値フィールドを文字列に変換**：

```typescript
// useAdFatigueWithAggregation.ts:113-125
impressions: String(insight.impressions || 0),  // ⚠️ 文字列化
clicks: String(insight.clicks || 0),           // ⚠️ 文字列化
spend: String(insight.spend || 0),             // ⚠️ 文字列化
```

**影響**:
- AdDataAggregatorに渡される時点で既に文字列型
- 複数の文字列が連結される可能性

### 3. データフローの詳細

```mermaid
graph TD
    A[Meta API Response<br/>文字列型] --> B[api-client.ts<br/>validateNumeric<br/>数値型に変換 ✅]
    B --> C[useMetaInsights.ts<br/>aggregateTimeSeriesData<br/>文字列型に戻す ⚠️]
    C --> D[useAdFatigueSimplified.ts<br/>そのまま渡す]
    D --> E[useAdFatigueWithAggregation.ts<br/>String()で文字列化 ⚠️]
    E --> F[AdDataAggregator.ts<br/>parseNumber()で数値化 ✅]
    F --> G[CreativeTableTab.tsx<br/>formatNumber()で表示]
```

### 4. 根本原因の特定

問題の根本原因は**複数の文字列化処理の組み合わせ**：

1. `aggregate-time-series.ts`で数値を文字列に変換（`return String(sum)`）
2. `useAdFatigueWithAggregation.ts`で再度文字列化（`String(insight.impressions || 0)`）
3. どこかの処理で文字列が連結される（おそらく集約処理中）

例：
- 元データ: "1000", "2000", "3000"
- 期待値: 6000
- 実際の処理: "1000" + "2000" + "3000" = "100020003000"
- 表示値: ¥100,020,003,000

### 5. 推奨される修正案

#### 修正案A: aggregate-time-series.tsの修正（推奨）

```typescript
// 修正前
function sumField(insights: AdInsight[], field: keyof AdInsight): string {
  // ...
  return String(sum)  // 問題箇所
}

// 修正後
function sumField(insights: AdInsight[], field: keyof AdInsight): number {
  // ...
  return sum  // 数値のまま返す
}
```

#### 修正案B: useAdFatigueWithAggregation.tsの修正

```typescript
// 修正前
impressions: String(insight.impressions || 0),

// 修正後  
impressions: insight.impressions || "0",  // 既に文字列なら変換不要
```

#### 修正案C: 型定義の統一

AdInsight型の定義を確認し、数値フィールドの型を統一：
- APIレスポンス時: string
- 内部処理時: number
- 最終出力時: number

### 6. 影響範囲

影響を受けるコンポーネント：
- `/ad-fatigue` ページのテーブル表示
- `/ad-fatigue-simple` ページのテーブル表示
- StatCardコンポーネントの数値表示
- CSVエクスポート機能（該当する場合）

### 7. テスト方針

1. **単体テスト**
   - aggregate-time-series.tsの合算処理
   - AdDataAggregatorの集約処理
   - 数値フォーマット関数

2. **結合テスト**
   - 日付範囲変更時のデータ更新
   - 複数日データの合算結果
   - プラットフォーム別集計の数値

3. **E2Eテスト**
   - 実際のMeta APIからのデータ取得と表示
   - 昨日/先月などの日付フィルター動作

### 8. 結論

**主要問題**: データ処理パイプラインの複数箇所で不要な型変換（数値→文字列）が行われており、文字列連結により巨大な数値が生成されている。

**修正優先度**:
1. 🔴 高: aggregate-time-series.ts の sumField関数
2. 🟡 中: useAdFatigueWithAggregation.ts の型変換処理
3. 🟢 低: 型定義の統一とドキュメント化

**推定作業時間**: 2-3時間（テスト含む）

---

## 付録: デバッグ用コンソールコマンド

```javascript
// ブラウザコンソールで実行してデータフローを確認
window.__AGGREGATION_DEBUG__
window.DEBUG_FATIGUE = true
window.DEBUG_FATIGUE_LOGS
```