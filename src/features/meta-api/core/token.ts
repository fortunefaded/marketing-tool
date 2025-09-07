import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export interface TokenInfo {
  accessToken: string
  expiresAt?: number
  isValid?: boolean
}

export class SimpleTokenStore {
  constructor(private convexClient: ConvexReactClient) {}
  
  async getToken(accountId: string): Promise<TokenInfo> {
    const account = await this.convexClient.query(
      api.metaAccounts.getAccountById,
      { accountId }
    )
    if (!account?.accessToken) {
      throw new Error(`No token found for account ${accountId}`)
    }
    
    // トークンの有効期限をチェック
    const tokenInfo: TokenInfo = {
      accessToken: account.accessToken,
      expiresAt: account.expiresAt || undefined,
      isValid: true
    }
    
    // 有効期限がある場合はチェック
    if (tokenInfo.expiresAt) {
      tokenInfo.isValid = tokenInfo.expiresAt > Date.now()
    }
    
    return tokenInfo
  }
  
  // 文字列として取得する後方互換性メソッド
  async getTokenString(accountId: string): Promise<string> {
    const tokenInfo = await this.getToken(accountId)
    if (!tokenInfo.isValid) {
      throw new Error('Token expired or invalid')
    }
    return tokenInfo.accessToken
  }
}