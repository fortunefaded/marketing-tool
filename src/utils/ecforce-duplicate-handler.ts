import { ECForceOrder } from '../types/ecforce'

export type DuplicateStrategy = 'skip' | 'replace'

export interface DuplicateHandlingResult {
  imported: ECForceOrder[]
  skipped: ECForceOrder[]
  replaced: ECForceOrder[]
  total: number
}

/**
 * EC Force注文データの重複処理
 */
export class ECForceDuplicateHandler {
  /**
   * 重複をチェックして処理
   * @param existingOrders 既存の注文データ
   * @param newOrders 新しい注文データ
   * @param strategy 重複処理戦略
   */
  static handleDuplicates(
    existingOrders: ECForceOrder[],
    newOrders: ECForceOrder[],
    strategy: DuplicateStrategy = 'skip'
  ): DuplicateHandlingResult {
    const existingMap = new Map(
      existingOrders.map(order => [order.受注ID, order])
    )
    
    const result: DuplicateHandlingResult = {
      imported: [],
      skipped: [],
      replaced: [],
      total: newOrders.length
    }

    for (const newOrder of newOrders) {
      const existingOrder = existingMap.get(newOrder.受注ID)
      
      if (!existingOrder) {
        // 新規データ
        result.imported.push(newOrder)
        existingMap.set(newOrder.受注ID, newOrder)
      } else {
        // 重複データ
        switch (strategy) {
          case 'skip':
            // スキップ
            result.skipped.push(newOrder)
            break
            
          case 'replace':
            // 置き換え
            existingMap.set(newOrder.受注ID, newOrder)
            result.replaced.push(newOrder)
            break
        }
      }
    }

    return {
      ...result,
      imported: Array.from(existingMap.values())
    }
  }

  /**
   * 重複の統計情報を取得
   */
  static getDuplicateStats(
    existingOrders: ECForceOrder[],
    newOrders: ECForceOrder[]
  ): {
    totalNew: number
    duplicates: number
    unique: number
  } {
    const existingIds = new Set(existingOrders.map(order => order.受注ID))
    const duplicates = newOrders.filter(order => existingIds.has(order.受注ID))
    
    return {
      totalNew: newOrders.length,
      duplicates: duplicates.length,
      unique: newOrders.length - duplicates.length
    }
  }
}