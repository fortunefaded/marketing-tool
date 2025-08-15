import { MetaApiClient } from '../lib/meta-api'
import { transformCampaignToConvex, transformInsightToConvex } from '../lib/meta-api'
import { api } from '../../convex/_generated/api'
import { ConvexClient } from 'convex/browser'

export class MetaApiService {
  private client: MetaApiClient
  private convex: ConvexClient

  constructor() {
    // 環境変数から認証情報を取得
    const accessToken = process.env.META_ACCESS_TOKEN
    const accountId = process.env.META_ACCOUNT_ID

    if (!accessToken || !accountId) {
      throw new Error(
        'Meta API credentials not configured. Please set META_ACCESS_TOKEN and META_ACCOUNT_ID in .env'
      )
    }

    this.client = new MetaApiClient({
      accessToken,
      accountId,
    })

    this.convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  }

  async syncCampaigns() {
    try {
      // Meta APIからキャンペーンデータを取得
      const campaigns = await this.client.getCampaigns()

      // Convex形式に変換
      const transformedCampaigns = campaigns.map((campaign) => transformCampaignToConvex(campaign))

      // Convexに保存
      await this.convex.mutation(api.metaSync.syncMetaCampaigns, {
        campaigns: transformedCampaigns.map((c) => ({
          metaId: c.metaId,
          accountId: c.accountId,
          name: c.name,
          objective: c.objective,
          status: c.status,
          dailyBudget: c.dailyBudget,
          lifetimeBudget: c.lifetimeBudget,
          startTime: c.startTime,
          stopTime: c.stopTime,
        })),
      })

      // インサイトデータも同期
      for (const campaign of campaigns) {
        const campaignWithInsights = await this.client.getCampaignWithInsights(campaign.id)

        if (campaignWithInsights.insights.data.length > 0) {
          const transformedInsights = campaignWithInsights.insights.data.map((insight) =>
            transformInsightToConvex(insight, campaign.id)
          )

          await this.convex.mutation(api.metaSync.saveMetaInsights, {
            insights: transformedInsights.map((i) => ({
              campaignId: i.campaignId,
              impressions: i.impressions,
              clicks: i.clicks,
              spend: i.spend,
              conversions: i.conversions,
              revenue: i.revenue,
              dateStart: i.dateStart,
              dateStop: i.dateStop,
            })),
          })
        }
      }

      // Successfully synced Meta campaigns
    } catch (error) {
      throw new Error(`Failed to sync Meta campaigns: ${error}`)
    }
  }
}
