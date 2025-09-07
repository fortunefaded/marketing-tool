/**
 * データ更新ボタン機能 TypeScript インターフェース定義
 */

// ========== 基本エンティティ ==========

export interface MetaAccount {
  accountId: string;
  accountName: string;
  isActive: boolean;
  lastSyncedAt?: Date;
}

export interface AdInsight {
  // 基本情報
  ad_id: string;
  ad_name: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  
  // メトリクス
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  
  // Instagramメトリクス
  instagram_metrics?: {
    profile_views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement_rate: number;
    publisher_platform: string;
  };
  
  // メタデータ
  date_start?: string;
  date_stop?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FatigueData {
  adId: string;
  adName: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  score: number;
  status: 'healthy' | 'caution' | 'warning' | 'critical';
  metrics?: {
    ctrDecline?: number;
    frequencyScore?: number;
    cpmIncrease?: number;
  };
}

// ========== Hook インターフェース ==========

export interface UseAdFatigueOptions {
  accountId: string;
  preferCache?: boolean;
  enrichWithCreatives?: boolean;
}

export interface UseAdFatigueResult {
  data: FatigueData[];
  insights: AdInsight[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
  dataSource: 'cache' | 'api' | null;
  lastUpdateTime: Date | null;
}

export interface RefetchOptions {
  clearCache?: boolean;
  force?: boolean;
}

// ========== コンポーネント Props ==========

export interface FatigueDashboardPresentationProps {
  // アカウント関連
  accounts: MetaAccount[];
  selectedAccountId: string | null;
  isLoadingAccounts: boolean;
  onAccountSelect: (accountId: string) => void;

  // データ関連
  data: FatigueData[];
  insights: AdInsight[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;

  // アクション
  onRefresh: (options?: RefetchOptions) => Promise<void>;

  // メタ情報
  dataSource: 'cache' | 'api' | null;
  lastUpdateTime: Date | null;
}

export interface DataRefreshButtonProps {
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  accountId?: string | null;
  className?: string;
}

// ========== API レスポンス ==========

export interface MetaApiResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
  error?: MetaApiError;
}

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface ConvexSaveResult {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// ========== エラー型定義 ==========

export type ErrorType = 
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'DATA_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApplicationError extends Error {
  type: ErrorType;
  code?: string;
  details?: Record<string, any>;
  recoverable: boolean;
  userMessage: string;
  timestamp: Date;
}

// ========== ログ・デバッグ ==========

export interface DebugLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  action: string;
  data?: Record<string, any>;
  error?: Error;
}

export interface RefreshDebugInfo {
  accountId: string | null;
  isRefreshing: boolean;
  buttonClicked: Date;
  refetchStarted?: Date;
  refetchCompleted?: Date;
  error?: Error;
  apiCallMade: boolean;
  convexSaveAttempted: boolean;
  dataCount?: number;
}

// ========== 状態管理 ==========

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface RefreshState {
  status: ButtonState;
  message?: string;
  progress?: number;
  startTime?: Date;
  endTime?: Date;
}

// ========== イベント ==========

export interface RefreshEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  timestamp: Date;
  accountId?: string;
  data?: any;
  error?: Error;
}

// ========== バリデーション ==========

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ========== ユーティリティ型 ==========

export type DataSourceType = 'cache' | 'api' | null;

export type AsyncState<T> = 
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error };

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;