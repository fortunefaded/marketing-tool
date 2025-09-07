import { useState, useCallback } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'

export function useMetaApi(accountId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const convex = useConvex()
  
  const callApi = useCallback(async <T>(
    apiMethod: (api: SimpleMetaApi) => Promise<T>
  ): Promise<T | null> => {
    if (!accountId) {
      setError(new Error('No account ID provided'))
      return null
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      const api = new SimpleMetaApi(token, accountId)
      
      const result = await apiMethod(api)
      return result
    } catch (err: any) {
      setError(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [accountId, convex])
  
  return { callApi, isLoading, error }
}