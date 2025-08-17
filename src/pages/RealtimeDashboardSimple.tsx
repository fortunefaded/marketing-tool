import React from 'react'

export const RealtimeDashboardSimple: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">リアルタイムダッシュボード（シンプル版）</h1>
      <p className="text-gray-400">WebSocket接続なしのテスト版です</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">売上</h3>
          <p className="text-2xl font-bold">¥0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">注文数</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">訪問者数</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  )
}