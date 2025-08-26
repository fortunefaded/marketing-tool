import { describe, it, expect } from 'vitest'
import type { MetaCampaign, MetaCreative, MetaInsight, MetaCreativeInsight } from '../types'
import {
  transformCampaignToConvex,
  transformCreativeToConvex,
  transformInsightToConvex,
  transformCreativeInsightToConvex,
} from '../transform'

describe('Meta API Data Transformation', () => {
  describe('transformCampaignToConvex', () => {
    it('should transform MetaCampaign to Convex schema', () => {
      const metaCampaign: MetaCampaign = {
        id: '123456789',
        account_id: 'act_123456789',
        name: 'Summer Sale Campaign',
        objective: 'CONVERSIONS',
        status: 'ACTIVE',
        daily_budget: 10000,
        lifetime_budget: 100000,
        start_time: '2024-01-01T00:00:00+0000',
        stop_time: '2024-12-31T23:59:59+0000',
        insights: { data: [] },
      }

      const result = transformCampaignToConvex(metaCampaign)

      expect(result).toEqual({
        metaId: '123456789',
        accountId: 'act_123456789',
        name: 'Summer Sale Campaign',
        objective: 'CONVERSIONS',
        status: 'ACTIVE',
        dailyBudget: 10000,
        lifetimeBudget: 100000,
        startTime: '2024-01-01T00:00:00+0000',
        stopTime: '2024-12-31T23:59:59+0000',
        lastSyncedAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })

      // Ensure dates are valid ISO strings
      expect(new Date(result.lastSyncedAt).toISOString()).toBe(result.lastSyncedAt)
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
      expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt)
    })

    it('should handle optional fields', () => {
      const metaCampaign: MetaCampaign = {
        id: '123456789',
        account_id: 'act_123456789',
        name: 'Basic Campaign',
        objective: 'TRAFFIC',
        status: 'PAUSED',
        daily_budget: 5000,
        start_time: '2024-01-01T00:00:00+0000',
        insights: { data: [] },
      }

      const result = transformCampaignToConvex(metaCampaign)

      expect(result.lifetimeBudget).toBeUndefined()
      expect(result.stopTime).toBeUndefined()
    })
  })

  describe('transformCreativeToConvex', () => {
    it('should transform MetaCreative to Convex schema', () => {
      const metaCreative: MetaCreative = {
        id: 'creative_123',
        name: 'Summer Banner',
        campaign_id: 'campaign_123',
        adset_id: 'adset_123',
        creative_type: 'IMAGE',
        thumbnail_url: 'https://example.com/thumb.jpg',
        body: 'Check out our sale!',
        title: 'Summer Sale',
        call_to_action_type: 'SHOP_NOW',
        insights: { data: [] },
      }

      const result = transformCreativeToConvex(metaCreative)

      expect(result).toEqual({
        metaId: 'creative_123',
        name: 'Summer Banner',
        campaignId: 'campaign_123',
        adsetId: 'adset_123',
        creativeType: 'IMAGE',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        body: 'Check out our sale!',
        title: 'Summer Sale',
        callToActionType: 'SHOP_NOW',
        lastSyncedAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('should handle video creative type', () => {
      const metaCreative: MetaCreative = {
        id: 'creative_456',
        name: 'Product Video',
        campaign_id: 'campaign_123',
        adset_id: 'adset_456',
        creative_type: 'VIDEO',
        video_url: 'https://example.com/video.mp4',
        thumbnail_url: 'https://example.com/video-thumb.jpg',
        insights: { data: [] },
      }

      const result = transformCreativeToConvex(metaCreative)

      expect(result.creativeType).toBe('VIDEO')
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
      expect(result.thumbnailUrl).toBe('https://example.com/video-thumb.jpg')
    })
  })

  describe('transformInsightToConvex', () => {
    it('should transform MetaInsight to Convex schema with campaign ID', () => {
      const metaInsight: MetaInsight = {
        impressions: '10000',
        clicks: '500',
        spend: '1000.50',
        conversions: '50',
        revenue: '5000.00',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      const result = transformInsightToConvex(metaInsight, 'campaign_123')

      expect(result).toEqual({
        campaignId: 'campaign_123',
        impressions: 10000,
        clicks: 500,
        spend: 1000.5,
        conversions: 50,
        revenue: 5000.0,
        dateStart: '2024-01-01',
        dateStop: '2024-01-01',
        createdAt: expect.any(String),
      })
    })

    it('should handle missing revenue field', () => {
      const metaInsight: MetaInsight = {
        impressions: '5000',
        clicks: '250',
        spend: '500.00',
        conversions: '25',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      const result = transformInsightToConvex(metaInsight, 'campaign_123')

      expect(result.revenue).toBeUndefined()
    })

    it('should parse string numbers correctly', () => {
      const metaInsight: MetaInsight = {
        impressions: '1234567',
        clicks: '12345',
        spend: '9876.54',
        conversions: '123',
        revenue: '54321.10',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      const result = transformInsightToConvex(metaInsight, 'campaign_123')

      expect(result.impressions).toBe(1234567)
      expect(result.clicks).toBe(12345)
      expect(result.spend).toBe(9876.54)
      expect(result.conversions).toBe(123)
      expect(result.revenue).toBe(54321.1)
    })
  })

  describe('transformCreativeInsightToConvex', () => {
    it('should transform MetaCreativeInsight to Convex schema', () => {
      const metaCreativeInsight: MetaCreativeInsight = {
        creative_id: 'creative_123',
        impressions: '20000',
        clicks: '1000',
        spend: '2000.00',
        conversions: '100',
        revenue: '10000.00',
        date_start: '2024-01-01',
        date_stop: '2024-01-07',
      }

      const result = transformCreativeInsightToConvex(metaCreativeInsight)

      expect(result).toEqual({
        creativeId: 'creative_123',
        impressions: 20000,
        clicks: 1000,
        spend: 2000.0,
        conversions: 100,
        revenue: 10000.0,
        dateStart: '2024-01-01',
        dateStop: '2024-01-07',
        createdAt: expect.any(String),
      })
    })

    it('should handle creative insight without revenue', () => {
      const metaCreativeInsight: MetaCreativeInsight = {
        creative_id: 'creative_456',
        impressions: '1000',
        clicks: '50',
        spend: '100.00',
        conversions: '5',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      const result = transformCreativeInsightToConvex(metaCreativeInsight)

      expect(result.creativeId).toBe('creative_456')
      expect(result.revenue).toBeUndefined()
    })
  })
})
