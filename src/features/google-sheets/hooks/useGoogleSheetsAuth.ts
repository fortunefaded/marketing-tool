/**
 * Google Sheets認証用カスタムフック
 */

import { useAction, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useCallback, useMemo } from 'react'

export const useGoogleSheetsAuth = () => {
  // Google Sheetsトークン情報を取得
  const googleSheetsTokens = useQuery(api.googleAuth.getAuthTokens, {
    service: 'google_sheets',
  })

  // Google Ads認証情報も確認（共有可能な場合）
  const googleAdsTokens = useQuery(api.googleAuth.getAuthTokens, {
    service: 'google_ads',
  })

  // 認証URL生成アクション
  const generateAuthUrl = useAction(api.googleAuth.generateAuthUrl)

  // 認証コードをトークンに交換
  const exchangeCodeForTokens = useAction(api.googleAuth.exchangeCodeForTokens)

  // トークンをリフレッシュ
  const refreshAccessToken = useAction(api.googleAuth.refreshAccessToken)

  // Google Ads認証情報から移行
  const migrateFromGoogleAds = useAction(api.googleAuth.migrateFromGoogleAds)

  // 認証済みかどうか（Google Sheetsトークンのみをチェック）
  const isAuthenticated = useMemo(() => {
    return !!(googleSheetsTokens?.accessToken)
  }, [googleSheetsTokens])

  // 有効なトークンを取得（Google Sheetsトークンのみ使用）
  const getValidToken = useCallback(async () => {
    // Google Sheetsトークンがあればそれを使用
    if (googleSheetsTokens?.accessToken) {
      const now = Date.now()
      const bufferTime = 5 * 60 * 1000 // 5分のバッファ

      if (googleSheetsTokens.expiresAt && googleSheetsTokens.expiresAt > now + bufferTime) {
        return {
          accessToken: googleSheetsTokens.accessToken,
          expiresAt: googleSheetsTokens.expiresAt,
        }
      }

      // トークンをリフレッシュ
      const result = await refreshAccessToken({ service: 'google_sheets' })
      if (result.success) {
        return {
          accessToken: result.accessToken!,
          expiresAt: result.expiresAt!,
        }
      }
    }

    return null
  }, [googleSheetsTokens, refreshAccessToken])

  // 認証開始
  const startAuth = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/settings/google-sheets/callback`

    if (!clientId) {
      throw new Error('Google Client IDが設定されていません')
    }

    const authUrl = await generateAuthUrl({
      service: 'google_sheets',
      clientId,
      redirectUri,
      additionalScopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    })

    window.location.href = authUrl
  }, [generateAuthUrl])

  // 認証コールバック処理
  const handleAuthCallback = useCallback(
    async (code: string) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
      const redirectUri = `${window.location.origin}/settings/google-sheets/callback`

      if (!clientId || !clientSecret) {
        throw new Error('Google認証情報が設定されていません')
      }

      const result = await exchangeCodeForTokens({
        code,
        clientId,
        clientSecret,
        redirectUri,
        service: 'google_sheets',
      })

      return result
    },
    [exchangeCodeForTokens]
  )

  // Google Ads認証を利用
  const useGoogleAdsAuth = useCallback(async () => {
    if (googleAdsTokens?.accessToken) {
      // Google Ads認証情報をGoogle Sheets用にコピー
      const result = await migrateFromGoogleAds({})
      return result
    }
    return { success: false, error: 'Google Ads認証情報が見つかりません' }
  }, [googleAdsTokens, migrateFromGoogleAds])

  return {
    isAuthenticated,
    googleSheetsTokens,
    googleAdsTokens,
    startAuth,
    handleAuthCallback,
    getValidToken,
    useGoogleAdsAuth,
    hasGoogleAdsAuth: !!googleAdsTokens?.accessToken,
  }
}