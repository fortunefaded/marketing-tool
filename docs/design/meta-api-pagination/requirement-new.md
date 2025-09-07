# Meta API v23.0 正確なデータ取得システム - 実装要件定義書

## 1. エグゼクティブサマリー

### 1.1 問題の本質
Meta APIから30日分のデータを要求しても、実際の配信日（1-6日）のデータしか返されない問題を解決する。これは**APIの仕様**であり、バグではない。

### 1.2 解決方針
- **透明性優先**: 実際に取得できたデータをありのまま表示
- **完全性確保**: ページネーションを完全実装して全データを取得
- **運用効率**: キャッシュとタイムラインで現実的な運用を実現

### 1.3 重要な前提
- 既存のConvex/React/TypeScriptスタックを活用
- 過度な複雑性を避け、実装可能な機能に限定
- 段階的実装により早期の価値提供を実現

## 2. 機能要件

### 2.1 必須機能（Phase 1-2）

#### 2.1.1 完全なページネーション処理
```typescript
// 全ページを確実に取得
while (response.paging?.next) {
  response = await fetchNext(response.paging.next)
  data.push(...response.data)
}
```

**要件**:
- `paging.next`が存在する限り次ページを取得
- エラー時のリトライ機能（最大3回）
- レート制限対応（429エラー時の待機）
- 取得進捗のリアルタイム表示

#### 2.1.2 基本キャッシュ（メモリのみ）
```typescript
interface BasicCache {
  memory: Map<string, CachedData>
  ttl: 5 * 60 * 1000 // 5分
}
```

**要件**:
- メモリ上での短期キャッシュ
- TTL管理（5分）
- キャッシュヒット率の計測

### 2.2 運用必須機能（Phase 3）

#### 2.2.1 タイムラインビュー
```typescript
interface TimelineView {
  mode: 'calendar' | 'list'
  showGaps: boolean    // 配信停止期間を表示
  showAnomalies: boolean // 異常を表示
}
```

**要件**:
- カレンダー形式での配信状況可視化
- 配信ギャップの自動検出と表示
- 日別メトリクスの表示（CTR/CPM/Frequency）

#### 2.2.2 異常検知（シンプル版）
```typescript
interface AnomalyDetection {
  types: [
    'sudden_stop',     // 3日以上配信停止
    'high_frequency',  // Frequency > 3.5
    'ctr_drop'        // CTR < baseline * 0.75
  ]
}
```

**要件**:
- 3種類の基本的な異常パターンを検出
- しきい値ベースのシンプルな判定
- 検出時の通知（UIアラート）

### 2.3 効率化機能（Phase 4）

#### 2.3.1 3層キャッシュアーキテクチャ
```typescript
interface CacheStrategy {
  memory: { ttl: 5 * 60 * 1000 }      // 5分
  localStorage: { ttl: 60 * 60 * 1000 } // 1時間
  convex: { ttl: 24 * 60 * 60 * 1000 }  // 24時間
}
```

**要件**:
- 段階的なキャッシュ検索（memory → localStorage → Convex）
- データ鮮度に応じた可変TTL
- 差分更新による効率化

#### 2.3.2 配信ギャップ原因推定
```typescript
interface GapAnalysis {
  detectGaps(): Gap[]
  inferCause(gap: Gap): PossibleCause
  // 原因: budget_exhausted, manual_pause, policy_violation, etc.
}
```

**要件**:
- ギャップ前後のデータから原因を推定
- 運用改善のための提案生成

## 3. 非機能要件

### 3.1 パフォーマンス
- **初回ロード**: 3秒以内（キャッシュなし）
- **2回目以降**: 500ms以内（キャッシュあり）
- **API呼び出し削減**: 70%以上（キャッシュにより）

### 3.2 信頼性
- **エラーハンドリング**: 全API呼び出しでリトライ機能
- **データ整合性**: ページ取得漏れの防止
- **障害復旧**: キャッシュクリアと再取得機能

### 3.3 使いやすさ
- **進捗表示**: 「10/50ページ取得中...」
- **透明性**: 「5日/30日分のデータ」明示
- **アクション可能**: 異常検知時の具体的な対処法提示

## 4. 技術スタック

### 4.1 既存技術の活用
```typescript
// 既存スタック
- React 19 + TypeScript
- Vite（ビルドツール）
- Convex（データベース）
- TanStack Query（データフェッチング）

// 追加ライブラリ（最小限）
- Recharts（グラフ描画）
- date-fns（日付処理）
```

### 4.2 アーキテクチャ原則
1. **Convexファースト**: DBアクセスは全てConvex経由
2. **型安全性**: TypeScriptで完全な型定義
3. **段階的実装**: MVPから段階的に機能追加

## 5. データモデル

### 5.1 統一データ構造
```typescript
interface UnifiedAdData {
  // 識別子
  adId: string
  date: string // YYYY-MM-DD
  
  // 基本メトリクス
  impressions: number
  clicks: number
  spend: number
  
  // 計算メトリクス
  ctr: number
  cpm: number
  frequency: number
  
  // メタ情報
  hasData: boolean    // その日に配信があったか
  isAnomaly: boolean  // 異常値フラグ
  gapReason?: string  // 配信停止理由
}
```

### 5.2 データ取得結果
```typescript
interface DataRetrievalResult {
  data: UnifiedAdData[]
  metadata: {
    requestedDays: 30
    actualDays: number  // 実際に配信があった日数
    coverage: number    // actualDays / requestedDays
    gaps: Gap[]
    anomalies: Anomaly[]
  }
  cache: {
    hit: boolean
    layer: 'memory' | 'localStorage' | 'convex' | 'miss'
  }
}
```

## 6. 実装優先順位

### Phase 1: 基盤（1週間）
1. 完全なページネーション実装
2. 基本的なエラーハンドリング
3. 進捗表示UI

### Phase 2: キャッシュ基礎（3日）
1. メモリキャッシュ実装
2. TTL管理
3. キャッシュ統計表示

### Phase 3: 運用機能（1週間）
1. タイムラインビュー（カレンダー）
2. 基本的な異常検知（3パターン）
3. ギャップ検出と表示

### Phase 4: 最適化（3日）
1. 3層キャッシュ完全実装
2. 差分更新機能
3. 原因推定ロジック

## 7. 成功指標

### 7.1 技術指標
- **データ完全性**: 100%のページ取得成功率
- **キャッシュヒット率**: 70%以上
- **エラー率**: 0.1%以下

### 7.2 ビジネス指標
- **問題発見時間**: 24時間→1時間に短縮
- **API呼び出し数**: 70%削減
- **運用工数**: 50%削減

## 8. リスクと対策

### 8.1 技術リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| API レート制限 | 高 | 指数バックオフ、キャッシュ活用 |
| 大量データ処理 | 中 | ページネーション、遅延ロード |
| ブラウザメモリ不足 | 低 | データ量制限、古いデータ自動削除 |

### 8.2 運用リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 誤検知 | 中 | しきい値調整UI、手動承認機能 |
| キャッシュ不整合 | 低 | 手動リフレッシュ、TTL短縮 |

## 9. 制約事項

### 9.1 対象外機能
- 機械学習による予測
- リアルタイムストリーミング
- 自動修正・自動対処
- 他媒体との統合（初期フェーズでは）

### 9.2 技術的制約
- Meta API v23.0の仕様に準拠
- ブラウザのストレージ容量制限
- Convexの同時接続数制限

## 10. 次のステップ

1. **設計承認**: この要件定義のレビューと承認
2. **詳細設計**: `/kairo-design`による技術設計書作成
3. **実装開始**: Phase 1から順次実装
4. **段階的リリース**: 各Phaseごとに本番投入

## 付録A: 用語定義

- **配信日**: 実際に広告が表示された日
- **ギャップ**: 配信が停止した期間
- **異常**: 定義されたしきい値を超えた状態
- **ベースライン**: 過去30日間の中央値
- **カバレッジ**: 要求日数に対する実配信日数の割合

## 付録B: 参考資料

- [Meta Graph API v23.0 Documentation](https://developers.facebook.com/docs/graph-api/)
- [Meta Marketing API Insights](https://developers.facebook.com/docs/marketing-api/insights/)
- 既存の型定義: `interfaces.ts`, `timeline-interfaces.ts`
- 既存のAPIクライアント: `api-client.ts`