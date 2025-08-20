// 疲労度分析の閾値設定
export const FATIGUE_THRESHOLDS = {
  // フリークエンシー（頻度）の閾値
  frequency: {
    safe: 2.5, // 安全域
    warning: 3.0, // 警告域
    critical: 3.5, // 危険域
  },

  // CTR低下率の閾値（ベースライン比）
  ctrDecline: {
    safe: 0.15, // 15%低下で注意
    warning: 0.25, // 25%低下で警告
    critical: 0.4, // 40%低下で危険
  },

  // First Time Impression Ratioの閾値
  firstTimeRatio: {
    safe: 0.5, // 50%以上が理想
    warning: 0.4, // 40%未満で警告
    critical: 0.3, // 30%未満で危険
  },

  // CPM上昇率の閾値（ベースライン比）
  cpmIncrease: {
    safe: 0.2, // 20%上昇で注意
    warning: 0.35, // 35%上昇で警告
    critical: 0.5, // 50%上昇で危険
  },

  // ネガティブフィードバック率の閾値（Phase 2用）
  negativeFeedback: {
    safe: 0.002, // 0.2%
    warning: 0.005, // 0.5%
    critical: 0.01, // 1.0%
  },

  // 動画完了率の閾値（Phase 3用）
  videoCompletionRate: {
    good: 0.25, // 25%以上が良好
    average: 0.15, // 15%が平均的
    poor: 0.1, // 10%未満が不良
  },
}

// スコアの重み付け設定
export const SCORE_WEIGHTS = {
  audience: 0.4, // 40%の重み - オーディエンス疲労
  creative: 0.35, // 35%の重み - クリエイティブ疲労
  algorithm: 0.25, // 25%の重み - アルゴリズム疲労
}

// 疲労度レベルの閾値
export const FATIGUE_LEVEL_THRESHOLDS = {
  healthy: 30, // 0-29: 健全
  caution: 50, // 30-49: 注意
  warning: 70, // 50-69: 警告
  critical: 100, // 70-100: 危険
}

// アラート設定
export const ALERT_SETTINGS = {
  // アラートを発生させる最小スコア
  minScoreForAlert: 50,

  // アラートの抑制期間（同一広告に対して）
  suppressionPeriodHours: 24,

  // 自動アクションの閾値
  autoActionThresholds: {
    pauseAd: 85, // スコア85以上で広告一時停止を推奨
    reduceFrequency: 70, // スコア70以上でフリークエンシーキャップを推奨
    refreshCreative: 60, // スコア60以上でクリエイティブ更新を推奨
  },
}

// 推奨アクションのテンプレート
export const RECOMMENDED_ACTIONS = {
  audience: {
    critical:
      'オーディエンスの飽和が深刻です。新しいターゲティングセグメントの追加、またはキャンペーンの一時停止を検討してください。',
    warning:
      'オーディエンスに疲労の兆候が見られます。フリークエンシーキャップの設定を検討してください。',
    caution: 'オーディエンスへの配信頻度に注意が必要です。今後の推移を監視してください。',
  },
  creative: {
    critical:
      'クリエイティブの効果が大幅に低下しています。新しいクリエイティブへの差し替えを強く推奨します。',
    warning:
      'クリエイティブのパフォーマンスが低下傾向です。A/Bテストで新しいバリエーションを試してください。',
    caution: 'クリエイティブに軽度の疲労兆候があります。バリエーションの追加を検討してください。',
  },
  algorithm: {
    critical:
      'アルゴリズムの配信効率が悪化しています。入札戦略の見直し、またはキャンペーンの再構築を検討してください。',
    warning: 'CPMが上昇傾向です。予算配分の最適化を検討してください。',
    caution: '配信効率に若干の低下が見られます。入札額の調整を検討してください。',
  },
  healthy: 'パフォーマンスは健全です。現在の戦略を継続してください。',
}

// 分析設定
export const ANALYSIS_CONFIG = {
  // 分析に必要な最小データポイント数
  minDataPoints: 3,

  // ベースライン計算用の日数
  baselineDays: 3,

  // 最近のパフォーマンス計算用の日数
  recentDays: 3,

  // デフォルトの分析期間（日数）
  defaultAnalysisPeriod: 30,

  // 更新頻度（分）
  updateFrequencyMinutes: 15,
}
