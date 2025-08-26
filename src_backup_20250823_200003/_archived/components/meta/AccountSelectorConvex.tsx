import React, { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'
import {
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { MetaAccountManagerConvex } from '../../services/metaAccountManagerConvex'
import { MetaAccount } from '../../../types/meta-account'

interface AccountSelectorProps {
  onAccountChange?: (account: MetaAccount | null) => void
  onAddAccount?: () => void
}

export const AccountSelectorConvex: React.FC<AccountSelectorProps> = ({
  onAccountChange,
  onAddAccount,
}) => {
  const convexClient = useConvex()
  const [manager] = useState(() => MetaAccountManagerConvex.getInstance(convexClient))
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<MetaAccount | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setIsLoading(true)
      const allAccounts = await manager.getAccounts()
      const active = await manager.getActiveAccount()

      setAccounts(allAccounts)
      setActiveAccount(active)

      if (onAccountChange) {
        onAccountChange(active)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAccount = async (account: MetaAccount) => {
    try {
      await manager.setActiveAccount(account.id)
      setActiveAccount(account)
      setShowDropdown(false)

      if (onAccountChange) {
        onAccountChange(account)
      }
    } catch (error) {
      console.error('Failed to select account:', error)
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    if (window.confirm('このアカウントを削除しますか？')) {
      try {
        await manager.removeAccount(accountId)
        await loadAccounts()
      } catch (error) {
        console.error('Failed to remove account:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <span className="flex items-center">
          <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span className="block truncate">
            {activeAccount ? activeAccount.name : 'アカウントを選択'}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="group cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
            >
              <div
                className="flex items-center justify-between"
                onClick={() => handleSelectAccount(account)}
              >
                <div className="flex items-center">
                  <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <span className="font-normal block truncate">{account.name}</span>
                    <span className="text-xs text-gray-500">{account.fullAccountId}</span>
                  </div>
                </div>
                {activeAccount?.id === account.id && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-8 text-indigo-600">
                    <CheckIcon className="h-5 w-5" />
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveAccount(account.id)
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
              </button>
            </div>
          ))}

          {onAddAccount && (
            <div
              onClick={() => {
                setShowDropdown(false)
                onAddAccount()
              }}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 border-t"
            >
              <div className="flex items-center">
                <PlusIcon className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="font-normal block truncate text-indigo-600">
                  新しいアカウントを追加
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
