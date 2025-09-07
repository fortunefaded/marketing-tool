# タイムラインアナライザー詳細設計

## 概要

広告配信の履歴を可視化し、配信パターンの異常を自動検知する運用必須機能。30日間の配信状況を一目で把握し、問題の早期発見を実現する。

## コア機能

### 1. 配信状況の日別分析

#### データ構造
```typescript
interface DailyDeliveryStatus {
  date: Date;
  hasDelivery: boolean;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpm: number;
  };
  comparisonFlags: {
    vsYesterday: 'up' | 'down' | 'stable' | 'no_data';
    vsLastWeek: 'up' | 'down' | 'stable' | 'no_data';
    vsBaseline: 'normal' | 'warning' | 'critical';
  };
}
```

#### 配信ギャップ検出アルゴリズム
```typescript
class GapDetector {
  // 閾値設定
  private readonly thresholds = {
    minorGap: 1,      // 1日の停止
    majorGap: 3,      // 3日連続停止
    criticalGap: 7    // 7日以上の停止
  };
  
  detectGaps(timeline: DailyDeliveryStatus[]): DeliveryGap[] {
    const gaps: DeliveryGap[] = [];
    let currentGap: DeliveryGap | null = null;
    
    timeline.forEach((day, index) => {
      if (!day.hasDelivery) {
        if (!currentGap) {
          currentGap = {
            startDate: day.date,
            endDate: day.date,
            duration: 1,
            severity: 'minor'
          };
        } else {
          currentGap.endDate = day.date;
          currentGap.duration++;
        }
      } else {
        if (currentGap) {
          // ギャップの深刻度を判定
          currentGap.severity = this.calculateSeverity(currentGap.duration);
          currentGap.possibleCause = this.inferCause(currentGap, timeline);
          gaps.push(currentGap);
          currentGap = null;
        }
      }
    });
    
    return gaps;
  }
  
  private calculateSeverity(duration: number): 'minor' | 'major' | 'critical' {
    if (duration >= this.thresholds.criticalGap) return 'critical';
    if (duration >= this.thresholds.majorGap) return 'major';
    return 'minor';
  }
  
  private inferCause(gap: DeliveryGap, timeline: DailyDeliveryStatus[]): GapCause {
    // 前後のデータパターンから原因を推測
    // 例: 月末→予算枯渇、週末→スケジュール設定、突然→手動停止
    // 実装詳細は省略
  }
}
```

### 2. 異常パターン検知

#### 異常検知ルール定義
```typescript
const ANOMALY_DETECTION_RULES = {
  // 突然の配信停止
  suddenStop: {
    condition: (current: DailyDeliveryStatus, previous: DailyDeliveryStatus[]) => {
      const avgImpressions = average(previous.map(d => d.metrics.impressions));
      return current.metrics.impressions === 0 && avgImpressions > 1000;
    },
    severity: 'high',
    threshold: 3,  // 3日連続で発生したら確定
    message: '広告配信が突然停止しました'
  },
  
  // パフォーマンス急落
  performanceDrop: {
    condition: (current: DailyDeliveryStatus, baseline: number) => {
      return current.metrics.ctr < baseline * 0.5; // ベースラインの50%以下
    },
    severity: 'medium',
    threshold: 2,  // 2日連続で発生
    message: 'CTRが基準値の50%以下に低下しています'
  },
  
  // 異常な支出増加
  spendSpike: {
    condition: (current: DailyDeliveryStatus, avgSpend: number) => {
      return current.metrics.spend > avgSpend * 2; // 平均の2倍以上
    },
    severity: 'high',
    threshold: 1,  // 即座に通知
    message: '広告費が平均の2倍を超えています'
  },
  
  // 断続的配信パターン
  intermittentDelivery: {
    condition: (timeline: DailyDeliveryStatus[]) => {
      const last7Days = timeline.slice(-7);
      const deliveryDays = last7Days.filter(d => d.hasDelivery).length;
      return deliveryDays >= 2 && deliveryDays <= 5; // 7日中2-5日のみ配信
    },
    severity: 'low',
    threshold: 7,  // 7日間のパターンを確認
    message: '配信が断続的になっています'
  },
  
  // フリークエンシー過多
  highFrequency: {
    condition: (current: DailyDeliveryStatus, frequency: number) => {
      return frequency > 5.0; // Frequency 5.0超過
    },
    severity: 'medium',
    threshold: 1,
    message: 'フリークエンシーが危険水準（5.0）を超えています'
  }
};
```

#### AnomalyDetectorクラス
```typescript
class AnomalyDetector {
  private detectionHistory: Map<string, number> = new Map();
  
  async detectAnomalies(
    timeline: DailyDeliveryStatus[],
    config: AnomalyDetectionConfig
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const baseline = await this.calculateBaseline(timeline);
    
    for (const [ruleName, rule] of Object.entries(ANOMALY_DETECTION_RULES)) {
      if (!config.enabledRules.includes(ruleName)) continue;
      
      const detected = this.checkRule(rule, timeline, baseline);
      
      if (detected) {
        // 閾値チェック（連続発生回数）
        const count = (this.detectionHistory.get(ruleName) || 0) + 1;
        this.detectionHistory.set(ruleName, count);
        
        if (count >= rule.threshold) {
          anomalies.push({
            type: ruleName as AnomalyType,
            severity: rule.severity,
            dateRange: this.getAffectedDateRange(timeline),
            message: rule.message,
            recommendation: this.generateRecommendation(ruleName),
            confidence: this.calculateConfidence(count, rule.threshold)
          });
        }
      } else {
        // ルール違反が解消されたらカウントリセット
        this.detectionHistory.delete(ruleName);
      }
    }
    
    return anomalies;
  }
  
  private calculateBaseline(timeline: DailyDeliveryStatus[]): BaselineMetrics {
    // 過去30日間の中央値・平均値を計算
    const activeDays = timeline.filter(d => d.hasDelivery);
    
    return {
      avgImpressions: average(activeDays.map(d => d.metrics.impressions)),
      medianCTR: median(activeDays.map(d => d.metrics.ctr)),
      avgSpend: average(activeDays.map(d => d.metrics.spend)),
      avgCPM: average(activeDays.map(d => d.metrics.cpm))
    };
  }
  
  private generateRecommendation(anomalyType: string): string {
    const recommendations = {
      suddenStop: '広告アカウント、予算設定、配信スケジュールを確認してください',
      performanceDrop: 'クリエイティブの更新、ターゲティングの見直しを検討してください',
      spendSpike: '予算上限の設定、入札戦略の確認を行ってください',
      intermittentDelivery: '配信スケジュール設定、予算配分を確認してください',
      highFrequency: 'オーディエンス拡大、フリークエンシーキャップの設定を検討してください'
    };
    
    return recommendations[anomalyType] || '詳細な分析が必要です';
  }
}
```

### 3. 配信強度の時系列変化追跡

#### IntensityTracker
```typescript
class DeliveryIntensityTracker {
  calculateIntensity(day: DailyDeliveryStatus): DeliveryIntensity {
    if (!day.hasDelivery) {
      return { level: 0, label: 'no_delivery' };
    }
    
    // インプレッション数を基準に強度を計算
    const impressions = day.metrics.impressions;
    
    if (impressions === 0) return { level: 0, label: 'no_delivery' };
    if (impressions < 1000) return { level: 1, label: 'very_low' };
    if (impressions < 5000) return { level: 2, label: 'low' };
    if (impressions < 10000) return { level: 3, label: 'medium' };
    if (impressions < 50000) return { level: 4, label: 'high' };
    return { level: 5, label: 'very_high' };
  }
  
  detectTrend(timeline: DailyDeliveryStatus[], windowSize: number = 7): TrendInfo {
    const recentWindow = timeline.slice(-windowSize);
    const previousWindow = timeline.slice(-windowSize * 2, -windowSize);
    
    const recentAvg = average(recentWindow.map(d => d.metrics.impressions));
    const previousAvg = average(previousWindow.map(d => d.metrics.impressions));
    
    const changeRate = (recentAvg - previousAvg) / previousAvg;
    
    return {
      direction: changeRate > 0.1 ? 'up' : changeRate < -0.1 ? 'down' : 'stable',
      changeRate,
      confidence: this.calculateTrendConfidence(recentWindow),
      forecast: this.generateForecast(timeline, changeRate)
    };
  }
  
  private generateForecast(
    timeline: DailyDeliveryStatus[], 
    trendRate: number
  ): ForecastInfo {
    // 簡単な線形予測
    const lastValue = timeline[timeline.length - 1].metrics.impressions;
    const next7Days = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(new Date(), i + 1),
      predictedImpressions: lastValue * Math.pow(1 + trendRate, i + 1),
      confidence: Math.max(0.5, 1 - (i * 0.1)) // 日数が進むほど信頼度低下
    }));
    
    return { predictions: next7Days };
  }
}
```

## 視覚化コンポーネント

### 技術選定

**採用: Recharts + React**
- 理由:
  - React エコシステムとの親和性が高い
  - レスポンシブ対応が容易
  - カスタマイズ性が高い
  - 軽量でパフォーマンスが良い
  - TypeScript サポートが充実

**代替案の検討結果:**
- D3.js: 高機能だが学習コストが高く、オーバースペック
- Chart.js: Canvas ベースで React との統合が複雑
- Victory: 良い選択肢だが、コミュニティが Recharts より小さい

### TimelineViewComponent

#### カレンダービュー実装
```typescript
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Cell, ReferenceArea } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface TimelineCalendarViewProps {
  data: DailyDeliveryStatus[];
  gaps: DeliveryGap[];
  anomalies: Anomaly[];
  onDateClick: (date: Date) => void;
}

const TimelineCalendarView: React.FC<TimelineCalendarViewProps> = ({
  data,
  gaps,
  anomalies,
  onDateClick
}) => {
  // カレンダーグリッドの生成
  const generateCalendarGrid = () => {
    const start = startOfMonth(data[0].date);
    const end = endOfMonth(data[data.length - 1].date);
    const days = eachDayOfInterval({ start, end });
    
    return days.map(date => {
      const dayData = data.find(d => isSameDay(d.date, date));
      const gap = gaps.find(g => isWithinInterval(date, { start: g.startDate, end: g.endDate }));
      const anomaly = anomalies.find(a => isWithinInterval(date, a.dateRange));
      
      return {
        date,
        status: dayData?.hasDelivery ? 'active' : 'inactive',
        intensity: dayData?.metrics.impressions || 0,
        isGap: !!gap,
        gapSeverity: gap?.severity,
        hasAnomaly: !!anomaly,
        anomalySeverity: anomaly?.severity
      };
    });
  };
  
  const getColorForCell = (cell: CalendarCell): string => {
    if (cell.hasAnomaly) {
      const severityColors = {
        low: '#FCD34D',    // yellow-300
        medium: '#FB923C', // orange-400
        high: '#EF4444'    // red-500
      };
      return severityColors[cell.anomalySeverity];
    }
    
    if (cell.isGap) {
      return '#9CA3AF'; // gray-400
    }
    
    if (cell.status === 'active') {
      // インテンシティに基づくグラデーション
      const intensity = Math.min(cell.intensity / 10000, 1);
      return `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`; // green with opacity
    }
    
    return '#F3F4F6'; // gray-100
  };
  
  return (
    <div className="timeline-calendar">
      {/* 月ヘッダー */}
      <div className="calendar-header">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => (
          <div key={day} className="day-label">{day}</div>
        ))}
      </div>
      
      {/* カレンダーグリッド */}
      <div className="calendar-grid">
        {generateCalendarGrid().map((cell, index) => (
          <div
            key={index}
            className="calendar-cell"
            style={{ backgroundColor: getColorForCell(cell) }}
            onClick={() => onDateClick(cell.date)}
            title={`${format(cell.date, 'MM/dd')}: ${cell.intensity} impressions`}
          >
            <span className="date-number">{format(cell.date, 'd')}</span>
            {cell.hasAnomaly && <span className="anomaly-indicator">!</span>}
          </div>
        ))}
      </div>
      
      {/* 凡例 */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="color-box active" />
          <span>配信あり</span>
        </div>
        <div className="legend-item">
          <span className="color-box inactive" />
          <span>配信なし</span>
        </div>
        <div className="legend-item">
          <span className="color-box anomaly" />
          <span>異常検知</span>
        </div>
      </div>
    </div>
  );
};
```

#### 時系列グラフビュー
```typescript
const TimelineGraphView: React.FC<TimelineGraphViewProps> = ({
  data,
  metric = 'impressions',
  showAnomalies = true,
  showGaps = true
}) => {
  const chartData = data.map(d => ({
    date: format(d.date, 'MM/dd'),
    value: d.metrics[metric],
    hasDelivery: d.hasDelivery
  }));
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        
        {/* 配信ギャップを背景色で表示 */}
        {showGaps && gaps.map((gap, index) => (
          <ReferenceArea
            key={index}
            x1={format(gap.startDate, 'MM/dd')}
            x2={format(gap.endDate, 'MM/dd')}
            fill="#EF4444"
            fillOpacity={0.1}
            label={`Gap: ${gap.duration} days`}
          />
        ))}
        
        {/* メインメトリクスライン */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            if (!payload.hasDelivery) {
              return <circle cx={cx} cy={cy} r={4} fill="#EF4444" />;
            }
            return <circle cx={cx} cy={cy} r={3} fill="#3B82F6" />;
          }}
        />
        
        {/* 異常検知マーカー */}
        {showAnomalies && anomalies.map((anomaly, index) => (
          <ReferenceDot
            key={index}
            x={format(anomaly.date, 'MM/dd')}
            y={chartData.find(d => d.date === format(anomaly.date, 'MM/dd'))?.value}
            r={8}
            fill="#EF4444"
            stroke="#991B1B"
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### ヒートマップビュー
```typescript
const DeliveryHeatmap: React.FC<HeatmapProps> = ({ data }) => {
  // 時間別×曜日別のヒートマップ生成
  const generateHeatmapData = () => {
    const heatmap = Array(24).fill(null).map(() => Array(7).fill(0));
    
    data.forEach(day => {
      if (!day.hasDelivery) return;
      
      const dayOfWeek = day.date.getDay();
      const hourlyDistribution = estimateHourlyDistribution(day);
      
      hourlyDistribution.forEach((value, hour) => {
        heatmap[hour][dayOfWeek] += value;
      });
    });
    
    return heatmap;
  };
  
  return (
    <div className="heatmap-container">
      {/* ヒートマップ実装 */}
    </div>
  );
};
```

## パフォーマンス最適化

### 1. 仮想化によるレンダリング最適化
```typescript
import { VariableSizeList } from 'react-window';

// 大量データの仮想スクロール対応
const VirtualizedTimeline = ({ data, itemHeight = 50 }) => {
  return (
    <VariableSizeList
      height={600}
      itemCount={data.length}
      itemSize={() => itemHeight}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <TimelineItem data={data[index]} />
        </div>
      )}
    </VariableSizeList>
  );
};
```

### 2. メモ化とキャッシング
```typescript
const TimelineAnalyzer = React.memo(({ data, config }) => {
  // 重い計算結果をメモ化
  const gaps = useMemo(() => detectGaps(data), [data]);
  const anomalies = useMemo(() => detectAnomalies(data, config), [data, config]);
  const intensity = useMemo(() => calculateIntensity(data), [data]);
  
  return (
    <TimelineView
      gaps={gaps}
      anomalies={anomalies}
      intensity={intensity}
    />
  );
});
```

### 3. 遅延読み込み
```typescript
const LazyTimelineComponent = lazy(() => import('./TimelineView'));

// 必要になるまでロードしない
<Suspense fallback={<TimelineSkeletonLoader />}>
  <LazyTimelineComponent data={timelineData} />
</Suspense>
```

## 成功指標

### パフォーマンス目標
- **初回描画**: 500ms以内
- **スクロール**: 60fps維持
- **データ更新**: 100ms以内の反映

### 検知精度目標
- **異常検知精度**: 90%以上
- **誤検知率**: 5%以下
- **ギャップ検出**: 100%（全停止期間を検出）

### ユーザビリティ目標
- **理解容易性**: 5秒以内に配信状況を把握
- **操作性**: モバイルでも快適に操作可能
- **情報密度**: 1画面で30日分を俯瞰可能

この設計により、広告運用の死活監視と異常の早期発見を実現し、運用品質を大幅に向上させる。