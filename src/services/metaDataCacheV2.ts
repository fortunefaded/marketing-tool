import { MetaInsightsData } from './metaApiService'

/**
 * MetaDataCacheのConvex版ラッパー
 * 既存のコードとの互換性を保つためのサービス
 */
export class MetaDataCacheV2 {
  // 互換性のためのメソッド（実際の処理はuseMetaInsightsフックで行う）

  /**
   * データ変更履歴を取得（互換性のため空配列を返す）
   */
  static getDataHistory(_accountId: string): any[] {
    console.log('MetaDataCacheV2: getDataHistory is now handled by Convex')
    return []
  }

  /**
   * ストレージ情報を取得（Convexは容量制限がないため固定値を返す）
   */
  static getStorageInfo(): { usedKB: number; estimatedMaxKB: number; percentUsed: number } {
    return {
      usedKB: 0,
      estimatedMaxKB: 999999, // 実質無制限
      percentUsed: 0,
    }
  }

  /**
   * キャッシュ使用量を取得（互換性のため0を返す）
   */
  static getCacheUsage(_accountId: string): { sizeKB: number; records: number } {
    console.log('MetaDataCacheV2: getCacheUsage is now handled by Convex')
    return { sizeKB: 0, records: 0 }
  }

  /**
   * 全キャッシュ使用量を取得（互換性のため0を返す）
   */
  static getTotalCacheUsage(): { totalSizeKB: number; accounts: number } {
    return { totalSizeKB: 0, accounts: 0 }
  }

  /**
   * 重要: これらのメソッドは直接呼び出さず、useMetaInsightsフックを使用してください
   */
  static saveInsights(_accountId: string, _data: MetaInsightsData[]): void {
    console.error(
      'MetaDataCacheV2: saveInsights should not be called directly. Use useMetaInsights hook instead.'
    )
    throw new Error('Use useMetaInsights hook for saving data to Convex')
  }

  static getInsights(_accountId: string): MetaInsightsData[] {
    console.error(
      'MetaDataCacheV2: getInsights should not be called directly. Use useMetaInsights hook instead.'
    )
    return []
  }

  static mergeInsights(
    _existing: MetaInsightsData[],
    _newData: MetaInsightsData[]
  ): MetaInsightsData[] {
    console.error(
      'MetaDataCacheV2: mergeInsights is now handled by Convex. Use importInsights with strategy="merge"'
    )
    return []
  }

  static clearAccountCache(_accountId: string): void {
    console.error(
      'MetaDataCacheV2: clearAccountCache should not be called directly. Use useMetaInsights hook instead.'
    )
  }

  static getSyncStatus(_accountId: string): any {
    console.error(
      'MetaDataCacheV2: getSyncStatus should not be called directly. Use useMetaInsights hook instead.'
    )
    return {
      accountId: _accountId,
      lastFullSync: null,
      lastIncrementalSync: null,
      totalRecords: 0,
      dateRange: {
        earliest: null,
        latest: null,
      },
    }
  }

  static saveSyncStatus(_accountId: string, _status: any): void {
    console.error(
      'MetaDataCacheV2: saveSyncStatus should not be called directly. Use useMetaInsights hook instead.'
    )
  }

  static findMissingDateRanges(
    _accountId: string,
    _start: string,
    _end: string
  ): Array<{ start: string; end: string }> {
    console.error(
      'MetaDataCacheV2: findMissingDateRanges should not be called directly. Use useMetaInsights hook instead.'
    )
    return []
  }
}
