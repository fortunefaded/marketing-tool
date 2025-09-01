# TASK-001: DataValidatorクラス 要件定義

## 目的
Meta APIレスポンスのデータ検証と正規化を行うクラスを実装する

## 機能要件

### 1. 数値の正規化
- 文字列形式の数値を数値型に変換
- カンマ区切りの数値を処理
- undefined/nullを0として扱う
- 指定された精度で丸め処理

### 2. メトリクスの検証
- 必須フィールド（ad_id, ad_name）の存在確認
- 数値フィールドの妥当性検証
- CTRが100%を超えないことを確認
- Frequencyの異常値を検出

### 3. 通貨変換
- アカウント通貨と表示通貨の変換
- 為替レートの適用
- 小数点以下の桁数管理

### 4. パーセンテージ正規化
- APIフォーマット（decimal/percentage）の判定
- 表示フォーマットへの変換

### 5. 日付のタイムゾーン調整
- ISO 8601形式の日付パース
- タイムゾーンオフセットの適用
- 夏時間の考慮（オプション）

## 受け入れ基準

1. **正規化機能**
   - "1,234.56" → 1234.56 に変換される
   - undefined/null → 0 に変換される
   - 丸め処理が正しく動作する

2. **検証機能**
   - 必須フィールドの欠落を検出できる
   - 無効な数値を検出できる
   - CTR > 100%を警告として検出できる
   - Frequency > 50を警告として検出できる

3. **通貨変換**
   - 正しい為替レートで変換される
   - 未定義の通貨の場合は元の値を返す

4. **パーセンテージ処理**
   - decimal形式（0.05 = 5%）を正しく変換
   - percentage形式（5 = 5%）を正しく変換

5. **日付処理**
   - タイムゾーンオフセットが正しく適用される
   - 有効な日付オブジェクトが返される

## 技術仕様

### クラス構造
```typescript
class DataValidator {
  constructor(
    config: NumericNormalizationConfig,
    timeRangeConfig: TimeRangeConfig,
    attributionConfig: AttributionConfig
  )
  
  validateMetrics(data: AdInsight): ValidationResult
  normalizeNumericValues(value: string | number | undefined): number
  applyCurrencyConversion(amount: number, currency: string): number
  normalizePercentage(value: string | number): number
  normalizeDateWithTimezone(date: string, timezone: string): Date
}
```

### 依存関係
- 型定義: `data-validation.ts`から import
- エラー型: ValidationError, ValidationWarning
- 設定型: NumericNormalizationConfig, TimeRangeConfig, AttributionConfig

## 制約事項
- Meta Graph API v23.0の仕様に準拠
- TypeScriptの型安全性を保証
- エラーハンドリングは例外を投げずに結果オブジェクトで返す