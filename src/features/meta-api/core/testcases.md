# TASK-004: Meta APIクライアント テストケース

## テストケース一覧

### 1. getTimeSeriesInsights メソッド

#### TC-001: 基本的な時系列データ取得
- **入力**: 
  ```typescript
  getTimeSeriesInsights({ datePreset: 'last_30d' })
  ```
- **期待値**: 
  - URLにtime_increment=1が含まれる
  - date_start, date_stopフィールドが含まれる
  - account_currencyフィールドが含まれる
- **説明**: 時系列データ取得の基本動作

#### TC-002: タイムゾーンパラメータの設定
- **入力**: 
  ```typescript
  getTimeSeriesInsights({ 
    timezone: 'Asia/Tokyo' 
  })
  ```
- **期待値**: URLにtime_zone=Asia/Tokyoが含まれる
- **説明**: タイムゾーンが正しく設定される

#### TC-003: デフォルトタイムゾーン
- **入力**: 
  ```typescript
  getTimeSeriesInsights({})
  ```
- **期待値**: URLにtime_zone=Asia/Tokyoが含まれる（デフォルト）
- **説明**: タイムゾーンのデフォルト値が適用される

### 2. 通貨設定

#### TC-004: account_currencyフィールドの追加
- **入力**: getTimeSeriesInsights()
- **期待値**: fieldsにaccount_currencyが含まれる
- **説明**: 通貨情報が取得できる

#### TC-005: カスタム通貨の指定
- **入力**: 
  ```typescript
  getTimeSeriesInsights({ currency: 'USD' })
  ```
- **期待値**: メタデータにcurrency: 'USD'が含まれる
- **説明**: カスタム通貨設定が可能

### 3. アトリビューション設定

#### TC-006: 統一アトリビューション設定
- **入力**: 
  ```typescript
  getTimeSeriesInsights({ 
    useUnifiedAttribution: true 
  })
  ```
- **期待値**: URLにuse_unified_attribution_setting=trueが含まれる
- **説明**: 統一アトリビューション設定が有効

#### TC-007: カスタムアトリビューションウィンドウ
- **入力**: 
  ```typescript
  getTimeSeriesInsights({ 
    attributionWindows: ['7d_click', '1d_view'] 
  })
  ```
- **期待値**: URLにaction_attribution_windows=['7d_click','1d_view']が含まれる
- **説明**: カスタムアトリビューション期間の設定

#### TC-008: デフォルトアトリビューション
- **入力**: getTimeSeriesInsights()
- **期待値**: デフォルトで['1d_click', '1d_view']が設定される
- **説明**: デフォルトアトリビューション設定

### 4. デバッグ統合

#### TC-009: デバッグセッションの記録
- **入力**: 
  ```typescript
  const session = new DebugSession()
  getTimeSeriesInsights({ debugSession: session })
  ```
- **期待値**: 
  - session.traceApiRequest()が呼ばれる
  - session.traceApiResponse()が呼ばれる
- **説明**: APIコールがデバッグセッションに記録される

#### TC-010: エラー時のデバッグ記録
- **入力**: APIエラーレスポンス
- **期待値**: session.traceError()が呼ばれる
- **説明**: エラーがデバッグセッションに記録される

### 5. レスポンス処理

#### TC-011: 拡張メタデータの返却
- **入力**: 正常なAPIレスポンス
- **期待値**: 
  ```typescript
  {
    data: [...],
    metadata: {
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      attributionSettings: {...},
      requestTimestamp: Date,
      processingTime: number
    }
  }
  ```
- **説明**: メタデータが含まれた拡張レスポンス

#### TC-012: データ検証の実行
- **入力**: APIレスポンスデータ
- **期待値**: DataValidatorによる検証が実行される
- **説明**: レスポンスデータが自動的に検証される

### 6. エラーハンドリング

#### TC-013: レート制限エラー
- **入力**: エラーコード4, 17, 32のレスポンス
- **期待値**: 
  - 適切なエラーメッセージ
  - リトライ情報の提供
- **説明**: レート制限エラーの適切な処理

#### TC-014: 認証エラー
- **入力**: 401/403エラーレスポンス
- **期待値**: 明確な認証エラーメッセージ
- **説明**: 認証エラーの明確な表示

#### TC-015: ネットワークエラー
- **入力**: fetch失敗
- **期待値**: 
  - ネットワークエラーメッセージ
  - デバッグセッションへの記録
- **説明**: ネットワークエラーの処理

### 7. 後方互換性

#### TC-016: 既存のgetInsights()メソッド
- **入力**: getInsights()の既存パラメータ
- **期待値**: 既存の動作が維持される
- **説明**: 後方互換性の確保

#### TC-017: breakdownsパラメータの分離
- **入力**: getPlatformBreakdown()呼び出し
- **期待値**: 
  - time_incrementが含まれない
  - breakdownsが含まれる
- **説明**: パラメータの競合回避

## エッジケース

### E-001: 無効なタイムゾーン
- **入力**: timezone: 'Invalid/Zone'
- **期待値**: エラーまたはデフォルトへのフォールバック
- **説明**: 無効なタイムゾーンの処理

### E-002: 空のレスポンス
- **入力**: data: []のレスポンス
- **期待値**: 正常に処理され、空配列を返す
- **説明**: 空データの処理

### E-003: 大量データのページネーション
- **入力**: 1000件以上のデータ
- **期待値**: 
  - 適切なページネーション処理
  - メモリ効率的な処理
- **説明**: 大量データの処理

### E-004: タイムアウト処理
- **入力**: 30秒以上かかるリクエスト
- **期待値**: タイムアウトエラー
- **説明**: タイムアウトの適切な処理

## パフォーマンステスト

### P-001: APIコールのオーバーヘッド
- **計測項目**: デバッグありなしでの実行時間差
- **期待値**: オーバーヘッド10%以下
- **説明**: デバッグ機能の性能影響

### P-002: メモリ使用量
- **計測項目**: 10000件のデータ処理時のメモリ
- **期待値**: 100MB以下
- **説明**: メモリ効率性の確認