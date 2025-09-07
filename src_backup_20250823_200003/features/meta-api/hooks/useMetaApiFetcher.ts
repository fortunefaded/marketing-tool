import { useCallback } from 'react'
import { useConvex } from 'convex/react'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { SimpleFatigueCalculator } from '../fatigue/calculator'
import { FatigueData } from '../fatigue/types'
import { ERROR_MESSAGES } from '../constants'

export function useMetaApiFetcher(accountId: string) {
  const convex = useConvex()
  
  const fetchFromApi = useCallback(async (): Promise<{
    data: FatigueData[] | null
    error: Error | null
  }> => {
    if (!accountId) {
      return { data: null, error: null }
    }
    
    try {
      const tokenStore = new SimpleTokenStore(convex)
      const token = await tokenStore.getToken(accountId)
      const api = new SimpleMetaApi(token, accountId)
      const insights = await api.getInsights()
      
      const calculator = new SimpleFatigueCalculator()
      const fatigueData = calculator.calculate(insights)
      
      return { data: fatigueData, error: null }
    } catch (error: any) {
      const message = error.message?.includes('No token found') ? ERROR_MESSAGES.NO_TOKEN
        : error.message?.includes('API Error: 400') ? ERROR_MESSAGES.INVALID_REQUEST
        : error.message?.includes('API Error: 401') ? ERROR_MESSAGES.TOKEN_EXPIRED
        : error.message
      
      return { data: null, error: new Error(message) }
    }
  }, [accountId, convex])
  
  return { fetchFromApi }
}