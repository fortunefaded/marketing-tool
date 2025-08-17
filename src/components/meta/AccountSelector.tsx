import React, { useState, useEffect } from 'react'
import { 
  ChevronDownIcon, 
  PlusIcon, 
  CheckIcon,
  TrashIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { MetaAccountManager } from '../../services/metaAccountManager'
import { MetaAccount } from '../../types/meta-account'

interface AccountSelectorProps {
  onAccountChange?: (account: MetaAccount | null) => void
  onAddAccount?: () => void
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  onAccountChange,
  onAddAccount
}) => {
  const [manager] = useState(() => new MetaAccountManager())
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<MetaAccount | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = () => {
    const allAccounts = manager.getAccounts()
    const active = manager.getActiveAccount()
    
    setAccounts(allAccounts)
    setActiveAccount(active)
    
    if (onAccountChange) {
      onAccountChange(active)
    }
  }

  const handleSelectAccount = (account: MetaAccount) => {
    manager.setActiveAccount(account.id)
    setActiveAccount(account)
    setShowDropdown(false)
    
    if (onAccountChange) {
      onAccountChange(account)
    }
  }

  const handleRemoveAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (window.confirm('このアカウントを削除しますか？')) {
      manager.removeAccount(accountId)
      loadAccounts()
    }
  }

  const handleAddAccount = () => {
    setShowDropdown(false)
    if (onAddAccount) {
      onAddAccount()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[250px]"
      >
        <div className="flex items-center">
          <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div className="text-left">
            {activeAccount ? (
              <>
                <div className="text-sm font-medium text-gray-900">
                  {activeAccount.name}
                </div>
                <div className="text-xs text-gray-500">
                  {activeAccount.fullAccountId}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                アカウントを選択
              </span>
            )}
          </div>
        </div>
        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
      </button>

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
          <div className="py-1">
            {accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleSelectAccount(account)}
                className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group"
              >
                <div className="flex items-center flex-1">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {account.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {account.fullAccountId}
                    </div>
                  </div>
                  {activeAccount?.id === account.id && (
                    <CheckIcon className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </div>
                <button
                  onClick={(e) => handleRemoveAccount(account.id, e)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="削除"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                onClick={handleAddAccount}
                className="flex items-center w-full px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                新しいアカウントを追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}