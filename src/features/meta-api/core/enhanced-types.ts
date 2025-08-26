export interface MetaApiFetcherState {
  isLoading: boolean
  isWaiting: boolean
  error: MetaApiError | null
  lastFetchTime: Date | null
  requestId: string | null
}

export interface MetaApiError {
  category: 'network' | 'auth' | 'ratelimit' | 'data' | 'timeout'
  message: string
  originalError: Error
  retryable: boolean
  actionRequired?: 'reauth' | 'wait' | 'config' | 'contact_support'
}

export interface MetaApiFetcherOptions {
  timeout?: number
  retryAttempts?: number
  validateResponse?: boolean
}

export interface UseMetaApiFetcherResult {
  fetchData: (endpoint: string, params: any) => Promise<any>
  fetchFromApi: () => Promise<{ data: any; error: Error | null }>
  state: MetaApiFetcherState
  cancelRequest: () => void
}