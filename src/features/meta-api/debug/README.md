# Debug Module

## 概要

Meta APIのデータ取得・処理過程を詳細に記録し、デバッグと問題分析を支援するモジュールです。

## 基本的な使い方

### 1. 単独のDebugSession

```typescript
import { DebugSession } from '@/features/meta-api/debug'

const session = new DebugSession()

// APIリクエストのトレース
session.traceApiRequest('/api/insights', {
  fields: ['spend', 'impressions'],
  date_preset: 'last_month'
})

// APIレスポンスのトレース
session.traceApiResponse(responseData, 250) // 250ms

// データ処理のトレース
session.traceDataProcessing(
  'NORMALIZATION',
  rawData,
  normalizedData,
  50 // 50ms
)

// エラーのトレース
try {
  // 処理
} catch (error) {
  session.traceError(error, { context: 'validation' })
}

// デバッグ情報の出力
session.logToConsole() // 開発環境のみ
session.saveToLocalStorage() // 開発環境のみ
```

### 2. グローバルDebugSession

```typescript
import { getGlobalDebugSession, resetGlobalDebugSession } from '@/features/meta-api/debug'

// グローバルセッションの取得
const session = getGlobalDebugSession()

// 使用後のリセット
resetGlobalDebugSession()
```

### 3. デバッグコンテキスト

```typescript
import { createDebugContext } from '@/features/meta-api/debug'

const result = await createDebugContext('FetchInsights', async (session) => {
  // APIリクエスト
  session.traceApiRequest('/api/insights', params)
  const response = await fetch('/api/insights', params)
  
  // レスポンス記録
  session.traceApiResponse(response, performance.now())
  
  // データ処理
  const processed = processData(response)
  session.traceDataProcessing('PROCESS', response, processed, 10)
  
  return processed
})
// 自動的にログ出力とlocalStorage保存
```

### 4. デコレータの使用

```typescript
import { debugTrace } from '@/features/meta-api/debug'

class DataProcessor {
  @debugTrace('VALIDATION')
  async validateData(data: any) {
    // 自動的にトレースされる
    return validatedData
  }
  
  @debugTrace('NORMALIZATION')
  async normalizeData(data: any) {
    // 自動的にトレースされる
    return normalizedData
  }
}
```

## 出力形式

### コンソール出力（開発環境）

```
🔍 Debug Session: 123e4567-e89b-12d3-a456-426614174000
  Trace: abc123... [success]
    [API_REQUEST] { duration: "0ms", input: {...}, output: undefined }
    [API_RESPONSE] { duration: "250ms", input: undefined, output: {...} }
    [NORMALIZATION] { duration: "50ms", input: {...}, output: {...} }
  📊 Performance: {
    apiCallDuration: 250,
    processingDuration: 50,
    totalDuration: 301
  }
```

### localStorage保存（開発環境）

キー: `debug-session-{sessionId}`

```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "apiRequest": { "url": "/api/insights", "params": {...} },
  "apiResponse": { "data": [...], "paging": {...} },
  "processedData": { "normalized": [...] },
  "performance": {
    "apiCallDuration": 250,
    "processingDuration": 50,
    "totalDuration": 301
  },
  "timestamp": "2024-08-01T12:00:00.000Z",
  "errors": []
}
```

## 環境設定

- **開発環境（NODE_ENV=development）**: 完全に動作
- **本番環境（NODE_ENV=production）**: 自動的に無効化

## 注意事項

1. **パフォーマンス**: デバッグ処理自体は軽量ですが、大量のデータを記録する場合は注意
2. **メモリ使用**: 長時間実行する場合は定期的にリセット
3. **セキュリティ**: トークンや個人情報をログに含めない
4. **ストレージ**: localStorage制限（5MB）を考慮、自動的に古いセッションを削除

## テスト

```bash
# 単体テスト実行
npm test src/features/meta-api/debug/__tests__/debug-session.test.ts

# カバレッジ確認
npm run test:coverage src/features/meta-api/debug
```