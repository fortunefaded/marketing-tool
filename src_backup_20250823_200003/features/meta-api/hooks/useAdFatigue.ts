import { useState, useEffect } from 'react'
import { useConvexCache } from './useConvexCache'
import { useMetaApiFetcher } from './useMetaApiFetcher'
import { SimpleFatigueCalculator } from '../fatigue/calculator'
import { FatigueData } from '../fatigue/types'

export function useAdFatigue(accountId: string) {
  const [data, setData] = useState<FatigueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null)
  
  const { data: cacheData, hasCache, error: cacheError } = useConvexCache(accountId)
  const { fetchFromApi } = useMetaApiFetcher(accountId)
  
  useEffect(() => {
    if (!accountId) {
      setData([])
      setIsLoading(false)
      setDataSource(null)
      return
    }
    
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      
      // Check for cache error
      if (cacheError) {
        console.warn('Cache error, falling back to API:', cacheError)
      }
      
      // Use cache if available
      if (hasCache && cacheData && !cacheError) {
        const calculator = new SimpleFatigueCalculator()
        setData(calculator.calculate(cacheData))
        setDataSource('cache')
        setIsLoading(false)
        return
      }
      
      // Fetch from API
      const { data: apiData, error: apiError } = await fetchFromApi()
      
      if (apiError) {
        setError(apiError)
        setData([])
        setDataSource(null)
      } else if (apiData) {
        setData(apiData)
        setDataSource('api')
      }
      
      setIsLoading(false)
    }
    
    loadData()
  }, [accountId, cacheData, hasCache, cacheError, fetchFromApi])
  
  const refetch = async () => {
    const { data: apiData, error: apiError } = await fetchFromApi()
    setData(apiData || [])
    setError(apiError)
    setDataSource(apiData ? 'api' : null)
  }
  
  return { data, isLoading, error, refetch, dataSource }
}