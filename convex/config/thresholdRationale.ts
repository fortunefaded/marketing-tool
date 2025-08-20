export const THRESHOLD_RATIONALE = {
  frequency: {
    thresholds: {
      safe: 2.5,
      warning: 3.0,
      critical: 3.5,
    },
    rationale: {
      critical: 'Meta社の研究で4回露出時にCVRが45%低下。3.5回を超えると投資対効果が負に転じる',
      warning: '3回目から限界効用が減少開始。ザイオンス効果の頂点に接近',
      safe: '最適な認知形成期間。2.5回までは好感度が上昇',
    },
    industryBenchmarks: {
      b2c_ecommerce: 3.2,
      b2b_saas: 4.5,
      fmcg: 2.8,
    },
    evidence: '業界調査により3-5回で単純接触効果が嫌悪感に転換することが判明',
  },

  ctrDecline: {
    thresholds: {
      safe: 0.15,
      warning: 0.25,
      critical: 0.4,
    },
    rationale: {
      critical: '40%低下でROASが赤字ライン突破。ユーザーの意図的回避が確定',
      warning: '25%は統計的に有意な低下。能動的な無視行動の開始',
      safe: '15%までは日常的な変動範囲内',
    },
    stages: {
      '0-15%': '正常変動',
      '15-25%': '興味減退',
      '25-40%': '能動的無視',
      '40%+': '嫌悪による回避',
    },
  },

  firstTimeRatio: {
    thresholds: {
      safe: 0.5,
      warning: 0.4,
      critical: 0.3,
    },
    rationale: {
      critical: '70%が既存ユーザーへの再露出。新規開拓が事実上停止',
      warning: 'オーディエンスプールの飽和開始',
      safe: '新規リーチが過半数を維持。健全な成長状態',
    },
    mathematical: 'リーチ成長曲線の変曲点が50%。これ以降は対数的減衰',
  },

  cpmIncrease: {
    thresholds: {
      warning: 0.2,
      critical: 0.3,
    },
    rationale: {
      critical: '30%上昇は重度のアルゴリズムペナルティ。配信がほぼ制限される',
      warning: '20%上昇でMetaのAIが低品質判定開始。入札競争力が低下',
    },
    mechanism:
      'MetaのAIは広告の予測エンゲージメント率を基に配信優先度を決定。低パフォーマンス広告は自動的に単価が上昇',
  },

  negativeFeedback: {
    thresholds: {
      warning: 0.001,
      critical: 0.003,
    },
    rationale: {
      critical: '0.3%は1000人中3人が積極的に拒否。ブランド毀損リスク',
      warning: '0.1%から負の口コミ効果が発生開始',
    },
    viralEffect: '1人の否定的反応は平均300人に影響（ソーシャル増幅効果）',
  },

  videoMetrics: {
    completionRate: {
      threshold: 0.5,
      rationale: '50%未満の完了率は、動画の前半で興味を失っている証拠',
    },
    dropoffAcceleration: {
      threshold: 0.3,
      rationale: '離脱速度が30%/秒を超えると、特定シーンへの拒否反応',
    },
  },

  instagramValue: {
    saveRate: {
      high: 0.01,
      exceptional: 0.02,
    },
    rationale: {
      saves: '保存率1%は「後で見返したい」という最強のエンゲージメント指標',
      profileToFollow: '5%のフォロー転換率は、広告を超えたブランド愛着の形成',
    },
    scoring: '保存は「いいね」の10倍の価値。長期的なブランド資産形成の指標',
  },

  crossPlatform: {
    multipliers: {
      instagram_facebook: 2.3,
      all_platforms: 3.5,
    },
    rationale: {
      instagram_facebook: '同一ユーザーがIG→FBで同じ広告を見ると疲労が2.3倍加速',
      all_platforms: '4プラットフォーム同時露出は「追跡されている感」を生む',
    },
    research: 'ハーバード大学の研究：クロスデバイス広告は3回目から不快感が急上昇',
  },
}

// 業界別の閾値調整係数
export const INDUSTRY_ADJUSTMENTS = {
  b2c_ecommerce: {
    frequency: 1.0,
    ctrDecline: 1.0,
    description: '標準的なEC。衝動買いが多く疲労が早い',
  },
  b2b_saas: {
    frequency: 1.5,
    ctrDecline: 1.3,
    description: '検討期間が長く、高頻度露出に耐性あり',
  },
  fmcg: {
    frequency: 0.8,
    ctrDecline: 0.9,
    description: '日用品は疲労が早い。新鮮さが重要',
  },
  luxury: {
    frequency: 1.2,
    ctrDecline: 1.4,
    description: '高額商品は検討期間が長く、繰り返し見られる',
  },
  entertainment: {
    frequency: 0.7,
    ctrDecline: 0.8,
    description: 'エンタメは新規性重視。同じ広告は飽きられやすい',
  },
}

// 季節・イベント別の調整
export const SEASONAL_ADJUSTMENTS = {
  normal: {
    multiplier: 1.0,
    description: '通常期間',
  },
  black_friday: {
    multiplier: 0.7,
    description: '広告過多により疲労が3.5倍速で進行',
  },
  christmas: {
    multiplier: 0.8,
    description: 'ホリデーシーズンは広告競争激化',
  },
  new_year: {
    multiplier: 1.1,
    description: '年始は広告への耐性が回復',
  },
}

// 閾値の解釈を生成する関数
export function interpretThreshold(
  metric: string,
  _value: number,
  status: 'safe' | 'warning' | 'critical'
): string {
  const metricData = THRESHOLD_RATIONALE[metric as keyof typeof THRESHOLD_RATIONALE]
  if (!metricData) return ''

  // videoMetricsとinstagramValueは構造が異なる
  if (metric === 'videoMetrics' || metric === 'instagramValue') {
    return ''
  }

  // rationaleプロパティを持つメトリクスのみ処理
  if ('rationale' in metricData) {
    const rationale = metricData.rationale as any
    return rationale[status] || ''
  }

  return ''
}

// 推奨アクションを生成する関数
export function getRecommendedActions(
  metric: string,
  status: 'safe' | 'warning' | 'critical'
): string[] {
  const actions: Record<string, Record<string, string[]>> = {
    frequency: {
      critical: [
        '広告セットを即座に停止',
        '新しいクリエイティブを準備',
        'オーディエンスを拡大または変更',
      ],
      warning: [
        'クリエイティブのリフレッシュを計画',
        'オーディエンスの拡大を検討',
        '配信ペースを調整',
      ],
      safe: ['現状を維持', 'パフォーマンスを継続監視'],
    },
    ctrDecline: {
      critical: ['クリエイティブを即座に変更', '広告コピーを見直し', 'ターゲティングを再評価'],
      warning: ['A/Bテストで新バージョンをテスト', '広告の要素を部分的に更新', '配信時間帯を調整'],
      safe: ['微調整で最適化を継続', '成功要因を分析して横展開'],
    },
    firstTimeRatio: {
      critical: ['類似オーディエンスを作成', '興味関心ターゲティングを拡大', '地域を拡大'],
      warning: ['オーディエンスサイズを確認', '除外設定を見直し', '新しいセグメントをテスト'],
      safe: ['オーディエンス戦略を維持', '拡大の機会を探索'],
    },
  }

  return actions[metric]?.[status] || []
}
