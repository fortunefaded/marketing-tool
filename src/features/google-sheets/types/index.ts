/**
 * Google Sheets統合機能の基本型定義
 */

// Google OAuth2関連
export interface GoogleAuthToken {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn: number
  scope: string
}

export interface GoogleAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
  token?: GoogleAuthToken
}

// スプレッドシート設定
export interface GoogleSheetConfig {
  _id?: string
  sheetId: string
  sheetName: string
  sheetUrl: string
  agencyName: string
  formatType: SheetFormatType
  dataRange?: string
  headerRow: number
  dataStartRow: number
  columnMappings: ColumnMapping
  syncFrequency: SyncFrequency
  isActive: boolean
  lastSyncAt?: number
  nextSyncAt?: number
  createdAt: number
  updatedAt: number
}

// フォーマットタイプ
export type SheetFormatType =
  | 'mogumo-prisma'    // mogumo Prisma運用形式
  | 'google-ads'       // Google Ads標準形式
  | 'meta-ads'         // Meta広告標準形式
  | 'custom'           // カスタムフォーマット

// 同期頻度
export type SyncFrequency =
  | 'manual'   // 手動のみ
  | 'daily'    // 日次
  | 'weekly'   // 週次
  | 'monthly'  // 月次

// カラムマッピング
export interface ColumnMapping {
  date?: string | number
  campaignName?: string | number
  adsetName?: string | number
  adName?: string | number
  impressions?: string | number
  clicks?: string | number
  cost?: string | number
  conversions?: string | number
  conversionValue?: string | number
  [key: string]: string | number | undefined
}

// 統合データフォーマット
export interface UnifiedAdPerformance {
  _id?: string
  sourceType: 'google-sheets'
  sourceId: string        // スプレッドシートID
  agencyName: string
  date: string           // YYYY-MM-DD形式
  campaignName?: string
  adsetName?: string
  adName?: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  conversionValue?: number
  ctr?: number           // クリック率
  cvr?: number           // コンバージョン率
  cpc?: number           // クリック単価
  cpa?: number           // 獲得単価
  rawData?: Record<string, any>  // 元データ
  importedAt: number
  createdAt: number
  updatedAt: number
}

// インポート履歴
export interface ImportHistory {
  _id?: string
  sheetConfigId: string
  importId: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  startDate?: string
  endDate?: string
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  errors?: ImportError[]
  startedAt: number
  completedAt?: number
  createdAt: number
}

export interface ImportError {
  row: number
  message: string
  data?: any
}

// パーサーインターフェース
export interface SheetParser {
  formatType: SheetFormatType
  parse(data: any[][], config: GoogleSheetConfig): UnifiedAdPerformance[]
  validateHeaders(headers: any[]): boolean
  detectFormat(data: any[][]): boolean
}

// Google Sheets APIレスポンス
export interface SheetData {
  range: string
  majorDimension: string
  values: any[][]
}

// 同期タスク
export interface SyncTask {
  configId: string
  sheetId: string
  sheetName: string
  agencyName: string
  status: 'waiting' | 'running' | 'completed' | 'failed'
  startedAt?: number
  completedAt?: number
  error?: string
}