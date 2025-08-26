import { 
  BaselineMetrics, 
  // BaselineCalculationRequest, // Unused
  ValidationResult,
  MetaAdInsights,
  AdType,
  Platform,
  CalculationConfidence 
} from './types'
import { logger } from '../../../modules/shared/utils/logger'

export class BaselineCalculationService {
  constructor(
    private metaApiService: any,
    private convexClient: any
  ) {}

  async calculateBaseline(adId: string, accountId: string): Promise<BaselineMetrics> {
    // Input validation
    this.validateInputParameters(adId, accountId)

    try {
      // Fetch 30-day historical data
      const historicalData = await this.fetchHistoricalData(adId, accountId)
      
      // Validate data sufficiency
      const validation = await this.validateDataSufficiency(historicalData)
      
      // If data is insufficient, use industry fallback
      if (!validation.isValid || validation.confidence < 0.7) {
        logger.info(`Using industry fallback for ad ${adId} due to insufficient data`)
        return await this.createIndustryFallbackBaseline(historicalData[0])
      }
      
      // Calculate baseline from historical data
      return this.calculateFromHistoricalData(historicalData, validation)
      
    } catch (error) {
      logger.error(`Baseline calculation failed for ad ${adId}:`, error)
      throw error
    }
  }

  async validateDataSufficiency(metrics: MetaAdInsights[]): Promise<ValidationResult> {
    if (!metrics || metrics.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        issues: [{ 
          field: 'data', 
          issue: 'No data available', 
          severity: 'error', 
          value: 0 
        }],
        appliedActions: []
      }
    }

    // Check minimum data threshold (7 days)
    const validDays = metrics.filter(m => m.impressions > 0).length
    const dataCompleteness = validDays / 30 // Expecting 30 days
    
    // Calculate base confidence based on data completeness
    let confidence = Math.min(1.0, dataCompleteness * 1.5) // Give bonus for good completeness
    
    // Reduce confidence for anomalous data
    const anomalousCount = this.detectAnomalousData(metrics)
    const anomalyRatio = anomalousCount / metrics.length
    
    // Strong penalty for anomalous data
    if (anomalyRatio > 0.2) { // More than 20% anomalous
      confidence *= 0.3 // Severe reduction
    } else {
      confidence *= (1 - anomalyRatio * 0.7) // Reduce confidence by anomaly ratio
    }
    
    // Check for delivery pauses
    const pauseAdjustment = this.detectDeliveryPauses(metrics)
    confidence *= pauseAdjustment.confidenceMultiplier
    
    // Additional data quality checks
    const dataVariability = this.calculateDataVariability(metrics)
    confidence *= dataVariability
    
    const issues = []
    if (anomalousCount > 0) {
      issues.push({
        field: 'metrics',
        issue: `${anomalousCount} anomalous data points detected`,
        severity: 'warning' as const,
        value: anomalousCount
      })
    }
    
    return {
      isValid: validDays >= 7 && confidence >= 0.3,
      confidence: Math.max(0, Math.min(1, confidence)),
      issues,
      appliedActions: []
    }
  }

  async applyIndustryFallback(adType: AdType, platform: Platform): Promise<BaselineMetrics> {
    const industryAverages = this.getIndustryAverages(adType, platform)
    
    return {
      ctr: industryAverages.ctr,
      uniqueCtr: industryAverages.ctr * 0.7, // Approximation
      inlineLinkClickCtr: industryAverages.ctr * 0.85,
      cpm: industryAverages.cpm,
      frequency: industryAverages.frequency,
      engagementRate: industryAverages.engagementRate,
      calculationPeriod: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        daysIncluded: 0
      },
      dataQuality: 0.5, // Industry average quality
      isIndustryAverage: true,
      confidence: 0.6, // Lower confidence for industry averages
      calculatedAt: new Date().toISOString(),
      version: '1.0'
    }
  }

  async storeBaseline(baseline: BaselineMetrics): Promise<void> {
    try {
      await this.convexClient.mutation('baseline:store', { baseline })
    } catch (error) {
      logger.error('Failed to store baseline:', error)
      throw new Error('DATABASE_CONNECTION_ERROR')
    }
  }

  private validateInputParameters(adId: string, accountId: string): void {
    if (!adId || typeof adId !== 'string' || adId.trim() === '') {
      throw new Error('INVALID_PARAMETERS: adId is required')
    }
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('INVALID_PARAMETERS: accountId is required')
    }
  }

  private async fetchHistoricalData(adId: string, accountId: string): Promise<MetaAdInsights[]> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    
    try {
      const data = await this.metaApiService.getAdInsights({
        adId,
        accountId,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      })
      
      return data || []
    } catch (error) {
      if (error.message === 'REQUEST_TIMEOUT') {
        throw new Error('REQUEST_TIMEOUT')
      }
      throw error
    }
  }

  private async createIndustryFallbackBaseline(sampleData?: MetaAdInsights): Promise<BaselineMetrics> {
    const adType = sampleData?.adType || 'video'
    const platform = sampleData?.platform?.[0] || 'facebook'
    
    return this.applyIndustryFallback(adType, platform)
  }

  private calculateFromHistoricalData(
    data: MetaAdInsights[], 
    validation: ValidationResult
  ): BaselineMetrics {
    // Filter out paused days (zero impressions)
    const activeData = data.filter(d => d.impressions > 0)
    
    // Handle delivery pauses and budget changes
    const pauseInfo = this.detectDeliveryPauses(data)
    const budgetChanges = this.detectBudgetChanges(data)
    
    let adjustedData = activeData
    let adjustedConfidence = validation.confidence
    
    // Adjust confidence based on pauses and budget changes
    if (pauseInfo.pauseDays > 0) {
      adjustedConfidence *= pauseInfo.confidenceMultiplier
    }
    
    if (budgetChanges.hasSignificantChange) {
      adjustedConfidence *= 0.7 // Reduce confidence for budget changes
    }
    
    // Calculate averages
    const avgCtr = this.calculateAverage(adjustedData.map(d => d.ctr))
    const avgUniqueCtr = this.calculateAverage(adjustedData.map(d => d.uniqueCtr))
    const avgInlineLinkClickCtr = this.calculateAverage(adjustedData.map(d => d.inlineLinkClickCtr))
    const avgCpm = this.calculateAverage(adjustedData.map(d => d.cpm))
    const avgFrequency = this.calculateAverage(adjustedData.map(d => d.frequency))
    
    // Calculate data quality based on consistency
    const dataQuality = this.calculateDataQuality(adjustedData, { 
      ...validation, 
      confidence: adjustedConfidence 
    })
    
    return {
      ctr: avgCtr,
      uniqueCtr: avgUniqueCtr,
      inlineLinkClickCtr: avgInlineLinkClickCtr,
      cpm: avgCpm,
      frequency: avgFrequency,
      calculationPeriod: {
        start: data[data.length - 1]?.dateStart || '',
        end: data[0]?.dateStart || '',
        daysIncluded: activeData.length
      },
      dataQuality,
      isIndustryAverage: false,
      confidence: adjustedConfidence,
      calculatedAt: new Date().toISOString(),
      version: '1.0'
    }
  }

  private detectAnomalousData(data: MetaAdInsights[]): number {
    let anomalousCount = 0
    
    for (const item of data) {
      // Check for extremely high/low values
      if (item.ctr > 10 || item.ctr < 0.01) anomalousCount++
      if (item.cpm > 5000 || item.cpm < 1) anomalousCount++
      if (item.frequency > 15 || item.frequency < 0.1) anomalousCount++
    }
    
    return anomalousCount
  }

  private detectDeliveryPauses(data: MetaAdInsights[]): {
    pauseDays: number
    confidenceMultiplier: number
  } {
    const pauseDays = data.filter(d => d.impressions === 0).length
    const pauseRatio = pauseDays / data.length
    
    return {
      pauseDays,
      confidenceMultiplier: 1 - (pauseRatio * 0.3) // Reduce confidence by pause ratio
    }
  }
  
  private detectBudgetChanges(data: MetaAdInsights[]): {
    hasSignificantChange: boolean
    changePoint?: string
  } {
    if (data.length < 10) return { hasSignificantChange: false }
    
    // Compare first and second half average spend
    const midpoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, midpoint)
    const secondHalf = data.slice(midpoint)
    
    const avgSpendFirst = this.calculateAverage(firstHalf.map(d => d.adSpend))
    const avgSpendSecond = this.calculateAverage(secondHalf.map(d => d.adSpend))
    
    // Check if there's a significant change (50%+)
    const changeRatio = Math.abs(avgSpendSecond - avgSpendFirst) / avgSpendFirst
    const hasSignificantChange = changeRatio > 0.5
    
    return {
      hasSignificantChange,
      changePoint: hasSignificantChange ? data[midpoint]?.dateStart : undefined
    }
  }

  private adjustForDeliveryPauses(
    data: MetaAdInsights[], 
    _pauseInfo: { pauseDays: number }
  ): MetaAdInsights[] {
    // For now, just return the data as-is
    // In a more sophisticated implementation, we might weight recent data more heavily
    return data
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    const validValues = values.filter(v => !isNaN(v) && isFinite(v))
    if (validValues.length === 0) return 0
    
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length
  }

  private calculateDataQuality(
    data: MetaAdInsights[], 
    validation: ValidationResult
  ): CalculationConfidence {
    // Base quality on data completeness and consistency
    let quality = validation.confidence
    
    // Adjust for data variability (lower variability = higher quality)
    const ctrValues = data.map(d => d.ctr)
    const ctrStdDev = this.calculateStandardDeviation(ctrValues)
    const ctrMean = this.calculateAverage(ctrValues)
    const ctrCoeffVariation = ctrStdDev / ctrMean
    
    // Lower coefficient of variation indicates more stable data
    quality *= Math.max(0.5, 1 - ctrCoeffVariation)
    
    return Math.max(0, Math.min(1, quality))
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateAverage(values)
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const avgSquaredDiff = this.calculateAverage(squaredDiffs)
    return Math.sqrt(avgSquaredDiff)
  }

  private calculateDataVariability(data: MetaAdInsights[]): number {
    if (data.length < 2) return 0.5
    
    const ctrValues = data.filter(d => d.impressions > 0).map(d => d.ctr)
    const cpmValues = data.filter(d => d.impressions > 0).map(d => d.cpm)
    
    if (ctrValues.length === 0) return 0.3
    
    // Calculate coefficient of variation for CTR and CPM
    const ctrMean = this.calculateAverage(ctrValues)
    const ctrStdDev = this.calculateStandardDeviation(ctrValues)
    const ctrCoeffVar = ctrMean > 0 ? ctrStdDev / ctrMean : 1
    
    const cpmMean = this.calculateAverage(cpmValues)
    const cpmStdDev = this.calculateStandardDeviation(cpmValues)
    const cpmCoeffVar = cpmMean > 0 ? cpmStdDev / cpmMean : 1
    
    // Lower coefficient of variation = higher quality
    // Scale factor to convert to 0-1 range where 1 = most stable
    const avgCoeffVar = (ctrCoeffVar + cpmCoeffVar) / 2
    return Math.max(0.2, Math.min(1.0, 1 - avgCoeffVar))
  }

  private getIndustryAverages(adType: AdType | string, platform: Platform): {
    ctr: number
    cpm: number
    frequency: number
    engagementRate?: number
  } {
    const platformDefaults = {
      facebook: { ctr: 2.0, cpm: 500, frequency: 2.5 },
      instagram: { ctr: 1.2, cpm: 600, frequency: 2.5 },
      audience_network: { ctr: 1.5, cpm: 400, frequency: 2.0 }
    }
    
    const base = platformDefaults[platform] || platformDefaults.facebook
    
    // Adjust for ad type
    const typeMultipliers = {
      video: { ctr: 1.0, cpm: 1.0 },
      image: { ctr: 0.8, cpm: 0.9 },
      carousel: { ctr: 0.9, cpm: 0.95 },
      collection: { ctr: 0.85, cpm: 0.92 },
      reel: { ctr: 1.1, cpm: 1.05 } // Special case for Instagram Reels
    }
    
    const multiplier = typeMultipliers[adType as keyof typeof typeMultipliers] || typeMultipliers.video
    
    const result = {
      ctr: base.ctr * multiplier.ctr,
      cpm: base.cpm * multiplier.cpm,
      frequency: base.frequency
    }
    
    // Add Instagram-specific engagement rates based on ad type
    if (platform === 'instagram') {
      if (adType === 'video' || adType === 'reel') {
        (result as any).engagementRate = 1.23 // Reel baseline
      } else {
        (result as any).engagementRate = 0.7  // Feed baseline
      }
    }
    
    return result
  }
}