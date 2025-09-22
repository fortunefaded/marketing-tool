/**
 * Google OAuth2認証ボタンコンポーネント
 */

import React, { useState, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export const GoogleAuthButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenInfo = useQuery(api.googleSheets.getValidToken)
  const saveToken = useMutation(api.googleSheets.saveAuthToken)
  const deleteToken = useMutation(api.googleSheets.deleteAuthToken)

  // Google OAuth2の認証URLを生成
  const getAuthUrl = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/google-sheets/callback`
    const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets.readonly')
    const responseType = 'code'
    const accessType = 'offline'
    const prompt = 'consent'

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `access_type=${accessType}&` +
      `prompt=${prompt}`
  }, [])

  // 認証開始
  const handleAuth = useCallback(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError('Google Client IDが設定されていません。.env.localファイルを確認してください。')
      return
    }

    setIsLoading(true)
    setError(null)

    // 新しいウィンドウで認証画面を開く
    const authUrl = getAuthUrl()
    const authWindow = window.open(authUrl, 'google-auth', 'width=600,height=600')

    // コールバックを待つ
    const checkAuth = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkAuth)
        setIsLoading(false)
        // トークンの再取得はuseQueryが自動的に行う
      }
    }, 1000)
  }, [getAuthUrl])

  // ログアウト
  const handleLogout = useCallback(async () => {
    if (!confirm('Googleアカウントとの連携を解除しますか？')) {
      return
    }

    try {
      setIsLoading(true)
      await deleteToken()
      setError(null)
    } catch (err) {
      setError('ログアウトに失敗しました')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [deleteToken])

  // 認証済みかどうか
  const isAuthenticated = tokenInfo && !tokenInfo.isExpired

  return (
    <div className="flex flex-col gap-3">
      {/* 認証状態の表示 */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-gray-600">
          {isAuthenticated ? 'Google Sheetsと連携済み' : 'Google Sheetsと未連携'}
        </span>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 認証ボタン */}
      {!isAuthenticated ? (
        <button
          onClick={handleAuth}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>認証中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Googleアカウントでログイン</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            連携を解除
          </button>
        </div>
      )}

      {/* トークン情報（デバッグ用、本番では削除） */}
      {tokenInfo && !tokenInfo.isExpired && (
        <div className="text-xs text-gray-500">
          トークン有効期限: {Math.round((tokenInfo.expiresIn || 0) / 1000 / 60)}分
        </div>
      )}
    </div>
  )
}