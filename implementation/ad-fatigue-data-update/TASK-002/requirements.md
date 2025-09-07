# TASK-002: データ更新状態管理の改善 - 要件定義

## 概要

`useAdFatigue` フックの状態管理を強化し、更新中の重複実行防止、詳細な進行状況追跡、UI応答性の向上を実現する。TASK-001で強化された `useMetaApiFetcher` を活用しながら、ユーザビリティとパフォーマンスを大幅に改善する。

## 機能要件 (Functional Requirements)

### FR-001: 重複実行防止メカニズム
**要件**: システムは同時に実行される複数のデータ更新リクエストを防止しなければならない
**理由**: データ整合性保持とリソース効率化
**受け入れ条件**:
- 更新中に新しい更新要求があった場合は無視または待機する
- 進行中の更新が完了するまで新しい更新を開始しない
- ユーザーに適切な状態表示（更新中であることを明示）

### FR-002: 詳細進行状況追跡機能
**要件**: システムは更新プロセスの各段階を詳細に追跡し報告しなければならない
**理由**: ユーザビリティ向上とデバッグ支援
**受け入れ条件**:
- キャッシュチェック、API呼び出し、データ処理の各段階を追跡
- 進行状況の割合（0-100%）を提供
- 各段階の所要時間を記録
- エラー発生箇所の特定機能

### FR-003: 成功/失敗時のコールバック機能
**要件**: システムは更新完了時に適切なコールバック関数を実行しなければならない
**理由**: 外部システムとの連携とUI更新
**受け入れ条件**:
- 成功時コールバック: データ、実行時間、ソース情報を提供
- 失敗時コールバック: エラー詳細、復旧提案、再試行オプション
- 設定可能なコールバック（オプトイン方式）
- 非同期コールバックの安全な実行

### FR-004: UI応答性最適化
**要件**: システムは更新処理中もUI応答性を100ms以下に維持しなければならない
**理由**: ユーザーエクスペリエンスの向上
**受け入れ条件**:
- 重い処理の非同期化
- UI更新の適切なバッチング
- メインスレッドのブロッキング防止
- レスポンシブな状態表示

### FR-005: 強化された状態管理
**要件**: システムは包括的で一貫性のある状態情報を提供しなければならない
**理由**: 複雑な UI 要件への対応
**受け入れ条件**:
- 現在の状態（idle, loading, updating, error, success）
- 進行状況の詳細（段階、割合、残り時間推定）
- エラー情報（分類、メッセージ、回復方法）
- 最後の更新情報（時刻、ソース、データ数）

## 非機能要件 (Non-Functional Requirements)

### NFR-001: パフォーマンス要件
- **UI応答性**: 100ms以下の状態更新
- **更新完了時間**: 30秒以内での完了
- **メモリ効率**: 不要なオブジェクト生成の最小化
- **CPU使用率**: 効率的な非同期処理

### NFR-002: 使いやすさ要件
- **直感的な状態**: 明確な状態名と意味
- **進行表示**: 視覚的に分かりやすい進行インジケーター
- **エラー処理**: ユーザーフレンドリーなエラーメッセージ
- **アクセシビリティ**: スクリーンリーダー対応

### NFR-003: 信頼性要件
- **状態一貫性**: 状態の矛盾がない管理
- **エラー回復**: 適切なエラー処理とフォールバック
- **データ整合性**: 更新中のデータ破損防止
- **中断対応**: ページリロード等への対応

### NFR-004: 拡張性要件
- **コールバック拡張**: 新しいコールバックタイプの追加容易性
- **状態拡張**: 新しい状態の追加対応
- **設定カスタマイズ**: タイムアウト、リトライ等の設定
- **外部統合**: 他のフックやコンポーネントとの連携

## 技術仕様 (Technical Specifications)

### TS-001: 拡張状態インターフェイス
```typescript
interface AdFatigueState {
  // 基本状態
  status: 'idle' | 'loading' | 'updating' | 'error' | 'success'
  isLoading: boolean // 後方互換性
  error: AdFatigueError | null
  
  // 進行状況追跡
  progress: {
    stage: 'cache-check' | 'api-fetch' | 'data-process' | 'complete'
    percentage: number // 0-100
    message: string
    startTime: Date
    estimatedCompletion?: Date
  } | null
  
  // データ情報
  data: FatigueData[]
  dataSource: 'cache' | 'api' | null
  lastUpdate: {
    timestamp: Date
    duration: number
    recordCount: number
    source: 'cache' | 'api'
  } | null
  
  // 制御情報
  canUpdate: boolean
  isUpdating: boolean
}
```

### TS-002: エラー型定義
```typescript
interface AdFatigueError {
  category: 'cache' | 'api' | 'processing' | 'validation'
  message: string
  originalError?: Error
  recoveryAction: 'retry' | 'fallback' | 'manual'
  timestamp: Date
}
```

### TS-003: コールバック型定義
```typescript
interface AdFatigueCallbacks {
  onUpdateStart?: () => void
  onUpdateProgress?: (progress: AdFatigueProgress) => void
  onUpdateSuccess?: (data: {
    data: FatigueData[]
    source: 'cache' | 'api'
    duration: number
    recordCount: number
  }) => void
  onUpdateError?: (error: AdFatigueError) => void
  onUpdateComplete?: () => void
}
```

### TS-004: フック オプション
```typescript
interface AdFatigueOptions {
  // コールバック設定
  callbacks?: AdFatigueCallbacks
  
  // タイミング設定
  progressUpdateInterval?: number // デフォルト: 100ms
  successMessageDuration?: number // デフォルト: 3000ms
  
  // 動作設定
  preventConcurrentUpdates?: boolean // デフォルト: true
  enableProgressTracking?: boolean // デフォルト: true
  autoRetryOnError?: boolean // デフォルト: false
  
  // UI設定
  updateUIDelay?: number // デフォルト: 16ms (60fps)
}
```

### TS-005: 戻り値インターフェイス
```typescript
interface UseAdFatigueResult {
  // 状態
  state: AdFatigueState
  
  // アクション
  update: () => Promise<void>
  retry: () => Promise<void>
  cancel: () => void
  
  // 後方互換性
  data: FatigueData[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  dataSource: 'cache' | 'api' | null
}
```

## UI/UX要件 (UI/UX Requirements)

### UX-001: ローディング状態表示
- **スピナー**: 視覚的な進行インジケーター
- **進行テキスト**: 現在の処理内容を説明
- **プログレスバー**: 0-100%の進行状況
- **推定時間**: 残り時間の表示

### UX-002: エラー状態表示
- **エラーカテゴリ**: アイコンとカラーによる分類
- **詳細メッセージ**: 分かりやすい説明文
- **対処法**: 具体的なアクション提案
- **再試行ボタン**: 簡単な回復手段

### UX-003: 成功状態表示
- **成功メッセージ**: 一時的な成功通知（3秒）
- **更新情報**: データ数、ソース、時刻
- **データ品質**: キャッシュ/API、鮮度情報
- **次回更新**: 推奨更新タイミング

### UX-004: アクセシビリティ対応
- **ARIA属性**: 適切なロール、ラベル設定
- **キーボード対応**: Tab、Enter操作対応
- **スクリーンリーダー**: 状態変化の読み上げ
- **ハイコントラスト**: 色覚に配慮した表示

## テスト要件 (Test Requirements)

### 単体テスト
- [ ] **UT-001**: 重複実行防止が正しく動作すること
- [ ] **UT-002**: 状態変更が適切にトラッキングされること
- [ ] **UT-003**: コールバックが正しいタイミングで実行されること
- [ ] **UT-004**: 進行状況が正確に計算されること
- [ ] **UT-005**: エラー状態が適切に管理されること

### パフォーマンステスト
- [ ] **PT-001**: UI応答性が100ms以下を維持すること
- [ ] **PT-002**: 大量データ処理時の性能確認
- [ ] **PT-003**: メモリリーク防止の確認
- [ ] **PT-004**: 同時更新要求の処理性能

### 統合テスト
- [ ] **IT-001**: useMetaApiFetcher との連携確認
- [ ] **IT-002**: useConvexCache との連携確認
- [ ] **IT-003**: 実際のUI コンポーネントでの動作確認

### ユーザビリティテスト
- [ ] **UB-001**: 進行状況表示の分かりやすさ
- [ ] **UB-002**: エラーメッセージの理解しやすさ
- [ ] **UB-003**: 操作レスポンスの適切性

## 受け入れ基準 (Acceptance Criteria)

### AC-001: 重複実行防止
- ✅ 更新中に新しい更新要求が無視される
- ✅ 適切な状態表示（更新中メッセージ）
- ✅ 完了後に正常な状態に復帰

### AC-002: 進行状況追跡
- ✅ 各段階の進行状況が0-100%で表示される
- ✅ リアルタイムな進行状況更新
- ✅ 推定完了時間の表示

### AC-003: コールバック実行
- ✅ 成功時コールバックが適切なデータで実行される
- ✅ エラー時コールバックが詳細情報で実行される
- ✅ コールバック実行中のエラーハンドリング

### AC-004: UI応答性
- ✅ 状態更新が100ms以内に反映される
- ✅ 大量データ処理中もUIが応答的
- ✅ スムーズなアニメーション動作

### AC-005: エラーハンドリング
- ✅ 各種エラーが適切に分類される
- ✅ ユーザーフレンドリーなエラーメッセージ
- ✅ 適切な回復オプションの提供

### AC-006: 後方互換性
- ✅ 既存の API インターフェイスを維持
- ✅ 既存のコンポーネントが正常動作
- ✅ 段階的移行が可能

## 制約条件 (Constraints)

### 技術制約
- React 18+ hooks パターン使用
- TypeScript strict mode 対応
- TASK-001 で強化された useMetaApiFetcher の活用
- 既存の Convex バックエンドとの互換性

### ビジネス制約
- 既存のユーザーワークフローを変更しない
- データ取得コスト（API呼び出し）を最小化
- 30秒以内での更新完了

### 運用制約
- デプロイ時のダウンタイムなし
- 既存データの保持
- パフォーマンス劣化なし

## 実装優先度

### Phase 1 (高優先度)
1. 重複実行防止メカニズムの実装
2. 基本的な進行状況追跡
3. 強化された状態管理

### Phase 2 (中優先度)
1. コールバック機能の実装
2. 詳細な進行状況計算
3. エラーハンドリングの改善

### Phase 3 (低優先度)
1. UI応答性の最適化
2. アクセシビリティ対応
3. 高度なパフォーマンス調整

## 関連ドキュメント

- [TASK-001: Meta API フェッチャーの信頼性向上 完了レポート](/implementation/ad-fatigue-data-update/TASK-001/completion-verification.md)
- [広告疲労度データ更新機能 実装タスク](/docs/tasks/ad-fatigue-data-update-tasks.md)
- [現在の useAdFatigue フック](/src/features/meta-api/hooks/useAdFatigue.ts)

## 成功指標

### 機能品質
- **重複防止率**: 100%（同時更新の完全防止）
- **状態追跡精度**: ±5%以内の進行状況精度
- **コールバック成功率**: 99%以上の実行成功
- **UI応答性**: 100ms以内の状態反映

### ユーザビリティ
- **進行状況理解率**: 95%以上（ユーザーテスト）
- **エラー解決率**: 80%以上（適切な案内）
- **操作満足度**: 4.5/5.0以上

### 技術品質
- **テストカバレッジ**: 単体テスト90%以上
- **パフォーマンス**: Lighthouse 90点以上
- **メモリ効率**: 前バージョン比±10%以内

---

**作成日**: 2024-08-25  
**最終更新**: 2024-08-25  
**作成者**: Claude Code Implementation  
**レビュー状態**: Draft