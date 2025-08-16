import { useState, useEffect } from 'react'
import { ECForceOrder } from '../types/ecforce'
import { ECForceStorage } from '../utils/ecforce-storage'

export const useECForceOrders = () => {
  const [orders, setOrders] = useState<ECForceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)
        const loadedOrders = await ECForceStorage.load()
        setOrders(loadedOrders)
        setError(null)
      } catch (err) {
        console.error('注文データの読み込みエラー:', err)
        setError('データの読み込みに失敗しました')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  return {
    orders,
    loading,
    error
  }
}