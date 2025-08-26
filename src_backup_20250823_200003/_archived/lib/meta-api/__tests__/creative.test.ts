import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type { MetaCreative, MetaCreativeInsight } from '../types'
import { MetaApiClient } from '../client'

// MSW server setup
const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Meta Creative Data Model', () => {
  describe('MetaCreative Type', () => {
    it('should have all required fields', () => {
      const creative: MetaCreative = {
        id: 'creative_123',
        name: 'Summer Sale Banner',
        campaign_id: 'campaign_123',
        adset_id: 'adset_123',
        creative_type: 'IMAGE',
        insights: {
          data: [],
        },
      }

      expect(creative.id).toBe('creative_123')
      expect(creative.name).toBe('Summer Sale Banner')
      expect(creative.campaign_id).toBe('campaign_123')
      expect(creative.adset_id).toBe('adset_123')
      expect(creative.creative_type).toBe('IMAGE')
      expect(creative.insights.data).toEqual([])
    })

    it('should accept optional fields', () => {
      const creative: MetaCreative = {
        id: 'creative_123',
        name: 'Product Video Ad',
        campaign_id: 'campaign_123',
        adset_id: 'adset_123',
        creative_type: 'VIDEO',
        thumbnail_url: 'https://example.com/thumb.jpg',
        video_url: 'https://example.com/video.mp4',
        body: 'Check out our amazing products!',
        title: 'Summer Sale - 50% Off',
        call_to_action_type: 'SHOP_NOW',
        insights: {
          data: [],
        },
      }

      expect(creative.thumbnail_url).toBe('https://example.com/thumb.jpg')
      expect(creative.video_url).toBe('https://example.com/video.mp4')
      expect(creative.body).toBe('Check out our amazing products!')
      expect(creative.title).toBe('Summer Sale - 50% Off')
      expect(creative.call_to_action_type).toBe('SHOP_NOW')
    })
  })

  describe('MetaCreativeInsight Type', () => {
    it('should extend MetaInsight with creative_id', () => {
      const insight: MetaCreativeInsight = {
        creative_id: 'creative_123',
        impressions: '5000',
        clicks: '250',
        spend: '500.25',
        conversions: '25',
        revenue: '2500.00',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      expect(insight.creative_id).toBe('creative_123')
      expect(insight.impressions).toBe('5000')
      expect(insight.revenue).toBe('2500.00')
    })
  })

  describe('MetaApiClient - Creative Methods', () => {
    const client = new MetaApiClient({
      accessToken: 'test-token',
      accountId: 'act_123456789',
    })

    it('should fetch creatives by campaign', async () => {
      const mockAdsResponse = [
        {
          id: 'ad_1',
          name: 'Ad 1',
          campaign_id: 'campaign_123',
          adset_id: 'adset_1',
          creative: {
            id: 'creative_1',
            name: 'Image Ad 1',
            object_type: 'IMAGE',
            thumbnail_url: 'https://example.com/img1.jpg',
          },
        },
        {
          id: 'ad_2',
          name: 'Ad 2',
          campaign_id: 'campaign_123',
          adset_id: 'adset_1',
          creative: {
            id: 'creative_2',
            name: 'Video Ad 1',
            object_type: 'VIDEO',
            video_url: 'https://example.com/vid1.mp4',
          },
        },
      ]

      server.use(
        http.get('https://graph.facebook.com/v23.0/campaign_123/ads', () => {
          return HttpResponse.json({ data: mockAdsResponse })
        })
      )

      const creatives = await client.getCreativesByCampaign('campaign_123')
      expect(creatives).toHaveLength(2)
      expect(creatives[0].creative_type).toBe('IMAGE')
      expect(creatives[1].creative_type).toBe('VIDEO')
    })

    it('should fetch creative with insights', async () => {
      const mockCreative = {
        id: 'creative_123',
        name: 'High Performance Ad',
        campaign_id: 'campaign_123',
        adset_id: 'adset_123',
        object_type: 'CAROUSEL',
      }

      const mockInsights = {
        data: [
          {
            creative_id: 'creative_123',
            impressions: '20000',
            clicks: '1000',
            spend: '2000.00',
            conversions: '100',
            revenue: '10000.00',
            date_start: '2024-01-01',
            date_stop: '2024-01-07',
          },
        ],
      }

      server.use(
        http.get('https://graph.facebook.com/v23.0/creative_123', () => {
          return HttpResponse.json(mockCreative)
        }),
        http.get('https://graph.facebook.com/v23.0/creative_123/insights', () => {
          return HttpResponse.json(mockInsights)
        })
      )

      const creative = await client.getCreativeWithInsights('creative_123')
      expect(creative.id).toBe('creative_123')
      expect(creative.creative_type).toBe('CAROUSEL')
      expect(creative.insights.data).toHaveLength(1)
      expect(creative.insights.data[0].revenue).toBe('10000.00')
    })

    it('should handle empty insights data', async () => {
      const mockCreative = {
        id: 'creative_456',
        name: 'New Ad',
        campaign_id: 'campaign_123',
        adset_id: 'adset_123',
        object_type: 'IMAGE',
      }

      const mockInsights = {
        data: [],
      }

      server.use(
        http.get('https://graph.facebook.com/v23.0/creative_456', () => {
          return HttpResponse.json(mockCreative)
        }),
        http.get('https://graph.facebook.com/v23.0/creative_456/insights', () => {
          return HttpResponse.json(mockInsights)
        })
      )

      const creative = await client.getCreativeWithInsights('creative_456')
      expect(creative.insights.data).toEqual([])
    })
  })
})
