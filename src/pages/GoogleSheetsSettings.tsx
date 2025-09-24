import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useAction, useMutation, useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export function GoogleSheetsSettings() {
  const navigate = useNavigate()
  const convex = useConvex()

  // Convex queries, mutations and actions
  const googleSheetsTokens = useQuery(api.googleAuth.getAuthTokens, {
    service: 'google_sheets',
  })
  const oauthConfig = useQuery(api.googleAuth.getOAuthConfig, {
    service: 'google_sheets',
  })
  const saveOAuthConfigMutation = useMutation(api.googleAuth.saveOAuthConfig)
  const generateAuthUrlAction = useAction(api.googleAuth.generateAuthUrl)
  const getValidAccessTokenAction = useAction(api.googleAuth.getValidAccessToken)
  const fetchSheetDataAction = useAction(api.googleSheets.fetchSheetData)
  const fetchLatestDateDataAction = useAction(api.googleSheets.fetchLatestDateData)

  // Google Sheets設定
  const savedSpreadsheetUrl = useQuery(api.googleSheets.getSpreadsheetUrl)
  const saveSpreadsheetUrlMutation = useMutation(api.googleSheets.saveSpreadsheetUrl)

  // Form state for OAuth configuration
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Test state
  const [testSpreadsheetId, setTestSpreadsheetId] = useState('')

  // UI state
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Convexから設定を読み込み
  useEffect(() => {
    if (oauthConfig?.clientId) {
      setClientId(oauthConfig.clientId)
      // Client Secretは表示しない（セキュリティのため、存在確認のみ）
      if (oauthConfig.hasClientSecret) {
        setClientSecret('●●●●●●●●●●●●') // マスク表示
      }
    }
  }, [oauthConfig])

  // 保存されたスプレッドシートURLを読み込み
  useEffect(() => {
    if (savedSpreadsheetUrl) {
      setTestSpreadsheetId(savedSpreadsheetUrl)
    }
  }, [savedSpreadsheetUrl])

  // 認証状態を確認
  const isAuthenticated = !!googleSheetsTokens?.accessToken
  const tokenExpiresAt = googleSheetsTokens?.expiresAt
  const isTokenExpired = tokenExpiresAt ? new Date(tokenExpiresAt) < new Date() : true

  // 設定を保存
  const handleSaveConfig = async () => {
    if (!clientId) {
      setMessage({ type: 'error', text: 'Client IDを入力してください' })
      return
    }

    // マスク表示の場合で、Client IDも変わっていない場合は保存しない
    if (clientSecret === '●●●●●●●●●●●●' && clientId === oauthConfig?.clientId) {
      setMessage({ type: 'info', text: '変更がありません。新しいClient Secretを入力するか、Client IDを変更してください。' })
      return
    }

    // Client Secretがマスク表示かつClient IDが変わっている場合はエラー
    if (clientSecret === '●●●●●●●●●●●●' && clientId !== oauthConfig?.clientId) {
      setMessage({ type: 'error', text: 'Client IDを変更する場合は、新しいClient Secretも入力してください' })
      return
    }

    if (!clientSecret || clientSecret === '●●●●●●●●●●●●') {
      setMessage({ type: 'error', text: 'Client Secretを入力してください' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await saveOAuthConfigMutation({
        service: 'google_sheets',
        clientId,
        clientSecret,
      })
      setMessage({ type: 'success', text: '設定を保存しました' })

      // Client Secretをマスク表示に戻す
      setClientSecret('●●●●●●●●●●●●')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存に失敗しました' })
    } finally {
      setIsSaving(false)
    }
  }

  // OAuth認証を開始
  const handleConnect = async () => {
    if (!oauthConfig?.clientId) {
      setMessage({ type: 'error', text: 'まず、Client IDとClient Secretを設定してください' })
      return
    }

    setIsConnecting(true)
    setMessage(null)

    try {
      // 認証URLを生成（Convexから設定を取得）
      const authUrl = await generateAuthUrlAction({
        service: 'google_sheets',
        redirectUri: `${window.location.origin}/settings/google-sheets/callback`,
      })

      // 認証ページにリダイレクト
      window.location.href = authUrl
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '接続に失敗しました' })
    } finally {
      setIsConnecting(false)
    }
  }

  // スプレッドシートIDを抽出するヘルパー関数
  const extractSpreadsheetId = (urlOrId: string): string => {
    // URLの場合、IDを抽出
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : urlOrId
  }

  // 接続テスト
  const handleTestConnection = async () => {
    if (!testSpreadsheetId) {
      setMessage({ type: 'error', text: 'スプレッドシートURLまたはIDを入力してください' })
      return
    }

    setIsTesting(true)
    setMessage(null)
    setTestResult(null)

    try {
      // スプレッドシートIDを抽出
      const spreadsheetId = extractSpreadsheetId(testSpreadsheetId)

      // URLを保存
      if (testSpreadsheetId !== savedSpreadsheetUrl) {
        await saveSpreadsheetUrlMutation({ url: testSpreadsheetId })
      }

      // 最新日付のデータを取得
      // 現在の年月を計算
      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
      const lastYearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

      // 複数のシート名を試す
      const ranges = [
        `'${currentYearMonth}'!A1:Z1000`,  // 今月（例: '2025-09'!A1:Z1000）
        `${currentYearMonth}!A1:Z1000`,    // 今月（引用符なし）
        `'${lastYearMonth}'!A1:Z1000`,     // 先月
        `${lastYearMonth}!A1:Z1000`,       // 先月（引用符なし）
        'A1:Z1000',                         // デフォルト（最初のシート）
      ]

      console.log(`[接続テスト] 現在の年月: ${currentYearMonth}`)
      console.log(`[接続テスト] 試行する範囲: ${ranges.join(', ')}`)

      let result = null
      let lastError = null

      for (const range of ranges) {
        console.log(`[接続テスト] 範囲を試行中: ${range}`)
        try {
          result = await fetchLatestDateDataAction({
            spreadsheetId,
            range,
          })

          if (result.success) {
            console.log(`[接続テスト] 成功: ${range}`)
            break
          } else {
            console.log(`[接続テスト] 失敗: ${range} - ${result.error}`)
            lastError = result.error
          }
        } catch (error: any) {
          console.log(`[接続テスト] エラー: ${range} - ${error.message}`)
          lastError = error.message
        }
      }

      if (!result || !result.success) {
        result = { success: false, error: lastError || '接続に失敗しました' }
      }

      if (result.success) {
        const message = `接続成功！最新日付（${result.latestDate}）のデータを取得しました`
        setMessage({ type: 'success', text: message })

        // 最新データと日付一覧を表示用に整形
        const displayData = {
          最新日付: result.latestDate,
          取得データ: result.latestData,
          媒体データ: result.mediaData,
          全日付リスト: result.allDates?.slice(0, 5), // 最新5件の日付を表示
        }
        setTestResult(displayData)
      } else {
        // エラーメッセージを詳細化
        let errorMessage = '接続テストに失敗しました'
        if (result.error?.includes('Unable to parse range')) {
          errorMessage = 'データ範囲の形式が正しくありません。\n' +
                        '実際のシート名を確認してください（例: Sheet1、シート1、データ など）\n' +
                        'シート名に空白が含まれる場合は引用符で囲んでください: \'My Sheet\'!A1:B10'
        } else if (result.error?.includes('404')) {
          errorMessage = 'スプレッドシートが見つかりません。URLまたはIDを確認してください。'
        } else if (result.error?.includes('403')) {
          errorMessage = 'スプレッドシートへのアクセス権限がありません。共有設定を確認してください。'
        } else if (result.error) {
          errorMessage = result.error
        }
        setMessage({ type: 'error', text: errorMessage })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '接続テストに失敗しました' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/settings')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Sheets統合設定</h1>
              <p className="mt-1 text-sm text-gray-500">
                スプレッドシートデータを取得するための認証設定
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/settings/google-sheets/import')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              データをインポート
            </button>
            <button
              onClick={() => navigate('/settings/google-sheets/data')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存済みデータ
            </button>
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 認証状態 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">認証状態</h2>

          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-green-800 font-medium">Google Sheetsと連携済み</span>
              </div>

              {tokenExpiresAt && (
                <div className="text-sm text-gray-600">
                  トークン有効期限: {new Date(tokenExpiresAt).toLocaleString('ja-JP')}
                  {(() => {
                    const now = new Date()
                    const expires = new Date(tokenExpiresAt)
                    const diffMs = expires.getTime() - now.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                    if (isTokenExpired) {
                      return <span className="ml-2 text-red-600 font-semibold">（期限切れ - 再認証が必要）</span>
                    } else if (diffHours < 1) {
                      return <span className="ml-2 text-orange-600">（残り{diffMins}分 - まもなく期限切れ）</span>
                    } else if (diffHours < 24) {
                      return <span className="ml-2 text-yellow-600">（残り約{diffHours}時間）</span>
                    } else {
                      const diffDays = Math.floor(diffHours / 24)
                      return <span className="ml-2 text-green-600">（残り約{diffDays}日）</span>
                    }
                  })()}
                </div>
              )}

              {googleSheetsTokens?.scope && (
                <div className="text-sm text-gray-600">
                  スコープ: {googleSheetsTokens.scope}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? '接続中...' : '再認証する'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-gray-600">Google Sheetsと未連携</span>
              </div>

              {!oauthConfig?.clientId ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    認証にはGoogle OAuth設定が必要です。<br />
                    下のOAuth設定セクションでClient IDとClient Secretを設定してください。
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? '接続中...' : 'Googleアカウントで認証'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* OAuth設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">OAuth設定</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 123456789-xxxxx.apps.googleusercontent.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client Secret</label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder={oauthConfig?.hasClientSecret ? '●●●●●●●●●●●● (保存済み、再入力で更新)' : 'GOCSPX-xxxxx'}
                />
                <button
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {showClientSecret ? '隠す' : '表示'}
                </button>
              </div>
              {oauthConfig?.hasClientSecret && clientSecret === '●●●●●●●●●●●●' && (
                <p className="mt-1 text-xs text-gray-500">
                  Client Secretは既に保存されています。変更する場合は新しい値を入力してください。
                </p>
              )}
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving || !clientId || (!clientSecret || clientSecret === '●●●●●●●●●●●●')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '設定を保存'}
              </button>
              {oauthConfig?.clientId && (
                <div className="flex items-center text-sm text-green-600">
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  設定済み
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 接続テスト */}
        {isAuthenticated && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">接続テスト</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  スプレッドシートURL または ID
                </label>
                <input
                  type="text"
                  value={testSpreadsheetId}
                  onChange={(e) => setTestSpreadsheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/xxxxx または xxxxx"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Google SheetsのURLまたはスプレッドシートIDを入力してください<br/>
                  ※自動的に最新日付のデータ（A列から日付を検出）を取得します
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTesting || !testSpreadsheetId}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? 'テスト中...' : '接続テスト'}
              </button>

              {/* テスト結果 */}
              {testResult && (
                <div className="mt-4 space-y-4">
                  {/* 最新日付情報 */}
                  {testResult['最新日付'] && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        📅 最新日付: {testResult['最新日付']}
                      </h4>
                      {testResult['全日付リスト'] && (
                        <p className="text-xs text-gray-600 mt-1">
                          検出された日付: {testResult['全日付リスト'].join(', ')}
                          {testResult['全日付リスト'].length > 5 && ' ...'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 媒体別サマリー */}
                  {testResult['媒体データ'] && testResult['媒体データ'].length > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                      <h4 className="text-sm font-medium text-purple-900 mb-3">
                        📈 媒体別サマリー
                      </h4>
                      <div className="space-y-2">
                        {testResult['媒体データ'].map((media: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-purple-100">
                            <div className="font-medium text-sm text-gray-900 mb-1">
                              {media.platform}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {media.impressions !== undefined && (
                                <div>
                                  <span className="text-gray-500">インプレ:</span>
                                  <span className="ml-1 font-medium">
                                    {media.impressions.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {media.clicks !== undefined && (
                                <div>
                                  <span className="text-gray-500">クリック:</span>
                                  <span className="ml-1 font-medium">
                                    {media.clicks.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {media.cost !== undefined && (
                                <div>
                                  <span className="text-gray-500">費用:</span>
                                  <span className="ml-1 font-medium">
                                    ¥{media.cost.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {media.conversions !== undefined && (
                                <div>
                                  <span className="text-gray-500">CV:</span>
                                  <span className="ml-1 font-medium">
                                    {media.conversions.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {media.ctr !== undefined && (
                                <div>
                                  <span className="text-gray-500">CTR:</span>
                                  <span className="ml-1 font-medium">
                                    {(media.ctr * 100).toFixed(2)}%
                                  </span>
                                </div>
                              )}
                              {media.cvr !== undefined && (
                                <div>
                                  <span className="text-gray-500">CVR:</span>
                                  <span className="ml-1 font-medium">
                                    {(media.cvr * 100).toFixed(2)}%
                                  </span>
                                </div>
                              )}
                              {media.cpa !== undefined && (
                                <div>
                                  <span className="text-gray-500">CPA:</span>
                                  <span className="ml-1 font-medium">
                                    ¥{media.cpa.toFixed(0).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 最新日付のデータ */}
                  {testResult['取得データ'] && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="text-sm font-medium text-green-900 mb-2">
                        📊 最新データ ({Array.isArray(testResult['取得データ']) ? testResult['取得データ'].length : 1}行):
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="text-xs border-collapse">
                          <tbody>
                            {(() => {
                              // 取得データが配列の配列か、単一の配列かチェック
                              const dataRows = Array.isArray(testResult['取得データ'][0])
                                ? testResult['取得データ']
                                : [testResult['取得データ']]

                              return dataRows.map((rowData: any, rowIndex: number) => {
                                // rowDataが配列でない場合の処理
                                const cells = Array.isArray(rowData) ? rowData : [rowData]

                                return (
                                  <tr key={rowIndex} className="hover:bg-green-100">
                                    <td className="px-2 py-1 border bg-green-100 font-medium">
                                      {testResult['媒体データ'] && testResult['媒体データ'][rowIndex]
                                        ? testResult['媒体データ'][rowIndex].platform
                                        : `行${rowIndex + 1}`}
                                    </td>
                                    {cells.slice(0, 15).map((value: any, colIndex: number) => (
                                      <td key={colIndex} className="px-2 py-1 border text-gray-700">
                                        {typeof value === 'number' && colIndex >= 1 && colIndex <= 4
                                          ? value.toLocaleString()
                                          : value || '-'}
                                      </td>
                                    ))}
                                    {cells.length > 15 && (
                                      <td className="px-2 py-1 border text-gray-500">
                                        ...他{cells.length - 15}列
                                      </td>
                                    )}
                                  </tr>
                                )
                              })
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 生データ（デバッグ用） */}
                  <details className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      🔍 生データを表示
                    </summary>
                    <pre className="text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap mt-2">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}