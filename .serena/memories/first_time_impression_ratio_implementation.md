# First Time Impression Ratio Implementation

## 実装完了項目

### 1. 型定義の更新
- `src/types/meta-api.ts` の `FatigueData` インターフェースに `first_time_impression_ratio?: number` を追加

### 2. 計算ロジックの実装
- `src/features/meta-api/fatigue/calculator.ts` の `SimpleFatigueCalculator` クラスに推定計算メソッドを追加
- リーチ÷インプレッション×100 で推定値を計算
- フォールバック: 1÷フリークエンシー×100

### 3. UI表示の更新が必要
- `src/features/meta-api/components/FatigueAccordion.tsx` の line 196 で表示
- 現在「計算中」となっている部分を実際の値に置き換える
- 閾値判定関数 `getFirstTimeImpressionStatus` を追加済み

## 残作業
1. FatigueAccordion.tsx の line 351 の構文エラー修正（`>>` を `>` に）
2. テストの追加
3. データ取得時にreachフィールドが正しく取得されているか確認

## 推定ロジックの詳細
```typescript
// リーチベースの計算（最も正確）
if (impressions > 0 && reach > 0) {
  return Math.round((reach / impressions) * 100 * 10) / 10
}

// フリークエンシーベースの計算（代替手段）
if (frequency > 0) {
  return Math.round((1 / frequency) * 100 * 10) / 10
}
```

## 閾値
- 60%以上: 健全（safe）
- 40-60%: 注意（warning）
- 40%未満: 危険（danger）

これらの値は、同じユーザーに繰り返し表示されている割合を示す重要な指標です。