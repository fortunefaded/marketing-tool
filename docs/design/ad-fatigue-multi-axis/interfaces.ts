// Ad Fatigue 多軸表示機能 型定義

// ==================== 基本型定義 ====================

/** 表示軸の種類 */
export type ViewAxis = 'creative' | 'adset' | 'campaign';

/** 疲労度ステータス */
export type FatigueStatus = 'healthy' | 'caution' | 'warning' | 'critical';

/** 基本的な疲労度データインターフェース */
export interface BaseFatigueData {
  id: string;
  name: string;
  score: number;
  status: FatigueStatus;
  metrics: BaseMetrics;
}

/** 基本メトリクス */
export interface BaseMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions?: number;
  reach?: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cvr?: number;
  cpa?: number;
}

// ==================== 階層別データ型 ====================

/** 広告セット疲労度データ */
export interface AdSetFatigueData extends BaseFatigueData {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  creativeCount: number;
  metrics: AdSetMetrics;
}

/** 広告セットメトリクス */
export interface AdSetMetrics extends BaseMetrics {
  aggregatedFrom: number; // 集約元のクリエイティブ数
  uniqueCtr?: number;
  uniqueInlineLinkClickCtr?: number;
}

/** キャンペーン疲労度データ */
export interface CampaignFatigueData extends BaseFatigueData {
  campaignId: string;
  campaignName: string;
  adSetCount: number;
  creativeCount: number;
  metrics: CampaignMetrics;
}

/** キャンペーンメトリクス */
export interface CampaignMetrics extends BaseMetrics {
  aggregatedFromAdSets: number;
  aggregatedFromCreatives: number;
  budgetUtilization?: number; // 予算消化率
}

// ==================== 集約サービスインターフェース ====================

/** 集約サービスインターフェース */
export interface IAggregatorService {
  aggregateByAdSet(insights: AdInsight[]): AdSetFatigueData[];
  aggregateByCampaign(insights: AdInsight[]): CampaignFatigueData[];
}

/** メトリクス計算サービス */
export interface IMetricsCalculator {
  calculateCTR(clicks: number, impressions: number): number;
  calculateCPC(spend: number, clicks: number): number;
  calculateCPM(spend: number, impressions: number): number;
  calculateCVR(conversions: number, clicks: number): number;
  calculateCPA(spend: number, conversions: number): number;
  calculateFrequency(impressions: number, reach: number): number;
  calculateFatigueScore(metrics: BaseMetrics): number;
}

// ==================== コンポーネントProps ====================

/** タブナビゲーションProps */
export interface TabNavigationProps {
  activeAxis: ViewAxis;
  onAxisChange: (axis: ViewAxis) => void;
  dataCounts: {
    creative: number;
    adset: number;
    campaign: number;
  };
  isLoading: boolean;
}

/** 疲労度ダッシュボードProps */
export interface FatigueDashboardProps {
  accountId: string;
  initialAxis?: ViewAxis;
}

/** 多軸対応アコーディオンProps */
export interface MultiAxisAccordionProps<T extends BaseFatigueData> {
  data: T[];
  viewAxis: ViewAxis;
  onItemClick?: (item: T) => void;
}

// ==================== Hook戻り値型 ====================

/** useAdFatigue拡張版の戻り値 */
export interface UseAdFatigueMultiAxisResult {
  // データ
  creativeData: FatigueData[] | null;
  adSetData: AdSetFatigueData[] | null;
  campaignData: CampaignFatigueData[] | null;
  
  // 状態
  isLoading: boolean;
  error: Error | null;
  currentAxis: ViewAxis;
  
  // アクション
  setAxis: (axis: ViewAxis) => void;
  refetch: () => Promise<void>;
  
  // メタ情報
  dataSource: 'api' | 'cache' | 'mock';
  lastUpdated: Date | null;
}

// ==================== API関連型 ====================

/** 集約リクエストパラメータ */
export interface AggregationParams {
  accountId: string;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    status?: FatigueStatus[];
    minSpend?: number;
    maxSpend?: number;
  };
}

/** 集約レスポンス */
export interface AggregatedResponse<T extends BaseFatigueData> {
  data: T[];
  summary: {
    totalCount: number;
    aggregatedAt: string;
    processingTime: number;
  };
  warnings?: string[];
}

// ==================== ユーティリティ型 ====================

/** 型ガード */
export const isAdSetFatigueData = (data: BaseFatigueData): data is AdSetFatigueData => {
  return 'adSetId' in data && 'creativeCount' in data;
};

export const isCampaignFatigueData = (data: BaseFatigueData): data is CampaignFatigueData => {
  return 'campaignId' in data && 'adSetCount' in data;
};

/** ソート関数型 */
export type SortFunction<T> = (a: T, b: T) => number;

/** フィルタ関数型 */
export type FilterFunction<T> = (item: T) => boolean;

// ==================== 設定型 ====================

/** 表示設定 */
export interface DisplaySettings {
  defaultAxis: ViewAxis;
  itemsPerPage: number;
  showWarnings: boolean;
  autoRefreshInterval?: number; // ミリ秒
}

/** 集約設定 */
export interface AggregationSettings {
  includeDeleted: boolean;
  minDataPoints: number; // 最小データポイント数
  outlierThreshold: number; // 外れ値閾値
}