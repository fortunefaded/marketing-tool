# 広告疲労度ダッシュボード エラー修正計画

## 根本原因の総括

### 主要な問題点
1. **型定義の不整合** - `any`型の多用により実行時エラーが頻発
2. **データ構造の不一致** - コンポーネント間でのデータ形式の期待値が異なる
3. **Null/Undefined防御の欠如** - ネストされたプロパティアクセスでのエラー
4. **集約機能の二重経路** - フィーチャーフラグによる返り値の型の分岐

## Phase 1: 即座の安定化（エラー防止）

### 1.1 統一型定義の作成
```typescript
// src/features/meta-api/types/unified-types.ts

// 基本メトリクス型（すべてOptional）
export interface SafeMetrics {
  impressions?: number
  clicks?: number
  spend?: number
  reach?: number
  frequency?: number
  ctr?: number
  cpm?: number
  cpc?: number
  conversions?: number
  first_conversions?: number
  roas?: number
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
  
  // メトリクス（安全なアクセス）
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
```

### 1.2 データアクセスヘルパー関数
```typescript
// src/features/meta-api/utils/safe-data-access.ts

export function getMetricValue(
  data: any,
  metric: keyof SafeMetrics,
  defaultValue: number = 0
): number {
  // 複数のアクセスパターンに対応
  const value = 
    data?.metrics?.[metric] ??
    data?.summary?.metrics?.[metric] ??
    data?.[metric] ??
    defaultValue
    
  return typeof value === 'number' ? value : Number(value) || defaultValue
}

export function getSafeMetrics(data: any): SafeMetrics {
  return {
    impressions: getMetricValue(data, 'impressions'),
    clicks: getMetricValue(data, 'clicks'),
    spend: getMetricValue(data, 'spend'),
    reach: getMetricValue(data, 'reach'),
    frequency: getMetricValue(data, 'frequency'),
    ctr: getMetricValue(data, 'ctr'),
    cpm: getMetricValue(data, 'cpm'),
    cpc: getMetricValue(data, 'cpc'),
    conversions: getMetricValue(data, 'conversions'),
    first_conversions: getMetricValue(data, 'first_conversions'),
    roas: getMetricValue(data, 'roas')
  }
}

export function normalizeAdData(data: any): UnifiedAdData {
  return {
    ad_id: data?.ad_id || data?.adId || data?.id || 'unknown',
    ad_name: data?.ad_name || data?.adName || data?.name || 'Untitled',
    
    campaign_id: data?.campaign_id || data?.campaignId,
    campaign_name: data?.campaign_name || data?.campaignName,
    adset_id: data?.adset_id || data?.adsetId,
    adset_name: data?.adset_name || data?.adsetName,
    
    metrics: getSafeMetrics(data),
    
    fatigueScore: data?.fatigueScore || data?.score || 0,
    status: data?.status || 'healthy',
    
    creative: {
      type: data?.creative_type || data?.creativeType,
      thumbnail_url: data?.thumbnail_url || data?.thumbnailUrl,
      video_url: data?.video_url || data?.videoUrl,
      image_url: data?.image_url || data?.imageUrl
    },
    
    summary: data?.summary
  }
}
```

## Phase 2: コンポーネント修正

### 2.1 CreativeTableTab修正
```typescript
// src/features/meta-api/components/CreativeTableTab.tsx

import { normalizeAdData, getSafeMetrics } from '../utils/safe-data-access'

// データ処理部分を修正
const sortedData = useMemo(() => {
  if (!data || !Array.isArray(data)) {
    return []
  }
  
  // すべてのデータを正規化
  const normalizedData = data.map(normalizeAdData)
  
  // 安全なデータ処理
  const enrichedData = normalizedData.map((item) => {
    const metrics = getSafeMetrics(item)
    
    return {
      ...item,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      spend: metrics.spend,
      conversions: metrics.conversions,
      cpa: metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0,
      roas: metrics.roas
    }
  })
  
  // ソート処理...
}, [data, sortField, sortDirection])
```

### 2.2 フィルターコンポーネント修正
```typescript
// src/features/meta-api/components/PerformanceFilter.tsx

import { getSafeMetrics } from '../utils/safe-data-access'

const applyFilters = () => {
  if (!Array.isArray(data)) {
    onFilter([])
    return
  }
  
  const filtered = data.filter((item: any) => {
    const metrics = getSafeMetrics(item)
    
    // 安全な比較
    if (criteria.ctr.min !== undefined && metrics.ctr < criteria.ctr.min) return false
    if (criteria.ctr.max !== undefined && metrics.ctr > criteria.ctr.max) return false
    // 他のフィルター条件...
    
    return true
  })
  
  onFilter(filtered)
}
```

## Phase 3: フック層の改善

### 3.1 useAdFatigueWithAggregation修正
```typescript
// src/features/meta-api/hooks/useAdFatigueWithAggregation.ts

import { UnifiedAdData, normalizeAdData } from '../types/unified-types'

interface UseAdFatigueWithAggregationResult {
  // 型を明確化
  data: UnifiedAdData[]
  insights: any[] // 後で型定義
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  // ...
}

export function useAdFatigueWithAggregation({
  accountId,
  dateRange = 'last_30d',
  enableAggregation = false,
  aggregationOptions = {}
}): UseAdFatigueWithAggregationResult {
  // 既存処理...
  
  // 返却データを正規化
  const normalizedData = useMemo(() => {
    const sourceData = enableAggregation && aggregatedData 
      ? aggregatedData 
      : existingResult.data
    
    if (!Array.isArray(sourceData)) return []
    
    return sourceData.map(normalizeAdData)
  }, [enableAggregation, aggregatedData, existingResult.data])
  
  return {
    ...existingResult,
    data: normalizedData, // 正規化されたデータを返す
    // ...
  }
}
```

## Phase 4: エラーバウンダリの強化

### 4.1 グローバルエラーバウンダリ
```typescript
// src/features/meta-api/components/AdFatigueErrorBoundary.tsx

export class AdFatigueErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    // エラータイプを分析
    if (error.message.includes('Cannot read properties of undefined')) {
      console.error('Data structure error:', error)
      return {
        hasError: true,
        error,
        errorType: 'DATA_STRUCTURE'
      }
    }
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーをログ送信（必要に応じて）
    console.error('AdFatigue Error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">
            データ処理エラーが発生しました
          </h3>
          <p className="text-sm text-red-600 mt-2">
            {this.state.error?.message}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            ページを再読み込み
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## Phase 5: データバリデーション

### 5.1 実行時型チェック
```typescript
// src/features/meta-api/utils/runtime-validation.ts

export function validateAdData(data: any): boolean {
  if (!data) return false
  if (!data.ad_id && !data.id && !data.adId) return false
  return true
}

export function validateMetrics(metrics: any): boolean {
  if (!metrics) return false
  
  const requiredFields = ['impressions', 'clicks', 'spend']
  for (const field of requiredFields) {
    const value = metrics[field]
    if (value !== undefined && value !== null && typeof value !== 'number' && typeof value !== 'string') {
      return false
    }
  }
  
  return true
}

// データパイプラインで使用
export function sanitizeDataArray(data: any[]): UnifiedAdData[] {
  if (!Array.isArray(data)) {
    console.warn('Invalid data: expected array, got', typeof data)
    return []
  }
  
  return data
    .filter(validateAdData)
    .map(normalizeAdData)
    .filter(item => validateMetrics(item.metrics))
}
```

## 実装順序と優先度

### 優先度1（即座実装 - 30分）
1. ✅ safe-data-access.ts の作成
2. ✅ CreativeTableTab.tsx への適用
3. ✅ PerformanceFilter.tsx への適用

### 優先度2（短期実装 - 1時間）
1. unified-types.ts の作成
2. useAdFatigueWithAggregation の修正
3. FatigueDashboardContainer の修正

### 優先度3（中期実装 - 2時間）
1. runtime-validation.ts の実装
2. エラーバウンダリの強化
3. 全コンポーネントへの適用

## テスト計画

### 自動テスト
```bash
# ユニットテスト追加
npm test -- safe-data-access.test.ts
npm test -- runtime-validation.test.ts

# 統合テスト
npm test -- ad-fatigue-integration.test.ts
```

### 手動テスト
1. データなしの状態で /ad-fatigue アクセス
2. 不正なデータ形式での表示確認
3. フィルター機能の動作確認
4. 集約ON/OFF切り替え時の安定性

## 成功基準

1. **エラー発生率**: 0件/セッション
2. **型安全性**: TypeScript strictモードでエラーなし
3. **既存機能**: すべての機能が正常動作
4. **パフォーマンス**: 初期ロード3秒以内

## ロールバック計画

各フェーズ実装前にgitブランチを作成：
```bash
git checkout -b fix/phase1-safety
git checkout -b fix/phase2-components
git checkout -b fix/phase3-hooks
```

問題発生時は即座に main ブランチへロールバック可能。