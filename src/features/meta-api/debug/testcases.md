# TASK-002: DebugSession テストケース

## テストケース一覧

### 1. コンストラクタ

#### TC-001: セッションIDの生成
- **入力**: new DebugSession()
- **期待値**: 一意のUUID形式のsessionId
- **説明**: セッションIDが正しく生成される

#### TC-002: 開始時刻の記録
- **入力**: new DebugSession()
- **期待値**: 現在時刻に近いstartTime
- **説明**: セッション開始時刻が記録される

#### TC-003: 初期状態
- **入力**: new DebugSession()
- **期待値**: traces配列が空
- **説明**: 初期状態でトレースが空である

### 2. traceApiRequest メソッド

#### TC-004: APIリクエストの記録
- **入力**: 
  ```typescript
  traceApiRequest('/api/insights', { 
    fields: ['spend', 'impressions'],
    date_preset: 'last_month'
  })
  ```
- **期待値**: トレースにAPI_REQUESTステップが追加
- **説明**: APIリクエスト情報が正しく記録される

#### TC-005: トレースIDの生成
- **入力**: traceApiRequest()呼び出し
- **期待値**: 新しいトレースにUUID形式のtraceId
- **説明**: 各トレースに一意のIDが付与される

### 3. traceApiResponse メソッド

#### TC-006: APIレスポンスの記録
- **入力**: 
  ```typescript
  traceApiResponse({ data: [...], paging: {} }, 250)
  ```
- **期待値**: 最後のトレースにAPI_RESPONSEステップが追加
- **説明**: レスポンスと実行時間が記録される

#### TC-007: エラーレスポンスの記録
- **入力**: 
  ```typescript
  traceApiResponse({ error: { message: 'Invalid token' } }, 100)
  ```
- **期待値**: トレースのstatusが'error'に設定
- **説明**: エラーレスポンスが適切に処理される

### 4. traceDataProcessing メソッド

#### TC-008: データ処理ステップの記録
- **入力**: 
  ```typescript
  traceDataProcessing(
    'NORMALIZATION',
    { raw: [...] },
    { normalized: [...] },
    50
  )
  ```
- **期待値**: 処理ステップが追加、入出力データ記録
- **説明**: データ処理の各段階が記録される

#### TC-009: メタデータの記録
- **入力**: recordCountなどのメタデータ
- **期待値**: ステップのmetadataに保存
- **説明**: 処理に関する追加情報が記録される

### 5. traceError メソッド

#### TC-010: エラーの記録
- **入力**: 
  ```typescript
  traceError(new Error('Validation failed'), { 
    field: 'spend',
    value: 'invalid'
  })
  ```
- **期待値**: errorDetailsにエラー情報が追加
- **説明**: エラーとコンテキストが記録される

#### TC-011: スタックトレースの記録
- **入力**: Errorオブジェクト
- **期待値**: スタックトレースが保存される
- **説明**: デバッグに必要な詳細情報が保持される

### 6. getPerformanceMetrics メソッド

#### TC-012: パフォーマンス計測
- **入力**: 複数のトレース実行後
- **期待値**: 
  ```typescript
  {
    apiCallDuration: 250,
    processingDuration: 150,
    totalDuration: 400
  }
  ```
- **説明**: 各処理の実行時間が正確に計測される

#### TC-013: 空のセッションの計測
- **入力**: トレースなしのセッション
- **期待値**: 全て0の値
- **説明**: 空のセッションでも正常に動作

### 7. exportDebugData メソッド

#### TC-014: デバッグ情報のエクスポート
- **入力**: 複数のトレースを持つセッション
- **期待値**: 構造化されたDebugInfoオブジェクト
- **説明**: 全情報が構造化されて出力される

#### TC-015: エラー情報の含有
- **入力**: エラーを含むセッション
- **期待値**: errors配列にエラー詳細
- **説明**: エラー情報が適切に含まれる

### 8. saveToLocalStorage メソッド

#### TC-016: 開発環境での保存
- **入力**: NODE_ENV='development'
- **期待値**: localStorageに保存される
- **説明**: 開発環境でのみ動作

#### TC-017: 本番環境での無効化
- **入力**: NODE_ENV='production'
- **期待値**: localStorageに保存されない
- **説明**: 本番環境では無効

#### TC-018: ストレージ容量制限
- **入力**: 大量のデータ
- **期待値**: 5MB以下に制限される
- **説明**: ストレージ制限を超えない

### 9. logToConsole メソッド

#### TC-019: コンソール出力（開発環境）
- **入力**: NODE_ENV='development'
- **期待値**: console.groupでグループ化出力
- **説明**: 開発環境で構造化ログ出力

#### TC-020: 本番環境での無効化
- **入力**: NODE_ENV='production'
- **期待値**: console出力なし
- **説明**: 本番環境では出力されない

## エッジケース

### E-001: 循環参照の処理
- 循環参照を含むオブジェクトの記録
- JSON.stringifyでエラーにならない

### E-002: 大量データの処理
- 1000件以上のトレース
- パフォーマンス劣化なし

### E-003: メモリリーク防止
- 長時間実行
- メモリ使用量が増加し続けない

### E-004: 並行処理
- 複数のAPIリクエストを同時実行
- トレースが正しく分離される

## パフォーマンステスト

### P-001: トレース処理のオーバーヘッド
- デバッグ有効/無効でのパフォーマンス比較
- オーバーヘッドが5%以下

### P-002: メモリ使用量
- 1時間の実行でメモリ使用量測定
- 50MB以下を維持