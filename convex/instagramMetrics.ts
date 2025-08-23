import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Instagram特有の指標を取得
export const fetchInstagramMetrics = mutation({
  args: {
    adId: v.string(),
    dateRange: v.object({
      since: v.string(),
      until: v.string()
    })
  },
  handler: async (ctx, args) => {
    // Instagram Insights APIから取得する指標
    // const metrics = [
    //   // エンゲージメント系
    //   'saved',                    // 保存数（最重要）
    //   'video_views',             // 動画再生数
    //   'shares',                  // シェア数
    //   
    //   // プロフィール系
    //   'profile_visits',          // プロフィール訪問数
    //   'follows',                 // フォロー数
    //   'website_clicks',          // ウェブサイトクリック
    //   
    //   // リーチの質
    //   'reached_audience',        // リーチしたユーザー
    //   'impressions_by_source',   // ソース別インプレッション
    //   
    //   // Stories特有（該当する場合）
    //   'stories_replies',         // ストーリーズ返信
    //   'stories_exits',          // 離脱数
    //   'stories_taps_forward',   // 次へタップ
    //   'stories_taps_back',      // 前へタップ
    //   
    //   // Reels特有（該当する場合）
    //   'reels_plays',            // リール再生数
    //   'reels_interactions',     // インタラクション総数
    //   'average_watch_time'      // 平均視聴時間
    // ];
    
    // 既存のmetaInsightsデータから関連情報を取得
    const insights = await ctx.db
      .query("metaInsights")
      .filter(q => 
        q.and(
          q.eq(q.field("ad_id"), args.adId),
          q.gte(q.field("date_start"), args.dateRange.since),
          q.lte(q.field("date_stop"), args.dateRange.until)
        )
      )
      .collect();
    
    if (insights.length === 0) {
      return {
        success: false,
        message: "No data found for the specified ad and date range"
      };
    }
    
    // 保存率とその他の指標を計算
    let totalSaves = 0;
    let totalImpressions = 0;
    let totalProfileVisits = 0;
    let totalFollows = 0;
    let totalShares = 0;
    let totalReach = 0;
    
    insights.forEach(insight => {
      totalSaves += insight.saves || 0;
      totalImpressions += insight.impressions || 0;
      totalProfileVisits += insight.profile_visits || 0;
      totalFollows += insight.follows || 0;
      totalShares += insight.shares || 0;
      totalReach += insight.reach || 0;
    });
    
    // 保存率の計算
    const saveRate = totalImpressions > 0 ? totalSaves / totalImpressions : 0;
    
    // プロフィール→フォロー転換率の計算
    const profileToFollowRate = totalProfileVisits > 0 ? totalFollows / totalProfileVisits : 0;
    
    // 非フォロワーリーチ率（推定値）
    const reachedNonFollowersRate = 0.35; // デフォルト値（実際のAPIから取得できない場合）
    
    // データベースに保存
    const metricData = {
      adId: args.adId,
      date: new Date().toISOString(),
      saves: totalSaves,
      saveRate: saveRate,
      profileVisits: totalProfileVisits,
      follows: totalFollows,
      profileToFollowRate: profileToFollowRate,
      shares: totalShares,
      websiteClicks: 0, // TODO: 実際のデータから取得
      
      // フォーマット判定（簡易版）
      format: (insights[0]?.creative_type?.toLowerCase() || 'image') as 'image' | 'carousel' | 'video' | 'reels' | 'stories',
      
      // リーチの質
      reachedNonFollowers: Math.floor(totalReach * reachedNonFollowersRate),
      reachedNonFollowersRate: reachedNonFollowersRate,
      impressionsFromExplore: Math.floor(totalImpressions * 0.2), // 推定値
      impressionsFromHashtags: Math.floor(totalImpressions * 0.1), // 推定値
      impressionsFromHome: Math.floor(totalImpressions * 0.7), // 推定値
    };
    
    await ctx.db.insert("instagramMetrics", metricData);
    
    return {
      success: true,
      metrics: {
        saveRate,
        profileToFollowRate,
        totalSaves,
        totalFollows,
        totalShares,
        reachedNonFollowersRate
      }
    };
  }
});

// 初回インプレッション比率の推定
export const estimateFirstTimeRatio = query({
  args: { adId: v.string() },
  handler: async (ctx, args) => {
    // 過去7日間のデータを取得
    const insights = await ctx.db
      .query("metaInsights")
      .filter(q => q.eq(q.field("ad_id"), args.adId))
      .collect();
    
    // 日付でソートして最新7件を取得
    const sortedInsights = insights
      .sort((a, b) => new Date(b.date_stop || '').getTime() - new Date(a.date_stop || '').getTime())
      .slice(0, 7);
    
    if (sortedInsights.length < 2) {
      return { firstTimeRatio: 1.0, confidence: 'low' };
    }
    
    // 方法1: 日次リーチの増分から推定
    const todayReach = sortedInsights[0].reach || 0;
    const yesterdayReach = sortedInsights[1].reach || 0;
    const todayImpressions = sortedInsights[0].impressions || 0;
    
    const dailyNewReach = Math.max(0, todayReach - yesterdayReach);
    const method1Ratio = todayImpressions > 0 ? dailyNewReach / todayImpressions : 0;
    
    // 方法2: 非フォロワーリーチから推定
    const instagramData = await ctx.db
      .query("instagramMetrics")
      .filter(q => q.eq(q.field("adId"), args.adId))
      .collect();
    
    const latestInstagramData = instagramData
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const method2Ratio = latestInstagramData?.reachedNonFollowersRate || 0.35;
    
    // 方法3: 頻度の逆数から推定
    const frequency = sortedInsights[0].frequency || 1;
    const method3Ratio = 1 / frequency;
    
    // 3つの方法の加重平均
    const weights = {
      method1: 0.4,  // リーチ増分法
      method2: 0.4,  // 非フォロワー率
      method3: 0.2   // 頻度逆数法
    };
    
    const estimatedRatio = 
      method1Ratio * weights.method1 +
      method2Ratio * weights.method2 +
      method3Ratio * weights.method3;
    
    // 信頼度の判定
    const confidence = 
      sortedInsights.length >= 7 ? 'high' :
      sortedInsights.length >= 3 ? 'medium' : 'low';
    
    return {
      firstTimeRatio: Math.min(1, Math.max(0, estimatedRatio)),
      confidence,
      methods: {
        reachIncrement: method1Ratio,
        nonFollowers: method2Ratio,
        frequencyInverse: method3Ratio
      }
    };
  }
});

// 最新のInstagram指標を取得
export const getLatestInstagramMetrics = query({
  args: { adId: v.string() },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("instagramMetrics")
      .filter(q => q.eq(q.field("adId"), args.adId))
      .collect();
    
    if (metrics.length === 0) {
      return null;
    }
    
    // 最新のデータを返す
    return metrics.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }
});