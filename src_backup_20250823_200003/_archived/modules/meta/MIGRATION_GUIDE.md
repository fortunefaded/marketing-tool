# Meta API Migration Guide

This guide helps you migrate from the old 1,815-line metaApiService.ts to the new clean implementation.

## Quick Start - Minimal Changes

If you want to migrate with minimal code changes, you can use the legacy wrapper:

```typescript
// Old code - no changes needed!
import { MetaApiService } from '../services/metaApiService'

const apiService = new MetaApiService(config)
const insights = await apiService.getInsights({ dateRange })
```

The legacy wrapper automatically uses the new clean implementation under the hood.

## Recommended Migration - Use React Query Hooks

For better performance and cleaner code, migrate to the new React Query hooks:

### Before (Class-based API):
```typescript
import { MetaApiService } from '../services/metaApiService'

const [insights, setInsights] = useState([])
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    try {
      const apiService = new MetaApiService(config)
      const data = await apiService.getInsights({ dateRange })
      setInsights(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }
  fetchData()
}, [config, dateRange])
```

### After (React Query Hooks):
```typescript
import { useMetaInsights } from '../modules/meta/hooks/useMetaApi'

const { data, isLoading, error } = useMetaInsights(
  { 
    accessToken: config.accessToken,
    accountId: config.accountId 
  },
  {
    dateRange: { since: dateRange.start, until: dateRange.end }
  }
)

const insights = data?.data || []
```

## Benefits of the New Implementation

1. **Type Safety**: Full TypeScript support with Zod validation
2. **Caching**: Automatic caching with React Query
3. **Size**: ~300 lines vs 1,815 lines (83% reduction)
4. **Performance**: Built-in optimizations like request deduplication
5. **Error Handling**: Consistent error handling with retry logic
6. **Infinite Scroll**: Built-in support with `useMetaInsightsInfinite`

## Migration Steps

### Step 1: Install Dependencies
```bash
npm install @tanstack/react-query zod
```

### Step 2: Add React Query Provider
```typescript
// In your App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  )
}
```

### Step 3: Migrate Components

#### For Simple Data Fetching:
```typescript
// Old
const apiService = new MetaApiService(config)
const campaigns = await apiService.getCampaigns()

// New
const { data: campaigns } = useMetaCampaigns(config)
```

#### For Infinite Scroll:
```typescript
// New - Built-in infinite scroll support
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useMetaInsightsInfinite(config, { limit: 50 })

const insights = data?.pages.flatMap(page => page.data) || []
```

#### For Batch Requests:
```typescript
// New - Using mutation for batch requests
const { data: ads } = useMetaAdsBatch(config, adIds)
```

## Type Mapping

| Old Type | New Type | Notes |
|----------|----------|--------|
| MetaInsightsData | Insight | Cleaner, validated with Zod |
| MetaCampaignData | Campaign | From getCampaigns response |
| MetaApiService | MetaApiServiceV2 | Direct service usage |

## Gradual Migration

You can migrate gradually:

1. Start with new features using the new hooks
2. Migrate existing components one by one
3. Use the legacy wrapper for complex migrations
4. Remove the old service once fully migrated

## Common Patterns

### Error Handling
```typescript
const { data, error, refetch } = useMetaInsights(config)

if (error) {
  return <ErrorComponent error={error} onRetry={refetch} />
}
```

### Loading States
```typescript
const { isLoading, isFetchingNextPage } = useMetaInsights(config)

if (isLoading) return <Skeleton />
```

### Data Transformation
```typescript
// Use the built-in selector for transformations
const { data: metrics } = useMetaInsights(
  config,
  params,
  {
    select: (data) => calculateMetrics(data.data)
  }
)
```