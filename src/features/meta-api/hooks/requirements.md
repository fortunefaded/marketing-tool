# TASK-005: 日付範囲パラメータの伝播修正 要件定義

## 目的
日付範囲フィルターの変更時に、データが正しく更新されるように修正する

## 現状の問題点

1. **日付範囲変更時にデータが更新されない**
   - DateRangeFilterで選択を変更しても、表示データが変わらない
   - UIの選択状態とデータの内容が一致しない

2. **パラメータ伝播の不具合**
   - useAdFatigueSimplifiedでdateRangeが固定されている
   - useMetaInsightsにdatePreset変更が伝わっていない

3. **循環依存の問題**
   - fetch関数とuseEffectの依存関係が複雑
   - 無限ループのリスクがある

## 機能要件

### 1. datePreset変更の検知
- DateRangeFilterコンポーネントでの選択変更を検知
- useAdFatigueSimplifiedへのprops伝播
- useMetaInsightsへのパラメータ更新

### 2. 自動データ再取得
- datePreset変更時の自動リフェッチ
- ローディング状態の適切な管理
- エラーハンドリングの維持

### 3. datePresetOverride機能
- fetch関数に一時的なdatePreset指定機能を追加
- 循環依存を避けるための仕組み
- 既存の依存関係を壊さない実装

### 4. キャッシュキーの改善
- 日付範囲ごとのキャッシュ分離
- 古いキャッシュの自動無効化
- メモリ効率的な管理

## 受け入れ基準

1. **UI連動性**
   - DateRangeFilterの選択変更で即座にデータ更新
   - ローディング状態の可視化
   - エラー時の適切な表示

2. **パフォーマンス**
   - 不要なAPIコールの発生なし
   - 無限ループの発生なし
   - レンダリング回数の最適化

3. **データ整合性**
   - 選択した期間のデータのみ表示
   - キャッシュと実際のデータの一致
   - 複数期間の混在なし

4. **エラーハンドリング**
   - ネットワークエラー時の適切な表示
   - レート制限時のフォールバック
   - 部分的なデータでも動作継続

## 技術仕様

### 1. useMetaInsights フックの拡張

```typescript
interface UseMetaInsightsOptions {
  accountId: string
  datePreset?: string
  autoFetch?: boolean
  onDatePresetChange?: (newPreset: string) => void // 追加
}

interface UseMetaInsightsResult {
  insights: AdInsight[] | null
  isLoading: boolean
  error: Error | null
  fetch: (options?: { 
    forceRefresh?: boolean,
    datePresetOverride?: string // 追加
  }) => Promise<void>
  currentDatePreset: string // 追加
  lastFetchTime: Date | null
}
```

### 2. 循環依存回避の仕組み

```typescript
// useRefを使用した前回値の追跡
const prevDatePresetRef = useRef<string>()

// useCallbackの依存配列最適化
const fetch = useCallback(async (options) => {
  const effectiveDatePreset = options?.datePresetOverride || datePreset
  // 実装
}, [accountId, convex, /* datePresetは依存から除外 */])

// useEffectでのdatePreset変更検知
useEffect(() => {
  if (prevDatePresetRef.current !== datePreset) {
    prevDatePresetRef.current = datePreset
    fetch({ forceRefresh: true, datePresetOverride: datePreset })
  }
}, [datePreset, fetch])
```

### 3. キャッシュキー改善

```typescript
interface CacheKey {
  accountId: string
  datePreset: string
  timestamp: number
}

const generateCacheKey = (accountId: string, datePreset: string): string => {
  return `insights_${accountId}_${datePreset}`
}
```

### 4. useAdFatigueSimplified の修正

```typescript
export function useAdFatigueSimplified({
  accountId,
  dateRange = 'last_30d' // これが変更されるようにする
}: UseAdFatigueOptions): UseAdFatigueResult {
  
  const api = useMetaInsights({ 
    accountId, 
    autoFetch: true,
    datePreset: dateRange // 動的に更新される
  })
  
  // dateRange変更時の処理
  useEffect(() => {
    console.log('📅 日付範囲変更検知:', { 
      oldRange: prevDateRangeRef.current,
      newRange: dateRange 
    })
    
    if (prevDateRangeRef.current && prevDateRangeRef.current !== dateRange) {
      // 強制リフレッシュ
      api.fetch({ forceRefresh: true, datePresetOverride: dateRange })
    }
    
    prevDateRangeRef.current = dateRange
  }, [dateRange, api.fetch])
}
```

## 実装の優先順位

1. **高優先度**
   - useMetaInsightsのdatePresetOverride追加
   - datePreset変更検知の実装
   - 基本的なデータ更新機能

2. **中優先度**
   - キャッシュキーの改善
   - パフォーマンス最適化
   - エラーハンドリング強化

3. **低優先度**
   - 詳細なログ出力
   - デバッグ機能強化
   - メモリ使用量最適化

## 制約事項

- 既存のAPIインターフェースを破壊しない
- 後方互換性の維持
- 既存のキャッシュ戦略との協調
- React Hooksのルールに準拠