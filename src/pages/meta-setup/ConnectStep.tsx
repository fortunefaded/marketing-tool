import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../../services/meta-account/MetaAccountManager'
import { MetaAccount } from '../../types/meta-account'
import {
  ExclamationTriangleIcon,
  KeyIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export const ConnectStep: React.FC = () => {
  const navigate = useNavigate()
  const [manager] = useState(() => MetaAccountManager.getInstance())
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<MetaAccount | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    accessToken: '',
    accountId: '',
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = () => {
    const allAccounts = manager.getAccounts()
    const active = manager.getActiveAccount()

    setAccounts(allAccounts)
    setSelectedAccount(active)

    if (allAccounts.length === 0) {
      setShowAddForm(true)
    }
  }

  const handleAddAccount = async () => {
    setError(null)
    setIsConnecting(true)

    try {
      if (!newAccountForm.accessToken || !newAccountForm.accountId) {
        throw new Error('アクセストークンとアカウントIDを入力してください。')
      }

      await manager.addAccount({
        name: newAccountForm.name || `アカウント ${newAccountForm.accountId}`,
        accessToken: newAccountForm.accessToken,
        accountId: newAccountForm.accountId,
      })

      setNewAccountForm({
        name: '',
        accessToken: '',
        accountId: '',
      })

      setShowAddForm(false)
      loadAccounts()
    } catch (error) {
      setError(error instanceof Error ? error.message : '接続に失敗しました')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRemoveAccount = (accountId: string) => {
    if (window.confirm('このアカウントを削除しますか？')) {
      manager.removeAccount(accountId)
      loadAccounts()
    }
  }

  const handleSelectAccount = (account: MetaAccount) => {
    manager.setActiveAccount(account.accountId)
    setSelectedAccount(account)
  }

  const handleContinue = () => {
    if (selectedAccount) {
      navigate('/meta-api-setup/permissions')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Meta広告アカウントの接続</h2>
        <p className="text-gray-600">
          Meta広告アカウントを接続して、広告データへのアクセスを設定します。
        </p>
      </div>

      {/* アカウント一覧 */}
      {accounts.length > 0 && !showAddForm && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">登録済みアカウント</h3>

          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedAccount?.accountId === account.accountId
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectAccount(account)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <UserCircleIcon className="h-10 w-10 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.fullAccountId}</div>
                    </div>
                    {selectedAccount?.accountId === account.accountId && (
                      <CheckCircleIcon className="h-5 w-5 text-indigo-500 ml-auto mr-3" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveAccount(account.accountId)
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="削除"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              アカウントを追加
            </button>

            {selectedAccount && (
              <button
                onClick={handleContinue}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                次へ進む
              </button>
            )}
          </div>
        </div>
      )}

      {/* 新規アカウント追加フォーム */}
      {showAddForm && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <KeyIcon className="h-6 w-6 mr-2 text-indigo-500" />
            新規アカウントの追加
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-gray-700">
                アカウント名（任意）
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="account-name"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="例：クライアントA広告アカウント"
                />
              </div>
            </div>

            <div>
              <label htmlFor="access-token" className="block text-sm font-medium text-gray-700">
                アクセストークン
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  id="access-token"
                  value={newAccountForm.accessToken}
                  onChange={(e) =>
                    setNewAccountForm({ ...newAccountForm, accessToken: e.target.value })
                  }
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="EAA..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="account-id" className="block text-sm font-medium text-gray-700">
                広告アカウントID
              </label>
              <div className="mt-1">
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    act_
                  </span>
                  <input
                    type="text"
                    id="account-id"
                    value={newAccountForm.accountId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      setNewAccountForm({ ...newAccountForm, accountId: value })
                    }}
                    className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
                    placeholder="123456789012345"
                    pattern="[0-9]*"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {accounts.length > 0 && (
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setError(null)
                    setNewAccountForm({
                      name: '',
                      accessToken: '',
                      accountId: '',
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleAddAccount}
                disabled={!newAccountForm.accessToken || !newAccountForm.accountId || isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                {isConnecting ? '接続中...' : 'アカウントを追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
