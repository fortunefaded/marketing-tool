/**
 * 日付範囲フィルター機能 TypeScript インターフェース定義
 * @version 1.0
 * @date 2024-12
 */

// ============================================
// 基本型定義
// ============================================

/**
 * 日付範囲フィルターのオプション
 */
export type DateRangeFilter = 
  | 'today'
  | 'yesterday' 
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_month'
  | 'last_90d'
  | 'all';

/**
 * 日付範囲の計算結果
 */
export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  value: DateRangeFilter;
}

/**
 * APIの日付パラメータ
 */
export interface ApiDateParams {
  datePreset?: string;
  dateStart?: string;
  dateStop?: string;
  timeRange?: {
    since: string;
    until: string;
  };
}

// ============================================
// UIコンポーネント関連
// ============================================

/**
 * DateRangeFilterコンポーネントのProps
 */
export interface DateRangeFilterProps {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * フィルターオプションの定義
 */
export interface FilterOption {
  label: string;
  value: DateRangeFilter;
  description?: string;
}

// ============================================
// 状態管理関連
// ============================================

/**
 * ダッシュボードの状態
 */
export interface DashboardState {
  dateRange: DateRangeFilter;
  accountId: string | null;
  isLoading: boolean;
  error: Error | null;
  data: FatigueData[];
}

/**
 * 疲労度データ
 */
export interface FatigueData {
  id: string;
  ad_id: string;
  ad_name: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  
  // メトリクス
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  
  // 疲労度スコア
  fatigueScore: number;
  creativeFatigue: number;
  audienceFatigue: number;
  algorithmFatigue: number;
  
  // 日付情報
  date_start?: string;
  date_stop?: string;
  
  // ステータス
  status: 'healthy' | 'warning' | 'critical';
}

// ============================================
// API関連
// ============================================

/**
 * Meta API インサイトデータ
 */
export interface AdInsight {
  ad_id: string;
  ad_name: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  
  impressions: string;
  clicks: string;
  spend: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  reach?: string;
  
  date_start?: string;
  date_stop?: string;
  
  // プラットフォーム別データ（オプション）
  publisher_platform?: 'facebook' | 'instagram' | 'audience_network';
}

/**
 * 集約済みインサイトデータ
 */
export interface AggregatedInsight extends Omit<AdInsight, 'impressions' | 'clicks' | 'spend'> {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  
  // 集約情報
  aggregatedCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * APIレスポンス
 */
export interface PaginatedResult {
  data: AdInsight[];
  nextPageUrl: string | null;
  hasMore: boolean;
  totalCount: number;
}

/**
 * APIエラー
 */
export interface ApiError extends Error {
  code?: string;
  retryAfter?: number;
  originalError?: any;
}

// ============================================
// Hook関連
// ============================================

/**
 * useMetaInsightsフックのオプション
 */
export interface UseMetaInsightsOptions {
  accountId: string;
  datePreset?: string;
  autoFetch?: boolean;
}

/**
 * useMetaInsightsフックの戻り値
 */
export interface UseMetaInsightsResult {
  insights: AdInsight[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  fetch: (options?: FetchOptions) => Promise<void>;
  lastFetchTime: Date | null;
  progress: FetchProgress;
  stopAutoFetch: () => void;
}

/**
 * フェッチオプション
 */
export interface FetchOptions {
  forceRefresh?: boolean;
  datePresetOverride?: string;
}

/**
 * フェッチ進捗
 */
export interface FetchProgress {
  loaded: number;
  hasMore: boolean;
  isAutoFetching: boolean;
}

/**
 * useAdFatigueSimplifiedフックのオプション
 */
export interface UseAdFatigueOptions {
  accountId: string;
  preferCache?: boolean;
  enrichWithCreatives?: boolean;
  dateRange?: DateRangeFilter;
}

/**
 * useAdFatigueSimplifiedフックの戻り値
 */
export interface UseAdFatigueResult {
  data: FatigueData[];
  insights: AdInsight[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
  dataSource: 'cache' | 'api' | null;
  lastUpdateTime: Date | null;
  progress?: FetchProgress;
  totalInsights: number;
  filteredCount: number;
  dateRange: DateRangeFilter;
}

/**
 * リフェッチオプション
 */
export interface RefetchOptions {
  clearCache?: boolean;
}

// ============================================
// キャッシュ関連
// ============================================

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  accountId: string;
  dateRange: DateRangeFilter;
}

/**
 * キャッシュメタデータ
 */
export interface CacheMetadata {
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * キャッシュストレージインターフェース
 */
export interface ICacheStorage {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T, ttl?: number): void;
  remove(key: string): void;
  clear(): void;
  getMetadata(): CacheMetadata;
}

// ============================================
// ユーティリティ関連
// ============================================

/**
 * 日付範囲変換オプション
 */
export interface DateRangeConversionOptions {
  timezone?: string;
  format?: 'YYYY-MM-DD' | 'MM/DD/YYYY';
}

/**
 * 集約オプション
 */
export interface AggregationOptions {
  groupBy: 'ad_name' | 'adset_name' | 'campaign_name';
  metrics: Array<'impressions' | 'clicks' | 'spend' | 'ctr' | 'cpc' | 'cpm'>;
  calculateWeightedAverage?: boolean;
}

/**
 * 疲労度計算オプション
 */
export interface FatigueCalculationOptions {
  baselineCtr?: number;
  baselineCpm?: number;
  frequencyThreshold?: number;
  weights?: {
    creative: number;
    audience: number;
    algorithm: number;
  };
}

// ============================================
// エラーハンドリング関連
// ============================================

/**
 * エラーコード
 */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  NO_DATA = 'NO_DATA',
  CACHE_ERROR = 'CACHE_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * エラー詳細
 */
export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  retryable: boolean;
  userMessage?: string;
}

// ============================================
// テスト用モック型
// ============================================

/**
 * モックデータジェネレータ
 */
export interface MockDataGenerator {
  generateInsights(count: number, dateRange: DateRange): AdInsight[];
  generateFatigueData(insights: AdInsight[]): FatigueData[];
  generateError(code: ErrorCode): ApiError;
}

/**
 * テストフィクスチャ
 */
export interface TestFixture {
  dateRange: DateRangeFilter;
  expectedApiParams: ApiDateParams;
  mockResponse: AdInsight[];
  expectedResult: FatigueData[];
}

// ============================================
// 型ガード
// ============================================

/**
 * AdInsight型ガード
 */
export function isAdInsight(obj: any): obj is AdInsight {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.ad_id === 'string' &&
    typeof obj.ad_name === 'string' &&
    typeof obj.impressions === 'string'
  );
}

/**
 * ApiError型ガード
 */
export function isApiError(error: any): error is ApiError {
  return (
    error instanceof Error &&
    'code' in error
  );
}

/**
 * DateRangeFilter型ガード
 */
export function isValidDateRangeFilter(value: any): value is DateRangeFilter {
  return [
    'today',
    'yesterday',
    'last_7d',
    'last_14d',
    'last_30d',
    'last_month',
    'last_90d',
    'all'
  ].includes(value);
}

// ============================================
// 定数
// ============================================

/**
 * デフォルト値
 */
export const DEFAULT_VALUES = {
  DATE_RANGE: 'last_30d' as DateRangeFilter,
  CACHE_TTL: 3600000, // 1時間
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  PAGE_SIZE: 500,
  FATIGUE_THRESHOLD: {
    WARNING: 50,
    CRITICAL: 75
  }
} as const;

/**
 * API定数
 */
export const API_CONSTANTS = {
  BASE_URL: 'https://graph.facebook.com',
  VERSION: 'v23.0',
  TIMEOUT: 30000,
  RATE_LIMIT_WINDOW: 3600000
} as const;