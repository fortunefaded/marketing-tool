/**
 * gap-detection-engine.test.ts
 * TASK-202: ギャップ検出エンジンのユニットテスト
 */

import { GapDetectionEngine, createDefaultGapDetectionConfig } from '../gap-detection-engine'
import type { 
  TimelineData, 
  DailyDeliveryStatus, 
  DailyMetrics,
  GapDetectionConfig 
} from '../../types'

// テスト用のヘルパー関数
const createMockDailyMetrics = (overrides: Partial<DailyMetrics> = {}): DailyMetrics => ({
  impressions: 1000,
  clicks: 50,
  spend: 100,
  reach: 800,
  frequency: 1.25,
  ctr: 5.0,
  cpc: 2.0,
  cpm: 125.0,
  conversions: 5,
  conversionRate: 10.0,
  ...overrides
})

const createMockDailyStatus = (date: Date, hasDelivery: boolean, metrics?: Partial<DailyMetrics>): DailyDeliveryStatus => ({
  date,
  hasDelivery,
  adId: 'test_ad_123',
  campaignId: 'test_campaign_456',
  metrics: hasDelivery ? createMockDailyMetrics(metrics) : createMockDailyMetrics({ 
    impressions: 0, clicks: 0, spend: 0, reach: 0, frequency: 0, 
    ctr: 0, cpc: 0, cpm: 0, conversions: 0, conversionRate: 0 
  }),
  comparisonFlags: {
    vsYesterday: {},
    vsLastWeek: {},
    vsBaseline: { status: 'normal', deviation: 0 },
    percentageChange: { daily: 0, weekly: 0 }
  },
  anomalyFlags: [],
  deliveryIntensity: hasDelivery ? 'medium' : 'none'
})

const createMockTimelineData = (dailyStatuses: DailyDeliveryStatus[]): TimelineData => {
  const deliveryDays = dailyStatuses.filter(s => s.hasDelivery).length
  const totalDays = dailyStatuses.length
  
  return {
    totalDays,
    deliveryDays,
    gapDays: totalDays - deliveryDays,
    dailyStatuses,
    aggregatedMetrics: {
      totalImpressions: 10000,
      totalClicks: 500,
      totalSpend: 1000,
      totalConversions: 50,
      averageCTR: 5.0,
      averageCPC: 2.0,
      averageCPM: 125.0,
      averageFrequency: 1.25
    },
    dateRange: {
      start: dailyStatuses[0]?.date || new Date('2024-01-01'),
      end: dailyStatuses[dailyStatuses.length - 1]?.date || new Date('2024-01-07')
    }
  }
}

describe('GapDetectionEngine', () => {
  let engine: GapDetectionEngine
  let config: GapDetectionConfig

  beforeEach(() => {
    config = createDefaultGapDetectionConfig()
    engine = new GapDetectionEngine(config)
  })

  describe('基本的なギャップ検出', () => {
    test('配信の空白期間を正しく検出する', () => {
      // テストデータ: 1日目配信 → 2-3日目ギャップ → 4日目配信
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false),
        createMockDailyStatus(new Date('2024-01-04'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(1)
      expect(result.gaps[0].durationDays).toBe(2)
      expect(result.gaps[0].startDate).toEqual(new Date('2024-01-02'))
      expect(result.gaps[0].endDate).toEqual(new Date('2024-01-04'))
    })

    test('最小ギャップ日数未満は無視される', () => {
      config.minGapDays = 2
      engine = new GapDetectionEngine(config)
      
      // 1日だけのギャップ
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false), // 1日ギャップ
        createMockDailyStatus(new Date('2024-01-03'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(0)
    })

    test('複数のギャップを検出する', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false), // ギャップ1開始
        createMockDailyStatus(new Date('2024-01-03'), false), // ギャップ1継続
        createMockDailyStatus(new Date('2024-01-04'), true),
        createMockDailyStatus(new Date('2024-01-05'), true),
        createMockDailyStatus(new Date('2024-01-06'), false), // ギャップ2開始
        createMockDailyStatus(new Date('2024-01-07'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(2)
      expect(result.gaps[0].durationDays).toBe(2)
      expect(result.gaps[1].durationDays).toBe(1)
    })
  })

  describe('重要度判定', () => {
    test('重大ギャップを正しく分類する', () => {
      config.thresholds.criticalGapDays = 5
      engine = new GapDetectionEngine(config)
      
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        ...Array.from({ length: 7 }, (_, i) => 
          createMockDailyStatus(new Date(`2024-01-${String(i + 2).padStart(2, '0')}`), false)
        ),
        createMockDailyStatus(new Date('2024-01-09'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].severity).toBe('critical')
      expect(result.statistics.severityDistribution.critical).toBe(1)
    })

    test('主要ギャップを正しく分類する', () => {
      config.thresholds.majorGapDays = 3
      config.thresholds.criticalGapDays = 7
      engine = new GapDetectionEngine(config)
      
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false),
        createMockDailyStatus(new Date('2024-01-04'), false),
        createMockDailyStatus(new Date('2024-01-05'), false), // 4日ギャップ
        createMockDailyStatus(new Date('2024-01-06'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].severity).toBe('major')
      expect(result.statistics.severityDistribution.major).toBe(1)
    })
  })

  describe('ギャップタイプ判定', () => {
    test('週末ギャップを検出する', () => {
      // 土曜日から日曜日のギャップ（2024-01-06は土曜日）
      const saturday = new Date('2024-01-06') // 土曜日
      const sunday = new Date('2024-01-07')   // 日曜日
      const monday = new Date('2024-01-08')   // 月曜日
      
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-05'), true), // 金曜日
        createMockDailyStatus(saturday, false),
        createMockDailyStatus(sunday, false),
        createMockDailyStatus(monday, true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].type).toBe('weekend')
    })

    test('予期しないギャップを分類する', () => {
      // 平日の予期しないギャップ
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true), // 月曜日
        createMockDailyStatus(new Date('2024-01-02'), false), // 火曜日
        createMockDailyStatus(new Date('2024-01-03'), false), // 水曜日
        createMockDailyStatus(new Date('2024-01-04'), true)  // 木曜日
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].type).toBe('unexpected')
    })
  })

  describe('パフォーマンス影響度計算', () => {
    test('CTR低下率を正しく計算する', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true, { ctr: 5.0 }),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), true, { ctr: 3.0 }) // 40%低下
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].impact.performanceDrop).toBeCloseTo(40.0, 1)
    })

    test('推定損失インプレッションを計算する', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true, { impressions: 1000 }),
        createMockDailyStatus(new Date('2024-01-02'), false), // 1日ギャップ
        createMockDailyStatus(new Date('2024-01-03'), true, { impressions: 1000 })
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.gaps[0].impact.estimatedLostImpressions).toBe(1000) // 1日 × 1000
    })
  })

  describe('統計計算', () => {
    test('全体統計を正しく計算する', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false),
        createMockDailyStatus(new Date('2024-01-04'), true),
        createMockDailyStatus(new Date('2024-01-05'), true),
        createMockDailyStatus(new Date('2024-01-06'), false),
        createMockDailyStatus(new Date('2024-01-07'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.statistics.totalGapDays).toBe(3) // 2日 + 1日
      expect(result.statistics.gapRate).toBeCloseTo(42.86, 2) // 3/7 * 100
      expect(result.statistics.averageGapDuration).toBe(1.5) // (2+1)/2
      expect(result.statistics.longestGapDays).toBe(2)
      expect(result.statistics.continuityScore).toBeCloseTo(57.14, 2) // 100 - 42.86
    })

    test('配信継続性スコアを正しく計算する', () => {
      // 完全配信の場合
      const perfectDelivery = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), true),
        createMockDailyStatus(new Date('2024-01-03'), true)
      ]
      
      let timelineData = createMockTimelineData(perfectDelivery)
      let result = engine.detectGaps(timelineData)
      
      expect(result.statistics.continuityScore).toBe(100)
      
      // 完全ギャップの場合
      const noDelivery = [
        createMockDailyStatus(new Date('2024-01-01'), false),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false)
      ]
      
      timelineData = createMockTimelineData(noDelivery)
      result = engine.detectGaps(timelineData)
      
      expect(result.statistics.continuityScore).toBe(0)
    })
  })

  describe('エッジケース', () => {
    test('データが空の場合', () => {
      const timelineData = createMockTimelineData([])
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(0)
      expect(result.statistics.totalGapDays).toBe(0)
      expect(result.statistics.continuityScore).toBe(100) // NaN回避
    })

    test('全て配信ありの場合', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), true),
        createMockDailyStatus(new Date('2024-01-03'), true)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(0)
      expect(result.statistics.continuityScore).toBe(100)
    })

    test('全てギャップの場合', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), false),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false)
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(1)
      expect(result.gaps[0].durationDays).toBe(3)
      expect(result.statistics.continuityScore).toBe(0)
    })

    test('期間終了時にギャップが継続している場合', () => {
      const dailyStatuses = [
        createMockDailyStatus(new Date('2024-01-01'), true),
        createMockDailyStatus(new Date('2024-01-02'), false),
        createMockDailyStatus(new Date('2024-01-03'), false) // 期間終了時もギャップ継続
      ]
      
      const timelineData = createMockTimelineData(dailyStatuses)
      const result = engine.detectGaps(timelineData)
      
      expect(result.totalGaps).toBe(1)
      expect(result.gaps[0].durationDays).toBe(2)
      expect(result.gaps[0].afterGapMetrics).toBe(null) // ギャップ継続中
    })
  })

  describe('設定検証', () => {
    test('無効な設定でエラーを投げる', () => {
      const invalidConfig: GapDetectionConfig = {
        minGapDays: 0, // 無効
        maxAnalysisWindow: 30,
        thresholds: {
          criticalGapDays: 3,
          majorGapDays: 5, // criticalより大きい（無効）
          minorGapDays: 1,
          performanceDropThreshold: 25,
          recoveryTimeThreshold: 3
        },
        patterns: {
          weekendGapTolerance: true,
          holidayGapTolerance: true,
          scheduledMaintenanceWindows: []
        }
      }
      
      expect(() => new GapDetectionEngine(invalidConfig)).toThrow()
    })

    test('デフォルト設定が有効', () => {
      const defaultConfig = createDefaultGapDetectionConfig()
      
      expect(() => new GapDetectionEngine(defaultConfig)).not.toThrow()
      expect(defaultConfig.minGapDays).toBe(1)
      expect(defaultConfig.thresholds.criticalGapDays).toBeGreaterThan(defaultConfig.thresholds.majorGapDays)
      expect(defaultConfig.thresholds.majorGapDays).toBeGreaterThan(defaultConfig.thresholds.minorGapDays)
    })
  })
})