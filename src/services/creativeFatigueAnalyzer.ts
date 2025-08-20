export interface CreativePerformanceData {
  date: string
  ctr: number
  frequency: number
  impressions: number
  clicks: number
  spend: number
}

export type RecommendedAction = 'continue' | 'refresh' | 'pause' | 'replace'

export interface FatigueAnalysis {
  creativeId: string
  fatigueScore: number // 0-100
  recommendedAction: RecommendedAction
  ctrTrend: number // Negative for declining, positive for improving
  frequencySaturation: number // 0-100
  decayRate: number // Percentage decline per day from peak
  peakPerformanceDate?: string
  daysSincePeak?: number
  predictedEndOfLife?: string
  daysUntilEndOfLife?: number
  message?: string
  fatigueLevel?: 'healthy' | 'warning' | 'critical'
  score?: number
}

export type CreativeFatigueAnalysis = FatigueAnalysis

export class CreativeFatigueAnalyzer {
  private readonly MIN_DATA_POINTS = 3
  private readonly CTR_THRESHOLD = 0.5 // Minimum acceptable CTR
  // private readonly _FREQUENCY_THRESHOLD = 5.0 // High frequency threshold
  private readonly FATIGUE_THRESHOLD_LOW = 30
  private readonly FATIGUE_THRESHOLD_MEDIUM = 50
  private readonly FATIGUE_THRESHOLD_HIGH = 70

  analyzeFatigue(creativeId: string, performanceData: CreativePerformanceData[]): FatigueAnalysis {
    // Handle empty data
    if (performanceData.length === 0) {
      return {
        creativeId,
        fatigueScore: 0,
        score: 0,
        fatigueLevel: 'healthy',
        recommendedAction: 'continue',
        ctrTrend: 0,
        frequencySaturation: 0,
        decayRate: 0,
        message: 'No data available',
      }
    }

    // Handle insufficient data
    if (performanceData.length < this.MIN_DATA_POINTS) {
      return {
        creativeId,
        fatigueScore: 0,
        score: 0,
        fatigueLevel: 'healthy',
        recommendedAction: 'continue',
        ctrTrend: 0,
        frequencySaturation: 0,
        decayRate: 0,
        message: 'insufficient data for analysis',
      }
    }

    // Sort data by date
    const sortedData = [...performanceData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate metrics
    const ctrTrend = this.calculateCTRTrend(sortedData)
    const frequencySaturation = this.calculateFrequencySaturation(sortedData)
    const { decayRate, peakDate, daysSincePeak } = this.calculateDecayFromPeak(sortedData)
    const fatigueScore = this.calculateFatigueScore(ctrTrend, frequencySaturation, decayRate)
    const recommendedAction = this.getRecommendedAction(fatigueScore, frequencySaturation)
    const { predictedEndOfLife, daysUntilEndOfLife } = this.predictEndOfLife(sortedData, decayRate)

    const fatigueLevel = fatigueScore < 30 ? 'healthy' : fatigueScore < 60 ? 'warning' : 'critical'

    return {
      creativeId,
      fatigueScore,
      score: fatigueScore,
      fatigueLevel,
      recommendedAction,
      ctrTrend,
      frequencySaturation,
      decayRate,
      peakPerformanceDate: peakDate,
      daysSincePeak,
      predictedEndOfLife,
      daysUntilEndOfLife,
    }
  }

  private calculateCTRTrend(data: CreativePerformanceData[]): number {
    if (data.length < 2) return 0

    // Simple linear regression on CTR values
    const n = data.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    data.forEach((point, index) => {
      sumX += index
      sumY += point.ctr
      sumXY += index * point.ctr
      sumX2 += index * index
    })

    // Calculate slope (trend)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    // Return trend as percentage change per day
    const avgCTR = sumY / n
    return avgCTR > 0 ? (slope / avgCTR) * 100 : 0
  }

  private calculateFrequencySaturation(data: CreativePerformanceData[]): number {
    const latestFrequency = data[data.length - 1].frequency

    // Sigmoid function to map frequency to saturation
    // Frequency of 5 maps to ~88% saturation
    const saturation = 100 / (1 + Math.exp(-1.5 * (latestFrequency - 3)))

    return Math.min(100, Math.max(0, saturation))
  }

  private calculateDecayFromPeak(data: CreativePerformanceData[]): {
    decayRate: number
    peakDate?: string
    daysSincePeak?: number
  } {
    // Find peak CTR
    let peakIndex = 0
    let peakCTR = 0

    data.forEach((point, index) => {
      if (point.ctr > peakCTR) {
        peakCTR = point.ctr
        peakIndex = index
      }
    })

    // If we're still at peak, no decay
    if (peakIndex === data.length - 1) {
      return { decayRate: 0 }
    }

    // Calculate decay rate
    const currentCTR = data[data.length - 1].ctr
    const daysSincePeak = data.length - 1 - peakIndex
    const totalDecay = ((peakCTR - currentCTR) / peakCTR) * 100
    const decayRate = daysSincePeak > 0 ? totalDecay / daysSincePeak : 0

    return {
      decayRate: Math.max(0, decayRate),
      peakDate: data[peakIndex].date,
      daysSincePeak,
    }
  }

  private calculateFatigueScore(
    ctrTrend: number,
    frequencySaturation: number,
    decayRate: number
  ): number {
    // Weight factors
    const trendWeight = 0.5
    const frequencyWeight = 0.2
    const decayWeight = 0.3

    // Normalize trend (more negative = higher fatigue)
    // Strong negative trends should result in high fatigue scores
    const trendScore = Math.max(0, Math.min(100, -ctrTrend * 30))

    // Normalize decay rate (typical decay rates are 5-20% per day)
    const decayScore = Math.min(100, decayRate * 5)

    // Calculate weighted score
    const score =
      trendScore * trendWeight + frequencySaturation * frequencyWeight + decayScore * decayWeight

    return Math.min(100, Math.max(0, score))
  }

  private getRecommendedAction(
    fatigueScore: number,
    frequencySaturation: number
  ): RecommendedAction {
    if (fatigueScore < this.FATIGUE_THRESHOLD_LOW) {
      return 'continue'
    } else if (fatigueScore < this.FATIGUE_THRESHOLD_MEDIUM) {
      return 'refresh'
    } else if (fatigueScore < this.FATIGUE_THRESHOLD_HIGH) {
      // High frequency with moderate fatigue = pause
      // Otherwise refresh
      return frequencySaturation > 60 ? 'pause' : 'refresh'
    } else {
      // For very high frequency saturation, always recommend refresh first
      if (frequencySaturation > 80) {
        return 'refresh'
      }
      return 'replace'
    }
  }

  private predictEndOfLife(
    data: CreativePerformanceData[],
    decayRate: number
  ): { predictedEndOfLife?: string; daysUntilEndOfLife?: number } {
    if (data.length < 3 || decayRate <= 0) {
      return {}
    }

    const currentCTR = data[data.length - 1].ctr
    const lastDate = new Date(data[data.length - 1].date)

    // Predict when CTR will hit threshold
    if (currentCTR <= this.CTR_THRESHOLD) {
      return { predictedEndOfLife: lastDate.toISOString().split('T')[0], daysUntilEndOfLife: 0 }
    }

    const daysUntilThreshold = (((currentCTR - this.CTR_THRESHOLD) / currentCTR) * 100) / decayRate
    const predictedDate = new Date(lastDate)
    predictedDate.setDate(predictedDate.getDate() + Math.ceil(daysUntilThreshold))

    return {
      predictedEndOfLife: predictedDate.toISOString().split('T')[0],
      daysUntilEndOfLife: Math.ceil(daysUntilThreshold),
    }
  }

  // メタデータから performance data への変換ヘルパー
  static convertMetaInsightsToPerformanceData(
    insights: Array<{
      date_start?: string
      dateStart?: string
      ctr?: number
      frequency?: number
      impressions?: number
      clicks?: number
      spend?: number
    }>
  ): CreativePerformanceData[] {
    return insights
      .filter((insight) => {
        const date = insight.date_start || insight.dateStart
        return date && insight.ctr !== undefined && insight.impressions
      })
      .map((insight) => ({
        date: insight.date_start || insight.dateStart || '',
        ctr: Number(insight.ctr) || 0,
        frequency: Number(insight.frequency) || 1,
        impressions: Number(insight.impressions) || 0,
        clicks: Number(insight.clicks) || 0,
        spend: Number(insight.spend) || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
}
