# Meta API Simple Implementation - Types

## Core Types (src/features/meta-api/core/types.ts)

```typescript
// アカウント関連
export interface MetaAccount {
  accountId: string
  name: string
  accessToken: string
}

// API レスポンス
export interface AdInsight {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  impressions: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  spend: number
  date_start: string
  date_stop: string
}

// 疲労度計算結果
export interface FatigueData {
  adId: string
  adName: string
  score: number
  status: 'healthy' | 'caution' | 'warning' | 'critical'
  metrics: {
    frequency: number
    ctr: number
    cpm: number
  }
}
```

## Fatigue Types (src/features/meta-api/fatigue/types.ts)

```typescript
export interface FatigueScore {
  total: number
  breakdown: {
    audience: number
    creative: number
    algorithm: number
  }
}

export interface FatigueThresholds {
  critical: number  // 70
  warning: number   // 50
  caution: number   // 30
}
```