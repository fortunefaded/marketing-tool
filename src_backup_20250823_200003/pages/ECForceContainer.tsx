import React from 'react'
import { ECForceDashboard } from './ECForceDashboard'
import { useECForceData } from '../hooks/useECForceData'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

export const ECForceContainer: React.FC = () => {
  // ConvexからECForceデータを取得
  const { orders, isLoading } = useECForceData()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" message="データを読み込んでいます..." />
      </div>
    )
  }

  return <ECForceDashboard orders={orders} />
}
