import { v } from "convex/values";
import { mutation } from "./_generated/server";

// 特定のアカウントのメタインサイトデータをクリア
export const clearByAccount = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("metaInsights")
      .filter((q) => q.eq(q.field("accountId"), args.accountId))
      .collect();
    
    let deleted = 0;
    for (const insight of insights) {
      await ctx.db.delete(insight._id);
      deleted++;
    }
    
    return {
      deleted,
      message: `Deleted ${deleted} records for account ${args.accountId}`,
    };
  },
});

// ad_idがundefinedのレコードのみクリア
export const clearUndefinedAdIds = mutation({
  args: {},
  handler: async (ctx) => {
    const insights = await ctx.db
      .query("metaInsights")
      .collect();
    
    let deleted = 0;
    for (const insight of insights) {
      if (!insight.ad_id || insight.ad_id === undefined) {
        await ctx.db.delete(insight._id);
        deleted++;
      }
    }
    
    return {
      deleted,
      message: `Deleted ${deleted} records with undefined ad_id`,
    };
  },
});

// すべてのメタインサイトデータをクリア（危険！）
export const clearAll = mutation({
  args: {
    confirm: v.literal("DELETE_ALL_DATA"),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== "DELETE_ALL_DATA") {
      throw new Error("Confirmation required");
    }
    
    const insights = await ctx.db
      .query("metaInsights")
      .collect();
    
    let deleted = 0;
    for (const insight of insights) {
      await ctx.db.delete(insight._id);
      deleted++;
    }
    
    return {
      deleted,
      message: `Deleted all ${deleted} records from metaInsights`,
    };
  },
});