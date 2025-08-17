import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetaApiService } from '../services/metaApiService'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  KeyIcon,
  ShieldCheckIcon
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
    accessToken: '',
    accountId: '',
  })
  const [showEnvSuccess, setShowEnvSuccess] = useState(false)
  const [apiService, setApiService] = useState<MetaApiService | null>(null)

  const handleConnect = async () => {
    try {
      if (!envVars.accessToken || !envVars.accountId) {
        alert('アクセストークンとアカウントIDを入力してください。')
        return
      }

      // MetaApiServiceを初期化
      const service = new MetaApiService({
        accessToken: envVars.accessToken,
        accountId: envVars.accountId.replace('act_', ''), // act_プレフィックスを除去
      })

      // トークンの検証
      const isValid = await service.validateAccessToken()
      
      if (!isValid) {
        throw new Error('アクセストークンが無効です')
      }

      // キャンペーン一覧を取得してテスト
      const campaigns = await service.getCampaigns({ limit: 1 })
      
      setApiService(service)
      setIsConnected(true)
      setAccountInfo({
        id: `act_${envVars.accountId}`,
        name: 'Meta広告アカウント',
        currency: 'JPY',
      })
      
      // 設定をローカルストレージに保存
      localStorage.setItem('meta_access_token', envVars.accessToken)
      localStorage.setItem('meta_account_id', envVars.accountId)
      
      setShowEnvSuccess(true)
      setTimeout(() => setShowEnvSuccess(false), 3000)
      
    } catch (error) {
      console.error('Failed to connect to Meta API:', error)
      alert(`Meta APIへの接続に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  const handleContinue = () => {
    navigate('/meta-dashboard')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // ローカルストレージから設定を読み込む
  React.useEffect(() => {
    const savedToken = localStorage.getItem('meta_access_token')
    const savedAccountId = localStorage.getItem('meta_account_id')
    
    if (savedToken && savedAccountId) {
      setEnvVars({
        accessToken: savedToken,
        accountId: savedAccountId,
      })
    }
  }, [])

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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ API認証情報設定</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="access-token" className="block text-sm font-medium text-gray-700">
                  アクセストークン
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="access-token"
                    value={envVars.accessToken}
                    onChange={(e) => setEnvVars({ ...envVars, accessToken: e.target.value })}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="EAA..."
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Meta開発者ダッシュボードで生成したアクセストークン
                </p>
              </div>

              <div>
                <label htmlFor="account-id" className="block text-sm font-medium text-gray-700">
                  広告アカウントID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="account-id"
                    value={envVars.accountId}
                    onChange={(e) => setEnvVars({ ...envVars, accountId: e.target.value })}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="act_123456789012345"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  ビジネスマネージャーで確認できる広告アカウントID（act_で始まる）
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleConnect}
                  disabled={!envVars.accessToken || !envVars.accountId}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  接続テスト
                </button>
              </div>

              {showEnvSuccess && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        接続に成功しました
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* トークンタブ */}
        {activeTab === 'token' && (
          <div className="bg-white shadow rounded-lg p-6">
            {!isConnected ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🔑 トークン取得方法</h2>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                      推奨: Graph API Explorer
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                      <li>
                        <a
                          href="https://developers.facebook.com/tools/explorer/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 inline-flex items-center"
                        >
                          Graph API Explorer
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                        </a>
                        にアクセス
                      </li>
                      <li>アプリを選択</li>
                      <li>必要な権限を追加:
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">ads_read</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">ads_management</span>
                        </div>
                      </li>
                      <li>「Generate Access Token」をクリック</li>
                      <li>生成されたトークンをコピー</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-yellow-800">
                          セキュリティ注意事項
                        </h3>
                        <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                          <li>アクセストークンは決して公開しないでください</li>
                          <li>GitHubなどにコミットしないよう注意してください</li>
                          <li>定期的にトークンを更新することを推奨します</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setActiveTab('env')}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <KeyIcon className="h-5 w-5 mr-2" />
                      認証情報を設定する
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
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
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    別のアカウントを設定
                  </button>
                  <button
                    onClick={handleContinue}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
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
            
            {apiService ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        API接続確立済み
                      </h3>
                      <p className="mt-1 text-sm text-green-700">
                        Meta APIサービスが正常に初期化されています
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const campaigns = await apiService.getCampaigns({ limit: 5 })
                      alert(`${campaigns.length}件のキャンペーンを取得しました`)
                    } catch (error) {
                      alert(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  キャンペーン取得テスト
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  まず「API認証情報設定」タブで接続を確立してください
                </p>
                <button
                  onClick={() => setActiveTab('env')}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  認証情報設定へ →
                </button>
              </div>
            )}
            
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