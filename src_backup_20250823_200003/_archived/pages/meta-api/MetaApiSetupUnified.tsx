import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaAccountManager } from '../_archived/services/metaAccountManager'
// import { MetaApiService } from '../services/metaApiService'
// import { AccountSelector } from '../components/meta/AccountSelector'
import { MetaAccount } from '../types/meta-account'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

export const MetaApiSetupUnified: React.FC = () => {
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

    // アカウントがない場合は追加フォームを表示
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

      // 成功したらフォームをリセット
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

  const handleContinueToDashboard = () => {
    if (selectedAccount) {
      navigate('/meta-dashboard')
    }
  }

  // シンプルモード：アカウントが1つだけの場合
  const isSimpleMode = accounts.length <= 1

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meta広告API設定</h1>
          <p className="mt-2 text-lg text-gray-600">
            Meta広告データにアクセスするための設定を行います
          </p>
        </div>

        {/* アカウント一覧（複数アカウントがある場合のみ表示） */}
        {!isSimpleMode && accounts.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">登録済みアカウント</h2>

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
                  onClick={handleContinueToDashboard}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  ダッシュボードへ進む
                </button>
              )}
            </div>
          </div>
        )}

        {/* 新規アカウント追加フォーム */}
        {(showAddForm || accounts.length === 0) && (
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 space-y-8">
              {/* セットアップガイド */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
                  セットアップガイド
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">必要なもの</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Meta広告アカウントへのアクセス権限</li>
                      <li>Graph API Explorerで生成したアクセストークン</li>
                      <li>広告アカウントID（act_で始まる番号）</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      アクセストークンの取得方法
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>
                        <a
                          href="https://developers.facebook.com/tools/explorer/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                        >
                          Graph API Explorer
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                        </a>
                        にアクセス
                      </li>
                      <li>
                        アプリを選択し、必要な権限を追加：
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                            ads_read
                          </span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                            ads_management
                          </span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                            business_management
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                          注意: これらの権限がすべて選択されていることを確認してください
                        </div>
                      </li>
                      <li>「Generate Access Token」をクリック</li>
                      <li>生成されたトークンをコピー</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium">セキュリティ注意事項</p>
                        <p>アクセストークンは第三者に公開しないよう注意してください</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 認証情報入力フォーム */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <KeyIcon className="h-6 w-6 mr-2 text-indigo-500" />
                  {accounts.length === 0 ? 'アカウント情報の設定' : '新規アカウントの追加'}
                </h2>

                <div className="space-y-4">
                  {accounts.length > 0 && (
                    <div>
                      <label
                        htmlFor="account-name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        アカウント名（任意）
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="account-name"
                          value={newAccountForm.name}
                          onChange={(e) =>
                            setNewAccountForm({ ...newAccountForm, name: e.target.value })
                          }
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="例：クライアントA広告アカウント"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">識別しやすい名前を付けてください</p>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="access-token"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                    <p className="mt-1 text-sm text-gray-500">
                      Meta開発者ダッシュボードで生成したアクセストークン
                    </p>
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
                            // 数字のみ許可
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
                    <p className="mt-1 text-sm text-gray-500">
                      ビジネスマネージャーで確認できる広告アカウントIDの数字部分
                    </p>
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
                      disabled={
                        !newAccountForm.accessToken || !newAccountForm.accountId || isConnecting
                      }
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <ShieldCheckIcon className="h-5 w-5 mr-2" />
                      {isConnecting
                        ? '接続中...'
                        : accounts.length === 0
                          ? '接続して保存'
                          : 'アカウントを追加'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 初回設定成功時の表示 */}
        {isSimpleMode && accounts.length === 1 && !showAddForm && selectedAccount && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800">接続成功</h3>
                  <p className="mt-1 text-sm text-green-700">Meta APIへの接続が確立されました</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">接続された広告アカウント</h3>
              <dl className="bg-gray-50 rounded-md p-4 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">アカウント名</dt>
                  <dd className="text-sm text-gray-900">{selectedAccount.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">アカウントID</dt>
                  <dd className="text-sm text-gray-900 font-mono">
                    {selectedAccount.fullAccountId}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">追加日</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(selectedAccount.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                別のアカウントを追加
              </button>
              <button
                onClick={handleContinueToDashboard}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                ダッシュボードへ進む
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
