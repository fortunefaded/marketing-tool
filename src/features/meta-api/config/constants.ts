// Meta API Pagination System - Constants
// Application-wide constants and defaults

import type { DeliveryPattern, AnomalyType, GapCause } from '../types'

// ============================================================================
// Meta API Constants
// ============================================================================

export const META_API_CONSTANTS = {
  // API Endpoints
  ENDPOINTS: {
    INSIGHTS: '/insights',
    CAMPAIGNS: '/campaigns',
    ADSETS: '/adsets', 
    ADS: '/ads',
    ACCOUNT: '/account',
  },
  
  // API Versions
  SUPPORTED_VERSIONS: ['v23.0', 'v22.0', 'v21.0'] as const,
  
  // Field Sets
  INSIGHT_FIELDS: [
    'ad_id',
    'ad_name', 
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'date_start',
    'date_stop',
    'impressions',
    'clicks',
    'spend',
    'reach',
    'frequency',
    'ctr',
    'cpc',
    'cpm',
    'cpp',
    'actions',
    'action_values',
  ] as const,
  
  // Time Increments
  TIME_INCREMENTS: {
    DAILY: '1',
    WEEKLY: '7',
    MONTHLY: 'monthly',
  } as const,
  
  // Levels
  LEVELS: {
    ACCOUNT: 'account',
    CAMPAIGN: 'campaign', 
    ADSET: 'adset',
    AD: 'ad',
  } as const,
} as const

// ============================================================================
// Pagination Constants
// ============================================================================

export const PAGINATION_CONSTANTS = {
  // Default Values
  DEFAULT_LIMIT: 25,
  DEFAULT_MAX_PAGES: 100,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
  
  // Limits
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  MAX_RETRY_ATTEMPTS: 5,
  
  // Backoff
  EXPONENTIAL_BACKOFF_BASE: 2,
  MAX_BACKOFF_MS: 30 * 1000, // 30 seconds
  
  // Rate Limiting
  DEFAULT_RATE_LIMIT: 200, // calls per hour
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
} as const

// ============================================================================
// Cache Constants
// ============================================================================

export const CACHE_CONSTANTS = {
  // Memory Cache
  MEMORY: {
    DEFAULT_MAX_SIZE: 50 * 1024 * 1024, // 50MB
    DEFAULT_TTL: 5 * 60, // 5 minutes
    MIN_SIZE: 1024 * 1024, // 1MB
    MAX_SIZE: 500 * 1024 * 1024, // 500MB
  },
  
  // Local Storage Cache
  LOCAL_STORAGE: {
    DEFAULT_MAX_SIZE: 500 * 1024 * 1024, // 500MB
    DEFAULT_KEY_PREFIX: 'meta-api-pagination',
    TTL: {
      REALTIME: 5 * 60, // 5 minutes
      RECENT: 60 * 60, // 1 hour
      HISTORICAL: 24 * 60 * 60, // 24 hours
    },
  },
  
  // Convex Cache
  CONVEX: {
    DEFAULT_TABLE_NAME: 'timelineCache',
    TTL: {
      REALTIME: 5 * 60, // 5 minutes
      RECENT: 60 * 60, // 1 hour
      HISTORICAL: 24 * 60 * 60, // 24 hours
    },
  },
  
  // Cache Key Patterns
  KEY_PATTERNS: {
    TIMELINE: 'timeline:{accountId}:{adId}:{startDate}:{endDate}',
    ANOMALIES: 'anomalies:{accountId}:{adId}:{date}',
    GAPS: 'gaps:{accountId}:{adId}:{startDate}:{endDate}',
    BASELINE: 'baseline:{accountId}:{adId}:{windowDays}',
    SESSION: 'session:{sessionId}',
  },
} as const

// ============================================================================
// Timeline Constants
// ============================================================================

export const TIMELINE_CONSTANTS = {
  // Delivery Patterns
  DELIVERY_PATTERNS: {
    CONTINUOUS: 'continuous',
    PARTIAL: 'partial', 
    INTERMITTENT: 'intermittent',
    SINGLE: 'single',
    NONE: 'none',
  } as const satisfies Record<string, DeliveryPattern>,
  
  // Delivery Intensity Levels
  INTENSITY_LEVELS: {
    NO_DELIVERY: 0,
    VERY_LOW: 1,
    LOW: 2,
    MEDIUM: 3,
    HIGH: 4,
    VERY_HIGH: 5,
  } as const,
  
  // Intensity Labels
  INTENSITY_LABELS: {
    0: 'no_delivery',
    1: 'very_low',
    2: 'low', 
    3: 'medium',
    4: 'high',
    5: 'very_high',
  } as const,
} as const

// ============================================================================
// Anomaly Detection Constants
// ============================================================================

export const ANOMALY_CONSTANTS = {
  // Anomaly Types
  TYPES: {
    SUDDEN_STOP: 'sudden_stop',
    PERFORMANCE_DROP: 'performance_drop',
    SPEND_SPIKE: 'spend_spike',
    INTERMITTENT: 'intermittent',
    HIGH_FREQUENCY: 'high_frequency',
    LOW_CTR: 'low_ctr',
    HIGH_CPM: 'high_cpm',
    BUDGET_PACING: 'budget_pacing',
    AUDIENCE_SATURATION: 'audience_saturation',
  } as const satisfies Record<string, AnomalyType>,
  
  // Severity Levels
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high', 
    CRITICAL: 'critical',
  } as const,
  
  // Default Thresholds
  DEFAULT_THRESHOLDS: {
    SUDDEN_STOP: {
      CONSECUTIVE_DAYS: 3,
      IMPRESSION_THRESHOLD: 0,
    },
    HIGH_FREQUENCY: {
      THRESHOLD: 3.5,
      IMMEDIATE_ALERT: true,
    },
    CTR_DROP: {
      BASELINE_MULTIPLIER: 0.75, // 25% drop
      CONSECUTIVE_DAYS: 2,
    },
    SPEND_SPIKE: {
      MULTIPLIER: 2.0, // 100% increase
      IMMEDIATE_ALERT: true,
    },
    INTERMITTENT: {
      WINDOW_DAYS: 7,
      MIN_ACTIVE_DAYS: 2,
      MAX_ACTIVE_DAYS: 5,
    },
  } as const,
  
  // Confidence Levels
  CONFIDENCE_LEVELS: {
    LOW: 0.3,
    MEDIUM: 0.6,
    HIGH: 0.8,
    VERY_HIGH: 0.9,
  } as const,
} as const

// ============================================================================
// Gap Analysis Constants  
// ============================================================================

export const GAP_CONSTANTS = {
  // Gap Causes
  CAUSES: {
    BUDGET_EXHAUSTED: 'budget_exhausted',
    MANUAL_PAUSE: 'manual_pause',
    POLICY_VIOLATION: 'policy_violation',
    SCHEDULE_SETTING: 'schedule_setting',
    BID_TOO_LOW: 'bid_too_low',
    AUDIENCE_EXHAUSTED: 'audience_exhausted',
    CREATIVE_REJECTED: 'creative_rejected',
    TECHNICAL_ERROR: 'technical_error',
    UNKNOWN: 'unknown',
  } as const satisfies Record<string, GapCause>,
  
  // Severity Levels
  SEVERITY_LEVELS: {
    MINOR: 'minor',
    MAJOR: 'major',
    CRITICAL: 'critical',
  } as const,
  
  // Default Thresholds (in days)
  DEFAULT_THRESHOLDS: {
    MINOR: 1,
    MAJOR: 3,
    CRITICAL: 7,
  } as const,
  
  // Cause Detection Patterns
  CAUSE_PATTERNS: {
    // Budget exhaustion: spend drops to 0, followed by gap
    BUDGET_EXHAUSTED: {
      SPEND_DROP_THRESHOLD: 0.9, // 90% drop
      LOOKBACK_DAYS: 2,
    },
    
    // Manual pause: immediate stop with no preceding issues
    MANUAL_PAUSE: {
      SUDDEN_STOP: true,
      NO_PERFORMANCE_ISSUES: true,
    },
    
    // Schedule setting: regular pattern (weekends, nights)
    SCHEDULE_SETTING: {
      RECURRING_PATTERN: true,
      TIME_BASED: true,
    },
    
    // Bid too low: decreasing impressions, then stop
    BID_TOO_LOW: {
      IMPRESSION_DECLINE_DAYS: 3,
      DECLINE_THRESHOLD: 0.5, // 50% decline
    },
    
    // Audience exhaustion: frequency spike, then decline
    AUDIENCE_EXHAUSTED: {
      FREQUENCY_SPIKE: 3.5,
      REACH_PLATEAU: true,
    },
  } as const,
} as const

// ============================================================================
// UI Constants
// ============================================================================

export const UI_CONSTANTS = {
  // Colors
  COLORS: {
    DELIVERY: {
      ACTIVE: '#22C55E', // green-500
      INACTIVE: '#9CA3AF', // gray-400
      PARTIAL: '#FCD34D', // yellow-400
    },
    ANOMALY: {
      LOW: '#FCD34D', // yellow-400
      MEDIUM: '#FB923C', // orange-400
      HIGH: '#EF4444', // red-500
      CRITICAL: '#991B1B', // red-900
    },
    GAP: {
      MINOR: '#E5E7EB', // gray-200
      MAJOR: '#9CA3AF', // gray-400
      CRITICAL: '#4B5563', // gray-600
    },
  },
  
  // Animation
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: 'ease-in-out',
  },
  
  // Spacing
  SPACING: {
    CALENDAR_CELL_SIZE: 32,
    TIMELINE_HEIGHT: 200,
    CHART_MIN_HEIGHT: 300,
  },
} as const

// ============================================================================
// Performance Constants
// ============================================================================

export const PERFORMANCE_CONSTANTS = {
  // Thresholds
  SLOW_QUERY_MS: 2000,
  ERROR_RATE_THRESHOLD: 0.01, // 1%
  CACHE_HIT_RATE_TARGET: 0.7, // 70%
  
  // Monitoring Intervals
  STATS_UPDATE_INTERVAL_MS: 60 * 1000, // 1 minute
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  
  // Limits
  MAX_CONCURRENT_REQUESTS: 5,
  MAX_RETRY_QUEUE_SIZE: 100,
} as const

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION_CONSTANTS = {
  // Date Formats
  DATE_FORMAT: 'YYYY-MM-DD',
  ISO_DATE_FORMAT: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  
  // Limits
  MAX_DATE_RANGE_DAYS: 365,
  MIN_DATE_RANGE_DAYS: 1,
  MAX_ACCOUNT_ID_LENGTH: 50,
  MAX_AD_ID_LENGTH: 50,
  
  // Patterns
  PATTERNS: {
    ACCOUNT_ID: /^\d+$/,
    AD_ID: /^\d+$/,
    SESSION_ID: /^[a-zA-Z0-9-_]+$/,
  },
} as const

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  // API Errors
  API: {
    INVALID_TOKEN: 'Invalid Meta API access token',
    RATE_LIMITED: 'API rate limit exceeded',
    NETWORK_ERROR: 'Network connection failed',
    INVALID_RESPONSE: 'Invalid API response format',
    TIMEOUT: 'API request timeout',
  },
  
  // Pagination Errors
  PAGINATION: {
    MAX_PAGES_EXCEEDED: 'Maximum page limit exceeded',
    INVALID_CURSOR: 'Invalid pagination cursor',
    NO_DATA: 'No data available for the specified date range',
  },
  
  // Cache Errors
  CACHE: {
    STORAGE_FULL: 'Cache storage is full',
    INVALID_KEY: 'Invalid cache key format',
    SERIALIZATION_ERROR: 'Failed to serialize cache data',
  },
  
  // Validation Errors
  VALIDATION: {
    INVALID_DATE_RANGE: 'Invalid date range specified',
    INVALID_ACCOUNT_ID: 'Invalid account ID format',
    MISSING_REQUIRED_FIELD: 'Required field is missing',
  },
} as const

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  DATA_RETRIEVED: 'Data successfully retrieved',
  CACHE_UPDATED: 'Cache updated successfully', 
  ANOMALY_DETECTED: 'Anomaly detected and logged',
  GAP_ANALYZED: 'Gap analysis completed',
  PERFORMANCE_TRACKED: 'Performance metrics updated',
} as const