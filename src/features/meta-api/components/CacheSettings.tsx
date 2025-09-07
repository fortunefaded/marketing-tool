import { useState, useEffect } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'

interface CacheSettingsProps {
  onExpiryChange?: (hours: number) => void
}

const CACHE_EXPIRY_KEY = 'meta-insights-cache-expiry-hours'
const DEFAULT_EXPIRY_HOURS = 24

export function CacheSettings({ onExpiryChange }: CacheSettingsProps) {
  const [expiryHours, setExpiryHours] = useState(() => {
    const saved = localStorage.getItem(CACHE_EXPIRY_KEY)
    return saved ? parseInt(saved, 10) : DEFAULT_EXPIRY_HOURS
  })

  const presetOptions = [
    { label: '1時間', value: 1 },
    { label: '3時間', value: 3 },
    { label: '6時間', value: 6 },
    { label: '12時間', value: 12 },
    { label: '24時間', value: 24 },
    { label: '2日間', value: 48 },
    { label: '7日間', value: 168 },
  ]

  const handleChange = (hours: number) => {
    setExpiryHours(hours)
    localStorage.setItem(CACHE_EXPIRY_KEY, hours.toString())
    onExpiryChange?.(hours)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center space-x-2 mb-3">
        <ClockIcon className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium">キャッシュ設定</h3>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">キャッシュ保持期間</label>
        <select
          value={expiryHours}
          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {presetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500">
          データは指定された期間ローカルに保存され、API呼び出しを削減します。
        </p>
      </div>
    </div>
  )
}

// キャッシュ有効期限を取得するヘルパー関数
export function getCacheExpiryHours(): number {
  const saved = localStorage.getItem(CACHE_EXPIRY_KEY)
  return saved ? parseInt(saved, 10) : DEFAULT_EXPIRY_HOURS
}

export function getCacheExpiryMs(): number {
  return getCacheExpiryHours() * 60 * 60 * 1000
}
