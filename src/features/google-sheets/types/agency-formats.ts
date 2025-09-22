/**
 * 各代理店のスプレッドシートフォーマット定義
 */

// mogumo Prisma運用形式のヘッダー
export interface MogumoPrismaHeaders {
  date: string               // 日付
  campaignName: string       // キャンペーン名
  adsetName: string          // 広告セット名
  adName: string             // 広告名
  mediaName: string          // 媒体名
  impressions: string        // インプレッション数
  clicks: string             // クリック数
  cost: string               // 広告費
  orderCount: string         // 注文数
  orderAmount: string        // 注文金額
  newCustomerCount: string   // 新規顧客数
  repeatCustomerCount: string // リピート顧客数
}

// Google Ads標準形式のヘッダー
export interface GoogleAdsHeaders {
  date: string               // 日付
  campaign: string           // キャンペーン
  adGroup: string            // 広告グループ
  impressions: string        // 表示回数
  clicks: string             // クリック数
  cost: string               // 費用
  conversions: string        // コンバージョン
  conversionValue: string    // コンバージョン値
  ctr: string                // クリック率
  cvr: string                // コンバージョン率
  cpc: string                // 平均クリック単価
  cpa: string                // コンバージョン単価
}

// Meta広告標準形式のヘッダー
export interface MetaAdsHeaders {
  reportingStarts: string     // レポート開始日
  reportingEnds: string       // レポート終了日
  campaignName: string        // キャンペーン名
  adsetName: string           // 広告セット名
  adName: string              // 広告名
  impressions: string         // インプレッション
  reach: string               // リーチ
  frequency: string           // フリークエンシー
  clicks: string              // リンククリック
  ctr: string                 // CTR
  cpc: string                 // CPC
  spend: string               // 消化金額
  purchases: string           // 購入
  purchaseValue: string       // 購入額
  cpa: string                 // CPA
  roas: string                // ROAS
}

// フォーマット検出のヒント
export const FORMAT_HINTS = {
  'mogumo-prisma': [
    '媒体名',
    '注文数',
    '注文金額',
    '新規顧客数',
    'リピート顧客数'
  ],
  'google-ads': [
    'キャンペーン',
    '広告グループ',
    '表示回数',
    '費用',
    'クリック率'
  ],
  'meta-ads': [
    'レポート開始日',
    'レポート終了日',
    'リーチ',
    'フリークエンシー',
    'ROAS'
  ]
}

// カラムインデックスマッピング例
export const DEFAULT_COLUMN_MAPPINGS = {
  'mogumo-prisma': {
    date: 0,
    campaignName: 1,
    adsetName: 2,
    adName: 3,
    mediaName: 4,
    impressions: 5,
    clicks: 6,
    cost: 7,
    orderCount: 8,
    orderAmount: 9,
    newCustomerCount: 10,
    repeatCustomerCount: 11
  },
  'google-ads': {
    date: 0,
    campaign: 1,
    adGroup: 2,
    impressions: 3,
    clicks: 4,
    cost: 5,
    conversions: 6,
    conversionValue: 7,
    ctr: 8,
    cvr: 9,
    cpc: 10,
    cpa: 11
  },
  'meta-ads': {
    reportingStarts: 0,
    reportingEnds: 1,
    campaignName: 2,
    adsetName: 3,
    adName: 4,
    impressions: 5,
    reach: 6,
    frequency: 7,
    clicks: 8,
    ctr: 9,
    cpc: 10,
    spend: 11,
    purchases: 12,
    purchaseValue: 13,
    cpa: 14,
    roas: 15
  }
}

// データ変換ユーティリティ型
export interface DataTransformRule {
  sourceField: string
  targetField: keyof import('./index').UnifiedAdPerformance
  transform?: (value: any) => any
}

// 日付フォーマット
export type DateFormat =
  | 'YYYY-MM-DD'
  | 'YYYY/MM/DD'
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYYMMDD'

// 数値フォーマット
export interface NumberFormat {
  thousandSeparator?: string
  decimalSeparator?: string
  currencyPrefix?: string
  currencySuffix?: string
  percentage?: boolean
}