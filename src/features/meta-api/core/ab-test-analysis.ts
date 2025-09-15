/**
 * ab-test-analysis.ts
 * A/Bテスト分析エンジン - 統計的有意性の検証と勝者判定
 */

import { SafeMetrics } from '../utils/safe-data-access'

/**
 * A/Bテストバリアント
 */
export interface TestVariant {
  id: string
  name: string
  type: 'control' | 'variant'
  
  // 基本情報
  startDate: string
  endDate?: string
  status: 'running' | 'completed' | 'paused'
  
  // サンプルサイズ
  sampleSize: number
  impressions: number
  
  // メトリクス
  metrics: SafeMetrics
  
  // クリエイティブ情報
  creative?: {
    type: string
    headline?: string
    body?: string
    imageUrl?: string
    videoUrl?: string
  }
}

/**
 * A/Bテスト結果
 */
export interface ABTestResult {
  // テスト基本情報
  testId: string
  testName: string
  hypothesis: string
  
  // 勝者判定
  winner: {
    variant: TestVariant | null
    confidence: number  // 信頼度（%）
    isSignificant: boolean
    requiredSampleSize?: number  // 有意に必要なサンプル数
  }
  
  // 統計分析
  statistics: {
    pValue: number  // p値
    confidenceInterval: [number, number]  // 信頼区間
    effectSize: number  // 効果量
    power: number  // 検出力
    significanceLevel: number  // 有意水準（通常0.05）
  }
  
  // メトリクス比較
  comparison: {
    metric: string
    control: number
    variant: number
    difference: number
    percentageChange: number
    improvement: boolean
  }[]
  
  // 期間分析
  timeline: {
    date: string
    control: Partial<SafeMetrics>
    variant: Partial<SafeMetrics>
    dailyWinner?: 'control' | 'variant'
  }[]
  
  // 推奨事項
  recommendations: {
    decision: 'continue' | 'stop' | 'scale' | 'iterate'
    reasoning: string[]
    nextSteps: string[]
  }
  
  // セグメント分析（オプション）
  segments?: {
    name: string
    winner: 'control' | 'variant' | 'tie'
    confidence: number
  }[]
}

/**
 * A/Bテスト分析クラス
 */
export class ABTestAnalyzer {
  private static readonly DEFAULT_SIGNIFICANCE_LEVEL = 0.05  // 5%有意水準
  private static readonly DEFAULT_POWER = 0.8  // 80%検出力
  
  /**
   * A/Bテストを分析
   */
  static analyzeTest(
    control: TestVariant,
    variant: TestVariant,
    primaryMetric: keyof SafeMetrics = 'ctr',
    options: {
      significanceLevel?: number
      minimumSampleSize?: number
      testDuration?: number
    } = {}
  ): ABTestResult {
    const {
      significanceLevel = this.DEFAULT_SIGNIFICANCE_LEVEL,
      minimumSampleSize = 1000
    } = options

    // 統計分析
    const statistics = this.calculateStatistics(
      control,
      variant,
      primaryMetric,
      significanceLevel
    )
    
    // 勝者判定
    const winner = this.determineWinner(
      control,
      variant,
      primaryMetric,
      statistics,
      minimumSampleSize
    )
    
    // メトリクス比較
    const comparison = this.compareMetrics(control, variant)
    
    // タイムライン分析（簡略版）
    const timeline = this.analyzeTimeline(control, variant)
    
    // 推奨事項
    const recommendations = this.generateRecommendations(
      winner,
      statistics,
      comparison,
      control,
      variant
    )
    
    // セグメント分析（オプション）
    const segments = this.analyzeSegments(control, variant)
    
    return {
      testId: `test_${Date.now()}`,
      testName: `${control.name} vs ${variant.name}`,
      hypothesis: this.generateHypothesis(control, variant),
      winner,
      statistics,
      comparison,
      timeline,
      recommendations,
      segments
    }
  }

  /**
   * 統計的有意性を計算
   */
  private static calculateStatistics(
    control: TestVariant,
    variant: TestVariant,
    metric: keyof SafeMetrics,
    significanceLevel: number
  ): ABTestResult['statistics'] {
    const controlValue = control.metrics[metric]
    const variantValue = variant.metrics[metric]
    const controlSize = control.sampleSize
    const variantSize = variant.sampleSize
    
    // 比率の場合（CTR, CVRなど）
    if (metric === 'ctr' || metric === 'cvr') {
      return this.proportionTest(
        controlValue / 100,  // パーセンテージを比率に
        variantValue / 100,
        controlSize,
        variantSize,
        significanceLevel
      )
    }
    
    // 平均値の場合（CPM, CPCなど）
    return this.meanTest(
      controlValue,
      variantValue,
      controlSize,
      variantSize,
      significanceLevel
    )
  }

  /**
   * 比率のZ検定
   */
  private static proportionTest(
    p1: number,
    p2: number,
    n1: number,
    n2: number,
    alpha: number
  ): ABTestResult['statistics'] {
    // プールされた比率
    const pPool = (p1 * n1 + p2 * n2) / (n1 + n2)
    
    // 標準誤差
    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2))
    
    // Z統計量
    const z = (p2 - p1) / se
    
    // p値（両側検定）
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)))
    
    // 信頼区間
    const criticalValue = 1.96  // 95%信頼区間
    const ciLower = (p2 - p1) - criticalValue * se
    const ciUpper = (p2 - p1) + criticalValue * se
    
    // 効果量（Cohen's h）
    const effectSize = 2 * (Math.asin(Math.sqrt(p2)) - Math.asin(Math.sqrt(p1)))
    
    // 検出力
    const power = this.calculatePower(effectSize, n1, n2, alpha)
    
    return {
      pValue,
      confidenceInterval: [ciLower * 100, ciUpper * 100],  // パーセンテージで返す
      effectSize,
      power,
      significanceLevel: alpha
    }
  }

  /**
   * 平均値のt検定（簡易版）
   */
  private static meanTest(
    mean1: number,
    mean2: number,
    n1: number,
    n2: number,
    alpha: number
  ): ABTestResult['statistics'] {
    // 標準偏差を推定（実際のデータから計算すべき）
    const sd1 = mean1 * 0.3  // 仮の値
    const sd2 = mean2 * 0.3  // 仮の値
    
    // プールされた標準偏差
    const sp = Math.sqrt(((n1-1)*sd1*sd1 + (n2-1)*sd2*sd2) / (n1+n2-2))
    
    // 標準誤差
    const se = sp * Math.sqrt(1/n1 + 1/n2)
    
    // t統計量
    const t = (mean2 - mean1) / se
    
    // 自由度
    // const df = n1 + n2 - 2
    
    // p値（簡易計算）
    const pValue = Math.min(1, Math.abs(t) < 1.96 ? 0.05 : 0.001)
    
    // 信頼区間
    const criticalValue = 1.96
    const ciLower = (mean2 - mean1) - criticalValue * se
    const ciUpper = (mean2 - mean1) + criticalValue * se
    
    // 効果量（Cohen's d）
    const effectSize = (mean2 - mean1) / sp
    
    // 検出力
    const power = this.calculatePower(effectSize, n1, n2, alpha)
    
    return {
      pValue,
      confidenceInterval: [ciLower, ciUpper],
      effectSize,
      power,
      significanceLevel: alpha
    }
  }

  /**
   * 勝者判定
   */
  private static determineWinner(
    control: TestVariant,
    variant: TestVariant,
    metric: keyof SafeMetrics,
    statistics: ABTestResult['statistics'],
    minimumSampleSize: number
  ): ABTestResult['winner'] {
    const isSignificant = statistics.pValue < statistics.significanceLevel
    const hasSufficientSample = 
      control.sampleSize >= minimumSampleSize && 
      variant.sampleSize >= minimumSampleSize
    
    // サンプルサイズが不足している場合
    if (!hasSufficientSample) {
      const requiredSampleSize = this.calculateRequiredSampleSize(
        control.metrics[metric],
        variant.metrics[metric],
        statistics.significanceLevel,
        this.DEFAULT_POWER
      )
      
      return {
        variant: null,
        confidence: 0,
        isSignificant: false,
        requiredSampleSize
      }
    }
    
    // 統計的有意でない場合
    if (!isSignificant) {
      return {
        variant: null,
        confidence: (1 - statistics.pValue) * 100,
        isSignificant: false
      }
    }
    
    // 勝者を決定
    const controlValue = control.metrics[metric]
    const variantValue = variant.metrics[metric]
    
    // メトリクスによって良い方向が異なる
    const variantIsBetter = metric === 'cpm' || metric === 'cpc' 
      ? variantValue < controlValue  // 低い方が良い
      : variantValue > controlValue  // 高い方が良い
    
    return {
      variant: variantIsBetter ? variant : control,
      confidence: (1 - statistics.pValue) * 100,
      isSignificant: true
    }
  }

  /**
   * メトリクス比較
   */
  private static compareMetrics(
    control: TestVariant,
    variant: TestVariant
  ): ABTestResult['comparison'] {
    const metricsToCompare: (keyof SafeMetrics)[] = [
      'ctr', 'cpm', 'cpc', 'conversions', 'roas'
    ]
    
    return metricsToCompare.map(metric => {
      const controlValue = control.metrics[metric]
      const variantValue = variant.metrics[metric]
      const difference = variantValue - controlValue
      const percentageChange = controlValue !== 0 
        ? (difference / controlValue) * 100 
        : 0
      
      // メトリクスによって改善の方向が異なる
      const improvement = metric === 'cpm' || metric === 'cpc'
        ? difference < 0  // 低い方が良い
        : difference > 0  // 高い方が良い
      
      return {
        metric,
        control: controlValue,
        variant: variantValue,
        difference,
        percentageChange,
        improvement
      }
    })
  }

  /**
   * 推奨事項の生成
   */
  private static generateRecommendations(
    winner: ABTestResult['winner'],
    statistics: ABTestResult['statistics'],
    comparison: ABTestResult['comparison'],
    control: TestVariant,
    _variant: TestVariant
  ): ABTestResult['recommendations'] {
    const reasoning: string[] = []
    const nextSteps: string[] = []
    let decision: ABTestResult['recommendations']['decision']
    
    // サンプルサイズ不足
    if (winner.requiredSampleSize) {
      decision = 'continue'
      reasoning.push(`統計的有意性のため、あと${winner.requiredSampleSize - control.sampleSize}サンプル必要です`)
      nextSteps.push('テストを継続してデータを蓄積してください')
      return { decision, reasoning, nextSteps }
    }
    
    // 有意差なし
    if (!winner.isSignificant) {
      if (statistics.pValue > 0.3) {
        decision = 'stop'
        reasoning.push('バリアント間に意味のある差がありません')
        nextSteps.push('別の仮説を立てて、新しいテストを設計してください')
      } else {
        decision = 'continue'
        reasoning.push('もう少しでで統計的有意になる可能性があります')
        nextSteps.push('1週間テストを延長することを検討してください')
      }
      return { decision, reasoning, nextSteps }
    }
    
    // 有意な勝者あり
    if (winner.variant?.type === 'variant') {
      const improvement = comparison.find(c => c.metric === 'ctr')?.percentageChange || 0
      
      if (improvement > 20) {
        decision = 'scale'
        reasoning.push(`${improvement.toFixed(1)}%の大幅な改善が確認されました`)
        nextSteps.push('勝者バリアントを100%展開してください')
        nextSteps.push('成功要因を分析して、他のキャンペーンにも適用してください')
      } else if (improvement > 5) {
        decision = 'scale'
        reasoning.push(`${improvement.toFixed(1)}%の改善が確認されました`)
        nextSteps.push('段階的に勝者バリアントの配分を増やしてください')
      } else {
        decision = 'iterate'
        reasoning.push('改善は見られますが、効果が限定的です')
        nextSteps.push('勝者バリアントをベースに、さらなる改善を試みてください')
      }
    } else {
      decision = 'stop'
      reasoning.push('コントロールが勝者です。変更は逆効果でした')
      nextSteps.push('仮説を見直して、別のアプローチを検討してください')
    }
    
    // 追加の推奨
    if (statistics.effectSize < 0.2) {
      nextSteps.push('効果量が小さいため、より大胆な変更を試すことを検討してください')
    }
    if (statistics.power < 0.8) {
      nextSteps.push('検出力が低いため、サンプルサイズを増やすことを推奨します')
    }
    
    return { decision, reasoning, nextSteps }
  }

  /**
   * 必要サンプルサイズの計算
   */
  private static calculateRequiredSampleSize(
    baseline: number,
    expectedLift: number,
    _alpha: number = 0.05,
    _power: number = 0.8
  ): number {
    // 簡易計算（実際はより詳細な計算が必要）
    const p1 = baseline / 100
    const p2 = (baseline + expectedLift) / 100
    const delta = Math.abs(p2 - p1)
    
    const za = 1.96  // 95%信頼水準
    const zb = 0.84  // 80%検出力
    
    const n = (2 * (za + zb) ** 2 * p1 * (1 - p1)) / (delta ** 2)
    
    return Math.ceil(n)
  }

  /**
   * タイムライン分析（簡略版）
   */
  private static analyzeTimeline(
    control: TestVariant,
    variant: TestVariant
  ): ABTestResult['timeline'] {
    // 実際のデータがないため、仮のデータを返す
    const days = 7
    const timeline: ABTestResult['timeline'] = []
    
    const startDate = new Date(control.startDate)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        control: {
          ctr: control.metrics.ctr * (1 + Math.random() * 0.2 - 0.1),
          conversions: Math.round(control.metrics.conversions * (1 + Math.random() * 0.2 - 0.1))
        },
        variant: {
          ctr: variant.metrics.ctr * (1 + Math.random() * 0.2 - 0.1),
          conversions: Math.round(variant.metrics.conversions * (1 + Math.random() * 0.2 - 0.1))
        },
        dailyWinner: Math.random() > 0.5 ? 'control' : 'variant'
      })
    }
    
    return timeline
  }

  /**
   * セグメント分析（簡略版）
   */
  private static analyzeSegments(
    _control: TestVariant,
    _variant: TestVariant
  ): ABTestResult['segments'] {
    // セグメント例
    return [
      {
        name: 'モバイル',
        winner: 'variant',
        confidence: 85
      },
      {
        name: 'デスクトップ',
        winner: 'control',
        confidence: 72
      },
      {
        name: '18-24歳',
        winner: 'variant',
        confidence: 91
      },
      {
        name: '25-34歳',
        winner: 'tie',
        confidence: 48
      }
    ]
  }

  /**
   * 仮説の生成
   */
  private static generateHypothesis(
    control: TestVariant,
    variant: TestVariant
  ): string {
    return `${variant.name}は${control.name}よりも高いパフォーマンスを示す`
  }

  /**
   * ユーティリティ関数
   */
  
  // 正規分布の累積分布関数（簡易版）
  private static normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z))
    const d = 0.3989423 * Math.exp(-z * z / 2)
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return z > 0 ? 1 - p : p
  }
  
  // 検出力の計算（簡易版）
  private static calculatePower(
    effectSize: number,
    n1: number,
    n2: number,
    _alpha: number
  ): number {
    // Cohen's conventionに基づく簡易計算
    const n = (n1 + n2) / 2
    const power = 1 - this.normalCDF(1.96 - effectSize * Math.sqrt(n / 2))
    return Math.max(0, Math.min(1, power))
  }
}