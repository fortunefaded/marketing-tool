import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type { MetaCampaign, MetaInsight } from '../types'
import { MetaApiClient } from '../client'

// MSW server setup
const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Meta Campaign Data Model', () => {
  describe('MetaCampaign Type', () => {
    it('should have all required fields', () => {
      const campaign: MetaCampaign = {
        id: '123456789',
        account_id: 'act_123456789',
        name: 'Summer Sale Campaign',
        objective: 'CONVERSIONS',
        status: 'ACTIVE',
        daily_budget: 10000,
        start_time: '2024-01-01T00:00:00+0000',
        insights: {
          data: [],
        },
      }

      expect(campaign.id).toBe('123456789')
      expect(campaign.account_id).toBe('act_123456789')
      expect(campaign.name).toBe('Summer Sale Campaign')
      expect(campaign.objective).toBe('CONVERSIONS')
      expect(campaign.status).toBe('ACTIVE')
      expect(campaign.daily_budget).toBe(10000)
      expect(campaign.start_time).toBe('2024-01-01T00:00:00+0000')
      expect(campaign.insights.data).toEqual([])
    })

    it('should accept optional fields', () => {
      const campaign: MetaCampaign = {
        id: '123456789',
        account_id: 'act_123456789',
        name: 'Limited Time Campaign',
        objective: 'CONVERSIONS',
        status: 'PAUSED',
        daily_budget: 5000,
        lifetime_budget: 50000,
        start_time: '2024-01-01T00:00:00+0000',
        stop_time: '2024-12-31T23:59:59+0000',
        insights: {
          data: [],
        },
      }

      expect(campaign.lifetime_budget).toBe(50000)
      expect(campaign.stop_time).toBe('2024-12-31T23:59:59+0000')
    })
  })

  describe('MetaInsight Type', () => {
    it('should have all required fields', () => {
      const insight: MetaInsight = {
        impressions: '10000',
        clicks: '500',
        spend: '1000.50',
        conversions: '50',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      expect(insight.impressions).toBe('10000')
      expect(insight.clicks).toBe('500')
      expect(insight.spend).toBe('1000.50')
      expect(insight.conversions).toBe('50')
      expect(insight.date_start).toBe('2024-01-01')
      expect(insight.date_stop).toBe('2024-01-01')
    })

    it('should accept optional revenue field', () => {
      const insight: MetaInsight = {
        impressions: '10000',
        clicks: '500',
        spend: '1000.50',
        conversions: '50',
        revenue: '5000.00',
        date_start: '2024-01-01',
        date_stop: '2024-01-01',
      }

      expect(insight.revenue).toBe('5000.00')
    })
  })

  describe('MetaApiClient - Campaign Methods', () => {
    const client = new MetaApiClient({
      accessToken: 'test-token',
      accountId: 'act_123456789',
    })

    it('should fetch campaigns list', async () => {
      const mockCampaigns: MetaCampaign[] = [
        {
          id: '1',
          account_id: 'act_123456789',
          name: 'Campaign 1',
          objective: 'CONVERSIONS',
          status: 'ACTIVE',
          daily_budget: 10000,
          start_time: '2024-01-01T00:00:00+0000',
          insights: { data: [] },
        },
        {
          id: '2',
          account_id: 'act_123456789',
          name: 'Campaign 2',
          objective: 'TRAFFIC',
          status: 'PAUSED',
          daily_budget: 5000,
          start_time: '2024-02-01T00:00:00+0000',
          insights: { data: [] },
        },
      ]

      server.use(
        http.get('https://graph.facebook.com/v23.0/act_123456789/campaigns', () => {
          return HttpResponse.json({ data: mockCampaigns })
        })
      )

      const campaigns = await client.getCampaigns()
      expect(campaigns).toHaveLength(2)
      expect(campaigns[0].name).toBe('Campaign 1')
      expect(campaigns[1].name).toBe('Campaign 2')
    })

    it('should fetch campaign with insights', async () => {
      const mockCampaign: Omit<MetaCampaign, 'insights'> = {
        id: '123456789',
        account_id: 'act_123456789',
        name: 'Campaign with Insights',
        objective: 'CONVERSIONS',
        status: 'ACTIVE',
        daily_budget: 10000,
        start_time: '2024-01-01T00:00:00+0000',
      }

      const mockInsights = {
        data: [
          {
            impressions: '10000',
            clicks: '500',
            spend: '1000.50',
            conversions: '50',
            revenue: '5000.00',
            date_start: '2024-01-01',
            date_stop: '2024-01-01',
          },
        ],
      }

      server.use(
        http.get('https://graph.facebook.com/v23.0/123456789', () => {
          return HttpResponse.json(mockCampaign)
        }),
        http.get('https://graph.facebook.com/v23.0/123456789/insights', () => {
          return HttpResponse.json(mockInsights)
        })
      )

      const campaign = await client.getCampaignWithInsights('123456789')
      expect(campaign.id).toBe('123456789')
      expect(campaign.insights.data).toHaveLength(1)
      expect(campaign.insights.data[0].revenue).toBe('5000.00')
    })

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('https://graph.facebook.com/v23.0/act_123456789/campaigns', () => {
          return HttpResponse.json(
            { error: { message: 'Invalid access token', code: 190 } },
            { status: 401 }
          )
        })
      )

      await expect(client.getCampaigns()).rejects.toThrow('Invalid access token')
    })
  })
})
