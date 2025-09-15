// Meta API Pagination - Refactored Version
// Clean, maintainable implementation with improved error handling

import { metaApiEnvironment } from '../config/environment'
import { RateLimitManager } from './rate-limit-manager'
import { analyzeDeliveryPattern } from './delivery-analyzer'
import type { 
  FetchAdInsightsParams, 
  PaginationOptions, 
  PaginationResult,
  MetaAdInsight,
  MetaApiResponse,
  ApiClientError,
  ApiCallMetadata,
  PaginationProgress
} from '../types'

// Configuration constants
const CONFIG = {
  BACKOFF_MULTIPLIER: 2,
  MAX_BACKOFF_MS: 30 * 1000,
  VALIDATION_ERRORS_LIMIT: 100,
  DUPLICATE_CHECK_ENABLED: true,
} as const

// Global rate limiter instance
const globalRateLimiter = new RateLimitManager(
  metaApiEnvironment.rateLimiting.maxCallsPerHour,
  metaApiEnvironment.rateLimiting.trackingWindowMs
)

/**
 * Main pagination function - fetches all pages from Meta API
 */
export async function fetchPaginatedData(
  params: FetchAdInsightsParams,
  options: PaginationOptions = {}
): Promise<PaginationResult<MetaAdInsight>> {
  const config = buildPaginationConfig(options)
  const state = initializePaginationState()
  
  try {
    const apiUrl = buildInitialApiUrl(params)
    
    await executePaginationLoop(apiUrl, config, state, params)
    
    return buildSuccessResult(state, params)
    
  } catch (error) {
    return handlePaginationError(error, state, config)
  }
}

/**
 * Build pagination configuration from options and environment
 */
function buildPaginationConfig(options: PaginationOptions) {
  return {
    maxPages: options.maxPages ?? metaApiEnvironment.pagination.maxPages,
    retryAttempts: options.retryAttempts ?? metaApiEnvironment.pagination.retryAttempts,
    retryDelayMs: options.retryDelayMs ?? metaApiEnvironment.pagination.retryDelayMs,
    onProgress: options.onProgress,
    onError: options.onError,
    signal: options.signal,
  }
}

/**
 * Initialize pagination state
 */
function initializePaginationState() {
  return {
    allData: [] as MetaAdInsight[],
    duplicateTracker: new Set<string>(),
    currentPage: 1,
    totalPages: 1,
    isComplete: true,
    totalApiCalls: 0,
    duplicatesRemoved: 0,
    validationErrors: [] as string[],
    startTime: Date.now(),
  }
}

/**
 * Build initial API URL with parameters
 */
function buildInitialApiUrl(params: FetchAdInsightsParams): string {
  const baseUrl = `${metaApiEnvironment.metaApiBaseUrl}/${metaApiEnvironment.metaApiVersion}`
  const apiUrl = `${baseUrl}/act_${params.accountId || 'unknown'}/insights`
  
  const urlParams = new URLSearchParams({
    fields: params.fields.join(','),
    time_range: JSON.stringify(params.time_range),
    level: params.level,
    limit: (params.limit || metaApiEnvironment.pagination.defaultLimit).toString(),
    access_token: metaApiEnvironment.metaAccessToken
  })
  
  if (params.time_increment) {
    urlParams.append('time_increment', params.time_increment)
  }
  
  return `${apiUrl}?${urlParams.toString()}`
}

/**
 * Main pagination loop
 */
async function executePaginationLoop(
  initialUrl: string,
  config: ReturnType<typeof buildPaginationConfig>,
  state: ReturnType<typeof initializePaginationState>,
  _params: FetchAdInsightsParams
): Promise<void> {
  let nextUrl: string | undefined = initialUrl

  while (state.currentPage <= config.maxPages && nextUrl) {
    // Rate limiting check
    await waitForRateLimit()
    
    // Make API call
    const response = await makeApiCallWithRetry(
      nextUrl,
      config.retryAttempts,
      config.retryDelayMs,
      config.signal
    )
    
    globalRateLimiter.recordCall()
    state.totalApiCalls++

    // Process response data
    processResponseData(response, state)

    // Update progress
    updateProgress(state, config.onProgress)

    // Prepare for next iteration
    const shouldContinue = handleNextPage(response, state, config.maxPages)
    if (!shouldContinue) break
    
    nextUrl = response.paging?.next
    state.currentPage++
  }
}

/**
 * Wait for rate limit availability
 */
async function waitForRateLimit(): Promise<void> {
  if (!globalRateLimiter.canMakeCall()) {
    const waitTime = globalRateLimiter.getWaitTime()
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

/**
 * Process API response data
 */
function processResponseData(
  response: MetaApiResponse<MetaAdInsight>,
  state: ReturnType<typeof initializePaginationState>
): void {
  if (!response.data || !Array.isArray(response.data)) {
    return
  }

  for (const item of response.data) {
    if (CONFIG.DUPLICATE_CHECK_ENABLED) {
      const uniqueKey = createUniqueKey(item)
      if (state.duplicateTracker.has(uniqueKey)) {
        state.duplicatesRemoved++
        continue
      }
      state.duplicateTracker.add(uniqueKey)
    }

    if (validateDataItem(item, state.validationErrors)) {
      state.allData.push(item)
    }
  }
}

/**
 * Create unique key for deduplication
 */
function createUniqueKey(item: MetaAdInsight): string {
  return `${item.ad_id || 'unknown'}-${item.date_start || 'unknown'}`
}

/**
 * Update progress tracking
 */
function updateProgress(
  state: ReturnType<typeof initializePaginationState>,
  onProgress?: (progress: PaginationProgress) => void
): void {
  if (!onProgress) return

  const progress: PaginationProgress = {
    currentPage: state.currentPage,
    totalPages: Math.max(state.currentPage, state.totalPages),
    itemsRetrieved: state.allData.length,
    estimatedCompletion: calculateEstimatedCompletion(
      state.startTime, 
      state.currentPage, 
      state.totalPages
    ),
    rateLimitRemaining: globalRateLimiter.getRemainingCalls()
  }
  
  onProgress(progress)
}

/**
 * Handle next page logic
 */
function handleNextPage(
  response: MetaApiResponse<MetaAdInsight>,
  state: ReturnType<typeof initializePaginationState>,
  maxPages: number
): boolean {
  if (!response.paging?.next) {
    return false // No more pages
  }

  if (state.currentPage >= maxPages) {
    state.isComplete = false // Hit page limit
    return false
  }

  // Update total pages estimate on first page
  if (state.currentPage === 1 && state.allData.length > 0) {
    const estimatedTotalItems = state.allData.length * 10
    const itemsPerPage = state.allData.length
    state.totalPages = Math.ceil(estimatedTotalItems / itemsPerPage)
  }

  return true
}

/**
 * Build success result
 */
function buildSuccessResult(
  state: ReturnType<typeof initializePaginationState>,
  params: FetchAdInsightsParams
): PaginationResult<MetaAdInsight> {
  const deliveryAnalysis = analyzeDeliveryPattern(state.allData, {
    start: params.time_range.since,
    end: params.time_range.until
  })

  const processingTimeMs = Date.now() - state.startTime
  const metadata: ApiCallMetadata & { 
    totalItems: number
    isComplete: boolean
    duplicatesRemoved: number
    validationErrors: string[]
  } = {
    totalApiCalls: state.totalApiCalls,
    totalPages: state.currentPage,
    processingTimeMs,
    rateLimitRemaining: globalRateLimiter.getRemainingCalls(),
    lastCallTimestamp: Date.now(),
    totalItems: state.allData.length,
    isComplete: state.isComplete,
    duplicatesRemoved: state.duplicatesRemoved,
    validationErrors: state.validationErrors
  }

  return {
    success: true,
    data: state.allData,
    metadata,
    deliveryAnalysis
  }
}

/**
 * Handle pagination error
 */
function handlePaginationError(
  error: unknown,
  _state: ReturnType<typeof initializePaginationState>,
  config: ReturnType<typeof buildPaginationConfig>
): never {
  const apiError: ApiClientError = {
    code: 'PAGINATION_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    type: determineErrorType(error),
    retryable: isRetryableError(error),
    originalError: error
  }

  if (config.onError) {
    config.onError(apiError)
  }

  throw error
}

/**
 * Make API call with retry logic
 */
async function makeApiCallWithRetry(
  url: string,
  maxRetries: number,
  delayMs: number,
  signal?: AbortSignal
): Promise<MetaApiResponse<MetaAdInsight>> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        throw new Error('Request was aborted')
      }

      const response = await makeHttpRequest(url, signal)
      const data = await response.json()
      
      validateApiResponse(data)
      
      return data

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries || !isRetryableError(error)) {
        break
      }
      
      if (shouldHandleRateLimit(error)) {
        await handleRateLimitError(attempt, delayMs)
        continue
      }
      
      await waitBeforeRetry(attempt, delayMs)
    }
  }

  throw lastError
}

/**
 * Make HTTP request
 */
async function makeHttpRequest(url: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, { 
    signal,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Meta-API-Pagination/1.0'
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error = new Error(
      errorData.error?.message || `API error: ${response.status} ${response.statusText}`
    )
    ;(error as any).status = response.status
    throw error
  }

  return response
}

/**
 * Validate API response structure
 */
function validateApiResponse(data: any): asserts data is MetaApiResponse<MetaAdInsight> {
  if (!data || !Array.isArray(data.data)) {
    throw new Error('Invalid API response format: missing or invalid data array')
  }
  
  if (data.paging !== undefined && typeof data.paging !== 'object') {
    throw new Error('Invalid API response format: invalid paging object')
  }
}

/**
 * Check if error should trigger rate limit handling
 */
function shouldHandleRateLimit(error: unknown): boolean {
  return (error as any)?.status === 429 || 
         (error instanceof Error && error.message.includes('rate limit'))
}

/**
 * Handle rate limit error with exponential backoff
 */
async function handleRateLimitError(attempt: number, baseDelayMs: number): Promise<void> {
  const waitTime = baseDelayMs * Math.pow(CONFIG.BACKOFF_MULTIPLIER, attempt)
  await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, CONFIG.MAX_BACKOFF_MS)))
}

/**
 * Wait before retry with exponential backoff
 */
async function waitBeforeRetry(attempt: number, baseDelayMs: number): Promise<void> {
  const waitTime = baseDelayMs * Math.pow(CONFIG.BACKOFF_MULTIPLIER, attempt)
  await new Promise(resolve => 
    setTimeout(resolve, Math.min(waitTime, metaApiEnvironment.rateLimiting.maxBackoffMs))
  )
}

/**
 * Validate individual data item
 */
function validateDataItem(item: any, validationErrors: string[]): boolean {
  if (validationErrors.length >= CONFIG.VALIDATION_ERRORS_LIMIT) {
    return false // Stop collecting errors if too many
  }

  if (!item || typeof item !== 'object') {
    validationErrors.push('Invalid data item: not an object')
    return false
  }

  if (!item.ad_id) {
    validationErrors.push('Missing required field: ad_id')
    return false
  }

  // Validate numeric fields
  const numericFields = ['impressions', 'clicks', 'spend'] as const
  for (const field of numericFields) {
    if (item[field] && isNaN(parseFloat(item[field]))) {
      validationErrors.push(`Invalid numeric value for ${field}: ${item[field]}`)
    }
  }

  return true
}

/**
 * Determine error type for classification
 */
function determineErrorType(error: unknown): ApiClientError['type'] {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const status = (error as any).status

    if (message.includes('abort')) return 'cancelled'
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('fetch') || message.includes('network')) return 'network'
    if (message.includes('oauth') || message.includes('token')) return 'auth'
    if (message.includes('rate limit') || status === 429) return 'rate_limit'
    if (status >= 400) return 'api'
  }
  return 'unknown'
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const status = (error as any).status

  // Retryable conditions
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    status === 429 ||
    (status >= 500 && status < 600)
  )
}

/**
 * Calculate estimated completion time
 */
function calculateEstimatedCompletion(
  startTime: number,
  currentPage: number,
  totalPages: number
): number {
  if (currentPage === 0) return 0
  
  const elapsed = Date.now() - startTime
  const avgTimePerPage = elapsed / currentPage
  const remainingPages = Math.max(0, totalPages - currentPage)
  const estimatedRemainingTime = remainingPages * avgTimePerPage
  
  return Date.now() + estimatedRemainingTime
}