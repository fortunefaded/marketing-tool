// Meta API Pagination System - Configuration Index
// Central export point for all configuration

// Environment configuration
export { 
  metaApiEnvironment,
  validateEnvironment,
  getEnvironmentSummary,
  type MetaApiEnvironment,
} from './environment'

// Constants
export {
  META_API_CONSTANTS,
  PAGINATION_CONSTANTS,
  CACHE_CONSTANTS,
  TIMELINE_CONSTANTS,
  ANOMALY_CONSTANTS,
  GAP_CONSTANTS,
  UI_CONSTANTS,
  PERFORMANCE_CONSTANTS,
  VALIDATION_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './constants'

// Import for re-export
import {
  META_API_CONSTANTS,
  PAGINATION_CONSTANTS,
  ANOMALY_CONSTANTS,
  GAP_CONSTANTS,
} from './constants'

// Re-export commonly used configurations for convenience
export const {
  DEFAULT_LIMIT,
  DEFAULT_MAX_PAGES,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_DELAY_MS,
} = PAGINATION_CONSTANTS

export const {
  ENDPOINTS,
  INSIGHT_FIELDS,
  TIME_INCREMENTS,
  LEVELS,
} = META_API_CONSTANTS

export const {
  TYPES: ANOMALY_TYPES,
  SEVERITY_LEVELS: ANOMALY_SEVERITY_LEVELS,
  DEFAULT_THRESHOLDS: ANOMALY_DEFAULT_THRESHOLDS,
} = ANOMALY_CONSTANTS

export const {
  CAUSES: GAP_CAUSES,
  SEVERITY_LEVELS: GAP_SEVERITY_LEVELS,
  DEFAULT_THRESHOLDS: GAP_DEFAULT_THRESHOLDS,
} = GAP_CONSTANTS