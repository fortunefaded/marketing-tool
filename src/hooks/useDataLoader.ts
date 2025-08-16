import { useState, useEffect, useCallback } from 'react'

interface UseDataLoaderOptions {
  initialLoading?: boolean
  minLoadingTime?: number // 最小ローディング時間（ミリ秒）
}

export function useDataLoader<T>(
  loadFunction: () => Promise<T> | T,
  dependencies: any[] = [],
  options: UseDataLoaderOptions = {}
) {
  const { initialLoading = true, minLoadingTime = 300 } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const startTime = Date.now()
    
    try {
      const result = await Promise.resolve(loadFunction())
      
      // 最小ローディング時間を確保（UXのため）
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime))
      }
      
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [loadFunction, minLoadingTime])

  useEffect(() => {
    loadData()
  }, dependencies)

  return { data, loading, error, reload: loadData }
}