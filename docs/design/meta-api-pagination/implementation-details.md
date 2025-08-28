# 実装詳細補完ドキュメント

## 配信ギャップ原因推定ロジック

### inferCause メソッドの完全実装

```typescript
private inferCause(gap: DeliveryGap, timeline: DailyDeliveryStatus[]): GapCause {
  const gapStartIndex = timeline.findIndex(d => 
    d.date.getTime() === gap.startDate.getTime()
  );
  
  // 前後のコンテキストを取得
  const beforeGap = timeline.slice(Math.max(0, gapStartIndex - 7), gapStartIndex);
  const afterGap = timeline.slice(
    gapStartIndex + gap.duration, 
    Math.min(timeline.length, gapStartIndex + gap.duration + 7)
  );
  
  // 1. 予算枯渇パターン
  if (this.checkBudgetExhaustion(beforeGap, gap)) {
    return 'budget_exhausted';
  }
  
  // 2. スケジュール設定パターン
  if (this.checkSchedulePattern(gap, timeline)) {
    return 'schedule_setting';
  }
  
  // 3. 手動停止パターン
  if (this.checkManualPause(beforeGap, afterGap)) {
    return 'manual_pause';
  }
  
  // 4. オーディエンス枯渇パターン
  if (this.checkAudienceExhaustion(beforeGap)) {
    return 'audience_exhausted';
  }
  
  // 5. 入札額不足パターン
  if (this.checkLowBid(beforeGap)) {
    return 'bid_too_low';
  }
  
  return 'unknown';
}

// 予算枯渇チェック
private checkBudgetExhaustion(beforeGap: DailyDeliveryStatus[], gap: DeliveryGap): boolean {
  // 月末または予算期間終了時のギャップ
  const gapDate = gap.startDate;
  const isMonthEnd = gapDate.getDate() >= 28;
  const isWeekend = gapDate.getDay() === 0 || gapDate.getDay() === 6;
  
  // ギャップ前の支出が急増していた場合
  if (beforeGap.length >= 3) {
    const lastDaysSpend = beforeGap.slice(-3).map(d => d.metrics.spend);
    const avgSpend = average(lastDaysSpend);
    const previousAvgSpend = beforeGap.length > 6 
      ? average(beforeGap.slice(0, -3).map(d => d.metrics.spend))
      : avgSpend;
    
    // 直前3日の支出が以前の2倍以上
    if (avgSpend > previousAvgSpend * 2) {
      return true;
    }
  }
  
  // 月末かつ支出が増加傾向
  if (isMonthEnd && this.isIncreasingTrend(beforeGap.map(d => d.metrics.spend))) {
    return true;
  }
  
  return false;
}

// スケジュール設定パターンチェック
private checkSchedulePattern(gap: DeliveryGap, timeline: DailyDeliveryStatus[]): boolean {
  const gapDays = this.getGapDays(gap);
  
  // 週末のみのギャップ
  const isWeekendOnly = gapDays.every(date => {
    const day = date.getDay();
    return day === 0 || day === 6;
  });
  
  // 深夜時間帯のギャップ（時間帯情報があれば）
  const isNightTime = this.checkNightTimePattern(gap, timeline);
  
  // 定期的なパターン（毎週同じ曜日など）
  const isRegularPattern = this.checkRegularPattern(gap, timeline);
  
  return isWeekendOnly || isNightTime || isRegularPattern;
}

// 手動停止パターンチェック
private checkManualPause(
  beforeGap: DailyDeliveryStatus[], 
  afterGap: DailyDeliveryStatus[]
): boolean {
  // 突然の停止（前日まで正常配信）
  const wasNormalBefore = beforeGap.length > 0 && 
    beforeGap[beforeGap.length - 1].hasDelivery &&
    beforeGap[beforeGap.length - 1].metrics.impressions > 1000;
  
  // 再開時も正常（問題なく再開）
  const isNormalAfter = afterGap.length > 0 &&
    afterGap[0].hasDelivery &&
    afterGap[0].metrics.impressions > 1000;
  
  // パフォーマンス低下なし
  const noPerformanceIssue = beforeGap.length > 0 &&
    beforeGap[beforeGap.length - 1].metrics.ctr > 0.5;
  
  return wasNormalBefore && isNormalAfter && noPerformanceIssue;
}

// オーディエンス枯渇チェック
private checkAudienceExhaustion(beforeGap: DailyDeliveryStatus[]): boolean {
  if (beforeGap.length < 7) return false;
  
  // フリークエンシーの増加傾向
  const frequencies = beforeGap.map(d => d.metrics.frequency);
  const isFrequencyIncreasing = this.isIncreasingTrend(frequencies);
  const highFrequency = frequencies[frequencies.length - 1] > 5.0;
  
  // リーチの減少傾向
  const reaches = beforeGap.map(d => d.metrics.reach);
  const isReachDecreasing = this.isDecreasingTrend(reaches);
  
  // CPMの上昇傾向
  const cpms = beforeGap.map(d => d.metrics.cpm);
  const isCpmIncreasing = this.isIncreasingTrend(cpms);
  
  return (isFrequencyIncreasing && highFrequency) || 
         (isReachDecreasing && isCpmIncreasing);
}

// 入札額不足チェック
private checkLowBid(beforeGap: DailyDeliveryStatus[]): boolean {
  if (beforeGap.length < 3) return false;
  
  // インプレッション数の急減
  const impressions = beforeGap.map(d => d.metrics.impressions);
  const lastImpression = impressions[impressions.length - 1];
  const avgImpression = average(impressions.slice(0, -1));
  
  // 最後のインプレッションが平均の10%未満
  const severeDropoff = lastImpression < avgImpression * 0.1;
  
  // CPMは正常範囲
  const normalCpm = beforeGap[beforeGap.length - 1].metrics.cpm < 5000;
  
  return severeDropoff && normalCpm;
}
```

## 時間別配信推定ロジック

### estimateHourlyDistribution メソッドの実装

```typescript
/**
 * 日次データから時間別分布を推定
 * Meta APIは時間別データを直接提供しないため、推定アルゴリズムを使用
 */
private estimateHourlyDistribution(dayData: DailyDeliveryStatus): number[] {
  const hourlyDistribution = new Array(24).fill(0);
  
  if (!dayData.hasDelivery || dayData.metrics.impressions === 0) {
    return hourlyDistribution;
  }
  
  // 基本配信パターン（業界標準）
  const standardPattern = this.getStandardHourlyPattern(dayData);
  
  // 曜日による調整
  const dayOfWeek = dayData.date.getDay();
  const weekdayAdjustment = this.getWeekdayAdjustment(dayOfWeek);
  
  // CTRベースの活動度推定
  const activityLevel = this.estimateActivityLevel(dayData.metrics);
  
  // 配信強度による調整
  const intensityFactor = dayData.deliveryIntensity.level / 5;
  
  // 時間別分布の計算
  const totalImpressions = dayData.metrics.impressions;
  
  for (let hour = 0; hour < 24; hour++) {
    const baseRate = standardPattern[hour];
    const adjustedRate = baseRate * weekdayAdjustment[hour] * activityLevel;
    
    // インプレッション数を時間別に配分
    hourlyDistribution[hour] = Math.round(
      totalImpressions * adjustedRate * intensityFactor
    );
  }
  
  // 正規化（合計が元のインプレッション数になるよう調整）
  const sum = hourlyDistribution.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    const ratio = totalImpressions / sum;
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = Math.round(hourlyDistribution[i] * ratio);
    }
  }
  
  return hourlyDistribution;
}

/**
 * 業界標準の時間別配信パターン
 */
private getStandardHourlyPattern(dayData: DailyDeliveryStatus): number[] {
  // B2C向けの一般的なパターン
  const b2cPattern = [
    0.01, 0.01, 0.01, 0.01, 0.02, 0.03,  // 0-5時: 深夜
    0.04, 0.05, 0.06, 0.07, 0.08, 0.09,  // 6-11時: 朝
    0.08, 0.07, 0.06, 0.06, 0.05, 0.05,  // 12-17時: 昼
    0.06, 0.08, 0.09, 0.08, 0.06, 0.03   // 18-23時: 夜
  ];
  
  // B2B向けのパターン
  const b2bPattern = [
    0.01, 0.01, 0.01, 0.01, 0.01, 0.02,  // 0-5時
    0.03, 0.05, 0.08, 0.10, 0.11, 0.10,  // 6-11時: 業務開始
    0.09, 0.08, 0.08, 0.07, 0.06, 0.04,  // 12-17時: 業務時間
    0.03, 0.02, 0.02, 0.01, 0.01, 0.01   // 18-23時: 業務終了後
  ];
  
  // キャンペーンタイプによる判定（簡易版）
  const isB2B = this.inferB2BPattern(dayData);
  return isB2B ? b2bPattern : b2cPattern;
}

/**
 * 曜日による調整係数
 */
private getWeekdayAdjustment(dayOfWeek: number): number[] {
  const adjustments = new Array(24).fill(1);
  
  switch(dayOfWeek) {
    case 0: // 日曜日
      // 午前中と夜間が活発
      for (let i = 10; i < 14; i++) adjustments[i] = 1.2;
      for (let i = 20; i < 23; i++) adjustments[i] = 1.3;
      break;
      
    case 6: // 土曜日
      // 昼間が活発
      for (let i = 11; i < 16; i++) adjustments[i] = 1.25;
      break;
      
    case 1: // 月曜日
      // 朝が活発（週始め）
      for (let i = 7; i < 10; i++) adjustments[i] = 1.15;
      break;
      
    case 5: // 金曜日
      // 夕方以降が活発
      for (let i = 17; i < 22; i++) adjustments[i] = 1.2;
      break;
      
    default:
      // 平日は標準
      break;
  }
  
  return adjustments;
}

/**
 * メトリクスから活動レベルを推定
 */
private estimateActivityLevel(metrics: DailyMetrics): number {
  // CTRが高い = ユーザーが活発
  const ctrFactor = Math.min(metrics.ctr / 2.0, 2.0); // CTR 2%を基準
  
  // エンゲージメント率から推定
  const engagementFactor = metrics.clicks / Math.max(metrics.impressions, 1);
  
  // フリークエンシーから推定（低いほど新規ユーザーが多い = 活発）
  const frequencyFactor = Math.max(2.0 - metrics.frequency / 3.0, 0.5);
  
  return (ctrFactor + engagementFactor + frequencyFactor) / 3;
}

/**
 * B2Bパターンかどうかを推定
 */
private inferB2BPattern(dayData: DailyDeliveryStatus): boolean {
  // 平日のCTRが高く、週末が低い傾向
  // CPC/CPMが高い傾向
  // 実装の簡易版
  
  const dayOfWeek = dayData.date.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const highCPC = dayData.metrics.cpc > 500; // 500円以上
  const highCPM = dayData.metrics.cpm > 3000; // 3000円以上
  
  return isWeekday && (highCPC || highCPM);
}
```

## キャッシュとタイムラインの統合戦略

### 統合アーキテクチャ

```typescript
/**
 * タイムラインデータの階層的キャッシュ管理
 */
class TimelineCacheManager extends IntelligentCacheManager {
  
  /**
   * タイムラインデータの取得（キャッシュ優先）
   */
  async getTimelineData(
    accountId: string,
    dateRange: DateRange,
    options?: TimelineCacheOptions
  ): Promise<TimelineData> {
    const cacheKey = this.generateTimelineCacheKey(accountId, dateRange);
    
    // 1. メモリキャッシュチェック（最速）
    const memoryResult = await this.checkMemoryCache(cacheKey);
    if (memoryResult.hit && this.isTimelineDataFresh(memoryResult.data, options)) {
      return memoryResult.data;
    }
    
    // 2. LocalStorageキャッシュチェック
    const localResult = await this.checkLocalStorageCache(cacheKey);
    if (localResult.hit && this.isTimelineDataFresh(localResult.data, options)) {
      // メモリにも保存
      await this.saveToMemoryCache(cacheKey, localResult.data);
      return localResult.data;
    }
    
    // 3. Convexキャッシュチェック
    const convexResult = await this.checkConvexCache(cacheKey);
    if (convexResult.hit) {
      // 差分更新の必要性をチェック
      const needsUpdate = this.needsIncrementalUpdate(convexResult.data, dateRange);
      
      if (needsUpdate) {
        // 差分データのみ取得
        const incrementalData = await this.fetchIncrementalTimelineData(
          accountId,
          convexResult.data,
          dateRange
        );
        
        // マージして更新
        const mergedData = this.mergeTimelineData(convexResult.data, incrementalData);
        await this.updateAllCacheLayers(cacheKey, mergedData);
        return mergedData;
      } else {
        // 上位キャッシュに復元
        await this.promoteToUpperCaches(cacheKey, convexResult.data);
        return convexResult.data;
      }
    }
    
    // 4. キャッシュミス: 完全新規取得
    const freshData = await this.fetchCompleteTimelineData(accountId, dateRange);
    await this.updateAllCacheLayers(cacheKey, freshData);
    return freshData;
  }
  
  /**
   * タイムラインデータの鮮度チェック
   */
  private isTimelineDataFresh(
    data: TimelineData,
    options?: TimelineCacheOptions
  ): boolean {
    const now = Date.now();
    const dataAge = now - data.metadata.lastUpdated.getTime();
    
    // 今日のデータ: 5分以内
    if (this.containsToday(data.timeline)) {
      return dataAge < 5 * 60 * 1000;
    }
    
    // 直近7日: 1時間以内
    if (this.isRecentData(data.timeline)) {
      return dataAge < 60 * 60 * 1000;
    }
    
    // 履歴データ: 24時間以内
    return dataAge < 24 * 60 * 60 * 1000;
  }
  
  /**
   * 異常検知結果のキャッシュ戦略
   */
  async cacheAnomalyDetection(
    anomalies: Anomaly[],
    config: AnomalyCacheConfig
  ): Promise<void> {
    // 重要度別にキャッシュ戦略を変更
    for (const anomaly of anomalies) {
      const cacheKey = `anomaly:${anomaly.id}`;
      
      switch(anomaly.severity) {
        case 'critical':
          // 全層に即座に保存、長期保持
          await this.saveToAllLayers(cacheKey, anomaly, {
            memory: 30 * 60 * 1000,     // 30分
            localStorage: 24 * 60 * 60 * 1000, // 24時間
            convex: 7 * 24 * 60 * 60 * 1000   // 7日
          });
          break;
          
        case 'high':
        case 'medium':
          // メモリとLocalStorageに保存
          await this.saveToMemoryCache(cacheKey, anomaly, 15 * 60 * 1000);
          await this.saveToLocalStorageCache(cacheKey, anomaly, 6 * 60 * 60 * 1000);
          break;
          
        case 'low':
          // メモリのみ
          await this.saveToMemoryCache(cacheKey, anomaly, 5 * 60 * 1000);
          break;
      }
    }
  }
  
  /**
   * リアルタイム更新とキャッシュの同期
   */
  async syncRealtimeUpdate(
    update: RealtimeUpdate
  ): Promise<void> {
    // WebSocketやSSEで受信したリアルタイム更新を処理
    
    // 1. 該当するキャッシュキーを特定
    const affectedKeys = this.identifyAffectedCacheKeys(update);
    
    // 2. 各キャッシュ層を更新
    for (const key of affectedKeys) {
      // メモリキャッシュは即座に更新
      const memoryData = await this.getFromMemoryCache(key);
      if (memoryData) {
        const updated = this.applyRealtimeUpdate(memoryData, update);
        await this.saveToMemoryCache(key, updated);
      }
      
      // LocalStorageは遅延更新（バッチ処理）
      this.scheduleLocalStorageUpdate(key, update);
      
      // Convexは次回の定期同期で更新
      this.markForConvexSync(key);
    }
    
    // 3. 異常検知をトリガー
    if (this.shouldTriggerAnomalyDetection(update)) {
      this.triggerAnomalyDetection(update.accountId);
    }
  }
}
```

この実装により、指摘された課題を解決し、実用的な設計が完成しました。