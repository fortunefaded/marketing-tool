import { describe, it, expect, beforeEach } from 'vitest'
import { DataValidator } from '../data-validator'
import type {
  NumericNormalizationConfig,
  TimeRangeConfig,
  AttributionConfig,
  AdInsight
} from '../types/data-validation'
import type {
  AdManagerExport,
  ComparisonResult
} from '../types/comparison'

describe('DataValidator Integration Tests', () => {
  let validator: DataValidator
  let normalizationConfig: NumericNormalizationConfig
  let timeRangeConfig: TimeRangeConfig
  let attributionConfig: AttributionConfig

  beforeEach(() => {
    normalizationConfig = {
      currency: {
        accountCurrency: 'JPY',
        displayCurrency: 'JPY',
        exchangeRates: {
          'USD': 150,
          'EUR': 160
        },
        decimalPlaces: 0
      },
      percentageHandling: {
        apiFormat: 'decimal',
        displayFormat: 'percentage'
      },
      rounding: {
        method: 'round',
        precision: 2
      }
    }

    timeRangeConfig = {
      timezone: 'Asia/Tokyo',
      accountTimezone: 'Asia/Tokyo',
      timezoneOffset: 540,
      adjustForDST: false,
      inclusionMode: 'inclusive'
    }

    attributionConfig = {
      clickWindow: '1d_click',
      viewWindow: '1d_view',
      useUnifiedAttribution: true
    }

    validator = new DataValidator(
      normalizationConfig,
      timeRangeConfig,
      attributionConfig
    )
  })

  describe('CSV Comparison Integration', () => {
    it('should detect currency conversion issues', () => {
      const apiData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: '10000', // JPY
        impressions: '1000',
        clicks: '50',
        ctr: '5.0'
      }

      const csvData: AdManagerExport = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: 100, // Looks like USD
        impressions: 1000,
        clicks: 50,
        ctr: 5.0
      }

      const result = validator.compareWithAdManager(apiData, csvData)

      expect(result.matches).toBe(false)
      expect(result.differences).toContainEqual(
        expect.objectContaining({
          field: 'spend',
          apiValue: 10000,
          csvValue: 100
        })
      )
      expect(result.possibleCauses).toContain('Currency conversion mismatch')
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should match data within tolerance', () => {
      const apiData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: '1000',
        impressions: '10000',
        clicks: '100',
        ctr: '1.0'
      }

      const csvData: AdManagerExport = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: 1005, // 0.5% difference - within 1% tolerance
        impressions: 10050, // 0.5% difference - within 1% tolerance
        clicks: 100,
        ctr: 1.0
      }

      const result = validator.compareWithAdManager(apiData, csvData)

      expect(result.matches).toBe(true)
      expect(result.differences).toHaveLength(0)
      expect(result.confidence).toBe(1.0)
    })

    it('should detect timezone differences', () => {
      const apiData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        date_start: '2024-08-01T00:00:00Z',
        spend: '1000',
        impressions: '10000'
      }

      const csvData: AdManagerExport = {
        ad_id: '123',
        ad_name: 'Test Ad',
        date: '2024-07-31', // Different date due to timezone
        spend: 1000,
        impressions: 10000
      }

      const result = validator.compareWithAdManager(apiData, csvData)

      expect(result.possibleCauses).toContain('Timezone difference affecting date boundaries')
    })

    it('should handle missing fields gracefully', () => {
      const apiData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: '1000',
        impressions: '10000'
        // Missing clicks, ctr, etc.
      }

      const csvData: AdManagerExport = {
        ad_id: '123',
        ad_name: 'Test Ad',
        spend: 1000,
        impressions: 10000,
        clicks: 100, // CSV has clicks but API doesn't
        ctr: 1.0
      }

      const result = validator.compareWithAdManager(apiData, csvData)

      expect(result.matches).toBe(true) // Should match on available fields
      expect(result.differences).toHaveLength(0)
    })
  })

  describe('End-to-End Data Processing', () => {
    it('should process and validate August 2024 data format', () => {
      // Simulating data from Meta API for August 2024
      const augustData: AdInsight[] = [
        {
          ad_id: 'ad_001',
          ad_name: 'Summer Campaign - Video 1',
          date_start: '2024-08-01',
          date_stop: '2024-08-01',
          impressions: '15234',
          clicks: '234',
          spend: '5678.90',
          ctr: '1.536',
          cpc: '24.27',
          cpm: '372.84',
          frequency: '2.3',
          reach: '6623',
          account_currency: 'JPY'
        },
        {
          ad_id: 'ad_001',
          ad_name: 'Summer Campaign - Video 1',
          date_start: '2024-08-02',
          date_stop: '2024-08-02',
          impressions: '14567',
          clicks: '198',
          spend: '4890.50',
          ctr: '1.359',
          cpc: '24.70',
          cpm: '335.74',
          frequency: '2.4',
          reach: '6070',
          account_currency: 'JPY'
        }
      ]

      // Process each day's data
      const validationResults = augustData.map(data => {
        const result = validator.validateMetrics(data)
        expect(result.isValid).toBe(true)
        expect(result.normalizedData).toBeDefined()
        
        // Check normalized values
        expect(result.normalizedData!.impressions).toBeTypeOf('number')
        expect(result.normalizedData!.spend).toBeTypeOf('number')
        expect(result.normalizedData!.ctr).toBeTypeOf('number')
        
        return result
      })

      // All should be valid
      expect(validationResults.every(r => r.isValid)).toBe(true)
    })

    it('should detect ad fatigue indicators', () => {
      // Day 1: Normal performance
      const day1: AdInsight = {
        ad_id: 'ad_fatigue_001',
        ad_name: 'Fatigue Test Ad',
        date_start: '2024-08-01',
        impressions: '10000',
        clicks: '200',
        spend: '5000',
        ctr: '2.0',
        cpm: '500',
        frequency: '2.0'
      }

      // Day 30: Showing fatigue
      const day30: AdInsight = {
        ad_id: 'ad_fatigue_001',
        ad_name: 'Fatigue Test Ad',
        date_start: '2024-08-30',
        impressions: '10000',
        clicks: '50',
        spend: '6000',
        ctr: '0.5', // CTR dropped 75%
        cpm: '600', // CPM increased 20%
        frequency: '5.5' // Frequency > 3.5
      }

      const result1 = validator.validateMetrics(day1)
      const result30 = validator.validateMetrics(day30)

      // Day 1 should have no warnings
      expect(result1.warnings).toHaveLength(0)

      // Day 30 should have frequency warning
      expect(result30.warnings).toContainEqual(
        expect.objectContaining({
          field: 'frequency',
          message: expect.stringContaining('High frequency')
        })
      )
    })

    it('should handle currency conversion in multi-account scenario', () => {
      // USD account data
      const usdValidator = new DataValidator(
        {
          ...normalizationConfig,
          currency: {
            accountCurrency: 'USD',
            displayCurrency: 'JPY',
            exchangeRates: { 'USD': 150 },
            decimalPlaces: 0
          }
        },
        timeRangeConfig,
        attributionConfig
      )

      const usdData: AdInsight = {
        ad_id: '123',
        ad_name: 'USD Account Ad',
        spend: '100', // 100 USD
        account_currency: 'USD'
      }

      // Convert to JPY for display
      const convertedSpend = usdValidator.applyCurrencyConversion(100, 'USD')
      expect(convertedSpend).toBe(15000) // 100 USD * 150 = 15000 JPY
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle batch processing efficiently', () => {
      const startTime = performance.now()
      
      // Generate 30 days of data for 100 ads = 3000 records
      const batchData: AdInsight[] = []
      for (let adId = 1; adId <= 100; adId++) {
        for (let day = 1; day <= 30; day++) {
          batchData.push({
            ad_id: `ad_${adId}`,
            ad_name: `Test Ad ${adId}`,
            date_start: `2024-08-${String(day).padStart(2, '0')}`,
            impressions: String(Math.floor(Math.random() * 10000)),
            clicks: String(Math.floor(Math.random() * 500)),
            spend: String((Math.random() * 10000).toFixed(2)),
            ctr: String((Math.random() * 5).toFixed(2)),
            frequency: String((Math.random() * 4).toFixed(1))
          })
        }
      }

      // Process all records
      const results = batchData.map(data => validator.validateMetrics(data))
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should process 3000 records in under 3 seconds
      expect(duration).toBeLessThan(3000)
      expect(results).toHaveLength(3000)
      expect(results.every(r => r.isValid !== undefined)).toBe(true)
    })

    it('should handle malformed data gracefully', () => {
      const malformedData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        impressions: 'not-a-number',
        clicks: null as any,
        spend: undefined,
        ctr: {},
        frequency: []
      } as any

      const result = validator.validateMetrics(malformedData)
      
      // Should still return a result without crashing
      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
      
      // Should normalize invalid values appropriately
      expect(result.normalizedData?.impressions).toBeNaN()
      expect(result.normalizedData?.clicks).toBe(0)
      expect(result.normalizedData?.spend).toBe(0)
    })

    it('should maintain precision for financial calculations', () => {
      const financialData: AdInsight = {
        ad_id: '123',
        ad_name: 'Precision Test',
        spend: '12345.6789',
        cpc: '12.3456789',
        cpm: '123.456789'
      }

      const result = validator.validateMetrics(financialData)
      
      // Check precision handling
      expect(result.normalizedData?.spend).toBeCloseTo(12345.6789, 4)
      expect(result.normalizedData?.cpc).toBeCloseTo(12.3456789, 6)
      expect(result.normalizedData?.cpm).toBeCloseTo(123.456789, 6)
      
      // Rounding with precision
      const rounded = validator.normalizeNumericValues(12345.6789, 2)
      expect(rounded).toBe(12345.68)
    })
  })
})