import { v } from "convex/values";
import { query } from "./_generated/server";

// フォーマット別の疲労閾値
export const FORMAT_SPECIFIC_THRESHOLDS = {
  image: {
    frequency: { warning: 3.0, critical: 3.5 },
    daysActive: { optimal: 7, stale: 14 }
  },
  carousel: {
    frequency: { warning: 3.5, critical: 4.0 },  // やや耐性あり
    daysActive: { optimal: 10, stale: 20 }
  },
  video: {
    frequency: { warning: 2.5, critical: 3.0 },
    daysActive: { optimal: 5, stale: 10 }
  },
  reels: {
    frequency: { warning: 2.0, critical: 2.5 },  // 最も疲労しやすい
    daysActive: { optimal: 3, stale: 7 },
    note: 'Reelsは3日で鮮度を失う'
  },
  stories: {
    frequency: { warning: 4.0, critical: 5.0 },  // 24時間で消えるため耐性高
    daysActive: { optimal: 1, stale: 1 },
    note: '毎日更新が前提'
  }
};

// Instagram価値指標による疲労度の補正
export const adjustFatigueWithInstagramValue = (
  baseFatigueScore: number,
  instagramMetrics: {
    saveRate: number;
    profileToFollowRate: number;
    reachedNonFollowersRate: number;
  }
): number => {
  let adjustedScore = baseFatigueScore;
  
  // 1. 保存率による補正（最も重要）
  const SAVE_RATE_THRESHOLDS = {
    exceptional: 0.02,   // 2%以上：疲労度を大幅改善
    good: 0.015,         // 1.5%以上：疲労度を改善
    average: 0.01,       // 1%：標準
    poor: 0.005          // 0.5%未満：疲労度を悪化
  };
  
  if (instagramMetrics.saveRate >= SAVE_RATE_THRESHOLDS.exceptional) {
    adjustedScore = Math.min(100, adjustedScore + 20);
    console.log(`高い保存率(${(instagramMetrics.saveRate * 100).toFixed(2)}%)により疲労度改善: +20点`);
  } else if (instagramMetrics.saveRate >= SAVE_RATE_THRESHOLDS.good) {
    adjustedScore = Math.min(100, adjustedScore + 10);
  } else if (instagramMetrics.saveRate < SAVE_RATE_THRESHOLDS.poor) {
    adjustedScore = Math.max(0, adjustedScore - 10);
    console.log(`低い保存率により疲労度悪化: -10点`);
  }
  
  // 2. プロフィール→フォロー転換率による補正
  const FOLLOW_CONVERSION_THRESHOLDS = {
    excellent: 0.05,     // 5%以上：優秀
    good: 0.03,         // 3%以上：良好
    poor: 0.01          // 1%未満：改善必要
  };
  
  if (instagramMetrics.profileToFollowRate >= FOLLOW_CONVERSION_THRESHOLDS.excellent) {
    adjustedScore = Math.min(100, adjustedScore + 15);
    console.log(`高いフォロー転換率により疲労度改善: +15点`);
  }
  
  // 3. 非フォロワーリーチ率による補正
  if (instagramMetrics.reachedNonFollowersRate > 0.4) {
    // 40%以上が非フォロワー = 新規開拓できている
    adjustedScore = Math.min(100, adjustedScore + 5);
  }
  
  return adjustedScore;
};

// フォーマットを考慮した疲労度計算
export const calculateFormatAdjustedFatigue = (
  metrics: {
    frequency: number;
    daysActive: number;
  },
  format: 'image' | 'carousel' | 'video' | 'reels' | 'stories'
): number => {
  const thresholds = FORMAT_SPECIFIC_THRESHOLDS[format];
  
  // フォーマット別の頻度評価
  let frequencyScore = 100;
  if (metrics.frequency > thresholds.frequency.critical) {
    frequencyScore = 0;
  } else if (metrics.frequency > thresholds.frequency.warning) {
    const ratio = (metrics.frequency - thresholds.frequency.warning) / 
                  (thresholds.frequency.critical - thresholds.frequency.warning);
    frequencyScore = 50 * (1 - ratio);
  }
  
  // 配信期間による鮮度評価
  let freshnessScore = 100;
  if (metrics.daysActive > thresholds.daysActive.stale) {
    freshnessScore = 0;
  } else if (metrics.daysActive > thresholds.daysActive.optimal) {
    const ratio = (metrics.daysActive - thresholds.daysActive.optimal) / 
                  (thresholds.daysActive.stale - thresholds.daysActive.optimal);
    freshnessScore = 100 * (1 - ratio);
  }
  
  return (frequencyScore + freshnessScore) / 2;
};

// Instagram指標を含めた総合疲労度計算
export const calculateInstagramAdjustedFatigue = query({
  args: {
    adId: v.string(),
    baseScores: v.object({
      creative: v.number(),
      audience: v.number(),
      algorithm: v.number(),
      total: v.number()
    })
  },
  handler: async (ctx, args) => {
    // Instagram指標を取得
    const instagramMetrics = await ctx.db
      .query("instagramMetrics")
      .filter(q => q.eq(q.field("adId"), args.adId))
      .collect();
    
    if (instagramMetrics.length === 0) {
      // Instagram指標がない場合は基本スコアをそのまま返す
      return args.baseScores;
    }
    
    // 最新のInstagram指標を使用
    const latestMetrics = instagramMetrics
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    // 各スコアをInstagram価値で補正
    const adjustedCreative = adjustFatigueWithInstagramValue(
      args.baseScores.creative,
      {
        saveRate: latestMetrics.saveRate,
        profileToFollowRate: latestMetrics.profileToFollowRate,
        reachedNonFollowersRate: latestMetrics.reachedNonFollowersRate
      }
    );
    
    // フォーマット別の補正も適用
    const adInsights = await ctx.db
      .query("metaInsights")
      .filter(q => q.eq(q.field("ad_id"), args.adId))
      .first();
    
    if (adInsights) {
      const daysActive = Math.floor(
        (new Date().getTime() - new Date(adInsights.date_start || '').getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      const formatAdjustedScore = calculateFormatAdjustedFatigue(
        {
          frequency: adInsights.frequency || 1,
          daysActive
        },
        latestMetrics.format
      );
      
      // フォーマット補正を視聴者疲労度に適用
      const adjustedAudience = (args.baseScores.audience + formatAdjustedScore) / 2;
      
      // 総合スコアを再計算
      const adjustedTotal = Math.round(
        (adjustedCreative + adjustedAudience + args.baseScores.algorithm) / 3
      );
      
      return {
        creative: Math.round(adjustedCreative),
        audience: Math.round(adjustedAudience),
        algorithm: args.baseScores.algorithm,
        total: adjustedTotal,
        instagramAdjusted: true,
        saveRate: latestMetrics.saveRate,
        format: latestMetrics.format
      };
    }
    
    return args.baseScores;
  }
});