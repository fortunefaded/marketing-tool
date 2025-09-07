// ========================================
// Core Entity Interfaces
// ========================================

export interface MetaAccount {
  accountId: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'active' | 'inactive';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  campaignId: string;
  accountId: string;
  name: string;
  objective: string;
  status: 'active' | 'paused' | 'deleted';
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: Date;
  stopTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdSet {
  adSetId: string;
  campaignId: string;
  name: string;
  status: 'active' | 'paused' | 'deleted';
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting: TargetingSpec;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ad {
  adId: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: 'active' | 'paused' | 'deleted';
  creative: Creative;
  createdAt: Date;
  updatedAt: Date;
}

export interface Creative {
  creativeId: string;
  name?: string;
  type: 'image' | 'video' | 'carousel' | 'collection';
  title?: string;
  body?: string;
  callToAction?: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  assets?: CreativeAsset[];
}

export interface CreativeAsset {
  assetId: string;
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  duration?: number; // for videos
}

export interface TargetingSpec {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female')[];
  locations?: Location[];
  interests?: Interest[];
  behaviors?: Behavior[];
  customAudiences?: string[];
  lookalikAudiences?: string[];
}

export interface Location {
  key: string;
  name: string;
  type: 'country' | 'region' | 'city';
}

export interface Interest {
  id: string;
  name: string;
  category: string;
}

export interface Behavior {
  id: string;
  name: string;
  category: string;
}

// ========================================
// Metrics & Analytics Interfaces
// ========================================

export interface AdMetrics {
  adId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue?: number;
  frequency: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpp: number;
  roas?: number;
  cpa?: number;
  
  // Instagram specific metrics
  profileViews?: number;
  follows?: number;
  engagements?: number;
  saves?: number;
  shares?: number;
  
  // Video specific metrics
  videoViews?: number;
  videoCompletionRate?: number;
  averageWatchTime?: number;
  soundOnRate?: number;
  threeSecondViews?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface FatigueScore {
  total: number; // 0-100
  breakdown: {
    audience: number;    // Frequency based fatigue
    creative: number;    // CTR decline based fatigue  
    algorithm: number;   // CPM increase based fatigue
  };
  primaryIssue: FatigueType;
  status: FatigueLevel;
  calculatedAt: Date;
}

export type FatigueType = 'audience' | 'creative' | 'algorithm';
export type FatigueLevel = 'healthy' | 'caution' | 'warning' | 'critical';

export interface FatigueAnalysis {
  adId: string;
  score: FatigueScore;
  metrics: {
    frequency: number;
    firstTimeRatio: number;
    ctrDeclineRate: number;
    cpmIncreaseRate: number;
  };
  recommendations: string[];
  alerts: FatigueAlert[];
  trend: FatigueTrendPoint[];
  createdAt: Date;
}

export interface FatigueAlert {
  id: string;
  adId: string;
  level: FatigueLevel;
  type: FatigueType;
  message: string;
  recommendedAction: string;
  isActive: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export interface FatigueTrendPoint {
  date: string;
  totalScore: number;
  audienceScore: number;
  creativeScore: number;
  algorithmScore: number;
  frequency: number;
  ctr: number;
  cpm: number;
  firstTimeRatio: number;
}

// ========================================
// ECForce Integration Interfaces
// ========================================

export interface ECForceOrder {
  orderId: string;
  customerId: string;
  orderDate: Date;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  items: ECForceOrderItem[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
}

export interface ECForceOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ECForceCustomer {
  customerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  registrationDate: Date;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  ltv: number;
  segment: 'new' | 'returning' | 'vip' | 'at_risk';
}

// ========================================
// API Request/Response Interfaces
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

export interface MetaInsightsRequest {
  accountId: string;
  level: 'account' | 'campaign' | 'adset' | 'ad';
  fields: string[];
  datePreset?: string;
  timeRange?: {
    since: string;
    until: string;
  };
  breakdowns?: string[];
  filtering?: any[];
  limit?: number;
  after?: string;
}

export interface MetaInsightsResponse {
  data: AdMetrics[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface DashboardQuery {
  accountIds: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  groupBy?: string[];
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface DashboardData {
  summary: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    averageCtr: number;
    averageCpc: number;
    averageCpm: number;
    totalRoas?: number;
  };
  campaigns: Campaign[];
  adSets: AdSet[];
  ads: Ad[];
  metrics: AdMetrics[];
  fatigueAnalysis: FatigueAnalysis[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas?: number;
}

// ========================================
// Export/Report Interfaces  
// ========================================

export interface ReportConfig {
  id: string;
  name: string;
  type: 'dashboard' | 'fatigue' | 'performance' | 'custom';
  format: 'csv' | 'excel' | 'pdf';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    recipients: string[];
  };
  filters: DashboardQuery;
  template?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportRequest {
  reportId?: string;
  format: 'csv' | 'excel' | 'pdf';
  data: any;
  template?: string;
  filename?: string;
}

export interface ExportResponse {
  fileUrl: string;
  filename: string;
  size: number;
  expiresAt: Date;
}

// ========================================
// User Management Interfaces
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  permissions: Permission[];
  accounts: string[]; // MetaAccount IDs user has access to
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'export')[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

// ========================================
// Configuration Interfaces
// ========================================

export interface SystemConfig {
  metaApi: {
    appId: string;
    appSecret: string;
    apiVersion: string;
    rateLimits: {
      requestsPerHour: number;
      requestsPerDay: number;
    };
  };
  ecforce: {
    apiEndpoint: string;
    apiKey: string;
    rateLimits: {
      requestsPerMinute: number;
    };
  };
  alerts: {
    fatigueThresholds: {
      critical: number;
      warning: number;
      caution: number;
    };
    emailNotifications: boolean;
    slackNotifications: boolean;
  };
  dataRetention: {
    rawMetrics: number; // days
    aggregatedData: number; // days
    exportFiles: number; // days
  };
}

export interface UserPreferences {
  userId: string;
  timezone: string;
  language: 'ja' | 'en';
  currency: string;
  defaultDateRange: number; // days
  dashboardLayout: Record<string, any>;
  emailNotifications: {
    fatigueAlerts: boolean;
    weeklyReports: boolean;
    systemUpdates: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}