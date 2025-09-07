# src/features/meta-api/core/types.ts

```typescript
// Core types for Meta API integration

export interface MetaAccount {
  accountId: string
  name: string
  accessToken: string
}

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

export interface FatigueData {
  adId: string
  adName: string
  score: number
  status: 'healthy' | 'caution' | 'warning' | 'critical'
  metrics: {
    frequency: number
    ctr: number
    cpm: number
    impressions: number
  }
}

export interface ApiError {
  code: number
  message: string
  type: 'auth' | 'permission' | 'rate_limit' | 'network'
}
```
