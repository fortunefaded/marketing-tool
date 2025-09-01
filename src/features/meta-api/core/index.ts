// Core API exports

export { SimpleMetaApi } from './api-client'
export { EnhancedMetaApi } from './enhanced-api-client'
export { AccountId, AccessToken } from './branded-types'
export { GapDetectionEngine } from './gap-detection-engine'

export type { 
  PaginatedResult 
} from './api-client'

export type {
  EnhancedInsightsOptions,
  EnhancedPaginatedResult,
  EnhancedMetaApiInterface
} from './types/enhanced-api'

export type {
  GapDetectionResult,
  GapType,
  DeliveryPattern,
  GapAnalysisConfig
} from '../types/gap-detection-types'