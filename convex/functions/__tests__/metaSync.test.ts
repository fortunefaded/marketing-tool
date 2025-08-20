import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../schema'
import { api } from '../../_generated/api'

describe('Meta Sync Batch Processing', () => {
  let t: ReturnType<typeof convexTest>

  beforeEach(() => {
    t = convexTest(schema)
  })

  describe('syncMetaCampaigns', () => {
    it('should sync campaigns from Meta API to database', async () => {
      // Mock data
      const mockCampaigns = [
        {
          metaId: 'campaign_1',
          accountId: 'act_123456789',
          name: 'Test Campaign 1',
          objective: 'CONVERSIONS',
          status: 'ACTIVE' as const,
          dailyBudget: 10000,
          lifetimeBudget: undefined,
          startTime: new Date('2024-01-01').toISOString(),
          stopTime: undefined,
          insights: {
            impressions: 1000,
            clicks: 50,
            spend: 100,
            conversions: 5,
            revenue: 500,
          },
        },
        {
          metaId: 'campaign_2',
          accountId: 'act_123456789',
          name: 'Test Campaign 2',
          objective: 'TRAFFIC',
          status: 'PAUSED' as const,
          dailyBudget: undefined,
          lifetimeBudget: 50000,
          startTime: new Date('2024-01-15').toISOString(),
          stopTime: new Date('2024-12-31').toISOString(),
          insights: {
            impressions: 2000,
            clicks: 100,
            spend: 200,
            conversions: 10,
            revenue: 1000,
          },
        },
      ]

      // Execute sync
      await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: mockCampaigns,
      })

      // Verify campaigns were created
      const campaigns = await t.query(api.functions.metaSync.getMetaCampaigns, {})
      expect(campaigns).toHaveLength(2)
      expect(campaigns[0].name).toBe('Test Campaign 1')
      expect(campaigns[1].name).toBe('Test Campaign 2')
    })

    it('should update existing campaigns instead of duplicating', async () => {
      const campaign = {
        metaId: 'campaign_1',
        accountId: 'act_123456789',
        name: 'Original Name',
        objective: 'CONVERSIONS',
        status: 'ACTIVE' as const,
        dailyBudget: 10000,
        startTime: new Date('2024-01-01').toISOString(),
        insights: {
          impressions: 1000,
          clicks: 50,
          spend: 100,
          conversions: 5,
          revenue: 500,
        },
      }

      // First sync
      await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: [campaign],
      })

      // Update campaign data
      const updatedCampaign = {
        ...campaign,
        name: 'Updated Name',
        status: 'PAUSED' as const,
        insights: {
          impressions: 2000,
          clicks: 100,
          spend: 200,
          conversions: 10,
          revenue: 1000,
        },
      }

      // Second sync with updated data
      await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: [updatedCampaign],
      })

      // Verify only one campaign exists with updated data
      const campaigns = await t.query(api.functions.metaSync.getMetaCampaigns, {})
      expect(campaigns).toHaveLength(1)
      expect(campaigns[0].name).toBe('Updated Name')
      expect(campaigns[0].status).toBe('PAUSED')
    })

    it('should track sync history', async () => {
      const campaign = {
        metaId: 'campaign_1',
        accountId: 'act_123456789',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
        status: 'ACTIVE' as const,
        dailyBudget: 10000,
        startTime: new Date('2024-01-01').toISOString(),
        insights: {
          impressions: 1000,
          clicks: 50,
          spend: 100,
          conversions: 5,
          revenue: 500,
        },
      }

      // Execute sync
      const result = await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: [campaign],
      })

      expect(result?.success).toBe(true)
      expect(result?.syncId).toBeDefined()
      expect(result?.stats).toEqual({
        total: 1,
        created: 1,
        updated: 0,
        failed: 0,
      })

      // Verify sync history was recorded
      const syncHistory = await t.query(api.functions.metaSync.getSyncHistory, {
        limit: 1,
      })
      expect(syncHistory).toHaveLength(1)
      expect(syncHistory[0].source).toBe('meta')
      expect(syncHistory[0].status).toBe('completed')
      expect(syncHistory[0].stats).toEqual({
        total: 1,
        created: 1,
        updated: 0,
        failed: 0,
      })
    })
  })

  describe('syncMetaCreatives', () => {
    it('should sync creatives from Meta API to database', async () => {
      const mockCreatives = [
        {
          metaId: 'creative_1',
          campaignId: 'campaign_1',
          adsetId: 'adset_1',
          name: 'Test Creative 1',
          creativeType: 'IMAGE' as const,
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          body: 'Ad body text',
          title: 'Ad title',
          callToActionType: 'LEARN_MORE',
          insights: {
            impressions: 500,
            clicks: 25,
            spend: 50,
            conversions: 2,
            revenue: 200,
          },
        },
      ]

      await t.mutation(api.functions.metaSync.syncMetaCreatives, {
        creatives: mockCreatives,
      })

      const creatives = await t.query(api.functions.metaSync.getMetaCreatives, {})
      expect(creatives).toHaveLength(1)
      expect(creatives[0].name).toBe('Test Creative 1')
    })
  })

  describe('Differential Updates', () => {
    it('should only update changed fields', async () => {
      const originalCampaign = {
        metaId: 'campaign_1',
        accountId: 'act_123456789',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
        status: 'ACTIVE' as const,
        dailyBudget: 10000,
        startTime: new Date('2024-01-01').toISOString(),
        insights: {
          impressions: 1000,
          clicks: 50,
          spend: 100,
          conversions: 5,
          revenue: 500,
        },
      }

      // Initial sync
      await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: [originalCampaign],
      })

      // Sync with only insights changed
      const updatedCampaign = {
        ...originalCampaign,
        insights: {
          impressions: 1100,
          clicks: 55,
          spend: 110,
          conversions: 6,
          revenue: 600,
        },
      }

      const result = await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: [updatedCampaign],
        differential: true,
      })

      expect(result?.stats.updated).toBe(1)
      expect(result?.stats.fieldsUpdated).toContain('insights')
      expect(result?.stats.fieldsUpdated).not.toContain('name')
      expect(result?.stats.fieldsUpdated).not.toContain('status')
    })
  })

  describe('Error Handling', () => {
    it('should handle partial sync failures gracefully', async () => {
      const campaigns = [
        {
          metaId: 'campaign_1',
          accountId: 'act_123456789',
          name: 'Valid Campaign',
          objective: 'CONVERSIONS',
          status: 'ACTIVE' as const,
          dailyBudget: 10000,
          startTime: new Date('2024-01-01').toISOString(),
        },
        {
          // Invalid campaign - missing required fields
          metaId: 'campaign_2',
          name: 'Invalid Campaign',
          // Missing accountId and objective
        },
      ] as any

      const result = await t.mutation(api.functions.metaSync.syncMetaCampaigns, {
        campaigns: campaigns,
      })

      expect(result?.success).toBe(true)
      expect(result?.stats.total).toBe(2)
      expect(result?.stats.created).toBe(1)
      expect(result?.stats.failed).toBe(1)
      expect(result?.errors).toHaveLength(1)
      expect(result?.errors?.[0].metaId).toBe('campaign_2')
    })
  })

  describe('Scheduled Sync', () => {
    it('should create a scheduled sync job', async () => {
      const schedule = await t.mutation(api.functions.metaSync.scheduleSync, {
        type: 'campaigns',
        interval: 'hourly',
        config: {
          accountId: 'act_123456789',
          lookbackDays: 7,
        },
      })

      expect(schedule?.id).toBeDefined()
      expect(schedule?.type).toBe('campaigns')
      expect(schedule?.interval).toBe('hourly')
      expect(schedule?.nextRun).toBeDefined()
      expect(schedule?.enabled).toBe(true)
    })

    it('should execute scheduled sync jobs', async () => {
      // Create a scheduled job
      await t.mutation(api.functions.metaSync.scheduleSync, {
        type: 'campaigns',
        interval: 'hourly',
        config: {
          accountId: 'act_123456789',
        },
      })

      // Mock time advancement and execute due jobs
      const result = await t.mutation(api.functions.metaSync.runScheduledSyncs, {})

      expect(result?.executed).toBe(1)
      expect(result?.jobs[0].status).toBe('completed')
    })
  })
})
