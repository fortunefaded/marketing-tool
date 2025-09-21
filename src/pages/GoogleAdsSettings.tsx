import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export function GoogleAdsSettings() {
  const navigate = useNavigate()

  // Convex queries and mutations
  const existingConfig = useQuery(api.googleAds.getConfig)
  const saveConfigMutation = useMutation(api.googleAds.saveConfig)
  const generateAuthUrlAction = useAction(api.googleAds.generateAuthUrl)
  const testConnectionAction = useAction(api.googleAds.testConnection)

  // Form state
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [developerToken, setDeveloperToken] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [managerAccountId, setManagerAccountId] = useState('')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showClientSecret, setShowClientSecret] = useState(false)

  // 既存の設定を読み込み（Convexから）
  useEffect(() => {
    if (existingConfig) {
      setClientId(existingConfig.clientId || '')
      setClientSecret(existingConfig.clientSecret || '')
      setDeveloperToken(existingConfig.developerToken || '')
      setCustomerId(existingConfig.customerId || '')
      setManagerAccountId(existingConfig.managerAccountId || '')
    }
  }, [existingConfig])

  // Customer IDからハイフンを除去するヘルパー関数
  const cleanCustomerId = (id: string): string => {
    return id.replace(/-/g, '')
  }

  // 設定を保存
  const handleSave = async () => {
    if (!clientId || !clientSecret || !developerToken || !customerId) {
      setMessage({ type: 'error', text: '必須項目を入力してください' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      // ハイフンを自動的に除去
      const cleanedCustomerId = cleanCustomerId(customerId)
      const cleanedManagerAccountId = managerAccountId ? cleanCustomerId(managerAccountId) : undefined

      await saveConfigMutation({
        clientId,
        clientSecret,
        developerToken,
        customerId: cleanedCustomerId,
        managerAccountId: cleanedManagerAccountId,
        isConnected: existingConfig?.isConnected || false, // 既存の接続状態を保持
      })

      setMessage({ type: 'success', text: '設定を保存しました' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存に失敗しました' })
    } finally {
      setIsSaving(false)
    }
  }

  // OAuth認証を開始
  const handleConnect = async () => {
    if (!clientId) {
      setMessage({ type: 'error', text: 'Client IDを入力してください' })
      return
    }

    setIsConnecting(true)
    setMessage(null)

    try {
      // まず設定を保存
      await handleSave()

      // 認証URLを生成
      const authUrl = await generateAuthUrlAction({
        clientId,
        redirectUri: `${window.location.origin}/settings/google-ads/callback`,
      })

      // 認証ページにリダイレクト
      window.location.href = authUrl
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '認証URLの生成に失敗しました' })
      setIsConnecting(false)
    }
  }

  // 接続テスト
  const handleTestConnection = async () => {
    setIsTesting(true)
    setMessage(null)

    try {
      const result = await testConnectionAction({})

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '接続テストに失敗しました' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <h1 className="text-xl font-semibold text-gray-900">Google Ads 設定</h1>
              </div>
            </div>

            {existingConfig?.isConnected && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700">接続済み</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* メッセージ表示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}


        {/* API認証情報セクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API認証情報</h2>

            <div className="space-y-4">
              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: 123456789.apps.googleusercontent.com"
                />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showClientSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="例: GOCSPX-xxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showClientSecret ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Developer Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Developer Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={developerToken}
                  onChange={(e) => setDeveloperToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: xxxxx"
                />
              </div>
            </div>
          </div>
        </div>

        {/* アカウント情報セクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>

            <div className="space-y-4">
              {/* Customer ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: 123-456-7890 または 1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Google Ads管理画面の右上に表示される番号。<span className="text-green-600 font-semibold">ハイフン付きでもOK！</span>
                </p>
              </div>

              {/* Manager Account ID (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Account ID（オプション）
                </label>
                <input
                  type="text"
                  value={managerAccountId}
                  onChange={(e) => setManagerAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="例: 098-765-4321 または 0987654321"
                />
                <p className="text-xs text-gray-500 mt-1">
                  MCC（マネージャーアカウント）を使用する場合のみ入力。<span className="text-green-600 font-semibold">ハイフン付きでもOK！</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-4 flex-wrap">
          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>

          {/* 接続ボタン */}
          {!existingConfig?.isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !clientId || !clientSecret || !developerToken || !customerId}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? '接続中...' : 'Googleアカウントと連携'}
            </button>
          ) : (
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'テスト中...' : '接続テスト'}
            </button>
          )}

        </div>

        {/* ヘルプセクション */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">設定方法</h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">1. Google Cloud Consoleでプロジェクトを作成</h4>
              <p className="text-sm text-gray-600 mb-1">
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google Cloud Console
                </a>
                にアクセスして新しいプロジェクトを作成します。
              </p>
            </div>

            {/* Step 2 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">2. Google Ads APIを有効化</h4>
              <p className="text-sm text-gray-600">
                作成したプロジェクトで「APIとサービス」→「ライブラリ」から「Google Ads API」を検索して有効化します。
              </p>
            </div>

            {/* Step 3 - 詳細な説明 */}
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">3</span>
                OAuth 2.0認証情報を作成（Client ID、Client Secret）
              </h4>
              <ol className="space-y-2 text-sm text-gray-600 ml-8">
                <li>a. Google Cloud Consoleで「APIとサービス」→「認証情報」に移動</li>
                <li>b. 「+ 認証情報を作成」→「OAuth クライアント ID」を選択</li>
                <li>c. アプリケーションの種類：「<strong>ウェブアプリケーション</strong>」を選択</li>
                <li>d. 名前：任意の名前（例：「Marketing Tool」）を入力</li>
                <li>
                  e. 承認済みのリダイレクトURI：以下のURIを追加
                  <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs break-all">
                    {window.location.origin}/settings/google-ads/callback
                  </div>
                </li>
                <li>f. 「作成」ボタンをクリック</li>
                <li>
                  g. 表示されるポップアップから：
                  <ul className="ml-4 mt-1">
                    <li>• <strong>クライアント ID</strong>をコピー（例：123456789.apps.googleusercontent.com）</li>
                    <li>• <strong>クライアント シークレット</strong>をコピー（例：GOCSPX-xxxxx）</li>
                  </ul>
                </li>
              </ol>
            </div>

            {/* Step 4 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">4. Developer Tokenを取得</h4>
              <p className="text-sm text-gray-600 mb-2">
                <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google Ads API Center
                </a>
                にアクセスして：
              </p>
              <ul className="space-y-1 text-sm text-gray-600 ml-4">
                <li>• 「API アクセス」タブをクリック</li>
                <li>• 「Developer token」の値をコピー</li>
                <li>• ※初回はテストアカウントでの利用になる場合があります</li>
              </ul>
            </div>

            {/* Step 5 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">5. Customer IDを確認</h4>
              <p className="text-sm text-gray-600">
                Google Ads管理画面の右上に表示される10桁の数字（ハイフンなし）です。
                <br />
                例：1234567890（123-456-7890 の場合はハイフンを除去）
              </p>
            </div>
          </div>

          {/* 重要な注意事項 */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">⚠️ 重要な注意事項</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• OAuth同意画面の設定が必要な場合は「外部」を選択し、テストユーザーとして自分のメールアドレスを追加してください</li>
              <li>• 本番環境では、OAuth同意画面の審査が必要になる場合があります</li>
              <li>• Developer Tokenがテストモードの場合、テストアカウントのみアクセス可能です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}