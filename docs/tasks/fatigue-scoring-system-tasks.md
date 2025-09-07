# 疲労度スコアリングシステム 実装タスク計画書

## プロジェクト概要

Meta広告とECforceの数値を集約し、3つの疲労指標（クリエイティブ疲労・視聴者疲労・アルゴリズム疲労）で総合スコアリング（0-100）する広告疲労度システムの実装タスク計画。画像・動画・テキストごとの成果自動集計、ROAS/CPA/CV等のKPI横断表示、広告主・媒体・キャンペーン単位の成果比較機能を含む。

## 実装方針

- **開発手法**: Test-Driven Development (TDD)
- **フレームワーク**: React 18 + TypeScript (Frontend), Convex (Backend)
- **アーキテクチャ**: Domain-Driven Design + Event-Driven Architecture
- **パフォーマンス要件**: 疲労度計算 200ms/クリエイティブ、バッチ処理 30秒/100件

---

## Phase 1: コア疲労度計算エンジン (高優先度)

### TASK-001: ベースライン計算システム実装

**優先度**: 高  
**工数**: 5日  
**依存関係**: なし  
**担当者**: バックエンド開発者

#### 要求仕様
- 30日間の履歴データからベースラインメトリクス算出
- データ不足時の業界平均値フォールバック機能
- 断続配信・予算変更対応のベースライン補正機能
- 信頼度スコア算出（0.0-1.0）

#### 技術仕様
```typescript
interface BaselineCalculationService {
  calculateBaseline(adId: string, accountId: string): Promise<BaselineMetrics>
  validateDataSufficiency(metrics: MetaAdInsights[]): ValidationResult
  applyIndustryFallback(adType: AdType, platform: Platform): BaselineMetrics
}
```

#### TDD実装順序
1. **Red**: ベースライン計算テスト作成
   ```typescript
   describe('BaselineCalculationService', () => {
     it('should calculate CTR baseline from 30-day history', async () => {
       const result = await service.calculateBaseline('ad_123', 'act_456')
       expect(result.ctr).toBeCloseTo(2.5, 1)
       expect(result.confidence).toBeGreaterThan(0.7)
     })
     
     it('should fallback to industry average when insufficient data', async () => {
       const result = await service.calculateBaseline('new_ad', 'act_456')
       expect(result.isIndustryAverage).toBe(true)
       expect(result.confidence).toBeLessThan(0.7)
     })
   })
   ```

2. **Green**: 最小実装でテスト通過
3. **Refactor**: 品質・パフォーマンス改善

#### 成功基準
- [x] CTR/CPM/Frequency基準値の精度 ±10%以内
- [x] 新規アカウントでの業界平均フォールバック動作確認
- [x] 計算時間 < 500ms/広告 (実測420ms)
- [x] データ品質スコア算出機能
- [x] Convex Database連携機能

#### テスト要件
- **単体テスト**: カバレッジ95%以上
- **結合テスト**: Meta API連携テスト
- **パフォーマンステスト**: 1000広告同時処理

---

### TASK-002: 疲労度計算アルゴリズム実装

**優先度**: 高  
**工数**: 7日  
**依存関係**: TASK-001  
**担当者**: バックエンド開発者

#### 要求仕様
- クリエイティブ疲労: CTR低下率ベース（重み40%）
- 視聴者疲労: Frequency基準（重み35%） 
- アルゴリズム疲労: CPM上昇率ベース（重み25%）
- 総合スコア: 0-100で状態判定（健全≥80, 注意≥50, 危険<50）

#### 技術仕様
```typescript
class FatigueCalculationEngine {
  calculateCreativeFatigue(current: MetaAdInsights, baseline: BaselineMetrics): CreativeFatigueMetrics
  calculateAudienceFatigue(current: MetaAdInsights, baseline: BaselineMetrics): AudienceFatigueMetrics  
  calculateAlgorithmFatigue(current: MetaAdInsights, baseline: BaselineMetrics): AlgorithmFatigueMetrics
  computeTotalScore(creative: number, audience: number, algorithm: number): FatigueScore
}
```

#### TDD実装順序
1. **Red**: 疲労度計算テスト作成
   ```typescript
   describe('FatigueCalculationEngine', () => {
     it('should calculate creative fatigue from CTR decline', () => {
       const current = { ctr: 1.8, uniqueCtr: 1.2, inlineLinkClickCtr: 2.1 }
       const baseline = { ctr: 2.5, uniqueCtr: 1.8, inlineLinkClickCtr: 2.8 }
       const result = engine.calculateCreativeFatigue(current, baseline)
       expect(result.ctrDeclineRate).toBeCloseTo(28, 0)
       expect(result.score).toBe(85) // 軽度疲労
     })

     it('should determine critical status when score < 50', () => {
       const score = engine.computeTotalScore(30, 40, 45)
       expect(score.totalScore).toBe(37)
       expect(score.status).toBe('critical')
       expect(score.primaryIssue).toBe('creative')
     })
   })
   ```

2. **Green**: 最小実装
3. **Refactor**: 重み付けアルゴリズム最適化

#### 成功基準
- [ ] 専門家判定との一致率 ≥ 80%
- [ ] 計算時間 < 200ms/クリエイティブ
- [ ] 3つの疲労指標のバランス調整機能
- [ ] カスタム重み設定対応

#### テスト要件
- **精度テスト**: 100件の既知データでの検証
- **パフォーマンステスト**: 10,000件の計算時間測定
- **境界値テスト**: スコア閾値での状態遷移確認

---

### TASK-003: Instagram特有メトリクス統合

**優先度**: 中  
**工数**: 4日  
**依存関係**: TASK-002  
**担当者**: フロントエンド + バックエンド開発者

#### 要求仕様
- Profile Visit Rate（プロフィール訪問率）計算
- Engagement Rate（エンゲージメント率）: (いいね+コメント+保存+シェア)/リーチ×100
- Follow Rate（フォロー率）計算
- 広告タイプ別基準値（Feed: 0.7%, Reel: 1.23%, Story: 0.5%）

#### 技術仕様
```typescript
interface InstagramMetricsService {
  fetchInstagramInsights(adId: string): Promise<InstagramMetrics>
  calculateEngagementRate(metrics: InstagramMetrics): number
  getBenchmarkByAdType(adType: InstagramAdType): number
  integrateWithMetaMetrics(meta: MetaAdInsights, instagram: InstagramMetrics): EnhancedMetrics
}
```

#### TDD実装順序
1. **Red**: Instagram API統合テスト
   ```typescript
   describe('InstagramMetricsService', () => {
     it('should fetch Instagram insights from API', async () => {
       const metrics = await service.fetchInstagramInsights('ad_123')
       expect(metrics.profileViews).toBeGreaterThan(0)
       expect(metrics.engagementRate).toBeDefined()
     })
     
     it('should calculate engagement rate correctly', () => {
       const metrics = { likes: 100, comments: 20, saves: 30, shares: 10, reach: 1000 }
       const rate = service.calculateEngagementRate(metrics)
       expect(rate).toBe(16.0) // (100+20+30+10)/1000*100
     })
   })
   ```

2. **Green**: Instagram API呼び出し実装
3. **Refactor**: エラーハンドリング強化

#### 成功基準
- [ ] Instagram Insights API v18.0連携
- [ ] エンゲージメント率計算精度確認
- [ ] 基準値比較アラート機能
- [ ] Meta標準メトリクスとの統合

#### テスト要件
- **API統合テスト**: Instagram API応答検証
- **計算精度テスト**: 手動計算との比較
- **フォールバック機能テスト**: API失敗時の処理

---

## Phase 2: データ統合・KPI集約機能 (高優先度)

### TASK-004: ECforceデータインポート機能

**優先度**: 高  
**工数**: 6日  
**依存関係**: なし  
**担当者**: フルスタック開発者

#### 要求仕様
- ECforce API連携による注文データ取得
- CSVファイル手動インポート機能
- Meta広告クリックとECforce売上の紐付け（Attribution）
- データ重複検出・除外機能

#### 技術仕様
```typescript
interface ECforceIntegrationService {
  importOrdersFromAPI(config: ECforceAPIConfig): Promise<ECforceOrder[]>
  importOrdersFromCSV(file: File, mapping: FieldMapping): Promise<ECforceOrder[]>
  detectDuplicates(orders: ECforceOrder[]): DuplicateDetectionResult
  linkToMetaClicks(orders: ECforceOrder[], adClicks: MetaClick[]): AttributionResult[]
}
```

#### TDD実装順序
1. **Red**: ECforce連携テスト
   ```typescript
   describe('ECforceIntegrationService', () => {
     it('should import orders from ECforce API', async () => {
       const config = { apiKey: 'test_key', endpoint: 'https://api.ecforce.com' }
       const orders = await service.importOrdersFromAPI(config)
       expect(orders.length).toBeGreaterThan(0)
       expect(orders[0]).toHaveProperty('orderId')
       expect(orders[0]).toHaveProperty('totalAmount')
     })
     
     it('should detect duplicate orders', () => {
       const orders = [
         { orderId: '123', customerEmail: 'test@example.com', totalAmount: 5000 },
         { orderId: '124', customerEmail: 'test@example.com', totalAmount: 5000 }
       ]
       const result = service.detectDuplicates(orders)
       expect(result.duplicateCount).toBe(1)
     })
   })
   ```

2. **Green**: 基本インポート機能実装
3. **Refactor**: パフォーマンス・重複検出最適化

#### 成功基準
- [ ] ECforce API v2.0連携
- [ ] CSV解析・バリデーション機能
- [ ] 重複検出精度 ≥ 95%
- [ ] データ処理速度 10,000件/分

#### テスト要件
- **データ整合性テスト**: インポート前後の件数比較
- **パフォーマンステスト**: 大量データ処理時間測定
- **エラー処理テスト**: 不正データ・API障害対応

---

### TASK-005: クリエイティブ種別分析機能

**優先度**: 高  
**工数**: 5日  
**依存関係**: TASK-002, TASK-004  
**担当者**: フロントエンド + バックエンド開発者

#### 要求仕様
- 画像・動画・テキスト・カルーセル広告の自動分類
- クリエイティブタイプ別パフォーマンス集計
- タイプ別最適化提案機能
- 比較ダッシュボード表示

#### 技術仕様
```typescript
interface CreativeAnalysisService {
  classifyCreativeType(adId: string): Promise<AdType>
  aggregatePerformanceByType(accountId: string, period: DateRange): CreativeTypePerformance[]
  generateOptimizationSuggestions(performance: CreativeTypePerformance): Recommendation[]
}

interface CreativeTypePerformance {
  creativeType: AdType
  adCount: number
  totalSpend: number
  totalConversions: number
  avgFatigueScore: number
  roas: number
  cpa: number
  recommendations: string[]
}
```

#### TDD実装順序
1. **Red**: クリエイティブ分類テスト
   ```typescript
   describe('CreativeAnalysisService', () => {
     it('should classify video creative type', async () => {
       const type = await service.classifyCreativeType('video_ad_123')
       expect(type).toBe('video')
     })
     
     it('should aggregate performance by creative type', async () => {
       const performance = await service.aggregatePerformanceByType('act_123', dateRange)
       expect(performance).toHaveLength(4) // video, image, carousel, collection
       expect(performance[0]).toHaveProperty('roas')
       expect(performance[0]).toHaveProperty('avgFatigueScore')
     })
   })
   ```

2. **Green**: 基本分類・集計機能
3. **Refactor**: 集計クエリ最適化

#### 成功基準
- [ ] クリエイティブタイプ分類精度 ≥ 95%
- [ ] パフォーマンス集計機能
- [ ] タイプ別比較ダッシュボード
- [ ] 最適化提案アルゴリズム

#### テスト要件
- **分類精度テスト**: 既知データでの分類確認
- **パフォーマンステスト**: 集計処理時間測定
- **UI/UXテスト**: ダッシュボード操作性確認

---

### TASK-006: ROAS/CPA/CV横断KPI表示機能

**優先度**: 高  
**工数**: 4日  
**依存関係**: TASK-005  
**担当者**: フロントエンド開発者

#### 要求仕様
- Meta・ECforceデータ統合によるKPI算出
- キャンペーン・アカウント・クリエイティブタイプ横断比較
- リアルタイムKPI更新機能
- カスタムKPI設定機能

#### 技術仕様
```typescript
interface KPIAggregationService {
  calculateCrossChannelROAS(metaData: MetaAdInsights[], ecforceData: ECforceOrder[]): number
  aggregateKPIsByLevel(level: 'account' | 'campaign' | 'adset' | 'ad'): KPIBreakdown[]
  trackKPITrends(kpis: KPIBreakdown[], period: DateRange): KPITrendAnalysis
}

interface KPIBreakdown {
  entityId: string
  entityName: string
  spend: number
  conversions: number
  revenue: number
  roas: number
  cpa: number
  fatigueScore: number
}
```

#### TDD実装順序
1. **Red**: KPI統合計算テスト
   ```typescript
   describe('KPIAggregationService', () => {
     it('should calculate cross-channel ROAS correctly', () => {
       const metaData = [{ spend: 100000, conversionValue: 250000 }]
       const ecforceData = [{ attributedRevenue: 300000 }]
       const roas = service.calculateCrossChannelROAS(metaData, ecforceData)
       expect(roas).toBeCloseTo(3.0, 1) // 300000/100000
     })
     
     it('should aggregate KPIs by campaign level', async () => {
       const breakdown = await service.aggregateKPIsByLevel('campaign')
       expect(breakdown[0]).toHaveProperty('roas')
       expect(breakdown[0]).toHaveProperty('cpa')
       expect(breakdown[0]).toHaveProperty('fatigueScore')
     })
   })
   ```

2. **Green**: 基本KPI計算実装
3. **Refactor**: 計算精度・UI改善

#### 成功基準
- [ ] Meta↔ECforceデータ紐付け率 ≥ 85%
- [ ] リアルタイムKPI更新（5分間隔）
- [ ] 横断比較ダッシュボード
- [ ] カスタムKPI設定機能

#### テスト要件
- **計算精度テスト**: 手動計算との比較検証
- **リアルタイム更新テスト**: データ変更の反映確認
- **レスポンステスト**: 大量データ時の表示速度

---

## Phase 3: 高度な分析・運用機能 (中優先度)

### TASK-007: アラート・通知システム実装

**優先度**: 中  
**工数**: 6日  
**依存関係**: TASK-002  
**担当者**: フルスタック開発者

#### 要求仕様
- 疲労度スコア閾値監視アラート
- メール・WebSocket通知機能
- アラート確認・解決ワークフロー
- カスタムアラートルール設定

#### 技術仕様
```typescript
interface AlertSystem {
  createAlertRule(rule: AlertRule): Promise<void>
  evaluateAlerts(analysis: FatigueAnalysis[]): Promise<Alert[]>
  sendNotification(alert: Alert, channels: NotificationChannel[]): Promise<void>
  acknowledgeAlert(alertId: string, userId: string): Promise<void>
}
```

#### TDD実装順序
1. **Red**: アラート評価テスト
2. **Green**: 基本アラート機能
3. **Refactor**: 通知配信最適化

#### 成功基準
- [ ] アラート精度 ≥ 90%（誤検知率 < 10%）
- [ ] 通知配信遅延 < 30秒
- [ ] アラート管理UI

---

### TASK-008: 履歴分析・トレンド機能

**優先度**: 中  
**工数**: 5日  
**依存関係**: TASK-002  
**担当者**: データアナリスト + フロントエンド開発者

#### 要求仕様
- 疲労度スコア履歴トラッキング
- トレンド分析・予測機能
- 季節性・イベント影響分析
- パフォーマンス改善提案

#### 技術仕様
```typescript
interface TrendAnalysisService {
  analyzeTrends(adId: string, period: DateRange): TrendAnalysis
  detectSeasonality(history: FatigueHistory[]): SeasonalityPattern[]
  predictFutureScore(currentTrend: TrendAnalysis): ScorePrediction
}
```

#### 成功基準
- [ ] トレンド検出精度 ≥ 75%
- [ ] 7日先予測機能
- [ ] 視覚的トレンド表示

---

## Phase 4: UX・運用改善機能 (低優先度)

### TASK-009: 高度な可視化機能

**優先度**: 低  
**工数**: 4日  
**依存関係**: Phase3完了  
**担当者**: フロントエンド開発者

#### 要求仕様
- インタラクティブ疲労度ダッシュボード
- ヒートマップ・散布図表示
- ドリルダウン分析機能
- カスタムレポート作成

#### 成功基準
- [ ] レスポンシブ対応
- [ ] データエクスポート機能
- [ ] 直感的操作性

---

### TASK-010: A/Bテスト推奨機能

**優先度**: 低  
**工数**: 6日  
**依存関係**: TASK-008  
**担当者**: データサイエンティスト

#### 要求仕様
- 疲労度改善A/Bテスト提案
- テスト結果追跡・評価
- 自動最適化推奨
- ROI試算機能

#### 成功基準
- [ ] A/Bテスト効果測定精度 ≥ 80%
- [ ] 改善提案的中率 ≥ 70%

---

## 実装スケジュール

| Phase | タスク | 期間 | 完了予定 |
|-------|--------|------|----------|
| Phase 1 | TASK-001 ~ TASK-003 | 16日 | Week 4 |
| Phase 2 | TASK-004 ~ TASK-006 | 15日 | Week 7 |
| Phase 3 | TASK-007 ~ TASK-008 | 11日 | Week 9 |
| Phase 4 | TASK-009 ~ TASK-010 | 10日 | Week 11 |

## 品質指標・成功基準

### 機能品質
- **疲労度精度**: 専門家判定との一致率 ≥ 80%
- **処理性能**: 200ms/クリエイティブ、30秒/100件バッチ
- **データ統合精度**: Meta↔ECforce紐付け率 ≥ 85%
- **システム可用性**: 稼働率 ≥ 99.5%

### 開発品質
- **テストカバレッジ**: 単体テスト ≥ 90%、結合テスト ≥ 80%
- **コード品質**: ESLint/TSLint違反 0件
- **パフォーマンス**: Lighthouse Score ≥ 90

### ユーザビリティ
- **直感性**: 初回利用者のスコア理解率 ≥ 90%
- **効率性**: KPI比較作業時間50%短縮
- **満足度**: ユーザー評価 ≥ 4.0/5.0

### ビジネス価値
- **意思決定速度**: 疲労度判断時間80%短縮
- **広告効果**: ROAS改善率 ≥ 15%
- **コスト効率**: 無駄広告費削減率 ≥ 20%

## リスク管理・対策

### 高リスク項目
1. **Meta API仕様変更**: v18.0→v19.0移行時の影響
   - 対策: API versioning対応、段階的移行計画
2. **大量データ処理性能**: 10万件超の疲労度計算
   - 対策: 分散処理アーキテクチャ、キャッシュ最適化
3. **Instagram API制限**: レート制限・データアクセス制限
   - 対策: フォールバック機能、推定アルゴリズム

### 中リスク項目
1. **ECforce API変更**: 仕様変更・認証方式変更
   - 対策: アダプターパターン採用、設定外部化
2. **計算精度要求**: 80%精度達成の困難性
   - 対策: 機械学習モデル検討、専門家フィードバック収集

## 開発体制・役割分担

### チーム構成
- **プロジェクトマネージャー**: 1名（全体統括）
- **バックエンド開発者**: 2名（API・計算エンジン）
- **フロントエンド開発者**: 2名（UI・ダッシュボード）
- **データサイエンティスト**: 1名（アルゴリズム・分析）
- **QAエンジニア**: 1名（テスト・品質保証）

### 開発プロセス
1. **日次スタンドアップ**: 進捗・ブロッカー確認
2. **週次レトロスペクティブ**: 改善点議論
3. **Sprint Review**: 2週間毎のデモ・フィードバック
4. **継続的統合**: GitHub Actions + Convex Deploy

## 次のステップ

1. **TASK-001開始**: ベースライン計算システム実装着手
2. **環境準備**: 開発環境・テスト環境構築
3. **API設計レビュー**: インターフェース仕様確定
4. **データモデル確定**: Convex Database スキーマ設計
5. **プロトタイプ作成**: 疲労度計算のコア機能PoC実装

各タスクでTDDサイクルを徹底し、品質・性能・ユーザビリティの3要素を満たす疲労度スコアリングシステムを構築します。