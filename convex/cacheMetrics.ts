import { query } from './_generated/server'

export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    try {
      // シンプルなメトリクス情報を返す
      const cacheEntriesExist = await ctx.db.query('cacheEntries').take(1)
      const dataFreshnessExist = await ctx.db.query('dataFreshness').take(1)

      return {
        status: 'connected',
        timestamp: Date.now(),
        tables: {
          cacheEntries: cacheEntriesExist.length > 0,
          dataFreshness: dataFreshnessExist.length > 0,
        },
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: Date.now(),
        error: String(error),
        tables: {
          cacheEntries: false,
          dataFreshness: false,
        },
      }
    }
  },
})
