/**
 * safe-data-access.ts
 * 
 * データアクセスを安全に行うためのヘルパー関数群
 * undefined/nullエラーを防ぎ、一貫性のあるデータ構造を提供
 */

// 安全なメトリクス型定義
export interface SafeMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  cpc: number
  conversions: number
  first_conversions: number
  roas: number
}

// 統一データ型
export interface UnifiedAdData {
  // 必須フィールド
  ad_id: string
  ad_name: string
  
  // Optional識別子
  campaign_id?: string
  campaign_name?: string
  adset_id?: string
  adset_name?: string
  
  // メトリクス（常に安全なアクセス）
  metrics: SafeMetrics
  
  // 疲労度関連
  fatigueScore?: number
  status?: 'healthy' | 'warning' | 'critical'
  
  // クリエイティブ情報
  creative?: {
    type?: string
    thumbnail_url?: string
    video_url?: string
    image_url?: string
  }
  
  // 集約情報
  summary?: {
    dateRange?: { start: string; end: string }
    metrics?: SafeMetrics
    platformBreakdown?: Record<string, SafeMetrics>
  }
}

/**
 * メトリクス値を安全に取得
 * 複数のアクセスパターンに対応し、確実に数値を返す
 */
export function getMetricValue(
  data: any,
  metric: keyof SafeMetrics,
  defaultValue: number = 0
): number {
  if (!data) return defaultValue
  
  // 複数のアクセスパターンを試行
  const possibleValues = [
    data?.metrics?.[metric],
    data?.summary?.metrics?.[metric],
    data?.[metric],
    data?.[`${metric}_value`], // 一部のAPIレスポンス形式に対応
  ]
  
  for (const value of possibleValues) {
    if (value !== undefined && value !== null) {
      // 文字列の場合は数値に変換
      const numValue = typeof value === 'number' ? value : Number(value)
      if (!isNaN(numValue)) {
        return numValue
      }
    }
  }
  
  return defaultValue
}

/**
 * 安全なメトリクスオブジェクトを生成
 * すべてのメトリクス値がデフォルト値で初期化される
 */
export function getSafeMetrics(data: any): SafeMetrics {
  return {
    impressions: getMetricValue(data, 'impressions', 0),
    clicks: getMetricValue(data, 'clicks', 0),
    spend: getMetricValue(data, 'spend', 0),
    reach: getMetricValue(data, 'reach', 0),
    frequency: getMetricValue(data, 'frequency', 0),
    ctr: getMetricValue(data, 'ctr', 0),
    cpm: getMetricValue(data, 'cpm', 0),
    cpc: getMetricValue(data, 'cpc', 0),
    conversions: getMetricValue(data, 'conversions', 0),
    first_conversions: getMetricValue(data, 'first_conversions', 0),
    roas: getMetricValue(data, 'roas', 0)
  }
}

/**
 * 任意のデータを統一形式に正規化
 * 異なるデータソースからの入力を一貫した形式に変換
 */
export function normalizeAdData(data: any): UnifiedAdData {
  // デバッグ用ログ（本番環境では削除推奨）
  if (!data) {
    console.warn('[SafeDataAccess] Normalizing null/undefined data')
  }
  
  // ID系フィールドの正規化（複数の命名パターンに対応）
  const ad_id = data?.ad_id || data?.adId || data?.id || `unknown_${Date.now()}`
  const ad_name = data?.ad_name || data?.adName || data?.name || 'Untitled'
  
  // キャンペーン情報の取得
  const campaign_id = data?.campaign_id || data?.campaignId
  const campaign_name = data?.campaign_name || data?.campaignName
  
  // 広告セット情報の取得
  const adset_id = data?.adset_id || data?.adsetId || data?.ad_set_id
  const adset_name = data?.adset_name || data?.adsetName || data?.ad_set_name
  
  // メトリクスの取得（安全）
  const metrics = getSafeMetrics(data)
  
  // 疲労度情報の取得
  const fatigueScore = Number(data?.fatigueScore || data?.score || data?.fatigue_score) || 0
  const status = data?.status || (fatigueScore > 70 ? 'critical' : fatigueScore > 50 ? 'warning' : 'healthy')
  
  // クリエイティブ情報の取得
  const creative = {
    type: data?.creative_type || data?.creativeType || data?.object_type,
    thumbnail_url: data?.thumbnail_url || data?.thumbnailUrl,
    video_url: data?.video_url || data?.videoUrl,
    image_url: data?.image_url || data?.imageUrl || data?.image_hash
  }
  
  // サマリー情報（集約データ用）
  const summary = data?.summary || 
    (data?.dateRange ? {
      dateRange: data.dateRange,
      metrics: data?.aggregatedMetrics || metrics,
      platformBreakdown: data?.platformBreakdown
    } : undefined)
  
  return {
    ad_id,
    ad_name,
    campaign_id,
    campaign_name,
    adset_id,
    adset_name,
    metrics,
    fatigueScore,
    status: status as 'healthy' | 'warning' | 'critical',
    creative,
    summary
  }
}

/**
 * データ配列を安全に正規化
 * null/undefined/不正なデータを除外し、統一形式の配列を返す
 */
export function normalizeDataArray(data: any): UnifiedAdData[] {
  if (!data) {
    console.warn('[SafeDataAccess] Received null/undefined data')
    return []
  }
  
  if (!Array.isArray(data)) {
    console.warn('[SafeDataAccess] Expected array, got:', typeof data)
    return []
  }
  
  return data
    .filter(item => item != null) // null/undefinedを除外
    .map(item => {
      try {
        return normalizeAdData(item)
      } catch (error) {
        console.error('[SafeDataAccess] Failed to normalize item:', error, item)
        // エラー時はデフォルト値を返す
        return normalizeAdData({})
      }
    })
}

/**
 * メトリクスの計算値を安全に取得
 */
export function calculateMetric(
  metrics: Partial<SafeMetrics>,
  type: 'cpa' | 'roas' | 'cvr'
): number {
  const safeMetrics = { ...getSafeMetrics({}), ...metrics }
  
  switch (type) {
    case 'cpa':
      return safeMetrics.conversions > 0 
        ? safeMetrics.spend / safeMetrics.conversions 
        : 0
    
    case 'roas':
      return safeMetrics.spend > 0 
        ? (safeMetrics.conversions * 100) / safeMetrics.spend // 仮の計算
        : 0
    
    case 'cvr':
      return safeMetrics.clicks > 0 
        ? (safeMetrics.conversions / safeMetrics.clicks) * 100 
        : 0
    
    default:
      return 0
  }
}

/**
 * データの有効性をチェック
 */
export function isValidAdData(data: any): boolean {
  if (!data) return false
  
  // 最低限必要なフィールドのチェック
  const hasId = !!(data.ad_id || data.adId || data.id)
  const hasName = !!(data.ad_name || data.adName || data.name)
  
  // メトリクスの存在チェック
  const hasMetrics = !!(
    data.metrics || 
    data.impressions !== undefined ||
    data.clicks !== undefined ||
    data.spend !== undefined
  )
  
  return hasId || hasName || hasMetrics
}

/**
 * デバッグ用: データ構造をログ出力
 */
export function debugDataStructure(data: any, label: string = 'Data'): void {
  if (process.env.NODE_ENV !== 'development') return
  
  console.group(`[SafeDataAccess] ${label}`)
  console.log('Type:', Array.isArray(data) ? 'Array' : typeof data)
  
  if (Array.isArray(data)) {
    console.log('Length:', data.length)
    if (data.length > 0) {
      console.log('First item keys:', Object.keys(data[0] || {}))
      console.log('First item sample:', data[0])
    }
  } else if (data && typeof data === 'object') {
    console.log('Keys:', Object.keys(data))
    console.log('Sample:', data)
  }
  
  console.groupEnd()
}