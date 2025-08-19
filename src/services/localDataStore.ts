import Dexie, { Table } from 'dexie'
import { EnhancedCreativeData } from './creativeDataAggregator'
import { MetaInsightsData } from './metaApiService'

interface StoredCreativeData extends EnhancedCreativeData {
  _localId?: string
  accountId: string
  fetchedAt: Date
  dateRange: {
    since: string
    until: string
  }
}

interface StoredInsightData {
  _localId?: string
  accountId: string
  fetchedAt: Date
  // MetaInsightsDataのフィールドをすべて含む
  date_start: string
  date_stop?: string
  campaign_id?: string
  campaign_name?: string
  ad_id?: string
  ad_name?: string
  creative_id?: string
  creative_name?: string
  impressions: number
  clicks: number
  spend: number
  reach?: number
  frequency?: number
  cpm?: number
  cpc?: number
  ctr?: number
  conversions?: number
  conversion_value?: number
  [key: string]: any
}

interface StoredCampaignData {
  _localId?: string
  accountId: string
  id: string
  name: string
  status: string
  objective?: string
  budget?: number
  spend?: number
  fetchedAt: Date
}

class LocalDataStore extends Dexie {
  creatives!: Table<StoredCreativeData>
  insights!: Table<StoredInsightData>
  campaigns!: Table<StoredCampaignData>
  
  constructor() {
    super('MarketingToolDB')
    
    this.version(1).stores({
      creatives: '++_localId, id, accountId, [accountId+id], creative_type, fetchedAt, [dateRange.since+dateRange.until]',
      insights: '++_localId, [accountId+date_start+campaign_id], accountId, campaign_id, ad_id, creative_id, fetchedAt',
      campaigns: '++_localId, [accountId+id], accountId, name, status, fetchedAt'
    })
  }
  
  // クリエイティブデータの保存（重複チェック付き）
  async saveCreatives(accountId: string, data: EnhancedCreativeData[], dateRange: { since: string; until: string }) {
    const toSave = data.map(item => ({
      ...item,
      accountId,
      fetchedAt: new Date(),
      dateRange
    }))
    
    // 既存データを削除（同じ期間のデータ）
    await this.creatives
      .where('[accountId+id]')
      .anyOf(toSave.map(d => [accountId, d.id]))
      .and(item => 
        item.dateRange.since === dateRange.since && 
        item.dateRange.until === dateRange.until
      )
      .delete()
    
    // 新規データを追加
    await this.creatives.bulkAdd(toSave)
    console.log(`${toSave.length}件のクリエイティブデータを保存しました`)
  }
  
  // インサイトデータの保存
  async saveInsights(accountId: string, data: MetaInsightsData[]) {
    const toSave = data.map(item => ({
      ...item,
      accountId,
      fetchedAt: new Date()
    }))
    
    // バッチ処理で重複を避けて保存
    const batchSize = 100
    for (let i = 0; i < toSave.length; i += batchSize) {
      const batch = toSave.slice(i, i + batchSize)
      
      // 既存チェックと新規追加
      for (const item of batch) {
        const key = [accountId, item.date_start || '', item.campaign_id || '']
        const existing = await this.insights
          .where('[accountId+date_start+campaign_id]')
          .equals(key)
          .first()
        
        if (!existing) {
          await this.insights.add(item)
        }
      }
    }
    
    console.log(`${toSave.length}件のインサイトデータを処理しました`)
  }
  
  // キャンペーンデータの保存
  async saveCampaigns(accountId: string, data: any[]) {
    const toSave = data.map(item => ({
      ...item,
      accountId,
      fetchedAt: new Date()
    }))
    
    // Upsert処理
    for (const campaign of toSave) {
      await this.campaigns.put(campaign)
    }
    
    console.log(`${toSave.length}件のキャンペーンデータを保存しました`)
  }
  
  // キャッシュの有効性チェック付きデータ取得
  async getCachedCreatives(
    accountId: string, 
    dateRange: { since: string; until: string },
    maxAge: number = 3600000 // 1時間
  ): Promise<StoredCreativeData[] | null> {
    const now = Date.now()
    const cutoff = new Date(now - maxAge)
    
    const cached = await this.creatives
      .where('accountId')
      .equals(accountId)
      .and(item => 
        item.dateRange.since === dateRange.since && 
        item.dateRange.until === dateRange.until &&
        item.fetchedAt > cutoff
      )
      .toArray()
    
    if (cached.length > 0) {
      console.log('ローカルキャッシュから取得:', cached.length, '件')
      return cached
    }
    
    return null
  }
  
  // 期間指定でインサイトデータを取得
  async getCachedInsights(
    accountId: string,
    startDate?: string,
    endDate?: string,
    maxAge: number = 3600000
  ): Promise<StoredInsightData[] | null> {
    const now = Date.now()
    const cutoff = new Date(now - maxAge)
    
    let query = this.insights
      .where('accountId')
      .equals(accountId)
      .and(item => item.fetchedAt > cutoff)
    
    let results = await query.toArray()
    
    // 日付フィルタリング
    if (startDate || endDate) {
      results = results.filter(item => {
        const itemDate = item.date_start || ''
        if (startDate && itemDate < startDate) return false
        if (endDate && itemDate > endDate) return false
        return true
      })
    }
    
    if (results.length > 0) {
      console.log('ローカルキャッシュからインサイトを取得:', results.length, '件')
      return results
    }
    
    return null
  }
  
  // データクリーンアップ（古いデータを削除）
  async cleanup(daysToKeep: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const creativesDeleted = await this.creatives
      .where('fetchedAt')
      .below(cutoffDate)
      .delete()
    
    const insightsDeleted = await this.insights
      .where('fetchedAt')
      .below(cutoffDate)
      .delete()
    
    const campaignsDeleted = await this.campaigns
      .where('fetchedAt')
      .below(cutoffDate)
      .delete()
    
    console.log(`クリーンアップ完了: クリエイティブ ${creativesDeleted}件, インサイト ${insightsDeleted}件, キャンペーン ${campaignsDeleted}件を削除`)
  }
  
  // ストレージ使用量の取得
  async getStorageInfo() {
    const estimate = await navigator.storage.estimate()
    const creativeCount = await this.creatives.count()
    const insightCount = await this.insights.count()
    const campaignCount = await this.campaigns.count()
    
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
      counts: {
        creatives: creativeCount,
        insights: insightCount,
        campaigns: campaignCount,
        total: creativeCount + insightCount + campaignCount
      }
    }
  }
  
  // データのエクスポート
  async exportAllData() {
    const allData = {
      creatives: await this.creatives.toArray(),
      insights: await this.insights.toArray(),
      campaigns: await this.campaigns.toArray(),
      exportedAt: new Date().toISOString()
    }
    
    return allData
  }
  
  // データのインポート
  async importData(data: any) {
    if (data.creatives) {
      await this.creatives.bulkPut(data.creatives)
    }
    if (data.insights) {
      await this.insights.bulkPut(data.insights)
    }
    if (data.campaigns) {
      await this.campaigns.bulkPut(data.campaigns)
    }
    
    console.log('データのインポートが完了しました')
  }
}

// シングルトンインスタンス
export const localDB = new LocalDataStore()

// データベースのオープンエラーをキャッチ
localDB.open().catch(err => {
  console.error('IndexedDBの初期化に失敗しました:', err)
})