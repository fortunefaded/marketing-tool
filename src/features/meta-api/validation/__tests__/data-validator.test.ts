import { describe, it, expect, beforeEach } from 'vitest'
import { DataValidator } from '../data-validator'
import type {
  NumericNormalizationConfig,
  TimeRangeConfig,
  AttributionConfig,
  AdInsight,
  ValidationResult
} from '../types/data-validation'

describe('DataValidator', () => {
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

  describe('normalizeNumericValues', () => {
    it('TC-001: should normalize comma-separated string numbers', () => {
      const result = validator.normalizeNumericValues('1,234.56')
      expect(result).toBe(1234.56)
    })

    it('TC-002: should handle undefined/null values', () => {
      expect(validator.normalizeNumericValues(undefined)).toBe(0)
      expect(validator.normalizeNumericValues(null)).toBe(0)
    })

    it('TC-003: should return numbers as-is', () => {
      const result = validator.normalizeNumericValues(123.45)
      expect(result).toBe(123.45)
    })

    it('TC-004: should round with specified precision', () => {
      const result = validator.normalizeNumericValues(123.456789, 2)
      expect(result).toBe(123.46)
    })

    it('TC-005: should return NaN for invalid strings', () => {
      const result = validator.normalizeNumericValues('abc')
      expect(result).toBeNaN()
    })
  })

  describe('validateMetrics', () => {
    it('TC-006: should validate valid data', () => {
      const data: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        impressions: '1000',
        clicks: '50',
        spend: '100.50',
        ctr: '5.0'
      }

      const result = validator.validateMetrics(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('TC-007: should detect missing required fields', () => {
      const data: AdInsight = {
        ad_name: 'Test Ad',
        impressions: '1000'
      }

      const result = validator.validateMetrics(data)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'ad_id',
          message: expect.stringContaining('missing')
        })
      )
    })

    it('TC-008: should warn about CTR exceeding 100%', () => {
      const data: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        ctr: '150.0'
      }

      const result = validator.validateMetrics(data)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'ctr',
          message: expect.stringContaining('exceeds 100%')
        })
      )
    })

    it('TC-009: should warn about high frequency', () => {
      const data: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        frequency: '4.0'  // Changed from 75 to 4.0 (above 3.5 threshold)
      }

      const result = validator.validateMetrics(data)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'frequency',
          message: expect.stringContaining('High frequency')
        })
      )
    })
  })

  describe('applyCurrencyConversion', () => {
    it('TC-010: should not convert same currency', () => {
      const result = validator.applyCurrencyConversion(1000, 'JPY')
      expect(result).toBe(1000)
    })

    it('TC-011: should convert different currencies', () => {
      const result = validator.applyCurrencyConversion(100, 'USD')
      expect(result).toBe(15000)
    })

    it('TC-012: should return original amount for undefined currency', () => {
      const result = validator.applyCurrencyConversion(100, 'GBP')
      expect(result).toBe(100)
    })
  })

  describe('normalizePercentage', () => {
    it('TC-013: should convert decimal to percentage format', () => {
      const result = validator.normalizePercentage(0.05)
      expect(result).toBe(5)
    })

    it('TC-014: should convert percentage to decimal format', () => {
      // Create validator with percentage input format
      const percentageValidator = new DataValidator(
        {
          ...normalizationConfig,
          percentageHandling: {
            apiFormat: 'percentage',
            displayFormat: 'decimal'
          }
        },
        timeRangeConfig,
        attributionConfig
      )
      
      const result = percentageValidator.normalizePercentage(5)
      expect(result).toBe(0.05)
    })

    it('TC-015: should not convert when formats are the same', () => {
      const percentageValidator = new DataValidator(
        {
          ...normalizationConfig,
          percentageHandling: {
            apiFormat: 'percentage',
            displayFormat: 'percentage'
          }
        },
        timeRangeConfig,
        attributionConfig
      )
      
      const result = percentageValidator.normalizePercentage(5)
      expect(result).toBe(5)
    })
  })

  describe('normalizeDateWithTimezone', () => {
    it('TC-016: should apply timezone offset', () => {
      const result = validator.normalizeDateWithTimezone('2024-08-01T00:00:00Z')
      // UTC time: 2024-08-01T00:00:00Z
      // With +540 minutes (9 hours) offset: 2024-08-01T09:00:00
      const utcDate = new Date('2024-08-01T00:00:00Z')
      const expectedTime = utcDate.getTime() + (540 * 60 * 1000) // Add 540 minutes
      expect(result.getTime()).toBe(expectedTime)
    })

    it('TC-017: should parse ISO 8601 format', () => {
      const result = validator.normalizeDateWithTimezone('2024-08-01T12:34:56Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.toString()).not.toBe('Invalid Date')
    })

    it('TC-018: should handle invalid date strings', () => {
      const result = validator.normalizeDateWithTimezone('invalid-date')
      expect(result.toString()).toBe('Invalid Date')
    })
  })

  describe('Edge Cases', () => {
    describe('E-001: Boundary value tests', () => {
      it('should handle CTR boundary values', () => {
        const testCases = [
          { ctr: '0', expectedWarning: false },
          { ctr: '100', expectedWarning: false },
          { ctr: '100.01', expectedWarning: true }
        ]

        testCases.forEach(({ ctr, expectedWarning }) => {
          const data: AdInsight = {
            ad_id: '123',
            ad_name: 'Test Ad',
            ctr
          }

          const result = validator.validateMetrics(data)
          if (expectedWarning) {
            expect(result.warnings).toContainEqual(
              expect.objectContaining({
                field: 'ctr'
              })
            )
          } else {
            expect(result.warnings.filter(w => w.field === 'ctr')).toHaveLength(0)
          }
        })
      })

      it('should handle Frequency boundary values', () => {
        const testCases = [
          { frequency: '0', expectedWarning: false },
          { frequency: '3.5', expectedWarning: false },
          { frequency: '3.6', expectedWarning: true }
        ]

        testCases.forEach(({ frequency, expectedWarning }) => {
          const data: AdInsight = {
            ad_id: '123',
            ad_name: 'Test Ad',
            frequency
          }

          const result = validator.validateMetrics(data)
          if (expectedWarning) {
            expect(result.warnings).toContainEqual(
              expect.objectContaining({
                field: 'frequency'
              })
            )
          } else {
            expect(result.warnings.filter(w => w.field === 'frequency')).toHaveLength(0)
          }
        })
      })

      it('should handle empty strings', () => {
        expect(validator.normalizeNumericValues('')).toBe(0)
      })

      it('should handle extreme values', () => {
        expect(validator.normalizeNumericValues('999999999999')).toBe(999999999999)
        expect(validator.normalizeNumericValues('0.000000001')).toBeCloseTo(0.000000001)
      })
    })

    describe('E-002: Mixed types', () => {
      it('should handle mixed string and number data', () => {
        const data: AdInsight = {
          ad_id: '123',
          ad_name: 'Test Ad',
          impressions: 1000 as any, // number instead of string
          clicks: '50',
          spend: 100.50 as any // number instead of string
        }

        const result = validator.validateMetrics(data)
        expect(result.isValid).toBe(true)
      })

      it('should handle invalid field types', () => {
        const data: AdInsight = {
          ad_id: 123 as any, // number instead of string
          ad_name: 'Test Ad'
        }

        const result = validator.validateMetrics(data)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'ad_id',
            message: expect.stringContaining('type')
          })
        )
      })
    })

    describe('E-003: Performance', () => {
      it('should process 1000 records within reasonable time', () => {
        const startTime = performance.now()
        
        const records: AdInsight[] = Array.from({ length: 1000 }, (_, i) => ({
          ad_id: `ad_${i}`,
          ad_name: `Test Ad ${i}`,
          impressions: '1000',
          clicks: '50',
          spend: '100.50',
          ctr: '5.0',
          frequency: '2.5'
        }))

        records.forEach(record => validator.validateMetrics(record))
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Should process 1000 records in less than 1 second
        expect(duration).toBeLessThan(1000)
      })

      it('should not cause memory leaks with large datasets', () => {
        // This is a simplified test - in production, use proper memory profiling
        const initialMemory = process.memoryUsage().heapUsed
        
        // Process large dataset
        for (let i = 0; i < 10000; i++) {
          const data: AdInsight = {
            ad_id: `ad_${i}`,
            ad_name: `Test Ad ${i}`,
            impressions: '1000000',
            clicks: '50000',
            spend: '10000.50'
          }
          validator.validateMetrics(data)
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
        
        const finalMemory = process.memoryUsage().heapUsed
        const memoryIncrease = finalMemory - initialMemory
        
        // Memory increase should be reasonable (less than 50MB for 10k records)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      })
    })
  })
})