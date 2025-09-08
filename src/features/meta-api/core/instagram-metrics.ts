/**
 * instagram-metrics.ts
 * Instagram特有のメトリクス計算エンジン
 */

import { SafeMetrics } from '../utils/safe-data-access'

/**
 * Instagram メトリクス
 */
export interface InstagramMetrics {
  // 基本メトリクス
  profileViews: number
  profileVisitRate: number  // プロフィール訪問率
  
  follows: number
  followRate: number  // フォロー率
  
  likes: number
  comments: number
  saves: number
  shares: number
  engagementRate: number  // エンゲージメント率
  
  // Reels特有
  reelsPlays?: number
  reelsReachRate?: number
  averageWatchTime?: number
  
  // Stories特有
  storyImpressions?: number
  storyExits?: number
  storyTapForward?: number
  storyTapBack?: number
  
  // 初回インプレッション（擬似実装）
  firstTimeImpressionRatio: number
  
  // ベンチマーク比較
  benchmark: {
    industryAvgEngagementRate: number  // 業界平均: 0.7%
    reelsAvgEngagementRate: number     // Reels平均: 1.23%
    isAboveAverage: boolean
  }
}

/**
 * Instagram パフォーマンススコア
 */
export interface InstagramPerformanceScore {
  totalScore: number  // 0-100
  breakdown: {
    engagement: number      // エンゲージメント
    reach: number          // リーチ効率
    conversion: number     // コンバージョン
    brandBuilding: number  // ブランド構築
  }
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  recommendations: string[]
}

/**
 * Instagram メトリクス計算クラス
 */
export class InstagramMetricsCalculator {
  // 業界ベンチマーク
  private static readonly BENCHMARKS = {
    avgEngagementRate: 0.7,      // 通常投稿: 0.7%
    reelsEngagementRate: 1.23,    // Reels: 1.23%
    profileVisitRate: 2.0,        // プロフィール訪問率: 2%
    followRate: 0.5,              // フォロー率: 0.5%
  }

  /**
   * Instagram メトリクスを計算
   */
  static calculateMetrics(
    data: any,  // Meta API response
    baseMetrics: SafeMetrics
  ): InstagramMetrics {
    // actions配列からデータを抽出
    const actions = data?.actions || []
    
    // アクションタイプから値を取得するヘルパー関数
    const getActionValue = (actionTypes: string[]): number => {
      for (const type of actionTypes) {
        const action = actions.find((a: any) => 
          a.action_type?.toLowerCase() === type.toLowerCase()
        )
        if (action?.value) {
          return typeof action.value === 'string' ? parseFloat(action.value) : action.value
        }
      }
      return 0
    }
    
    // Instagram関連アクションの抽出
    const saves = getActionValue([
      'onsite_conversion.post_save',
      'post_save',
      'ig_save',
      'saves'
    ])
    
    const postEngagement = getActionValue([
      'post_engagement',
      'onsite_conversion.post_engagement'
    ])
    
    const postReaction = getActionValue([
      'post_reaction',
      'onsite_conversion.post_reaction',
      'post_like',
      'likes'
    ])
    
    // エンゲージメント関連（実データがない場合は0）
    const likes = postReaction
    const comments = getActionValue(['post_comment', 'comments', 'ig_comment'])
    const shares = getActionValue(['post_share', 'shares', 'ig_share'])
    
    // プロフィール関連（通常はN/A）
    const profileViews = getActionValue([
      'onsite_conversion.ig_profile_visit',
      'ig_profile_visit', 
      'profile_visits',
      'profile_views'
    ])
    
    const follows = getActionValue([
      'onsite_conversion.follow',
      'ig_follow',
      'follows',
      'new_followers'
    ])
    
    // リーチとインプレッション
    const reach = baseMetrics.reach || 1
    const impressions = baseMetrics.impressions || 1
    
    // 率を計算
    const engagementRate = this.calculateEngagementRate(
      likes, comments, saves, shares, reach
    )
    
    const profileVisitRate = reach > 0 
      ? (profileViews / reach) * 100 
      : 0
    
    const followRate = profileViews > 0 
      ? (follows / profileViews) * 100 
      : 0
    
    // 初回インプレッション比率（擬似計算）
    const firstTimeImpressionRatio = this.estimateFirstTimeImpressionRatio(
      baseMetrics.frequency,
      reach,
      impressions
    )
    
    // ベンチマーク比較
    const isAboveAverage = engagementRate > this.BENCHMARKS.avgEngagementRate
    
    return {
      profileViews,
      profileVisitRate,
      follows,
      followRate,
      likes,
      comments,
      saves,
      shares,
      engagementRate,
      firstTimeImpressionRatio,
      
      // Reels データ（利用可能な場合）
      reelsPlays: data?.video_views || data?.reel_plays,
      reelsReachRate: data?.reel_reach_rate,
      averageWatchTime: data?.average_watch_time,
      
      // Stories データ（利用可能な場合）
      storyImpressions: data?.story_impressions,
      storyExits: data?.story_exits,
      storyTapForward: data?.story_tap_forward,
      storyTapBack: data?.story_tap_back,
      
      benchmark: {
        industryAvgEngagementRate: this.BENCHMARKS.avgEngagementRate,
        reelsAvgEngagementRate: this.BENCHMARKS.reelsEngagementRate,
        isAboveAverage
      }
    }
  }

  /**
   * エンゲージメント率を計算
   * Formula: (いいね + コメント + 保存 + シェア) / リーチ × 100
   */
  private static calculateEngagementRate(
    likes: number,
    comments: number,
    saves: number,
    shares: number,
    reach: number
  ): number {
    if (reach === 0) return 0
    
    const totalEngagements = likes + comments + saves + shares
    return (totalEngagements / reach) * 100
  }

  /**
   * 初回インプレッション比率を推定（擬似実装）
   * 実際のAPIでは取得できないため、Frequencyから推定
   */
  private static estimateFirstTimeImpressionRatio(
    frequency: number,
    reach: number,
    impressions: number
  ): number {
    if (impressions === 0 || reach === 0) return 0
    
    // Frequencyが低いほど初回インプレッション比率が高い
    if (frequency <= 1.2) return 85  // ほぼ新規
    if (frequency <= 2.0) return 60  // バランス型
    if (frequency <= 3.0) return 40  // リピーター多め
    if (frequency <= 4.0) return 25  // 高頻度
    return 15  // 過度な露出
  }

  /**
   * Instagram パフォーマンススコアを計算
   */
  static calculatePerformanceScore(
    metrics: InstagramMetrics,
    baseMetrics: SafeMetrics
  ): InstagramPerformanceScore {
    const scores = {
      engagement: this.scoreEngagement(metrics),
      reach: this.scoreReach(metrics, baseMetrics),
      conversion: this.scoreConversion(metrics, baseMetrics),
      brandBuilding: this.scoreBrandBuilding(metrics)
    }
    
    // 総合スコア（加重平均）
    const totalScore = Math.round(
      scores.engagement * 0.35 +
      scores.reach * 0.25 +
      scores.conversion * 0.20 +
      scores.brandBuilding * 0.20
    )
    
    // グレード判定
    const grade = this.determineGrade(totalScore)
    
    // 推奨事項
    const recommendations = this.generateRecommendations(metrics, scores)
    
    return {
      totalScore,
      breakdown: scores,
      grade,
      recommendations
    }
  }

  /**
   * エンゲージメントスコア（0-100）
   */
  private static scoreEngagement(metrics: InstagramMetrics): number {
    const { engagementRate, benchmark } = metrics
    
    if (engagementRate >= benchmark.reelsAvgEngagementRate * 2) return 100  // 2倍以上
    if (engagementRate >= benchmark.reelsAvgEngagementRate) return 85
    if (engagementRate >= benchmark.industryAvgEngagementRate) return 70
    if (engagementRate >= benchmark.industryAvgEngagementRate * 0.5) return 50
    return Math.max(0, Math.round(engagementRate * 50))
  }

  /**
   * リーチ効率スコア（0-100）
   */
  private static scoreReach(
    metrics: InstagramMetrics,
    baseMetrics: SafeMetrics
  ): number {
    // 初回インプレッション比率が高いほど良い
    const firstTimeScore = metrics.firstTimeImpressionRatio
    
    // CPMが低いほど良い（効率的）
    const cpmScore = baseMetrics.cpm < 500 ? 100 :
                     baseMetrics.cpm < 1000 ? 80 :
                     baseMetrics.cpm < 2000 ? 60 :
                     baseMetrics.cpm < 3000 ? 40 : 20
    
    return Math.round((firstTimeScore + cpmScore) / 2)
  }

  /**
   * コンバージョンスコア（0-100）
   */
  private static scoreConversion(
    metrics: InstagramMetrics,
    baseMetrics: SafeMetrics
  ): number {
    // プロフィール訪問率とフォロー率から算出
    const profileVisitScore = Math.min(100, metrics.profileVisitRate * 25)
    const followScore = Math.min(100, metrics.followRate * 100)
    
    // 実際のコンバージョン（購入等）も考慮
    const conversionRate = baseMetrics.clicks > 0 
      ? (baseMetrics.conversions / baseMetrics.clicks) * 100 
      : 0
    const conversionScore = Math.min(100, conversionRate * 10)
    
    return Math.round((profileVisitScore + followScore + conversionScore) / 3)
  }

  /**
   * ブランド構築スコア（0-100）
   */
  private static scoreBrandBuilding(metrics: InstagramMetrics): number {
    // 保存数とシェア数を重視
    const saveRate = metrics.likes > 0 
      ? (metrics.saves / metrics.likes) * 100 
      : 0
    const shareRate = metrics.likes > 0 
      ? (metrics.shares / metrics.likes) * 100 
      : 0
    
    const saveScore = Math.min(100, saveRate * 20)  // 5%で100点
    const shareScore = Math.min(100, shareRate * 33)  // 3%で100点
    
    // コメントの質も考慮（数だけでなく）
    const commentEngagement = metrics.likes > 0
      ? (metrics.comments / metrics.likes) * 100
      : 0
    const commentScore = Math.min(100, commentEngagement * 10)  // 10%で100点
    
    return Math.round((saveScore + shareScore + commentScore) / 3)
  }

  /**
   * グレード判定
   */
  private static determineGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'S'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  /**
   * 推奨事項を生成
   */
  private static generateRecommendations(
    metrics: InstagramMetrics,
    scores: InstagramPerformanceScore['breakdown']
  ): string[] {
    const recommendations: string[] = []
    
    // エンゲージメント改善
    if (scores.engagement < 70) {
      if (metrics.engagementRate < metrics.benchmark.industryAvgEngagementRate) {
        recommendations.push('📱 エンゲージメント率が業界平均を下回っています。コンテンツの質を見直しましょう')
      }
      if (metrics.saves < metrics.likes * 0.02) {
        recommendations.push('💾 保存率が低いです。有益な情報や参考になるコンテンツを増やしましょう')
      }
    }
    
    // リーチ改善
    if (scores.reach < 70) {
      if (metrics.firstTimeImpressionRatio < 50) {
        recommendations.push('🎯 新規ユーザーへのリーチが少ないです。ハッシュタグ戦略を見直しましょう')
      }
    }
    
    // コンバージョン改善
    if (scores.conversion < 70) {
      if (metrics.profileVisitRate < 2) {
        recommendations.push('👤 プロフィール訪問率が低いです。CTAを明確にしましょう')
      }
      if (metrics.followRate < 0.5) {
        recommendations.push('➕ フォロー率が低いです。プロフィールを魅力的にしましょう')
      }
    }
    
    // ブランド構築改善
    if (scores.brandBuilding < 70) {
      recommendations.push('🏢 ブランド認知度向上のため、ストーリーズやReelsを活用しましょう')
    }
    
    // 全体的に優秀な場合
    if (scores.engagement >= 85 && scores.reach >= 85) {
      recommendations.push('🎉 素晴らしいパフォーマンスです！この調子を維持しましょう')
    }
    
    return recommendations
  }

  /**
   * Reels専用分析
   */
  static analyzeReelsPerformance(
    reelsData: any
  ): {
    performance: 'excellent' | 'good' | 'average' | 'poor'
    metrics: {
      viewsPerReach: number
      completionRate: number
      shareRate: number
    }
    tips: string[]
  } {
    const plays = reelsData?.plays || reelsData?.video_views || 0
    const reach = reelsData?.reach || 1
    const shares = reelsData?.shares || 0
    const avgWatchTime = reelsData?.average_watch_time || 0
    const videoDuration = reelsData?.video_duration || 15
    
    const viewsPerReach = plays / reach
    const completionRate = (avgWatchTime / videoDuration) * 100
    const shareRate = (shares / plays) * 100
    
    // パフォーマンス判定
    let performance: 'excellent' | 'good' | 'average' | 'poor'
    if (viewsPerReach > 2 && completionRate > 80) {
      performance = 'excellent'
    } else if (viewsPerReach > 1.5 && completionRate > 60) {
      performance = 'good'
    } else if (viewsPerReach > 1 && completionRate > 40) {
      performance = 'average'
    } else {
      performance = 'poor'
    }
    
    // Tips生成
    const tips: string[] = []
    if (completionRate < 60) {
      tips.push('🎬 最初の3秒でフックを強化しましょう')
    }
    if (shareRate < 1) {
      tips.push('🔄 シェアしたくなる価値あるコンテンツを作りましょう')
    }
    if (avgWatchTime < 5) {
      tips.push('⏱️ 視聴時間が短いです。エンゲージメントを高める工夫を')
    }
    
    return {
      performance,
      metrics: {
        viewsPerReach,
        completionRate,
        shareRate
      },
      tips
    }
  }
}