// Meta API Pagination - TDD Tests (Fixed Version)
// Simplified test suite focusing on core functionality

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { RateLimitManager } from '../rate-limit-manager'
import { analyzeDeliveryPattern } from '../delivery-analyzer'
import type { MetaAdInsight } from '../../types'

describe('Meta API Pagination - Core Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RateLimitManager', () => {
    test('should track API calls within time window', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(5, 60000) // 5 calls per minute

      // Act
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordCall()
      }

      // Assert
      expect(rateLimiter.getRemainingCalls()).toBe(2)
      expect(rateLimiter.canMakeCall()).toBe(true)
    })

    test('should prevent calls when limit reached', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(2, 60000)

      // Act
      rateLimiter.recordCall()
      rateLimiter.recordCall()

      // Assert
      expect(rateLimiter.canMakeCall()).toBe(false)
      expect(rateLimiter.getWaitTime()).toBeGreaterThan(0)
    })

    test('should reset calls after time window', () => {
      // Arrange
      const rateLimiter = new RateLimitManager(2, 1000) // 2 calls per second
      
      // Act
      rateLimiter.recordCall()
      rateLimiter.recordCall()
      
      // Wait for time window to pass (simulate)
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 1100)
      
      // Assert
      expect(rateLimiter.canMakeCall()).toBe(true)
      expect(rateLimiter.getRemainingCalls()).toBe(2)
      
      vi.restoreAllMocks()
    })
  })

  describe('Delivery Analysis', () => {
    test('should analyze continuous delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = [
        { ad_id: '001', date_start: '2024-01-01', impressions: '1000' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-02', impressions: '800' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-03', impressions: '600' } as MetaAdInsight
      ]

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-03'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(3)
      expect(analysis.actualDeliveryDays).toBe(3)
      expect(analysis.deliveryRatio).toBeCloseTo(1.0)
      expect(analysis.deliveryPattern).toBe('continuous')
      expect(analysis.firstDeliveryDate).toBe('2024-01-01')
      expect(analysis.lastDeliveryDate).toBe('2024-01-03')
    })

    test('should analyze intermittent delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = [
        { ad_id: '001', date_start: '2024-01-01', impressions: '1000' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-03', impressions: '800' } as MetaAdInsight,
        { ad_id: '001', date_start: '2024-01-05', impressions: '600' } as MetaAdInsight
      ]

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(3)
      expect(analysis.deliveryRatio).toBeCloseTo(0.1)
      expect(analysis.deliveryPattern).toBe('intermittent')
      expect(analysis.firstDeliveryDate).toBe('2024-01-01')
      expect(analysis.lastDeliveryDate).toBe('2024-01-05')
    })

    test('should analyze no delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = []

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(0)
      expect(analysis.deliveryRatio).toBe(0)
      expect(analysis.deliveryPattern).toBe('none')
      expect(analysis.firstDeliveryDate).toBeUndefined()
      expect(analysis.lastDeliveryDate).toBeUndefined()
    })

    test('should analyze single day delivery pattern', () => {
      // Arrange
      const testData: MetaAdInsight[] = [
        { ad_id: '001', date_start: '2024-01-15', impressions: '1000' } as MetaAdInsight
      ]

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(1)
      expect(analysis.deliveryRatio).toBeCloseTo(0.033)
      expect(analysis.deliveryPattern).toBe('single')
      expect(analysis.firstDeliveryDate).toBe('2024-01-15')
      expect(analysis.lastDeliveryDate).toBe('2024-01-15')
    })

    test('should analyze partial delivery pattern', () => {
      // Arrange - 25 out of 30 days (83% = partial)
      const testData: MetaAdInsight[] = []
      for (let i = 1; i <= 25; i++) {
        const date = `2024-01-${i.toString().padStart(2, '0')}`
        testData.push({
          ad_id: '001',
          date_start: date,
          impressions: '1000'
        } as MetaAdInsight)
      }

      // Act
      const analysis = analyzeDeliveryPattern(testData, {
        start: '2024-01-01',
        end: '2024-01-30'
      })

      // Assert
      expect(analysis.totalRequestedDays).toBe(30)
      expect(analysis.actualDeliveryDays).toBe(25)
      expect(analysis.deliveryRatio).toBeCloseTo(0.833, 2)
      expect(analysis.deliveryPattern).toBe('partial')
    })
  })
})