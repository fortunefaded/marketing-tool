import { v } from 'convex/values'
import { query } from './_generated/server'
import {
  THRESHOLD_RATIONALE,
  INDUSTRY_ADJUSTMENTS,
  SEASONAL_ADJUSTMENTS,
} from './config/thresholdRationale'

// 動的閾値の調整
export const getContextualThresholds = query({
  args: {
    industry: v.optional(v.string()),
    productPrice: v.optional(v.number()),
    campaignGoal: v.optional(v.string()),
    season: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const {
      industry = 'b2c_ecommerce',
      productPrice = 100,
      campaignGoal = 'conversions',
      season = 'normal',
    } = args

    // ベースの閾値をコピー
    let thresholds = JSON.parse(JSON.stringify(THRESHOLD_RATIONALE))
    let adjustments: any[] = []

    // 業界による調整
    const industryAdj = INDUSTRY_ADJUSTMENTS[industry as keyof typeof INDUSTRY_ADJUSTMENTS]
    if (industryAdj) {
      // Frequency閾値の調整
      thresholds.frequency.thresholds.warning *= industryAdj.frequency
      thresholds.frequency.thresholds.critical *= industryAdj.frequency

      adjustments.push({
        type: '業界調整',
        metric: 'Frequency',
        reason: industryAdj.description,
        oldValue: THRESHOLD_RATIONALE.frequency.thresholds.critical,
        newValue: thresholds.frequency.thresholds.critical.toFixed(1),
      })

      // CTR減少率の調整
      thresholds.ctrDecline.thresholds.warning *= industryAdj.ctrDecline
      thresholds.ctrDecline.thresholds.critical *= industryAdj.ctrDecline

      adjustments.push({
        type: '業界調整',
        metric: 'CTR減少率',
        reason: industryAdj.description,
        oldValue: `${(THRESHOLD_RATIONALE.ctrDecline.thresholds.critical * 100).toFixed(0)}%`,
        newValue: `${(thresholds.ctrDecline.thresholds.critical * 100).toFixed(0)}%`,
      })
    }

    // 高額商品（$500以上）
    if (productPrice > 500) {
      thresholds.frequency.thresholds.critical = 4.5
      thresholds.frequency.thresholds.warning = 3.8

      adjustments.push({
        type: '商品価格調整',
        metric: 'Frequency',
        reason: '高額商品は検討期間が長いため、通常より高い頻度を許容',
        oldValue: THRESHOLD_RATIONALE.frequency.thresholds.critical,
        newValue: 4.5,
      })

      // 高額商品はCTR低下への耐性も高い
      thresholds.ctrDecline.thresholds.critical = 0.5
      adjustments.push({
        type: '商品価格調整',
        metric: 'CTR減少率',
        reason: '高額商品は慎重な検討が必要なため、CTR低下への耐性が高い',
        oldValue: '40%',
        newValue: '50%',
      })
    }

    // 低額商品（$20以下）
    if (productPrice <= 20) {
      thresholds.frequency.thresholds.critical = 2.8
      thresholds.frequency.thresholds.warning = 2.3

      adjustments.push({
        type: '商品価格調整',
        metric: 'Frequency',
        reason: '低額商品は衝動買いが多く、過度な露出は逆効果',
        oldValue: THRESHOLD_RATIONALE.frequency.thresholds.critical,
        newValue: 2.8,
      })
    }

    // 季節・イベント調整
    const seasonalAdj = SEASONAL_ADJUSTMENTS[season as keyof typeof SEASONAL_ADJUSTMENTS]
    if (seasonalAdj && seasonalAdj.multiplier !== 1.0) {
      const originalFreq = thresholds.frequency.thresholds.critical
      thresholds.frequency.thresholds.critical *= seasonalAdj.multiplier
      thresholds.frequency.thresholds.warning *= seasonalAdj.multiplier

      adjustments.push({
        type: '季節調整',
        metric: 'Frequency',
        reason: seasonalAdj.description,
        oldValue: originalFreq.toFixed(1),
        newValue: thresholds.frequency.thresholds.critical.toFixed(1),
      })

      // 初回インプレッション比率も調整
      thresholds.firstTimeRatio.thresholds.critical *= 2 - seasonalAdj.multiplier
      thresholds.firstTimeRatio.thresholds.warning *= 2 - seasonalAdj.multiplier

      adjustments.push({
        type: '季節調整',
        metric: '初回インプレッション比率',
        reason: seasonalAdj.description,
        oldValue: `${(THRESHOLD_RATIONALE.firstTimeRatio.thresholds.critical * 100).toFixed(0)}%`,
        newValue: `${(thresholds.firstTimeRatio.thresholds.critical * 100).toFixed(0)}%`,
      })
    }

    // キャンペーン目標による調整
    if (campaignGoal === 'brand_awareness') {
      thresholds.frequency.thresholds.critical = 5.0
      thresholds.frequency.thresholds.warning = 4.0

      adjustments.push({
        type: 'キャンペーン目標',
        metric: 'Frequency',
        reason: 'ブランド認知目的では高頻度露出が必要',
        oldValue: THRESHOLD_RATIONALE.frequency.thresholds.critical,
        newValue: 5.0,
      })
    }

    if (campaignGoal === 'app_installs') {
      thresholds.frequency.thresholds.critical = 2.5
      thresholds.frequency.thresholds.warning = 2.0

      adjustments.push({
        type: 'キャンペーン目標',
        metric: 'Frequency',
        reason: 'アプリインストールは即座の判断が多く、繰り返し露出は逆効果',
        oldValue: THRESHOLD_RATIONALE.frequency.thresholds.critical,
        newValue: 2.5,
      })
    }

    // 調整の説明を生成
    const explanation = generateContextualExplanation(adjustments, {
      industry,
      productPrice,
      campaignGoal,
      season,
    })

    return {
      thresholds,
      adjustments,
      explanation,
      context: {
        industry,
        productPrice,
        campaignGoal,
        season,
      },
    }
  },
})

// コンテキストに応じた説明を生成
function generateContextualExplanation(adjustments: any[], context: any): string {
  if (adjustments.length === 0) {
    return '標準的な閾値を使用しています。'
  }

  let explanation = `あなたの設定に基づいて、以下の調整を行いました：\n\n`

  // コンテキスト情報
  explanation += `【分析コンテキスト】\n`
  explanation += `• 業界: ${context.industry.replace(/_/g, ' ').toUpperCase()}\n`
  explanation += `• 商品価格: $${context.productPrice}\n`
  explanation += `• キャンペーン目標: ${context.campaignGoal.replace(/_/g, ' ')}\n`
  explanation += `• 時期: ${context.season}\n\n`

  // 調整内容
  explanation += `【閾値調整】\n`
  adjustments.forEach((adj) => {
    explanation += `• ${adj.metric}: ${adj.oldValue} → ${adj.newValue}\n`
    explanation += `  理由: ${adj.reason}\n`
  })

  return explanation
}

// 業界別の推奨設定を取得
export const getIndustryRecommendations = query({
  args: {
    industry: v.string(),
  },
  handler: async (_ctx, args) => {
    const recommendations = {
      b2c_ecommerce: {
        frequency: { min: 2.0, max: 3.5, optimal: 2.8 },
        budget_allocation: '70% プロスペクティング、30% リターゲティング',
        creative_refresh: '2週間ごと',
        tips: [
          '商品カテゴリーごとに異なるクリエイティブを使用',
          'カート放棄者は別セグメントで高頻度配信',
          '季節商品は疲労閾値を20%厳しく設定',
        ],
      },
      b2b_saas: {
        frequency: { min: 3.0, max: 5.0, optimal: 4.0 },
        budget_allocation: '40% プロスペクティング、60% リターゲティング',
        creative_refresh: '月1回',
        tips: [
          '意思決定者の役職別にメッセージを変更',
          'ホワイトペーパーDLなど、段階的なCTAを設定',
          '長期的な育成を前提とした配信設計',
        ],
      },
      fmcg: {
        frequency: { min: 1.5, max: 2.8, optimal: 2.2 },
        budget_allocation: '90% プロスペクティング、10% リターゲティング',
        creative_refresh: '週2回',
        tips: [
          '新商品は初速重視で高頻度配信',
          '既存商品は疲労を避けて低頻度維持',
          '店舗誘導の場合は地域別に配信調整',
        ],
      },
      luxury: {
        frequency: { min: 2.5, max: 4.5, optimal: 3.5 },
        budget_allocation: '50% プロスペクティング、50% リターゲティング',
        creative_refresh: '3週間ごと',
        tips: [
          'ブランドイメージを保つ高品質クリエイティブ',
          '顧客の検討期間に合わせた長期配信',
          'VIPセグメントは別管理で特別な体験を提供',
        ],
      },
    }

    return (
      recommendations[args.industry as keyof typeof recommendations] ||
      recommendations.b2c_ecommerce
    )
  },
})
