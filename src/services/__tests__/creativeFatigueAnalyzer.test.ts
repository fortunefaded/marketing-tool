import { describe, expect, it, beforeEach } from 'vitest'
import { 
  CreativeFatigueAnalyzer, 
  CreativePerformanceData
} from '../creativeFatigueAnalyzer'

describe('CreativeFatigueAnalyzer', () => {
  let analyzer: CreativeFatigueAnalyzer

  beforeEach(() => {
    analyzer = new CreativeFatigueAnalyzer()
  })

  describe('analyzeFatigue', () => {
    it('should return high fatigue score for declining CTR trend', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.2, impressions: 10000, clicks: 250, spend: 5000 },
        { date: '2024-01-02', ctr: 2.3, frequency: 1.5, impressions: 11000, clicks: 253, spend: 5500 },
        { date: '2024-01-03', ctr: 2.0, frequency: 1.8, impressions: 12000, clicks: 240, spend: 6000 },
        { date: '2024-01-04', ctr: 1.7, frequency: 2.1, impressions: 13000, clicks: 221, spend: 6500 },
        { date: '2024-01-05', ctr: 1.4, frequency: 2.4, impressions: 14000, clicks: 196, spend: 7000 },
        { date: '2024-01-06', ctr: 1.2, frequency: 2.7, impressions: 15000, clicks: 180, spend: 7500 },
        { date: '2024-01-07', ctr: 1.0, frequency: 3.0, impressions: 16000, clicks: 160, spend: 8000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.fatigueScore).toBeGreaterThan(70)
      expect(analysis.recommendedAction).toBe('replace')
    })

    it('should return low fatigue score for stable or improving CTR', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.0, frequency: 1.2, impressions: 10000, clicks: 200, spend: 5000 },
        { date: '2024-01-02', ctr: 2.1, frequency: 1.3, impressions: 11000, clicks: 231, spend: 5500 },
        { date: '2024-01-03', ctr: 2.0, frequency: 1.4, impressions: 12000, clicks: 240, spend: 6000 },
        { date: '2024-01-04', ctr: 2.2, frequency: 1.5, impressions: 13000, clicks: 286, spend: 6500 },
        { date: '2024-01-05', ctr: 2.1, frequency: 1.6, impressions: 14000, clicks: 294, spend: 7000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.fatigueScore).toBeLessThan(30)
      expect(analysis.recommendedAction).toBe('continue')
    })

    it('should handle new creatives with insufficient data', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.0, impressions: 1000, clicks: 25, spend: 500 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.fatigueScore).toBe(0)
      expect(analysis.recommendedAction).toBe('continue')
      expect(analysis.message).toContain('insufficient data')
    })

    it('should detect frequency saturation', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.0, impressions: 10000, clicks: 250, spend: 5000 },
        { date: '2024-01-02', ctr: 2.4, frequency: 2.0, impressions: 11000, clicks: 264, spend: 5500 },
        { date: '2024-01-03', ctr: 2.3, frequency: 3.0, impressions: 12000, clicks: 276, spend: 6000 },
        { date: '2024-01-04', ctr: 2.1, frequency: 4.0, impressions: 13000, clicks: 273, spend: 6500 },
        { date: '2024-01-05', ctr: 1.8, frequency: 5.0, impressions: 14000, clicks: 252, spend: 7000 },
        { date: '2024-01-06', ctr: 1.5, frequency: 6.0, impressions: 15000, clicks: 225, spend: 7500 },
        { date: '2024-01-07', ctr: 1.2, frequency: 7.0, impressions: 16000, clicks: 192, spend: 8000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.frequencySaturation).toBeGreaterThan(80)
      expect(analysis.recommendedAction).toBe('refresh')
    })

    it('should calculate decay rate from peak performance', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 1.5, frequency: 1.0, impressions: 10000, clicks: 150, spend: 5000 },
        { date: '2024-01-02', ctr: 2.0, frequency: 1.2, impressions: 11000, clicks: 220, spend: 5500 },
        { date: '2024-01-03', ctr: 2.5, frequency: 1.4, impressions: 12000, clicks: 300, spend: 6000 }, // Peak
        { date: '2024-01-04', ctr: 2.3, frequency: 1.6, impressions: 13000, clicks: 299, spend: 6500 },
        { date: '2024-01-05', ctr: 2.0, frequency: 1.8, impressions: 14000, clicks: 280, spend: 7000 },
        { date: '2024-01-06', ctr: 1.7, frequency: 2.0, impressions: 15000, clicks: 255, spend: 7500 },
        { date: '2024-01-07', ctr: 1.5, frequency: 2.2, impressions: 16000, clicks: 240, spend: 8000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.decayRate).toBeGreaterThan(0)
      expect(analysis.peakPerformanceDate).toBe('2024-01-03')
      expect(analysis.daysSincePeak).toBe(4)
    })

    it('should predict end of effective life', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.0, impressions: 10000, clicks: 250, spend: 5000 },
        { date: '2024-01-02', ctr: 2.3, frequency: 1.2, impressions: 11000, clicks: 253, spend: 5500 },
        { date: '2024-01-03', ctr: 2.1, frequency: 1.4, impressions: 12000, clicks: 252, spend: 6000 },
        { date: '2024-01-04', ctr: 1.9, frequency: 1.6, impressions: 13000, clicks: 247, spend: 6500 },
        { date: '2024-01-05', ctr: 1.7, frequency: 1.8, impressions: 14000, clicks: 238, spend: 7000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.predictedEndOfLife).toBeDefined()
      expect(analysis.daysUntilEndOfLife).toBeGreaterThan(0)
    })

    it('should handle empty performance data', () => {
      const performanceData: CreativePerformanceData[] = []

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      expect(analysis.fatigueScore).toBe(0)
      expect(analysis.recommendedAction).toBe('continue')
      expect(analysis.message).toContain('No data available')
    })

    it('should recommend pause for moderate fatigue with high frequency', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.0, impressions: 10000, clicks: 250, spend: 5000 },
        { date: '2024-01-02', ctr: 2.45, frequency: 2.0, impressions: 11000, clicks: 270, spend: 5500 },
        { date: '2024-01-03', ctr: 2.4, frequency: 3.0, impressions: 12000, clicks: 288, spend: 6000 },
        { date: '2024-01-04', ctr: 2.35, frequency: 3.5, impressions: 13000, clicks: 306, spend: 6500 },
        { date: '2024-01-05', ctr: 2.3, frequency: 4.0, impressions: 14000, clicks: 322, spend: 7000 }
      ]

      const analysis = analyzer.analyzeFatigue('creative_123', performanceData)

      // For this scenario, we expect moderate fatigue
      expect(analysis.fatigueScore).toBeGreaterThan(30)
      expect(analysis.fatigueScore).toBeLessThan(70)
      expect(analysis.recommendedAction).toBe('pause')
    })
  })

  describe('calculateCTRTrend', () => {
    it('should calculate negative trend for declining CTR', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.5, frequency: 1.0, impressions: 10000, clicks: 250, spend: 5000 },
        { date: '2024-01-02', ctr: 2.0, frequency: 1.2, impressions: 11000, clicks: 220, spend: 5500 },
        { date: '2024-01-03', ctr: 1.5, frequency: 1.4, impressions: 12000, clicks: 180, spend: 6000 }
      ]

      const trend = analyzer['calculateCTRTrend'](performanceData)

      expect(trend).toBeLessThan(0)
    })

    it('should calculate positive trend for improving CTR', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 1.5, frequency: 1.0, impressions: 10000, clicks: 150, spend: 5000 },
        { date: '2024-01-02', ctr: 2.0, frequency: 1.2, impressions: 11000, clicks: 220, spend: 5500 },
        { date: '2024-01-03', ctr: 2.5, frequency: 1.4, impressions: 12000, clicks: 300, spend: 6000 }
      ]

      const trend = analyzer['calculateCTRTrend'](performanceData)

      expect(trend).toBeGreaterThan(0)
    })
  })

  describe('calculateFrequencySaturation', () => {
    it('should return high saturation for high frequency', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.0, frequency: 6.0, impressions: 10000, clicks: 200, spend: 5000 }
      ]

      const saturation = analyzer['calculateFrequencySaturation'](performanceData)

      expect(saturation).toBeGreaterThan(80)
    })

    it('should return low saturation for low frequency', () => {
      const performanceData: CreativePerformanceData[] = [
        { date: '2024-01-01', ctr: 2.0, frequency: 1.5, impressions: 10000, clicks: 200, spend: 5000 }
      ]

      const saturation = analyzer['calculateFrequencySaturation'](performanceData)

      expect(saturation).toBeLessThan(30)
    })
  })

  describe('getRecommendedAction', () => {
    it('should recommend continue for low fatigue', () => {
      const action = analyzer['getRecommendedAction'](20, 30)
      expect(action).toBe('continue')
    })

    it('should recommend refresh for moderate fatigue', () => {
      const action = analyzer['getRecommendedAction'](50, 40)
      expect(action).toBe('refresh')
    })

    it('should recommend pause for moderate fatigue with high frequency', () => {
      const action = analyzer['getRecommendedAction'](50, 70)
      expect(action).toBe('pause')
    })

    it('should recommend replace for high fatigue', () => {
      const action = analyzer['getRecommendedAction'](80, 60)
      expect(action).toBe('replace')
    })
  })
})