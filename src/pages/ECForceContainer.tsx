import React, { useState, useEffect } from 'react'
import { ECForceOrder } from '../types/ecforce'
import { ECForceDashboard } from './ECForceDashboard'
import { ECForceStorage } from '../utils/ecforce-storage'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export const ECForceContainer: React.FC = () => {
  const [orders, setOrders] = useState<ECForceOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // 初期データをストレージから読み込む（ローディング付き）
    const loadData = async () => {
      setIsLoading(true)
      
      // 最小ローディング時間を確保
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const data = ECForceStorage.load()
      setOrders(data)
      setIsLoading(false)
    }
    
    loadData()
  }, [])

  // グローバルイベントリスナーで他のコンポーネントからのデータ更新を受け取る
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent<ECForceOrder[]>) => {
      console.log('[ECForceContainer] データ更新イベントを受信:', event.detail.length, '件')
      setOrders(event.detail)
    }

    window.addEventListener('ecforce-data-updated', handleDataUpdate as EventListener)

    return () => {
      window.removeEventListener('ecforce-data-updated', handleDataUpdate as EventListener)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" message="データを読み込んでいます..." />
      </div>
    )
  }
  
  return <ECForceDashboard orders={orders} />
}