# TASK-002(003): DebugSessionクラス 要件定義

## 目的
Meta APIのデータ取得・処理過程を詳細に記録し、デバッグと問題分析を支援するクラスを実装する

## 機能要件

### 1. セッション管理
- 一意のセッションIDを生成
- セッション開始時刻の記録
- 複数のトレースを管理

### 2. APIリクエストトレース
- リクエストURL、パラメータの記録
- リクエスト時刻の記録
- レスポンスの記録
- エラーの記録
- 実行時間の計測

### 3. データ処理トレース
- 処理ステージ名の記録
- 入力データ、出力データの記録
- 処理時間の計測
- レコード数などのメタデータ記録

### 4. パフォーマンス計測
- API呼び出し時間
- データ処理時間
- 全体の処理時間
- メモリ使用量（オプション）

### 5. エラー記録
- エラーメッセージ
- スタックトレース
- エラー発生箇所
- エラー発生時の入力データ

### 6. データエクスポート
- JSON形式でのエクスポート
- 開発環境でのlocalStorage保存
- コンソールログ出力

## 受け入れ基準

1. **セッション管理**
   - UUIDでセッションIDが生成される
   - 複数のトレースを管理できる

2. **トレース機能**
   - APIリクエスト/レスポンスが記録される
   - 処理ステップが順番に記録される
   - 実行時間が正確に計測される

3. **エクスポート機能**
   - 構造化されたデバッグ情報を出力できる
   - 開発環境でのみlocalStorageに保存される
   - 本番環境では無効化される

4. **パフォーマンス**
   - デバッグ処理自体が軽量である
   - メインの処理に影響を与えない

## 技術仕様

### クラス構造
```typescript
class DebugSession {
  private sessionId: string
  private traces: DebugTrace[]
  private startTime: Date
  
  constructor()
  
  traceApiRequest(url: string, params: any): void
  traceApiResponse(response: any, duration: number): void
  traceDataProcessing(stage: string, input: any, output: any, duration: number): void
  traceError(error: Error, context?: any): void
  
  getPerformanceMetrics(): PerformanceMetrics
  exportDebugData(): DebugInfo
  logToConsole(): void
  saveToLocalStorage(): void
}
```

### 型定義
```typescript
interface DebugTrace {
  traceId: string
  steps: DebugStep[]
  status: 'success' | 'error' | 'warning'
  errorDetails?: ErrorDetails
}

interface DebugStep {
  name: string
  timestamp: Date
  duration: number
  input?: any
  output?: any
  metadata?: Record<string, any>
}

interface PerformanceMetrics {
  apiCallDuration: number
  processingDuration: number
  totalDuration: number
  memoryUsed?: number
}

interface DebugInfo {
  sessionId: string
  apiRequest: any
  apiResponse: any
  processedData: any
  validationResults: any
  performance: PerformanceMetrics
  timestamp: Date
  errors: ErrorDetails[]
}

interface ErrorDetails {
  message: string
  stack?: string
  context?: any
  timestamp: Date
}
```

## 制約事項
- 開発環境でのみ完全に動作
- 本番環境ではメモリ使用を最小限に
- 個人情報やトークンをログに含めない
- localStorage容量制限を考慮（5MB以下）