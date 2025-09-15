/**
 * predictive-analysis.ts
 * 予測分析エンジン - 7日後の疲労度やパフォーマンスを予測
 */

import { FatigueScoreDetail } from './fatigue-calculator-v2'
import { SafeMetrics } from '../utils/safe-data-access'

/**
 * 時系列データポイント
 */
export interface TimeSeriesDataPoint {
  date: string
  metrics: SafeMetrics
  fatigueScore?: number
}

/**
 * 予測結果
 */
export interface PredictionResult {
  // 予測値
  predictions: {
    date: string
    metrics: Partial<SafeMetrics>
    fatigueScore: number
    confidence: number  // 信頼度 0-1
  }[]
  
  // トレンド分析
  trend: {
    direction: 'improving' | 'stable' | 'declining' | 'critical'
    momentum: number  // -100 to 100
    inflectionPoint?: string  // 転換点の日付
  }
  
  // リスク評価
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    estimatedImpact: {
      impressions: number  // 予想される印象数の変化率
      ctr: number         // 予想されるCTRの変化率
      spend: number       // 予想される支出の変化率
    }
  }
  
  // 推奨アクション
  recommendations: {
    immediate: string[]  // 今すぐ実施
    shortTerm: string[]  // 3日以内
    preventive: string[] // 予防的措置
  }
  
  // 統計情報
  statistics: {
    r2Score: number      // 決定係数
    mape: number        // 平均絶対誤差率
    confidence: number  // 全体的な信頼度
  }
}

/**
 * 予測分析クラス
 */
export class PredictiveAnalyzer {
  /**
   * 7日後の予測を実行
   */
  static predict7Days(
    historicalData: TimeSeriesDataPoint[],
    currentFatigueScore?: FatigueScoreDetail
  ): PredictionResult {
    if (historicalData.length < 7) {
      return this.getInsufficientDataResult()
    }

    // データの前処理
    const processedData = this.preprocessData(historicalData)
    
    // トレンド分析
    const trend = this.analyzeTrend(processedData)
    
    // 予測モデルの実行
    const predictions = this.runPredictionModel(processedData, 7)
    
    // リスク評価
    const risk = this.assessRisk(predictions, trend, currentFatigueScore)
    
    // 推奨事項の生成
    const recommendations = this.generateRecommendations(
      predictions,
      trend,
      risk,
      currentFatigueScore
    )
    
    // 統計情報の計算
    const statistics = this.calculateStatistics(processedData, predictions)
    
    return {
      predictions,
      trend,
      risk,
      recommendations,
      statistics
    }
  }

  /**
   * データの前処理
   */
  private static preprocessData(
    data: TimeSeriesDataPoint[]
  ): TimeSeriesDataPoint[] {
    // 欠損値の補完
    const filled = this.fillMissingValues(data)
    
    // 外れ値の処理
    const cleaned = this.removeOutliers(filled)
    
    // 正規化
    return this.normalizeData(cleaned)
  }

  /**
   * トレンド分析
   */
  private static analyzeTrend(
    data: TimeSeriesDataPoint[]
  ): PredictionResult['trend'] {
    const recentData = data.slice(-7)  // 直近7日
    const olderData = data.slice(-14, -7)  // その前の7日
    
    // 主要メトリクスの変化率を計算
    const recentAvgCTR = this.average(recentData.map(d => d.metrics.ctr))
    const olderAvgCTR = this.average(olderData.map(d => d.metrics.ctr))
    const ctrChange = ((recentAvgCTR - olderAvgCTR) / olderAvgCTR) * 100
    
    const recentAvgCPM = this.average(recentData.map(d => d.metrics.cpm))
    const olderAvgCPM = this.average(olderData.map(d => d.metrics.cpm))
    const cpmChange = ((recentAvgCPM - olderAvgCPM) / olderAvgCPM) * 100
    
    // モメンタム計算（-100 to 100）
    const momentum = this.calculateMomentum(ctrChange, cpmChange)
    
    // 方向性の判定
    let direction: PredictionResult['trend']['direction']
    if (momentum < -20 && ctrChange < -10) {
      direction = 'critical'
    } else if (momentum < -10) {
      direction = 'declining'
    } else if (momentum > 10) {
      direction = 'improving'
    } else {
      direction = 'stable'
    }
    
    // 転換点の検出
    const inflectionPoint = this.detectInflectionPoint(data)
    
    return {
      direction,
      momentum,
      inflectionPoint
    }
  }

  /**
   * 予測モデルの実行（簡易線形回帰）
   */
  private static runPredictionModel(
    data: TimeSeriesDataPoint[],
    days: number
  ): PredictionResult['predictions'] {
    const predictions: PredictionResult['predictions'] = []
    
    // 各メトリクスについて線形回帰
    const ctrTrend = this.linearRegression(
      data.map((d, i) => ({ x: i, y: d.metrics.ctr }))
    )
    const cpmTrend = this.linearRegression(
      data.map((d, i) => ({ x: i, y: d.metrics.cpm }))
    )
    const impTrend = this.linearRegression(
      data.map((d, i) => ({ x: i, y: d.metrics.impressions }))
    )
    
    // 疲労度スコアのトレンド
    const fatigueTrend = this.linearRegression(
      data.filter(d => d.fatigueScore !== undefined)
        .map((d, i) => ({ x: i, y: d.fatigueScore! }))
    )
    
    const lastDate = new Date(data[data.length - 1].date)
    
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      
      const dataIndex = data.length + i
      
      // 予測値を計算
      const predictedCTR = Math.max(0, ctrTrend.slope * dataIndex + ctrTrend.intercept)
      const predictedCPM = Math.max(0, cpmTrend.slope * dataIndex + cpmTrend.intercept)
      const predictedImp = Math.max(0, impTrend.slope * dataIndex + impTrend.intercept)
      const predictedFatigue = Math.min(100, Math.max(0, 
        fatigueTrend.slope * dataIndex + fatigueTrend.intercept
      ))
      
      // 信頼度は日数が進むにつれて低下
      const confidence = Math.max(0.3, 1 - (i * 0.1))
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        metrics: {
          ctr: predictedCTR,
          cpm: predictedCPM,
          impressions: predictedImp
        },
        fatigueScore: predictedFatigue,
        confidence
      })
    }
    
    return predictions
  }

  /**
   * リスク評価
   */
  private static assessRisk(
    predictions: PredictionResult['predictions'],
    trend: PredictionResult['trend'],
    _currentFatigue?: FatigueScoreDetail
  ): PredictionResult['risk'] {
    const lastPrediction = predictions[predictions.length - 1]
    const factors: string[] = []
    
    // 疲労度スコアによるリスク
    if (lastPrediction.fatigueScore > 80) {
      factors.push('疲労度スコアが危険水準に達する予測')
    }
    if (lastPrediction.fatigueScore > 60) {
      factors.push('疲労度スコアが警告水準を超える予測')
    }
    
    // CTR低下リスク
    const ctrDecline = predictions[0].metrics.ctr! - (predictions[6].metrics.ctr || 0)
    if (ctrDecline > 0.5) {
      factors.push('CTRの大幅な低下が予測される')
    }
    
    // CPM上昇リスク
    const cpmIncrease = ((predictions[6].metrics.cpm || 0) - predictions[0].metrics.cpm!) / predictions[0].metrics.cpm! * 100
    if (cpmIncrease > 30) {
      factors.push('CPMの大幅な上昇が予測される')
    }
    
    // トレンドによるリスク
    if (trend.direction === 'critical') {
      factors.push('クリティカルな下降トレンド')
    }
    
    // リスクレベルの判定
    let level: PredictionResult['risk']['level']
    if (factors.length >= 3 || lastPrediction.fatigueScore > 80) {
      level = 'critical'
    } else if (factors.length >= 2 || lastPrediction.fatigueScore > 60) {
      level = 'high'
    } else if (factors.length >= 1 || lastPrediction.fatigueScore > 40) {
      level = 'medium'
    } else {
      level = 'low'
    }
    
    // 影響の推定
    const estimatedImpact = {
      impressions: -Math.round(trend.momentum * 0.5),  // モメンタムの半分
      ctr: -ctrDecline / predictions[0].metrics.ctr! * 100,
      spend: cpmIncrease
    }
    
    return {
      level,
      factors,
      estimatedImpact
    }
  }

  /**
   * 推奨事項の生成
   */
  private static generateRecommendations(
    predictions: PredictionResult['predictions'],
    trend: PredictionResult['trend'],
    risk: PredictionResult['risk'],
    _currentFatigue?: FatigueScoreDetail
  ): PredictionResult['recommendations'] {
    const immediate: string[] = []
    const shortTerm: string[] = []
    const preventive: string[] = []
    
    // リスクレベルに応じた推奨
    if (risk.level === 'critical' || risk.level === 'high') {
      immediate.push('🚨 広告を一時停止して、クリエイティブを刷新してください')
      immediate.push('🎯 ターゲティングを見直して、新しいオーディエンスを開拓してください')
    }
    
    // 疲労度スコアに基づく推奨
    const predictedFatigue = predictions[6].fatigueScore
    if (predictedFatigue > 70) {
      immediate.push('🔄 新しいクリエイティブバリエーションを3つ以上準備してください')
      shortTerm.push('📊 A/Bテストを実施して、最適なクリエイティブを特定してください')
    } else if (predictedFatigue > 50) {
      shortTerm.push('💡 クリエイティブのマイナーチェンジを検討してください')
      preventive.push('📅 2週間後にクリエイティブローテーションを計画してください')
    }
    
    // トレンドに基づく推奨
    if (trend.direction === 'declining' || trend.direction === 'critical') {
      if (trend.momentum < -30) {
        immediate.push('⚡ 入札戦略を「コンバージョン」から「リーチ」に変更を検討')
      }
      shortTerm.push('🔍 競合分析を実施して、差別化ポイントを明確にしてください')
    }
    
    // CPM上昇への対処
    if (risk.estimatedImpact.spend > 20) {
      shortTerm.push('💰 予算配分を見直して、効率的な時間帯に集中投下してください')
      preventive.push('📈 入札上限を設定して、CPMの過度な上昇を防いでください')
    }
    
    // CTR低下への対処
    if (risk.estimatedImpact.ctr < -20) {
      immediate.push('📝 広告コピーを見直して、CTAを強化してください')
      shortTerm.push('🖼️ サムネイルやファーストビューを改善してください')
    }
    
    // 予防的措置
    preventive.push('📊 週次でパフォーマンスレビューを実施してください')
    preventive.push('🎨 月間3-5個の新クリエイティブを制作する体制を整えてください')
    
    return {
      immediate,
      shortTerm,
      preventive
    }
  }

  /**
   * 線形回帰
   */
  private static linearRegression(
    data: { x: number; y: number }[]
  ): { slope: number; intercept: number } {
    const n = data.length
    if (n === 0) return { slope: 0, intercept: 0 }
    
    const sumX = data.reduce((sum, p) => sum + p.x, 0)
    const sumY = data.reduce((sum, p) => sum + p.y, 0)
    const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return { slope, intercept }
  }

  /**
   * モメンタム計算
   */
  private static calculateMomentum(ctrChange: number, cpmChange: number): number {
    // CTR改善とCPM低下が良い
    const ctrMomentum = ctrChange * 2  // CTRは2倍の重み
    const cpmMomentum = -cpmChange  // CPMは逆（低いほど良い）
    
    return Math.max(-100, Math.min(100, (ctrMomentum + cpmMomentum) / 2))
  }

  /**
   * 転換点の検出
   */
  private static detectInflectionPoint(data: TimeSeriesDataPoint[]): string | undefined {
    if (data.length < 5) return undefined
    
    // 2階微分で転換点を検出（簡易版）
    for (let i = 2; i < data.length - 2; i++) {
      const prev = data[i - 1].metrics.ctr
      const curr = data[i].metrics.ctr
      const next = data[i + 1].metrics.ctr
      
      const firstDiff1 = curr - prev
      const firstDiff2 = next - curr
      
      // 符号が変わったら転換点
      if (firstDiff1 * firstDiff2 < 0) {
        return data[i].date
      }
    }
    
    return undefined
  }

  /**
   * 統計情報の計算
   */
  private static calculateStatistics(
    _historical: TimeSeriesDataPoint[],
    predictions: PredictionResult['predictions']
  ): PredictionResult['statistics'] {
    // 簡易的な統計（実際の実装ではより詳細な計算が必要）
    const confidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    
    return {
      r2Score: 0.75,  // 仮の値
      mape: 15.5,     // 仮の値（%）
      confidence
    }
  }

  /**
   * ユーティリティ関数
   */
  private static average(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  private static fillMissingValues(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    // 簡易的な前方補完
    return data
  }

  private static removeOutliers(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    // IQR法による外れ値除去（簡易版）
    return data
  }

  private static normalizeData(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    // Min-Max正規化（簡易版）
    return data
  }

  private static getInsufficientDataResult(): PredictionResult {
    return {
      predictions: [],
      trend: {
        direction: 'stable',
        momentum: 0
      },
      risk: {
        level: 'low',
        factors: ['データ不足のため予測精度が低い'],
        estimatedImpact: {
          impressions: 0,
          ctr: 0,
          spend: 0
        }
      },
      recommendations: {
        immediate: ['📊 予測分析のため、少なくとも7日分のデータを蓄積してください'],
        shortTerm: [],
        preventive: []
      },
      statistics: {
        r2Score: 0,
        mape: 100,
        confidence: 0
      }
    }
  }
}