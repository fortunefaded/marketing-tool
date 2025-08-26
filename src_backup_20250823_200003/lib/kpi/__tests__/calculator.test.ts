import { describe, it, expect } from 'vitest'
import {
  calculateROAS,
  calculateCPA,
  calculateCTR,
  calculateCVR,
  calculateCPM,
  calculateKPIs,
  aggregateKPIs,
} from '../calculator'

describe('KPI Calculator', () => {
  describe('calculateROAS', () => {
    it('should calculate ROAS correctly', () => {
      expect(calculateROAS(10000, 2000)).toBe(5.0)
      expect(calculateROAS(5000, 1000)).toBe(5.0)
      expect(calculateROAS(15000, 3000)).toBe(5.0)
    })

    it('should handle zero spend', () => {
      expect(calculateROAS(10000, 0)).toBe(0)
    })

    it('should handle zero revenue', () => {
      expect(calculateROAS(0, 1000)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateROAS(10000, 3000)).toBe(3.33)
      expect(calculateROAS(7500, 2000)).toBe(3.75)
    })
  })

  describe('calculateCPA', () => {
    it('should calculate CPA correctly', () => {
      expect(calculateCPA(1000, 50)).toBe(20)
      expect(calculateCPA(5000, 100)).toBe(50)
      expect(calculateCPA(2500, 25)).toBe(100)
    })

    it('should handle zero conversions', () => {
      expect(calculateCPA(1000, 0)).toBe(0)
    })

    it('should handle zero spend', () => {
      expect(calculateCPA(0, 50)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateCPA(1000, 33)).toBe(30.3)
      expect(calculateCPA(2500, 77)).toBe(32.47)
    })
  })

  describe('calculateCTR', () => {
    it('should calculate CTR as percentage', () => {
      expect(calculateCTR(500, 10000)).toBe(5.0)
      expect(calculateCTR(1000, 50000)).toBe(2.0)
      expect(calculateCTR(250, 25000)).toBe(1.0)
    })

    it('should handle zero impressions', () => {
      expect(calculateCTR(100, 0)).toBe(0)
    })

    it('should handle zero clicks', () => {
      expect(calculateCTR(0, 10000)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateCTR(333, 10000)).toBe(3.33)
      expect(calculateCTR(127, 5000)).toBe(2.54)
    })
  })

  describe('calculateCVR', () => {
    it('should calculate CVR as percentage', () => {
      expect(calculateCVR(50, 500)).toBe(10.0)
      expect(calculateCVR(25, 1000)).toBe(2.5)
      expect(calculateCVR(100, 2000)).toBe(5.0)
    })

    it('should handle zero clicks', () => {
      expect(calculateCVR(10, 0)).toBe(0)
    })

    it('should handle zero conversions', () => {
      expect(calculateCVR(0, 1000)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateCVR(33, 1000)).toBe(3.3)
      expect(calculateCVR(77, 2500)).toBe(3.08)
    })
  })

  describe('calculateCPM', () => {
    it('should calculate CPM correctly', () => {
      expect(calculateCPM(1000, 100000)).toBe(10.0)
      expect(calculateCPM(500, 50000)).toBe(10.0)
      expect(calculateCPM(2500, 500000)).toBe(5.0)
    })

    it('should handle zero impressions', () => {
      expect(calculateCPM(1000, 0)).toBe(0)
    })

    it('should handle zero spend', () => {
      expect(calculateCPM(0, 100000)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateCPM(1000, 333333)).toBe(3.0)
      expect(calculateCPM(2500, 777777)).toBe(3.21)
    })
  })

  describe('calculateKPIs', () => {
    it('should calculate all KPIs from insight data', () => {
      const result = calculateKPIs({
        impressions: 100000,
        clicks: 5000,
        spend: 1000,
        conversions: 100,
        revenue: 10000,
      })

      expect(result).toEqual({
        roas: 10.0,
        cpa: 10.0,
        ctr: 5.0,
        cvr: 2.0,
        cpm: 10.0,
        impressions: 100000,
        clicks: 5000,
        spend: 1000,
        conversions: 100,
        revenue: 10000,
      })
    })

    it('should handle missing revenue', () => {
      const result = calculateKPIs({
        impressions: 50000,
        clicks: 2500,
        spend: 500,
        conversions: 50,
      })

      expect(result).toEqual({
        roas: 0,
        cpa: 10.0,
        ctr: 5.0,
        cvr: 2.0,
        cpm: 10.0,
        impressions: 50000,
        clicks: 2500,
        spend: 500,
        conversions: 50,
        revenue: undefined,
      })
    })

    it('should handle all zero values', () => {
      const result = calculateKPIs({
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
      })

      expect(result).toEqual({
        roas: 0,
        cpa: 0,
        ctr: 0,
        cvr: 0,
        cpm: 0,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: undefined,
      })
    })
  })

  describe('aggregateKPIs', () => {
    it('should aggregate multiple KPI records', () => {
      const records = [
        {
          roas: 5.0,
          cpa: 20.0,
          ctr: 2.0,
          cvr: 5.0,
          cpm: 10.0,
          impressions: 100000,
          clicks: 2000,
          spend: 1000,
          conversions: 50,
          revenue: 5000,
        },
        {
          roas: 4.0,
          cpa: 25.0,
          ctr: 3.0,
          cvr: 4.0,
          cpm: 15.0,
          impressions: 50000,
          clicks: 1500,
          spend: 750,
          conversions: 30,
          revenue: 3000,
        },
        {
          roas: 6.0,
          cpa: 16.67,
          ctr: 2.5,
          cvr: 6.0,
          cpm: 12.5,
          impressions: 80000,
          clicks: 2000,
          spend: 1000,
          conversions: 60,
          revenue: 6000,
        },
      ]

      const result = aggregateKPIs(records)

      expect(result).toEqual({
        roas: 5.09, // 14000 / 2750
        cpa: 19.64, // 2750 / 140
        ctr: 2.39, // 5500 / 230000 * 100
        cvr: 2.55, // 140 / 5500 * 100
        cpm: 11.96, // 2750 / 230000 * 1000
        impressions: 230000,
        clicks: 5500,
        spend: 2750,
        conversions: 140,
        revenue: 14000,
      })
    })

    it('should handle empty array', () => {
      const result = aggregateKPIs([])

      expect(result).toEqual({
        roas: 0,
        cpa: 0,
        ctr: 0,
        cvr: 0,
        cpm: 0,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
      })
    })

    it('should handle records with missing revenue', () => {
      const records = [
        {
          roas: 0,
          cpa: 20.0,
          ctr: 2.0,
          cvr: 5.0,
          cpm: 10.0,
          impressions: 100000,
          clicks: 2000,
          spend: 1000,
          conversions: 50,
          revenue: undefined,
        },
        {
          roas: 4.0,
          cpa: 25.0,
          ctr: 3.0,
          cvr: 4.0,
          cpm: 15.0,
          impressions: 50000,
          clicks: 1500,
          spend: 750,
          conversions: 30,
          revenue: 3000,
        },
      ]

      const result = aggregateKPIs(records)

      // Total revenue is 3000 (undefined treated as 0)
      expect(result.revenue).toBe(3000)
      expect(result.roas).toBe(1.71) // 3000 / 1750
    })
  })
})
