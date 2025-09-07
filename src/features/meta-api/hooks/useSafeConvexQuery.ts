import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { vibe } from '@/utils/vibelogger'
import { useMemo } from 'react'

type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

interface SafeQueryResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  status: QueryStatus
}

// 関数パスから安全にAPI関数を取得
function getApiFunction(functionPath: string) {
  try {
    const pathParts = functionPath.split('.')
    let func: any = api
    
    for (const part of pathParts) {
      if (!func || typeof func !== 'object') {
        return null
      }
      func = func[part]
    }
    
    return func || null
  } catch (error) {
    return null
  }
}

export function useSafeConvexQuery<T = any>(
  functionPath: string,
  args?: any
): SafeQueryResult<T> {
  
  // API関数を安全に取得
  const queryFunction = useMemo(() => {
    return getApiFunction(functionPath)
  }, [functionPath])
  
  // クエリ引数の準備
  const queryArgs = useMemo(() => {
    if (!queryFunction) return 'skip'
    if (args === undefined) return 'skip'  
    return args
  }, [queryFunction, args])
  
  // useQueryを必ず呼び出す（条件分岐しない）
  // nullの場合はundefinedに変換してskipさせる
  const result = useQuery(queryFunction || undefined, queryArgs)
  
  // 状態の判定
  if (!queryFunction) {
    console.log('❌ API function not available:', { path: functionPath })
    vibe.debug('API function not available', { path: functionPath })
    return {
      data: null,
      isLoading: false, // 関数が存在しない場合はローディングを停止
      error: new Error(`API function not found: ${functionPath}`),
      status: 'error'
    }
  }
  
  if (result === undefined) {
    return {
      data: null,
      isLoading: true,
      error: null,
      status: 'loading'
    }
  }
  
  return {
    data: result as T,
    isLoading: false,
    error: null,
    status: 'success'
  }
}