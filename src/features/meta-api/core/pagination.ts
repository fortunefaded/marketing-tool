// Meta API Pagination - Green Phase Minimal Implementation
// Complete pagination processing for Meta Graph API v23.0

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

// Global rate limiter instance
const globalRateLimiter = new RateLimitManager(
  metaApiEnvironment.rateLimiting.maxCallsPerHour,
  metaApiEnvironment.rateLimiting.trackingWindowMs
)

export async function fetchPaginatedData(
  params: FetchAdInsightsParams,
  options: PaginationOptions = {}
): Promise<PaginationResult<MetaAdInsight>> {
  const {
    maxPages = metaApiEnvironment.pagination.maxPages,
    retryAttempts = metaApiEnvironment.pagination.retryAttempts,
    retryDelayMs = metaApiEnvironment.pagination.retryDelayMs,
    onProgress,
    onError,
    signal
  } = options

  const allData: MetaAdInsight[] = []
  const duplicateTracker = new Set<string>()
  let currentPage = 1
  let totalPages = 1
  let nextUrl: string | undefined
  let isComplete = true
  let totalApiCalls = 0
  let duplicatesRemoved = 0
  const validationErrors: string[] = []
  
  const startTime = Date.now()

  try {
    // Build initial API URL
    const baseUrl = `${metaApiEnvironment.metaApiBaseUrl}/${metaApiEnvironment.metaApiVersion}`
    let apiUrl = `${baseUrl}/act_${params.accountId || 'unknown'}/insights`
    
    // Add query parameters
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
    
    apiUrl += '?' + urlParams.toString()

    // Main pagination loop
    while (currentPage <= maxPages) {
      // Check rate limit
      if (!globalRateLimiter.canMakeCall()) {
        const waitTime = globalRateLimiter.getWaitTime()
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }

      // Make API call with retry logic
      const response = await makeApiCallWithRetry(
        nextUrl || apiUrl,
        retryAttempts,
        retryDelayMs,
        signal
      )
      
      globalRateLimiter.recordCall()
      totalApiCalls++

      // Process response data
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          // Create unique key for deduplication
          const uniqueKey = `${item.ad_id || 'unknown'}-${item.date_start || 'unknown'}`
          
          if (!duplicateTracker.has(uniqueKey)) {
            // Basic validation
            if (validateDataItem(item, validationErrors)) {
              allData.push(item)
              duplicateTracker.add(uniqueKey)
            }
          } else {
            duplicatesRemoved++
          }
        }
      }

      // Update progress
      if (onProgress) {
        const progress: PaginationProgress = {
          currentPage,
          totalPages: Math.max(currentPage, totalPages),
          itemsRetrieved: allData.length,
          estimatedCompletion: calculateEstimatedCompletion(startTime, currentPage, totalPages),
          rateLimitRemaining: globalRateLimiter.getRemainingCalls()
        }
        onProgress(progress)
      }

      // Check for next page
      if (response.paging?.next && currentPage < maxPages) {
        nextUrl = response.paging.next
        currentPage++
        
        // Update total pages estimate based on data patterns
        if (currentPage === 2 && allData.length > 0) {
          // Rough estimate based on first page
          const estimatedTotalItems = allData.length * 10 // Conservative estimate
          const itemsPerPage = allData.length
          totalPages = Math.ceil(estimatedTotalItems / itemsPerPage)
        }
      } else {
        // No more pages or reached limit
        if (currentPage >= maxPages && response.paging?.next) {
          isComplete = false // More pages available but limit reached
        }
        break
      }
    }

    // Analyze delivery pattern
    const deliveryAnalysis = analyzeDeliveryPattern(allData, {
      start: params.time_range.since,
      end: params.time_range.until
    })

    // Prepare metadata
    const processingTimeMs = Date.now() - startTime
    const metadata: ApiCallMetadata = {
      totalApiCalls,
      totalPages: currentPage,
      processingTimeMs,
      rateLimitRemaining: globalRateLimiter.getRemainingCalls(),
      lastCallTimestamp: Date.now()
    }

    return {
      success: true,
      data: allData,
      metadata: {
        ...metadata,
        totalItems: allData.length,
        isComplete,
        duplicatesRemoved,
        validationErrors
      },
      deliveryAnalysis
    }

  } catch (error) {
    const apiError: ApiClientError = {
      code: 'PAGINATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: determineErrorType(error),
      retryable: isRetryableError(error),
      originalError: error
    }

    if (onError) {
      onError(apiError)
    }

    throw error
  }
}

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

      const response = await fetch(url, { 
        signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Meta-API-Pagination/1.0'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 429) {
          // Rate limited - wait longer
          const waitTime = delayMs * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        const error = new Error(
          errorData.error?.message || `API error: ${response.status} ${response.statusText}`
        )
        ;(error as Error & { status?: number }).status = response.status
        throw error
      }

      const data = await response.json()
      
      // Validate response structure
      if (!isValidMetaApiResponse(data)) {
        throw new Error('Invalid API response format')
      }

      return data

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries || !isRetryableError(error)) {
        break
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(metaApiEnvironment.rateLimiting.backoffMultiplier, attempt)
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, metaApiEnvironment.rateLimiting.maxBackoffMs)))
      }
    }
  }

  throw lastError
}

function validateDataItem(item: unknown, validationErrors: string[]): boolean {
  if (!item || typeof item !== 'object') {
    validationErrors.push('Invalid data item: not an object')
    return false
  }

  // Basic required fields check
  if (!item.ad_id) {
    validationErrors.push('Missing required field: ad_id')
    return false
  }

  // Validate numeric fields
  const numericFields = ['impressions', 'clicks', 'spend']
  for (const field of numericFields) {
    if (item[field] && isNaN(parseFloat(item[field]))) {
      validationErrors.push(`Invalid numeric value for ${field}: ${item[field]}`)
    }
  }

  return true
}

function isValidMetaApiResponse(data: unknown): data is MetaApiResponse<MetaAdInsight> {
  return data && Array.isArray(data.data) && 
    (data.paging === undefined || typeof data.paging === 'object')
}

function determineErrorType(error: unknown): ApiClientError['type'] {
  if (error instanceof Error) {
    if (error.message.includes('fetch')) return 'network'
    if (error.message.includes('abort')) return 'cancelled'
    if (error.message.includes('timeout')) return 'timeout'
    if (error.message.includes('OAuth') || error.message.includes('token')) return 'auth'
    if (error.message.includes('rate limit') || (error as Error & { status?: number }).status === 429) return 'rate_limit'
    if ((error as Error & { status?: number }).status && (error as Error & { status?: number }).status! >= 400) return 'api'
  }
  return 'unknown'
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors are retryable
    if (error.message.includes('fetch') || error.message.includes('network')) return true
    
    // Rate limit errors are retryable
    if ((error as Error & { status?: number }).status === 429) return true
    
    // Temporary server errors are retryable
    if ((error as Error & { status?: number }).status && (error as Error & { status?: number }).status! >= 500) return true
    
    // Timeout errors are retryable
    if (error.message.includes('timeout')) return true
  }
  return false
}

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