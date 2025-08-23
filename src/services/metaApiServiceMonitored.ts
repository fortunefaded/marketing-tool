import { MetaApiService, MetaApiConfig, MetaInsightsData, MetaCampaignData, MetaAdData } from './metaApiService'
import { monitorMetaApiCall, monitorMetaApiCallWithTimeout } from '../utils/metaApiMonitor'
import { logger } from '../utils/logger'

/**
 * 監視機能付きMetaApiServiceラッパー
 * 既存のMetaApiServiceに影響を与えずに監視機能を追加
 */
export class MetaApiServiceMonitored extends MetaApiService {
  constructor(config: MetaApiConfig, convexClient?: any) {
    super(config, convexClient)
    logger.info('[MetaApiServiceMonitored] Initialized with monitoring')
  }

  async getInsights(params: any): Promise<MetaInsightsData[]> {
    return monitorMetaApiCall(
      () => super.getInsights(params),
      `getInsights_${params.level || 'unknown'}_${params.dateRange?.since || 'no-date'}`
    )
  }

  async getCampaigns(limit: number = 100): Promise<MetaCampaignData[]> {
    return monitorMetaApiCall(
      () => super.getCampaigns(limit),
      `getCampaigns_limit${limit}`
    )
  }

  async getAds(params: any): Promise<MetaAdData[]> {
    return monitorMetaApiCall(
      () => super.getAds(params),
      `getAds_${params.campaign_id || 'all'}`
    )
  }

  async getAccountInfo(): Promise<any> {
    return monitorMetaApiCallWithTimeout(
      () => super.getAccountInfo(),
      'getAccountInfo',
      15000 // 15秒タイムアウト
    )
  }

  async getCreatives(adIds: string[]): Promise<any> {
    if (adIds.length > 50) {
      // バッチ処理が必要な場合
      const batches = []
      for (let i = 0; i < adIds.length; i += 50) {
        batches.push(adIds.slice(i, i + 50))
      }
      
      const results = await Promise.all(
        batches.map((batch, index) => 
          monitorMetaApiCall(
            () => super.getCreatives(batch),
            `getCreatives_batch${index}_size${batch.length}`
          )
        )
      )
      
      return results.flat()
    }
    
    return monitorMetaApiCall(
      () => super.getCreatives(adIds),
      `getCreatives_${adIds.length}ads`
    )
  }

  async detectDateLimit(): Promise<{ maxMonths: number; oldestDate: string }> {
    return monitorMetaApiCall(
      () => super.detectDateLimit(),
      'detectDateLimit'
    )
  }

  // バルクデータ取得の監視
  async bulkFetchInsights(dateRanges: Array<{ since: string; until: string }>, params: any = {}) {
    const results = []
    
    for (const dateRange of dateRanges) {
      try {
        const insights = await monitorMetaApiCall(
          () => super.getInsights({ ...params, dateRange }),
          `bulkFetchInsights_${dateRange.since}_to_${dateRange.until}`
        )
        results.push({ dateRange, insights, success: true })
      } catch (error) {
        results.push({ dateRange, insights: [], success: false, error })
      }
    }
    
    return results
  }
}

/**
 * 既存のMetaApiServiceインスタンスを監視付きに変換
 */
export function wrapWithMonitoring(apiService: MetaApiService): MetaApiServiceMonitored {
  const config = apiService.getConfig()
  const monitoredService = new MetaApiServiceMonitored(config)
  
  // 内部状態をコピー（必要に応じて）
  // Note: これは簡易的な実装です。実際のプロダクションでは
  // より洗練された状態管理が必要かもしれません
  
  return monitoredService
}