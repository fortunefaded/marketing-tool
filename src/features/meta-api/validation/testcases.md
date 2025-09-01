# TASK-001: DataValidator テストケース

## テストケース一覧

### 1. normalizeNumericValues メソッド

#### TC-001: 文字列数値の正規化
- **入力**: "1,234.56"
- **期待値**: 1234.56
- **説明**: カンマ区切りの文字列を数値に変換

#### TC-002: undefined/nullの処理
- **入力**: undefined, null
- **期待値**: 0
- **説明**: 未定義値を0として扱う

#### TC-003: 既に数値の場合
- **入力**: 123.45
- **期待値**: 123.45
- **説明**: 数値はそのまま返す

#### TC-004: 丸め処理（precision=2）
- **入力**: 123.456789
- **期待値**: 123.46
- **説明**: 指定された精度で丸める

#### TC-005: 無効な文字列
- **入力**: "abc"
- **期待値**: NaN
- **説明**: 数値に変換できない文字列

### 2. validateMetrics メソッド

#### TC-006: 有効なデータの検証
- **入力**: 
  ```typescript
  {
    ad_id: "123",
    ad_name: "Test Ad",
    impressions: "1000",
    clicks: "50",
    spend: "100.50",
    ctr: "5.0"
  }
  ```
- **期待値**: { isValid: true, errors: [], warnings: [] }
- **説明**: 全てのフィールドが有効

#### TC-007: 必須フィールド欠落
- **入力**: 
  ```typescript
  {
    ad_name: "Test Ad",
    impressions: "1000"
  }
  ```
- **期待値**: { isValid: false, errors: [ad_id missing error] }
- **説明**: ad_idが欠落している場合のエラー

#### TC-008: CTR異常値の警告
- **入力**: 
  ```typescript
  {
    ad_id: "123",
    ad_name: "Test Ad",
    ctr: "150.0"
  }
  ```
- **期待値**: { isValid: true, warnings: [CTR exceeds 100%] }
- **説明**: CTRが100%を超える場合の警告

#### TC-009: Frequency異常値の警告
- **入力**: 
  ```typescript
  {
    ad_id: "123",
    ad_name: "Test Ad",
    frequency: "75"
  }
  ```
- **期待値**: { isValid: true, warnings: [High frequency warning] }
- **説明**: Frequencyが50を超える場合の警告

### 3. applyCurrencyConversion メソッド

#### TC-010: 同一通貨の場合
- **入力**: amount: 1000, currency: "JPY" (displayCurrency: "JPY")
- **期待値**: 1000
- **説明**: 変換不要

#### TC-011: 異なる通貨の変換
- **入力**: amount: 100, currency: "USD" (rate: 150)
- **期待値**: 15000
- **説明**: USD→JPY変換

#### TC-012: 未定義の通貨
- **入力**: amount: 100, currency: "EUR" (rate未定義)
- **期待値**: 100
- **説明**: レートがない場合は元の値を返す

### 4. normalizePercentage メソッド

#### TC-013: decimal形式からpercentage形式へ
- **入力**: 0.05 (apiFormat: 'decimal', displayFormat: 'percentage')
- **期待値**: 5
- **説明**: 0.05 → 5%

#### TC-014: percentage形式からdecimal形式へ
- **入力**: 5 (apiFormat: 'percentage', displayFormat: 'decimal')
- **期待値**: 0.05
- **説明**: 5% → 0.05

#### TC-015: 同一形式の場合
- **入力**: 5 (apiFormat: 'percentage', displayFormat: 'percentage')
- **期待値**: 5
- **説明**: 変換不要

### 5. normalizeDateWithTimezone メソッド

#### TC-016: タイムゾーンオフセット適用
- **入力**: "2024-08-01T00:00:00Z", timezone: "Asia/Tokyo" (offset: 540)
- **期待値**: 2024-08-01T09:00:00
- **説明**: UTC→JST変換

#### TC-017: ISO 8601形式のパース
- **入力**: "2024-08-01T12:34:56Z"
- **期待値**: Valid Date object
- **説明**: 正しい日付オブジェクトが返される

#### TC-018: 無効な日付文字列
- **入力**: "invalid-date"
- **期待値**: Invalid Date
- **説明**: 無効な日付の処理

## エッジケース

### E-001: 境界値テスト
- CTR = 0%, 100%, 100.01%
- Frequency = 0, 50, 50.1
- 空文字列の処理
- 極大値/極小値の処理

### E-002: 型の混在
- 文字列と数値の混在したデータ
- 不正な型のフィールド

### E-003: パフォーマンス
- 大量データ（1000件）の処理時間
- メモリ使用量の確認