# TASK-004: Meta APIクライアントの修正 要件定義

## 目的
Meta APIクライアントを改善し、データ整合性を確保するための必要なパラメータを追加する

## 現状の問題点

1. **通貨設定の欠如**
   - account_currencyフィールドが取得されていない
   - 通貨変換に必要な情報が不足

2. **タイムゾーン設定の欠如**
   - タイムゾーンパラメータが設定されていない
   - 日付の境界が曖昧になる

3. **アトリビューション設定の欠如**
   - use_unified_attribution_settingが設定されていない
   - アトリビューション期間の明示的な指定がない

4. **データ検証の欠如**
   - レスポンスデータの検証処理がない
   - エラーのトレースが不十分

## 機能要件

### 1. getTimeSeriesInsights()メソッドの改善
- 既存のgetInsights()メソッドを拡張
- 時系列データ専用のパラメータ設定
- 通貨・タイムゾーン・アトリビューション設定の追加

### 2. 通貨パラメータの追加
- account_currencyフィールドの取得
- 通貨情報を含むレスポンスの返却

### 3. タイムゾーンパラメータの追加
- time_zoneパラメータの設定
- デフォルト値：'Asia/Tokyo'
- カスタマイズ可能なオプション

### 4. アトリビューション設定の追加
- use_unified_attribution_settingパラメータ
- action_attribution_windowsの設定（v23.0で非推奨だが互換性のため）
- デフォルト値の明示

### 5. デバッグ機能の統合
- DebugSessionとの連携
- APIリクエスト/レスポンスのトレース
- エラーの詳細記録

## 受け入れ基準

1. **パラメータの追加**
   - account_currencyがfieldsに含まれる
   - time_zoneパラメータが設定される
   - use_unified_attribution_settingが設定される

2. **既存機能の保持**
   - 既存のgetInsights()メソッドが正常動作
   - 後方互換性の維持
   - パフォーマンスの劣化なし

3. **エラーハンドリング**
   - レート制限エラーの適切な処理
   - 認証エラーの明確なメッセージ
   - ネットワークエラーのリトライ処理

4. **デバッグ対応**
   - 全APIコールがトレース可能
   - エラー時の詳細情報記録
   - パフォーマンス計測

## 技術仕様

### 拡張インターフェース
```typescript
interface EnhancedInsightsOptions {
  datePreset?: string
  timeRange?: { since: string; until: string }
  timezone?: string  // デフォルト: 'Asia/Tokyo'
  currency?: string  // デフォルト: アカウント通貨
  useUnifiedAttribution?: boolean  // デフォルト: true
  attributionWindows?: string[]  // デフォルト: ['1d_click', '1d_view']
  forceRefresh?: boolean
  maxPages?: number
  onProgress?: (count: number) => void
  debugSession?: DebugSession  // デバッグセッション
}
```

### 新しいメソッド
```typescript
async getTimeSeriesInsights(
  options?: EnhancedInsightsOptions
): Promise<EnhancedPaginatedResult>
```

### 拡張レスポンス型
```typescript
interface EnhancedPaginatedResult extends PaginatedResult {
  metadata: {
    currency: string
    timezone: string
    attributionSettings: {
      unified: boolean
      windows: string[]
    }
    requestTimestamp: Date
    processingTime: number
  }
}
```

## 実装の優先順位

1. **高優先度**
   - account_currencyフィールドの追加
   - time_zoneパラメータの追加
   - 基本的なデバッグトレース

2. **中優先度**
   - use_unified_attribution_setting
   - 拡張エラーハンドリング
   - メタデータの返却

3. **低優先度**
   - リトライ処理の改善
   - 詳細なパフォーマンス計測
   - キャッシュ戦略の最適化

## 制約事項

- Meta Graph API v23.0の仕様に準拠
- action_attribution_windowsは非推奨だが互換性のため保持
- time_incrementとbreakdownsは同時使用不可
- レート制限を考慮した実装