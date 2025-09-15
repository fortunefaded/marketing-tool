import { useState, useEffect } from 'react'
import { vibe } from '@/utils/vibelogger'

interface RateLimitStatus {
  isRateLimited: boolean
  retryAfter: number // 秒数
  canRetry: boolean
  timeRemaining: number // 残り秒数
}

export function useRateLimitStatus(): RateLimitStatus {
  const [_lastRateLimitTime, setLastRateLimitTime] = useState<number>(0)
  const [retryAfter, setRetryAfter] = useState<number>(0)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  // ローカルストレージからレート制限情報を復元
  useEffect(() => {
    const stored = localStorage.getItem('metaApiRateLimit')
    if (stored) {
      const { timestamp, duration } = JSON.parse(stored)
      const elapsed = Math.floor((Date.now() - timestamp) / 1000)
      const remaining = Math.max(0, duration - elapsed)
      
      if (remaining > 0) {
        setLastRateLimitTime(timestamp)
        setRetryAfter(duration)
        setTimeRemaining(remaining)
        vibe.info(`レート制限中: あと${remaining}秒`)
      }
    }
  }, [])
  
  // カウントダウンタイマー
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const next = Math.max(0, prev - 1)
          if (next === 0) {
            localStorage.removeItem('metaApiRateLimit')
            vibe.good('レート制限が解除されました')
          }
          return next
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [timeRemaining])
  
  // レート制限を記録
  const recordRateLimit = (duration: number = 60) => {
    const timestamp = Date.now()
    localStorage.setItem('metaApiRateLimit', JSON.stringify({ timestamp, duration }))
    setLastRateLimitTime(timestamp)
    setRetryAfter(duration)
    setTimeRemaining(duration)
  }
  
  // グローバルに公開（エラーハンドリングで使用）
  useEffect(() => {
    (window as any).recordMetaApiRateLimit = recordRateLimit
  }, [])
  
  return {
    isRateLimited: timeRemaining > 0,
    retryAfter,
    canRetry: timeRemaining === 0,
    timeRemaining
  }
}