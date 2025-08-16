import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaTokenSetup } from '../lib/meta-api/token-setup-ui'
import { MetaApiClientWithTokenManager } from '../lib/meta-api/client-with-token-manager'
import { ConnectionTester } from '../components/meta-api/ConnectionTester'
import { EnvConfigPanel } from '../components/meta-api/EnvConfigPanel'
import { AppSecretGuide } from '../components/meta-api/AppSecretGuide'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

export const MetaApiSetup: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'guide' | 'env' | 'token' | 'test'>('guide')
  const [isConnected, setIsConnected] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{
    id: string
    name: string
    currency: string
  } | null>(null)
  const [envVars, setEnvVars] = useState({
    appId: '',
    appSecret: '',
  })
  const [showEnvSuccess, setShowEnvSuccess] = useState(false)

  // Get app credentials from environment variables
  const appId = import.meta.env.VITE_META_APP_ID || ''
  const appSecret = import.meta.env.VITE_META_APP_SECRET || ''
  const apiVersion = 'v23.0' // 固定バージョン

  const handleTokenReady = async (token: string) => {
    try {
      // Create API client with token manager
      const client = new MetaApiClientWithTokenManager({
        appId,
        appSecret,
        adAccountId: '', // Will be set after fetching account info
      })

      await client.initialize()
      
      // Test the connection by fetching ad accounts
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/me/adaccounts?fields=id,name,currency&access_token=${token}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch ad accounts')
      }

      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        const account = data.data[0]
        setAccountInfo({
          id: account.id,
          name: account.name,
          currency: account.currency,
        })
        setIsConnected(true)
        
        // Save account ID to environment
        localStorage.setItem('meta_ad_account_id', account.id)
      }
    } catch (error) {
      console.error('Failed to connect to Meta API:', error)
      alert('Meta APIへの接続に失敗しました。トークンを確認してください。')
    }
  }

  const handleContinue = () => {
    navigate('/meta-dashboard')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const generateEnvContent = () => {
    return `# Meta API Configuration
VITE_META_APP_ID=${envVars.appId}
VITE_META_AD_ACCOUNT_ID=act_your_ad_account_id
VITE_USE_MOCK_DATA=false

# オプション: トークン交換機能を使用する場合のみ
# VITE_META_APP_SECRET=${envVars.appSecret}`
  }

  const handleSaveEnvVars = () => {
    // 実際の環境では、これらの値を安全に保存する必要があります
    localStorage.setItem('meta_app_id', envVars.appId)
    localStorage.setItem('meta_app_secret', envVars.appSecret)
    setShowEnvSuccess(true)
    setTimeout(() => setShowEnvSuccess(false), 3000)
  }

  // 環境変数が設定されていない場合の表示を改善
  const hasEnvVars = appId && appSecret

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Meta広告API設定
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Meta広告データにアクセスするための設定を行います
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'guide'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              セットアップガイド
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'env'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              環境変数設定
            </button>
            <button
              onClick={() => setActiveTab('token')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'token'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              トークン設定
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              接続テスト
            </button>
          </nav>
        </div>

        {/* ガイドタブ */}
        {activeTab === 'guide' && (
          <div className="bg-white shadow rounded-lg p-6 space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📚 セットアップガイド</h2>
              
              {/* ステップ1: アプリ作成 */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-3">ステップ1: Meta開発者アプリの作成</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>
                    <a
                      href="https://developers.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                    >
                      Meta for Developers
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                    </a>
                    にアクセス
                  </li>
                  <li>右上の「マイアプリ」→「アプリを作成」をクリック</li>
                  <li>アプリタイプは「ビジネス」を選択</li>
                  <li>アプリ名とメールアドレスを入力</li>
                  <li>作成完了後、ダッシュボードが表示されます</li>
                </ol>
              </div>

              {/* ステップ2: 認証情報取得 */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-3">ステップ2: 認証情報の取得</h3>
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="text-sm text-gray-600 mb-3">アプリダッシュボードで以下を確認：</p>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-700">アプリID</dt>
                      <dd className="text-sm text-gray-600">設定 → ベーシックに表示される16桁の数字</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-700">app secret</dt>
                      <dd className="text-sm text-gray-600">設定 → ベーシックで「表示」をクリックして確認</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* ステップ3: Marketing API追加 */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-3">ステップ3: Marketing APIの追加</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>アプリダッシュボードで「プロダクト」→「プロダクトを追加」</li>
                  <li>「Marketing API」を探して「設定」をクリック</li>
                  <li>必要な権限を確認：
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">ads_read</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">ads_management</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">business_management</span>
                    </div>
                  </li>
                </ol>
              </div>

              {/* ステップ4: トークン取得 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">ステップ4: アクセストークンの取得</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-2">推奨: システムユーザートークン</p>
                      <p>ビジネス設定 → システムユーザー → 新規作成 → トークンを生成</p>
                      <p className="mt-2">システムユーザートークンは期限がなく、本番環境に最適です。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 環境変数タブ */}
        {activeTab === 'env' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ 環境変数設定</h2>
            
            <div className="space-y-8">
              {/* EnvConfigPanel for actual configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">環境変数の設定</h3>
                <EnvConfigPanel />
              </div>
              
              {/* Divider */}
              <div className="border-t border-gray-200" />
              
              {/* App Secret Guide */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">App Secretの取得方法</h3>
                <AppSecretGuide />
              </div>
            </div>
          </div>
        )}

        {/* トークンタブ */}
        {activeTab === 'token' && (
          <div>
            {!hasEnvVars ? (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800">
                        環境変数を先に設定してください
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        トークン設定の前に「環境変数設定」タブでApp IDとApp Secretを設定してください。
                      </p>
                      <button
                        onClick={() => setActiveTab('env')}
                        className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                      >
                        環境変数設定へ →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : !isConnected ? (
              <MetaTokenSetup
                appId={appId || envVars.appId}
                appSecret={appSecret || envVars.appSecret}
                onTokenReady={handleTokenReady}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-800">
                        接続成功
                      </h3>
                      <p className="mt-1 text-sm text-green-700">
                        Meta APIへの接続が確立されました
                      </p>
                    </div>
                  </div>
                </div>

                {accountInfo && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      接続された広告アカウント
                    </h3>
                    <dl className="bg-gray-50 rounded-md p-4 space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          アカウント名
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {accountInfo.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          アカウントID
                        </dt>
                        <dd className="text-sm text-gray-900 font-mono">
                          {accountInfo.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          通貨
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {accountInfo.currency}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setIsConnected(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    別のアカウントを設定
                  </button>
                  <button
                    onClick={handleContinue}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    ダッシュボードへ進む
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 接続テストタブ */}
        {activeTab === 'test' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                API接続テスト
              </h2>
              <p className="text-gray-600">
                Meta APIへの接続とデータ取得が正常に動作するかテストします。
              </p>
            </div>
            
            <ConnectionTester />
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                テスト項目の説明
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• 環境変数チェック: 必要な設定が正しく行われているか確認</li>
                <li>• API接続テスト: Meta APIエンドポイントへの接続確認</li>
                <li>• アカウント情報取得: 広告アカウントの詳細情報を取得</li>
                <li>• キャンペーン一覧取得: アクティブなキャンペーンの取得テスト</li>
                <li>• トークン検証: アクセストークンの有効性と権限の確認</li>
                <li>• レート制限チェック: API使用量と制限状況の確認</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}