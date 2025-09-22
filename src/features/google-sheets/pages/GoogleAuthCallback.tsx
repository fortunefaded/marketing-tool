/**
 * Google OAuth2認証コールバックページ
 */

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const saveToken = useMutation(api.googleSheets.saveAuthToken)

  useEffect(() => {
    const handleCallback = async () => {
      // 認証コードを取得
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setErrorMessage('認証がキャンセルされました')
        setTimeout(() => {
          if (window.opener) {
            window.close()
          } else {
            navigate('/google-sheets')
          }
        }, 2000)
        return
      }

      if (!code) {
        setStatus('error')
        setErrorMessage('認証コードが見つかりません')
        return
      }

      try {
        // アクセストークンを取得
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
            redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/google-sheets/callback`,
            grant_type: 'authorization_code',
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('Token exchange error:', errorData)
          throw new Error('アクセストークンの取得に失敗しました')
        }

        const tokenData = await response.json()

        // Convexにトークンを保存
        await saveToken({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
        })

        setStatus('success')

        // 成功したら元のウィンドウに戻る
        setTimeout(() => {
          if (window.opener) {
            window.close()
          } else {
            navigate('/google-sheets')
          }
        }, 1500)
      } catch (err) {
        console.error('Authentication error:', err)
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : '認証処理中にエラーが発生しました')
      }
    }

    handleCallback()
  }, [searchParams, saveToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        {status === 'processing' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">認証処理中...</h2>
            <p className="text-gray-600">Googleアカウントの認証を処理しています</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">認証成功！</h2>
            <p className="text-gray-600">Google Sheetsとの連携が完了しました</p>
            <p className="text-sm text-gray-500 mt-2">このウィンドウは自動的に閉じます...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">認証エラー</h2>
            <p className="text-gray-600">{errorMessage}</p>
            <button
              onClick={() => {
                if (window.opener) {
                  window.close()
                } else {
                  navigate('/google-sheets')
                }
              }}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  )
}