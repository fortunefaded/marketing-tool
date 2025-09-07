# src/features/meta-api/hooks/useAdFatigue.ts

```typescript
import { useState, useEffect } from 'react'
import { useConvex } from '../../../hooks/useConvex'
import { SimpleTokenStore } from '../core/token'
import { SimpleMetaApi } from '../core/api-client'
import { SimpleFatigueCalculator } from '../fatigue/calculator'
import { FatigueData } from '../core/types'
import { api } from '../../../../convex/_generated/api'

export function useAdFatigue(accountId: string) {
  const [data, setData] = useState<FatigueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const convex = useConvex()
  
  useEffect(() => {
    if (!accountId) {
      setData([])
      setIsLoading(false)
      return
    }
    
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Try Convex cache first
        const cached = await convex.query(api.metaInsights.getInsights, {
          accountId,
          limit: 100
        })
        
        if (cached?.items && cached.items.length > 0) {
          const calculator = new SimpleFatigueCalculator()
          const fatigueData = calculator.calculate(cached.items)
          setData(fatigueData)
        } else {
          // Get token and fetch from API
          const tokenStore = new SimpleTokenStore(convex)
          const token = await tokenStore.getToken(accountId)
          
          const apiClient = new SimpleMetaApi(token, accountId)
          const insights = await apiClient.getInsights()
          
          const calculator = new SimpleFatigueCalculator()
          const fatigueData = calculator.calculate(insights)
          setData(fatigueData)
        }
      } catch (err) {
        console.error('Failed to fetch ad fatigue data:', err)
        setError(err as Error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [accountId, convex])
  
  return { data, isLoading, error, refetch: () => fetchData() }
}
```
