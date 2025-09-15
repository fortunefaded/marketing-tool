# 広告クリエイティブ評価指標の実装レポート

## エグゼクティブサマリー
Meta広告の疲労度分析から、より包括的なクリエイティブ評価システムへの拡張を実装。8つの主要指標を定義し、既存のAPIデータ構造を活用して実装。

## 1. 実装確定指標（データ取得済み）

### 1.1 動画視聴ファネル指標
```typescript
// 既存データから取得可能
const videoMetrics = {
  hookRate: insight.video_p25_watched_actions / insight.video_play_actions,  // フック力
  retentionRate: insight.video_p50_watched_actions / insight.video_play_actions,  // 継続視聴率
  completionRate: insight.video_p100_watched_actions / insight.video_play_actions,  // 完視聴率
}
```

### 1.2 疲労度指標（実装済み）
```typescript
// src/features/meta-api/fatigue/calculator.ts に実装済み
const fatigueMetrics = {
  creativeFatigue: (industryAvgCTR - actualCTR) / industryAvg * qualityScore,
  audienceFatigue: (frequency - 1.5) / 2.0 * 100,
  deliveryEfficiency: (cpm - marketAvg) / marketAvg * 50
}
```

### 1.3 ROAS効率指標
```typescript
// purchase_roasフィールドから取得
const roasMetrics = {
  roasEfficiency: (purchase_roas / 3.0) * 50,  // 業界平均3.0基準
  scalability: roas * (1 - frequency/5) * 20,  // スケール可能性
  profitabilityGrade: calculateGrade(roas, cpa, targetCPA)
}
```

## 2. エンゲージメント指標の実装

### 2.1 アクション抽出ヘルパー関数
```typescript
// 既存のextractActionValueパターンを活用
class CreativeMetricsCalculator {
  private extractActionValue(actions: any[], actionType: string): number {
    if (!actions || !Array.isArray(actions)) return 0
    const action = actions.find(a => a.action_type === actionType)
    return action ? parseFloat(action.value || '0') : 0
  }

  // エンゲージメント系アクションの抽出
  extractEngagementMetrics(insight: AdInsight) {
    const actions = insight.actions || []
    
    return {
      likes: this.extractActionValue(actions, 'like'),
      comments: this.extractActionValue(actions, 'comment'),
      shares: this.extractActionValue(actions, 'post'),
      saves: this.extractActionValue(actions, 'post_save'),
      linkClicks: this.extractActionValue(actions, 'link_click')
    }
  }
}
```

### 2.2 エンゲージメント率の計算
```typescript
calculateEngagementRate(insight: AdInsight): number {
  const engagement = this.extractEngagementMetrics(insight)
  const totalEngagements = 
    engagement.likes + 
    engagement.comments + 
    engagement.shares + 
    engagement.saves
  
  const reach = insight.reach || 0
  return reach > 0 ? (totalEngagements / reach) * 100 : 0
}
```

### 2.3 保存率の計算
```typescript
calculateSaveRate(insight: AdInsight): number {
  const actions = insight.actions || []
  const saves = this.extractActionValue(actions, 'post_save')
  const reach = insight.reach || 0
  
  return reach > 0 ? (saves / reach) * 100 : 0
}
```

## 3. 包括的評価スコアの実装

```typescript
interface CreativeEvaluationScore {
  // 動画パフォーマンス (0-100)
  videoPerformance: {
    score: number
    metrics: {
      hookRate: number      // 25%視聴率
      completionRate: number // 完視聴率
      watchTime: number     // 平均視聴時間
    }
  }
  
  // エンゲージメント品質 (0-100)
  engagementQuality: {
    score: number
    metrics: {
      engagementRate: number
      saveRate: number
      shareRate: number
    }
  }
  
  // 疲労度 (0-100, 低いほど良い)
  fatigueLevel: {
    score: number
    metrics: {
      creativeFatigue: number
      audienceFatigue: number
      frequencyScore: number
    }
  }
  
  // 収益性 (0-100)
  profitability: {
    score: number
    metrics: {
      roas: number
      cpa: number
      conversionRate: number
    }
  }
  
  // 総合スコア (0-100)
  totalScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}
```

## 4. 実装場所と統合方法

### 4.1 新規ファイル作成
```typescript
// src/features/meta-api/evaluation/CreativeEvaluator.ts
export class CreativeEvaluator {
  constructor(
    private industryBenchmarks: IndustryBenchmarks
  ) {}
  
  evaluate(insight: AdInsight): CreativeEvaluationScore {
    // 各指標の計算と統合
  }
}
```

### 4.2 既存コンポーネントへの統合
```typescript
// src/features/meta-api/components/CreativeDetailModal.tsx に追加
<CreativeEvaluationPanel 
  insight={currentInsight}
  showDetailedMetrics={true}
/>
```

## 5. API完全データタブの改善

### 5.1 actions配列の展開表示
```typescript
// src/features/meta-api/components/ComprehensiveDataTabs.tsx
const renderActionsArray = (actions: any[]) => {
  if (!actions || !Array.isArray(actions)) return null
  
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">Actions詳細 ({actions.length}件)</h4>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Action Type</th>
            <th>Value</th>
            <th>1d_click</th>
            <th>7d_click</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, idx) => (
            <tr key={idx}>
              <td className="font-mono">{action.action_type}</td>
              <td>{action.value}</td>
              <td>{action['1d_click'] || '-'}</td>
              <td>{action['7d_click'] || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 6. 実装優先順位

### フェーズ1（即座に実装可能）
1. ✅ 動画視聴ファネル機能（データ取得済み）
2. ✅ ROAS効率スコア（purchase_roasフィールド活用）
3. ✅ 既存疲労度指標の改善

### フェーズ2（データ確認後）
1. ⚠️ エンゲージメント率（actions配列の中身確認要）
2. ⚠️ 保存率（post_saveアクションの存在確認要）
3. ⚠️ クリエイティブ評価ダッシュボード

### フェーズ3（将来拡張）
1. 📊 時系列劣化分析
2. 🏢 競合比較機能
3. 🤖 AI推奨改善ポイント

## 7. 技術的実装詳細

### 7.1 型定義の追加
```typescript
// src/features/meta-api/types/evaluation-types.ts
export interface CreativeMetrics {
  // 基本指標
  impressions: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  
  // エンゲージメント指標
  engagement: {
    likes: number
    comments: number
    shares: number
    saves: number
    total: number
    rate: number
  }
  
  // 動画指標
  video: {
    plays: number
    p25Watched: number
    p50Watched: number
    p75Watched: number
    p100Watched: number
    hookRate: number
    completionRate: number
  }
  
  // コンバージョン指標
  conversion: {
    purchases: number
    value: number
    roas: number
    cpa: number
  }
  
  // 評価スコア
  evaluation: {
    creativeFatigue: number
    audienceFatigue: number
    engagementQuality: number
    profitability: number
    totalScore: number
  }
}
```

### 7.2 計算ロジックの実装
```typescript
// src/features/meta-api/utils/metrics-calculator.ts
export class MetricsCalculator {
  // 業界ベンチマーク
  private benchmarks = {
    ctr: 1.0,        // 1%
    engagementRate: 3.0,  // 3%
    saveRate: 0.5,   // 0.5%
    completionRate: 15.0, // 15%
    roas: 3.0        // 3.0x
  }
  
  calculateAllMetrics(insight: AdInsight): CreativeMetrics {
    const base = this.extractBaseMetrics(insight)
    const engagement = this.calculateEngagement(insight)
    const video = this.calculateVideoMetrics(insight)
    const conversion = this.calculateConversion(insight)
    const evaluation = this.evaluatePerformance(base, engagement, video, conversion)
    
    return {
      ...base,
      engagement,
      video,
      conversion,
      evaluation
    }
  }
}
```

## 8. データ取得の確認事項

### actions配列の確認
```javascript
// デバッグコンソールで実行
const checkActions = (insight) => {
  if (!insight.actions) return "No actions found"
  
  const actionTypes = insight.actions.map(a => a.action_type)
  const engagementActions = ['like', 'comment', 'post', 'post_save']
  const found = engagementActions.filter(type => 
    actionTypes.includes(type)
  )
  
  return {
    totalActions: actionTypes.length,
    allTypes: actionTypes,
    engagementFound: found,
    hasEngagement: found.length > 0
  }
}
```

## 9. 実装チェックリスト

- [ ] CreativeEvaluator クラスの作成
- [ ] MetricsCalculator の実装
- [ ] 型定義ファイルの追加
- [ ] actions配列の展開表示機能
- [ ] エンゲージメント指標の計算
- [ ] 動画ファネル分析の実装
- [ ] ROAS効率スコアの計算
- [ ] 評価ダッシュボードUI
- [ ] API完全データタブの改善
- [ ] テストコードの作成

## 10. 引き継ぎ事項

### 重要確認事項
1. **actions配列の内容確認**
   - action_type一覧の取得
   - like, comment, share, post_saveの有無
   - 各アクションの実際の値

2. **実装推奨順序**
   - Step 1: API完全データタブでactions配列を展開表示
   - Step 2: 動画視聴ファネル実装（データ確定済み）
   - Step 3: エンゲージメント率計算（データ確認後）
   - Step 4: 総合評価ダッシュボード構築

3. **パフォーマンス考慮事項**
   - 大量データ時の計算処理をWeb Workerで実行
   - メトリクス計算結果のキャッシュ
   - リアクティブな更新の最適化

このレポートを基に、段階的に機能を実装していくことで、より高度な広告クリエイティブ評価システムを構築できます。
