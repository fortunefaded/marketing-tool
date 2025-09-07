import React, { useState, useEffect } from 'react'
import { MetaTokenManager } from './token-manager'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface TokenSetupProps {
  appId: string
  appSecret: string
  onTokenReady: (token: string) => void
  onCancel?: () => void
}

export const MetaTokenSetup: React.FC<TokenSetupProps> = ({
  appId,
  appSecret,
  onTokenReady,
  onCancel,
}) => {
  const [step, setStep] = useState<'input' | 'validating' | 'success' | 'error'>('input')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenType, setTokenType] = useState<'short' | 'long' | 'system'>('short')
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<{
    isValid: boolean
    type?: string
    expiresAt?: Date
    scopes?: string[]
  } | null>(null)

  const tokenManager = new MetaTokenManager({
    appId,
    appSecret,
  })

  useEffect(() => {
    // Try to load existing token
    tokenManager.loadFromStorage().then((loaded) => {
      if (loaded) {
        tokenManager.getTokenInfo().then((info) => {
          if (info.isValid) {
            setTokenInfo(info)
            setStep('success')
            tokenManager.getAccessToken().then(onTokenReady)
          }
        })
      }
    })
  }, [])

  const handleTokenSubmit = async () => {
    setStep('validating')
    setError(null)

    try {
      if (tokenType === 'short') {
        // Exchange short-lived token
        await tokenManager.exchangeToken(tokenInput)
      } else {
        // Set long-lived or system token
        tokenManager.setToken({
          token: tokenInput,
          type: tokenType,
          expiresAt:
            tokenType === 'long'
              ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
              : undefined,
        })
      }

      // Validate token
      const info = await tokenManager.getTokenInfo()
      if (info.isValid) {
        setTokenInfo(info)
        setStep('success')
        const token = await tokenManager.getAccessToken()
        onTokenReady(token)
      } else {
        throw new Error('Invalid token')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token validation failed')
      setStep('error')
    }
  }

  const formatExpiryTime = (expiresAt?: Date) => {
    if (!expiresAt) return '期限なし'

    const remaining = expiresAt.getTime() - Date.now()
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) {
      return `${days}日 ${hours}時間後`
    } else if (hours > 0) {
      return `${hours}時間後`
    } else {
      return '期限切れ'
    }
  }

  const requiredScopes = ['ads_read', 'ads_management', 'business_management']
  const hasRequiredScopes =
    tokenInfo?.scopes?.some((scope) => requiredScopes.includes(scope)) ?? false

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Meta APIトークン設定</h2>

        {step === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">トークンタイプ</label>
              <select
                value={tokenType}
                onChange={(e) => setTokenType(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="short">短期アクセストークン</option>
                <option value="long">長期アクセストークン</option>
                <option value="system">システムユーザートークン</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {tokenType === 'short' && '自動的に長期トークンに交換されます'}
                {tokenType === 'long' && '最大60日間有効'}
                {tokenType === 'system' && '期限なし（推奨）'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アクセストークン
              </label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="トークンを貼り付けてください"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
              />
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">トークンの取得方法：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Graph API Explorer
                  </a>
                  を開く
                </li>
                <li>アプリを選択</li>
                <li>「Get Token」→「Get User Access Token」を選択</li>
                <li>必要な権限にチェック: ads_read, ads_management</li>
                <li>「Generate Access Token」をクリック</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleTokenSubmit}
                disabled={!tokenInput}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
              >
                検証して保存
              </button>
            </div>
          </div>
        )}

        {step === 'validating' && (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
            <p className="mt-2 text-sm text-gray-500">トークンを検証中...</p>
          </div>
        )}

        {step === 'success' && tokenInfo && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    トークンが正常に設定されました
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>タイプ: {tokenInfo.type}</p>
                    <p>有効期限: {formatExpiryTime(tokenInfo.expiresAt)}</p>
                    {!hasRequiredScopes && (
                      <p className="text-yellow-700 mt-2">
                        ⚠️ 必要な権限が不足している可能性があります
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {tokenInfo.scopes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">付与された権限:</h4>
                <div className="flex flex-wrap gap-2">
                  {tokenInfo.scopes.map((scope) => (
                    <span
                      key={scope}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        requiredScopes.includes(scope)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                新しいトークンを設定
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <XCircleIcon className="h-5 w-5 text-red-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">トークンの設定に失敗しました</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                再試行
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
