import { useEffect, useRef, useCallback, useState } from 'react'

interface UseWebWorkerOptions {
  onMessage?: (data: any) => void
  onError?: (error: any) => void
}

/**
 * Web Workerを使うカスタムフック
 */
export function useWebWorker(
  workerPath: string,
  options: UseWebWorkerOptions = {}
) {
  const workerRef = useRef<Worker | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Workerの初期化
  useEffect(() => {
    // Worker作成
    workerRef.current = new Worker(
      new URL(workerPath, import.meta.url),
      { type: 'module' }
    )

    // メッセージハンドラー
    workerRef.current.onmessage = (event) => {
      setIsProcessing(false)
      options.onMessage?.(event.data)
    }

    // エラーハンドラー
    workerRef.current.onerror = (error) => {
      setIsProcessing(false)
      setError(new Error(error.message))
      options.onError?.(error)
    }

    // クリーンアップ
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [workerPath])

  // メッセージ送信
  const postMessage = useCallback((message: any) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized')
    }
    
    setIsProcessing(true)
    setError(null)
    workerRef.current.postMessage(message)
  }, [])

  // Worker終了
  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsProcessing(false)
  }, [])

  return {
    postMessage,
    terminate,
    isProcessing,
    error
  }
}

/**
 * メトリクス計算用のWorkerフック
 */
export function useMetricsCalculator() {
  const [result, setResult] = useState<any>(null)
  
  const { postMessage, isProcessing, error } = useWebWorker(
    '../workers/metricsCalculator.worker.ts',
    {
      onMessage: (data) => {
        if (data.type === 'METRICS_CALCULATED') {
          setResult(data.data)
        }
      }
    }
  )

  const calculateMetrics = useCallback((insights: any[]) => {
    postMessage({
      type: 'CALCULATE_METRICS',
      data: { insights }
    })
  }, [postMessage])

  return {
    calculateMetrics,
    result,
    isProcessing,
    error
  }
}

/**
 * 疲労度計算用のWorkerフック
 */
export function useFatigueCalculator() {
  const [result, setResult] = useState<any[]>([])
  
  const { postMessage, isProcessing, error } = useWebWorker(
    '../workers/metricsCalculator.worker.ts',
    {
      onMessage: (data) => {
        if (data.type === 'FATIGUE_CALCULATED') {
          setResult(data.data)
        }
      }
    }
  )

  const calculateFatigue = useCallback((ads: any[]) => {
    postMessage({
      type: 'CALCULATE_FATIGUE',
      data: { ads }
    })
  }, [postMessage])

  return {
    calculateFatigue,
    result,
    isProcessing,
    error
  }
}