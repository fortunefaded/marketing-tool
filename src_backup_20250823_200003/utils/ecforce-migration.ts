import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ECForceStorage } from './ecforce-storage'
import { logger } from './logger'

/**
 * ECForceデータをローカルストレージからConvexへ移行
 */
export class ECForceMigration {
  private convex: ConvexReactClient

  constructor(convexUrl: string) {
    this.convex = new ConvexReactClient(convexUrl)
  }

  /**
   * ローカルストレージのデータをConvexへ移行
   */
  async migrateToConvex(strategy: 'skip' | 'replace' = 'skip'): Promise<{
    success: boolean
    imported: number
    skipped: number
    replaced: number
    error?: string
  }> {
    try {
      // ローカルストレージからデータを読み込み
      const localOrders = ECForceStorage.load()

      if (localOrders.length === 0) {
        return {
          success: true,
          imported: 0,
          skipped: 0,
          replaced: 0,
        }
      }

      logger.debug(`[ECForceMigration] ${localOrders.length}件のデータを移行開始`)

      // バッチサイズを設定（一度に大量のデータを送信しないように）
      const batchSize = 100
      let totalImported = 0
      let totalSkipped = 0
      let totalReplaced = 0

      for (let i = 0; i < localOrders.length; i += batchSize) {
        const batch = localOrders.slice(i, i + batchSize)

        // Convexに送信するためのデータを準備
        const ordersForConvex = batch.map((order) => ({
          orderId: order.受注ID || '',
          orderDate: order.受注日 || '',
          purchaseDate: order.受注日 || '',
          customerId: order.顧客番号 || '',
          customerNumber: order.顧客番号 || '',
          email: order.メールアドレス || '',
          postalCode: order.配送先郵便番号,
          address: order.配送先住所,
          subtotal: order.小計 || 0,
          discount: 0, // ECForceOrder型にない
          tax: order.消費税,
          shipping: order.送料,
          fee: 0, // ECForceOrder型にない
          pointsUsed: 0, // ECForceOrder型にない
          total: order.合計 || order.小計 || 0,
          products: order.購入商品 || [],
          offer: order.購入オファー,
          subscriptionStatus: order.定期ステータス,
          deliveryStatus: undefined, // ECForceOrder型にない
          adCode: order.ランディングページ, // 広告コードの代わりに
          advertiserName: order.広告主名,
          adMedia: order.広告URLグループ名, // 広告媒体の代わりに
          importedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))

        // Convexにインポート
        const result = await this.convex.mutation(api.ecforce.importOrders, {
          orders: ordersForConvex,
          strategy,
        })

        totalImported += result.imported
        totalSkipped += result.skipped
        totalReplaced += result.replaced

        logger.debug(
          `[ECForceMigration] バッチ ${Math.floor(i / batchSize) + 1}: ${result.total}件処理完了`
        )
      }

      logger.debug(
        `[ECForceMigration] 移行完了: インポート${totalImported}件, スキップ${totalSkipped}件, 置換${totalReplaced}件`
      )

      return {
        success: true,
        imported: totalImported,
        skipped: totalSkipped,
        replaced: totalReplaced,
      }
    } catch (error) {
      logger.error('[ECForceMigration] 移行エラー:', error)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        replaced: 0,
        error: error instanceof Error ? error.message : '不明なエラー',
      }
    }
  }

  /**
   * Convexからデータを取得してローカルと比較
   */
  async compareWithConvex(): Promise<{
    localCount: number
    convexCount: number
    matches: boolean
  }> {
    try {
      const localOrders = ECForceStorage.load()
      const convexOrders = await this.convex.query(api.ecforce.getOrders, {})

      return {
        localCount: localOrders.length,
        convexCount: convexOrders.items.length,
        matches: localOrders.length === convexOrders.items.length,
      }
    } catch (error) {
      logger.error('[ECForceMigration] 比較エラー:', error)
      return {
        localCount: ECForceStorage.load().length,
        convexCount: 0,
        matches: false,
      }
    }
  }

  /**
   * 移行完了後、ローカルストレージをクリア
   */
  clearLocalStorage(): void {
    ECForceStorage.clear()
    logger.debug('[ECForceMigration] ローカルストレージをクリアしました')
  }
}
