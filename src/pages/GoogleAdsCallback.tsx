import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function GoogleAdsCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOAuthCallbackAction = useAction(api.googleAds.handleOAuthCallback)
  const existingConfig = useQuery(api.googleAds.getConfig)

  // Customer IDからハイフンを除去するヘルパー関数
  const cleanCustomerId = (id: string): string => {
    return id.replace(/-/g, '')
  }

  // 処理実行のトリガーを単純化
  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    console.log('GoogleAdsCallback mounted:', {
      code: code ? 'present' : 'missing',
      error,
      url: window.location.href,
      existingConfig: existingConfig ? 'loaded' : 'loading',
      isProcessing
    })

    // エラーがある場合
    if (error) {
      setStatus('error')
      setErrorMessage(`認証エラー: ${error}`)
      setTimeout(() => navigate('/settings/google-ads'), 3000)
      return
    }

    // コードがない場合
    if (!code) {
      setStatus('error')
      setErrorMessage('認証コードが取得できませんでした')
      setTimeout(() => navigate('/settings/google-ads'), 3000)
      return
    }

    // 設定がまだ読み込まれていない場合は待つ
    if (existingConfig === undefined) {
      return
    }

    // 既に処理中の場合はスキップ
    if (isProcessing) {
      return
    }

    const processCallback = async () => {
      console.log('GoogleAdsCallback: Starting processing', {
        code: code ? 'present' : 'missing',
        error,
        url: window.location.href
      })

      // 必要な設定を取得
      const customerId = existingConfig?.customerId
      const clientId = existingConfig?.clientId
      const clientSecret = existingConfig?.clientSecret

      if (!customerId || !clientId || !clientSecret) {
        setStatus('error')
        setErrorMessage('Google Ads API設定が不完全です。設定画面で必要な情報を入力してください。')
        setTimeout(() => navigate('/settings/google-ads'), 3000)
        return
      }

      // 処理開始フラグを立てる
      setIsProcessing(true)

      try {
        console.log('Calling handleOAuthCallback with:', {
          clientId,
          customerId: cleanCustomerId(customerId),
          code: code.substring(0, 10) + '...'
        })

        // OAuth認証を処理
        const result = await handleOAuthCallbackAction({
          code,
          clientId,
          clientSecret,
          customerId: cleanCustomerId(customerId),
        })

        console.log('OAuth callback result:', result)

        setStatus('success')
        setTimeout(() => navigate('/settings/google-ads'), 2000)
      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setErrorMessage(error.message || '認証処理に失敗しました')
        setTimeout(() => navigate('/settings/google-ads'), 3000)
      }
    }

    // 実際に処理を実行
    processCallback()
  }, [searchParams, existingConfig, isProcessing]) // 依存関係を最小限に

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {/* Google Ads ロゴ */}
          <div className="mb-6 flex justify-center">
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>

          {status === 'processing' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                認証処理中...
              </h2>
              <p className="text-gray-600 mb-4">
                Googleアカウントの認証を処理しています
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <h2 className="text-xl font-semibold text-green-600 mb-2">
                認証成功！
              </h2>
              <p className="text-gray-600 mb-4">
                Google Adsアカウントと正常に連携されました
              </p>
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                設定画面に戻ります...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 className="text-xl font-semibold text-red-600 mb-2">
                認証エラー
              </h2>
              <p className="text-gray-600 mb-4">
                {errorMessage}
              </p>
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                設定画面に戻ります...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}