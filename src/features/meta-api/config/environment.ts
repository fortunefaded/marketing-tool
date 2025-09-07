// Meta API Pagination System - Environment Configuration
// Centralized environment variable management

export interface MetaApiEnvironment {
  // Meta API Configuration
  metaApiBaseUrl: string
  metaApiVersion: string
  metaAccessToken: string
  
  // Pagination Settings
  pagination: {
    defaultLimit: number
    maxPages: number
    retryAttempts: number
    retryDelayMs: number
  }
  
  // Cache Configuration
  cache: {
    memory: {
      maxSize: number      // bytes
      ttl: number         // seconds
      enabled: boolean
    }
    localStorage: {
      maxSize: number      // bytes
      ttl: {
        realtime: number   // seconds
        recent: number     // seconds  
        historical: number // seconds
      }
      enabled: boolean
      storageKey: string
    }
    convex: {
      ttl: {
        realtime: number   // seconds
        recent: number     // seconds
        historical: number // seconds
      }
      enabled: boolean
      tableName: string
    }
  }
  
  // Rate Limiting
  rateLimiting: {
    maxCallsPerHour: number
    trackingWindowMs: number
    backoffMultiplier: number
    maxBackoffMs: number
  }
  
  // Anomaly Detection Thresholds
  anomalyThresholds: {
    suddenStop: {
      consecutiveDays: number
      impressionThreshold: number
    }
    highFrequency: {
      threshold: number
      immediateAlert: boolean
    }
    ctrDrop: {
      baselineMultiplier: number
      consecutiveDays: number
    }
    spendSpike: {
      multiplier: number
      immediateAlert: boolean
    }
    intermittent: {
      windowDays: number
      minActiveDays: number
      maxActiveDays: number
    }
  }
  
  // Gap Detection
  gapThresholds: {
    minorGap: number      // days
    majorGap: number      // days
    criticalGap: number   // days
  }
  
  // Performance Monitoring
  performance: {
    trackingEnabled: boolean
    slowQueryThreshold: number  // ms
    errorRateThreshold: number  // 0-1
    cacheHitRateTarget: number  // 0-1
  }
  
  // Debugging & Logging
  debug: {
    enableDetailedLogging: boolean
    enableApiCallLogging: boolean
    enableCacheLogging: boolean
    enablePerformanceLogging: boolean
  }
}

// Environment variable accessors
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || process.env[key]
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`)
  }
  return value || defaultValue || ''
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = getEnvVar(key, defaultValue?.toString())
  const parsed = Number(value)
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`)
  }
  return parsed
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, defaultValue.toString())
  return value.toLowerCase() === 'true'
}

// Main environment configuration
export const metaApiEnvironment: MetaApiEnvironment = {
  // Meta API Configuration
  metaApiBaseUrl: getEnvVar('VITE_META_API_BASE_URL', 'https://graph.facebook.com'),
  metaApiVersion: getEnvVar('VITE_META_API_VERSION', 'v23.0'),
  metaAccessToken: getEnvVar('VITE_META_ACCESS_TOKEN', ''),
  
  // Pagination Settings
  pagination: {
    defaultLimit: getEnvNumber('VITE_PAGINATION_DEFAULT_LIMIT', 25),
    maxPages: getEnvNumber('VITE_PAGINATION_MAX_PAGES', 100),
    retryAttempts: getEnvNumber('VITE_PAGINATION_RETRY_ATTEMPTS', 3),
    retryDelayMs: getEnvNumber('VITE_PAGINATION_RETRY_DELAY_MS', 1000),
  },
  
  // Cache Configuration
  cache: {
    memory: {
      maxSize: getEnvNumber('VITE_CACHE_MEMORY_MAX_SIZE', 50 * 1024 * 1024), // 50MB
      ttl: getEnvNumber('VITE_CACHE_MEMORY_TTL', 5 * 60), // 5 minutes
      enabled: getEnvBoolean('VITE_CACHE_MEMORY_ENABLED', true),
    },
    localStorage: {
      maxSize: getEnvNumber('VITE_CACHE_LOCALSTORAGE_MAX_SIZE', 500 * 1024 * 1024), // 500MB
      ttl: {
        realtime: getEnvNumber('VITE_CACHE_LOCALSTORAGE_TTL_REALTIME', 5 * 60), // 5 min
        recent: getEnvNumber('VITE_CACHE_LOCALSTORAGE_TTL_RECENT', 60 * 60), // 1 hour
        historical: getEnvNumber('VITE_CACHE_LOCALSTORAGE_TTL_HISTORICAL', 24 * 60 * 60), // 24 hours
      },
      enabled: getEnvBoolean('VITE_CACHE_LOCALSTORAGE_ENABLED', true),
      storageKey: getEnvVar('VITE_CACHE_LOCALSTORAGE_KEY', 'meta-api-pagination'),
    },
    convex: {
      ttl: {
        realtime: getEnvNumber('VITE_CACHE_CONVEX_TTL_REALTIME', 5 * 60), // 5 min
        recent: getEnvNumber('VITE_CACHE_CONVEX_TTL_RECENT', 60 * 60), // 1 hour  
        historical: getEnvNumber('VITE_CACHE_CONVEX_TTL_HISTORICAL', 24 * 60 * 60), // 24 hours
      },
      enabled: getEnvBoolean('VITE_CACHE_CONVEX_ENABLED', true),
      tableName: getEnvVar('VITE_CACHE_CONVEX_TABLE', 'timelineCache'),
    },
  },
  
  // Rate Limiting
  rateLimiting: {
    maxCallsPerHour: getEnvNumber('VITE_RATE_LIMIT_MAX_CALLS_PER_HOUR', 200),
    trackingWindowMs: getEnvNumber('VITE_RATE_LIMIT_TRACKING_WINDOW_MS', 60 * 60 * 1000), // 1 hour
    backoffMultiplier: getEnvNumber('VITE_RATE_LIMIT_BACKOFF_MULTIPLIER', 2),
    maxBackoffMs: getEnvNumber('VITE_RATE_LIMIT_MAX_BACKOFF_MS', 30 * 1000), // 30 seconds
  },
  
  // Anomaly Detection Thresholds
  anomalyThresholds: {
    suddenStop: {
      consecutiveDays: getEnvNumber('VITE_ANOMALY_SUDDEN_STOP_DAYS', 3),
      impressionThreshold: getEnvNumber('VITE_ANOMALY_SUDDEN_STOP_IMPRESSIONS', 0),
    },
    highFrequency: {
      threshold: getEnvNumber('VITE_ANOMALY_HIGH_FREQUENCY_THRESHOLD', 3.5),
      immediateAlert: getEnvBoolean('VITE_ANOMALY_HIGH_FREQUENCY_IMMEDIATE', true),
    },
    ctrDrop: {
      baselineMultiplier: getEnvNumber('VITE_ANOMALY_CTR_DROP_MULTIPLIER', 0.75),
      consecutiveDays: getEnvNumber('VITE_ANOMALY_CTR_DROP_DAYS', 2),
    },
    spendSpike: {
      multiplier: getEnvNumber('VITE_ANOMALY_SPEND_SPIKE_MULTIPLIER', 2),
      immediateAlert: getEnvBoolean('VITE_ANOMALY_SPEND_SPIKE_IMMEDIATE', true),
    },
    intermittent: {
      windowDays: getEnvNumber('VITE_ANOMALY_INTERMITTENT_WINDOW_DAYS', 7),
      minActiveDays: getEnvNumber('VITE_ANOMALY_INTERMITTENT_MIN_DAYS', 2),
      maxActiveDays: getEnvNumber('VITE_ANOMALY_INTERMITTENT_MAX_DAYS', 5),
    },
  },
  
  // Gap Detection
  gapThresholds: {
    minorGap: getEnvNumber('VITE_GAP_MINOR_THRESHOLD', 1),
    majorGap: getEnvNumber('VITE_GAP_MAJOR_THRESHOLD', 3),
    criticalGap: getEnvNumber('VITE_GAP_CRITICAL_THRESHOLD', 7),
  },
  
  // Performance Monitoring
  performance: {
    trackingEnabled: getEnvBoolean('VITE_PERFORMANCE_TRACKING_ENABLED', true),
    slowQueryThreshold: getEnvNumber('VITE_PERFORMANCE_SLOW_QUERY_MS', 2000),
    errorRateThreshold: getEnvNumber('VITE_PERFORMANCE_ERROR_RATE_THRESHOLD', 0.01),
    cacheHitRateTarget: getEnvNumber('VITE_PERFORMANCE_CACHE_HIT_RATE_TARGET', 0.7),
  },
  
  // Debugging & Logging
  debug: {
    enableDetailedLogging: getEnvBoolean('VITE_DEBUG_DETAILED_LOGGING', false),
    enableApiCallLogging: getEnvBoolean('VITE_DEBUG_API_CALL_LOGGING', false),
    enableCacheLogging: getEnvBoolean('VITE_DEBUG_CACHE_LOGGING', false),
    enablePerformanceLogging: getEnvBoolean('VITE_DEBUG_PERFORMANCE_LOGGING', false),
  },
}

// Validation functions
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields validation
  if (!metaApiEnvironment.metaAccessToken) {
    errors.push('VITE_META_ACCESS_TOKEN is required for Meta API access')
  }
  
  // Numeric validation
  if (metaApiEnvironment.pagination.defaultLimit < 1 || metaApiEnvironment.pagination.defaultLimit > 100) {
    errors.push('VITE_PAGINATION_DEFAULT_LIMIT must be between 1 and 100')
  }
  
  if (metaApiEnvironment.pagination.maxPages < 1) {
    errors.push('VITE_PAGINATION_MAX_PAGES must be greater than 0')
  }
  
  if (metaApiEnvironment.rateLimiting.maxCallsPerHour < 1) {
    errors.push('VITE_RATE_LIMIT_MAX_CALLS_PER_HOUR must be greater than 0')
  }
  
  if (metaApiEnvironment.anomalyThresholds.highFrequency.threshold < 1) {
    errors.push('VITE_ANOMALY_HIGH_FREQUENCY_THRESHOLD must be greater than 1')
  }
  
  // Cache validation
  if (metaApiEnvironment.cache.memory.maxSize < 1024 * 1024) {
    errors.push('VITE_CACHE_MEMORY_MAX_SIZE must be at least 1MB')
  }
  
  // Performance validation
  if (metaApiEnvironment.performance.errorRateThreshold < 0 || metaApiEnvironment.performance.errorRateThreshold > 1) {
    errors.push('VITE_PERFORMANCE_ERROR_RATE_THRESHOLD must be between 0 and 1')
  }
  
  if (metaApiEnvironment.performance.cacheHitRateTarget < 0 || metaApiEnvironment.performance.cacheHitRateTarget > 1) {
    errors.push('VITE_PERFORMANCE_CACHE_HIT_RATE_TARGET must be between 0 and 1')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Development helpers
export function getEnvironmentSummary(): Record<string, any> {
  return {
    metaApiVersion: metaApiEnvironment.metaApiVersion,
    paginationEnabled: true,
    cacheEnabled: {
      memory: metaApiEnvironment.cache.memory.enabled,
      localStorage: metaApiEnvironment.cache.localStorage.enabled,
      convex: metaApiEnvironment.cache.convex.enabled,
    },
    rateLimitEnabled: metaApiEnvironment.rateLimiting.maxCallsPerHour > 0,
    performanceTracking: metaApiEnvironment.performance.trackingEnabled,
    debugMode: {
      logging: metaApiEnvironment.debug.enableDetailedLogging,
      apiCalls: metaApiEnvironment.debug.enableApiCallLogging,
      cache: metaApiEnvironment.debug.enableCacheLogging,
      performance: metaApiEnvironment.debug.enablePerformanceLogging,
    },
  }
}

// Export for use in development/debugging
if (import.meta.env.DEV) {
  console.log('Meta API Pagination Environment:', getEnvironmentSummary())
  
  const validation = validateEnvironment()
  if (!validation.isValid) {
    console.warn('Environment validation errors:', validation.errors)
  }
}