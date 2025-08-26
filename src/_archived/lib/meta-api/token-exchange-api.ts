/**
 * トークン交換用のAPIエンドポイント
 *
 * 本番環境では、このロジックをサーバーサイドのAPIとして実装してください。
 * App Secretをクライアントサイドに公開することは絶対に避けてください。
 *
 * 例：
 * - Next.js: /api/meta/exchange-token
 * - Express: /api/meta/exchange-token
 * - Cloudflare Workers
 * - AWS Lambda
 */

// Removed unused interface
// interface TokenExchangeRequest {
//   shortLivedToken: string
// }

interface TokenExchangeResponse {
  accessToken: string
  expiresIn: number
  error?: string
}

/**
 * サーバーサイドでのトークン交換実装例
 */
export async function exchangeTokenServerSide(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<TokenExchangeResponse> {
  const url = new URL('https://graph.facebook.com/v23.0/oauth/access_token')
  url.searchParams.append('grant_type', 'fb_exchange_token')
  url.searchParams.append('client_id', appId)
  url.searchParams.append('client_secret', appSecret)
  url.searchParams.append('fb_exchange_token', shortLivedToken)

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error) {
      return {
        accessToken: '',
        expiresIn: 0,
        error: data.error.message,
      }
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000, // 60 days default
    }
  } catch {
    return {
      accessToken: '',
      expiresIn: 0,
      error: 'Token exchange failed',
    }
  }
}

/**
 * クライアントサイドから呼び出すAPI
 * 実際の本番環境では、サーバーサイドのエンドポイントを呼び出します
 */
export async function exchangeToken(shortLivedToken: string): Promise<TokenExchangeResponse> {
  // 開発環境の警告
  if (import.meta.env.VITE_META_APP_SECRET) {
    logger.warn(
      '⚠️ 警告: App Secretがクライアントサイドに公開されています。\n' +
        '本番環境では必ずサーバーサイドAPIを使用してください。'
    )

    // 開発環境のみ：直接交換（非推奨）
    return exchangeTokenServerSide(
      shortLivedToken,
      import.meta.env.VITE_META_APP_ID!,
      import.meta.env.VITE_META_APP_SECRET!
    )
  }

  // 本番環境：サーバーサイドAPIを呼び出す
  const response = await fetch('/api/meta/exchange-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ shortLivedToken }),
  })

  if (!response.ok) {
    throw new Error('Token exchange failed')
  }

  return response.json()
}
