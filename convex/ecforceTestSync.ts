import { mutation } from './_generated/server'

// テスト用同期mutation（実際のデータまたはサンプルデータを追加）
export const runTestSync = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      // 現在の日時
      const now = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // テスト用のインポートセッションを作成
      const importId = `import_test_${now}_${Math.random().toString(36).substr(2, 9)}`

      await ctx.db.insert('ecforceImports', {
        importId,
        fileName: 'test_manual_sync.csv',
        fileSize: 3489,
        dataDate: yesterday,
        source: 'manual',
        status: 'processing',
        totalRows: 28,
        filteredRows: 7,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        duplicateRows: 0,
        startedAt: now,
      })

      // テスト用のサンプルデータを挿入（既存データがない場合）
      const existingData = await ctx.db
        .query('ecforcePerformance')
        .withIndex('by_date', (q) => q.eq('dataDate', yesterday))
        .first()

      if (!existingData) {
        // サンプルデータを作成
        const sampleData = {
          importId,
          hash: `${yesterday}_インハウス`,
          advertiser: 'インハウス',
          advertiserNormalized: 'インハウス',
          dataDate: yesterday,
          date: yesterday,
          orderAmount: 45624,
          salesAmount: 18111,
          cost: 0,
          accessCount: 157,
          cvOrder: 15,
          cvrOrder: 0.0955,
          cvPayment: 6,
          cvrPayment: 0.0382,
          cvThanksUpsell: 3,
          offerRateThanksUpsell: 0.2,
          paymentRate: 0.4,
          realCPA: 0,
          roas: 0,
          createdAt: now,
          updatedAt: now,
        }

        await ctx.db.insert('ecforcePerformance', sampleData)
      }

      // 少し待機してから完了状態に更新
      const importRecord = await ctx.db
        .query('ecforceImports')
        .filter((q) => q.eq(q.field('importId'), importId))
        .first()

      if (importRecord) {
        await ctx.db.patch(importRecord._id, {
          status: 'success',
          processedRows: 7,
          successRows: existingData ? 0 : 1,
          duplicateRows: existingData ? 1 : 0,
          errorRows: 0,
          completedAt: now + 1000,
        })
      }

      return {
        success: true,
        message: 'テスト同期が正常に完了しました',
        recordsProcessed: 1,
        importId,
      }
    } catch (error) {
      console.error('テスト同期エラー:', error)
      throw new Error(error instanceof Error ? error.message : '同期エラーが発生しました')
    }
  },
})
