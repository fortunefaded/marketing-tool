import { ECForceOrder } from '../types/ecforce'

const STORAGE_KEY = 'ecforce_orders'

/**
 * EC Forceデータの永続化ユーティリティ
 */
export class ECForceStorage {
  /**
   * データを保存
   */
  static save(orders: ECForceOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
      console.log(`[ECForceStorage] ${orders.length}件のデータを保存しました`)
    } catch (error) {
      console.error('[ECForceStorage] データの保存に失敗しました:', error)
    }
  }

  /**
   * データを読み込み
   */
  static load(): ECForceOrder[] {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      if (!storedData) {
        console.log('[ECForceStorage] 保存されたデータがありません')
        return []
      }
      
      const orders = JSON.parse(storedData) as ECForceOrder[]
      console.log(`[ECForceStorage] ${orders.length}件のデータを読み込みました`)
      return orders
    } catch (error) {
      console.error('[ECForceStorage] データの読み込みに失敗しました:', error)
      return []
    }
  }

  /**
   * データをクリア
   */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[ECForceStorage] データをクリアしました')
  }

  /**
   * データが存在するかチェック
   */
  static hasData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null
  }
}