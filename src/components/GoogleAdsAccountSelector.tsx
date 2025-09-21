import React from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface GoogleAdsAccount {
  id: string
  accountId: string
  name: string
  isActive: boolean
  currency?: string
  timezone?: string
}

interface GoogleAdsAccountSelectorProps {
  accounts: GoogleAdsAccount[]
  selectedAccountId: string | null
  onSelect: (accountId: string) => void
  isLoading?: boolean
}

export const GoogleAdsAccountSelector: React.FC<GoogleAdsAccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  onSelect,
  isLoading = false,
}) => {
  const selectedAccount = accounts.find(acc => acc.accountId === selectedAccountId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse bg-gray-200 h-8 w-48 rounded-md"></div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        Google Adsアカウントが設定されていません
      </div>
    )
  }

  // 単一アカウントの場合はセレクターを表示しない
  if (accounts.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">アカウント:</span>
        <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
          {accounts[0].name}
          {accounts[0].currency && (
            <span className="ml-2 text-xs text-blue-600">({accounts[0].currency})</span>
          )}
        </div>
      </div>
    )
  }

  // 複数アカウントの場合はドロップダウンを表示
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Google Adsアカウント
      </label>
      <div className="relative">
        <button
          type="button"
          className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <span className="block truncate">
            {selectedAccount ? selectedAccount.name : 'アカウントを選択'}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </button>

        <select
          value={selectedAccountId || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          <option value="" disabled>アカウントを選択</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.accountId}>
              {account.name}
              {account.currency && ` (${account.currency})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}