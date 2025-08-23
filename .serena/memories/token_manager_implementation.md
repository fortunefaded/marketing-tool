# TokenManager実装

## ファイル: src/services/auth/tokenManager.ts

```typescript
import { ConvexReactClient } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  accountId: string
}

export class TokenManager {
  private static instance: TokenManager | null = null
  private convexClient: ConvexReactClient
  private tokenCache: Map<string, TokenInfo> = new Map()
  private refreshPromises: Map<string, Promise<TokenInfo>> = new Map()

  private constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  static getInstance(convexClient: ConvexReactClient): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(convexClient)
    }
    return TokenManager.instance
  }

  async getValidToken(accountId: string): Promise<string> {
    const cached = this.tokenCache.get(accountId)
    if (cached && this.isTokenValid(cached)) {
      return cached.accessToken
    }

    const refreshing = this.refreshPromises.get(accountId)
    if (refreshing) {
      const refreshed = await refreshing
      return refreshed.accessToken
    }

    const refreshPromise = this.refreshToken(accountId)
    this.refreshPromises.set(accountId, refreshPromise)
    
    try {
      const tokenInfo = await refreshPromise
      return tokenInfo.accessToken
    } finally {
      this.refreshPromises.delete(accountId)
    }
  }

  private isTokenValid(tokenInfo: TokenInfo): boolean {
    const now = new Date()
    const buffer = 5 * 60 * 1000
    return tokenInfo.expiresAt.getTime() - buffer > now.getTime()
  }

  private async refreshToken(accountId: string): Promise<TokenInfo> {
    const account = await this.convexClient.query(api.metaAccounts.getAccountById, {
      accountId
    })

    if (!account || !account.accessToken) {
      throw new Error(`No token found for account ${accountId}`)
    }

    const tokenInfo: TokenInfo = {
      accessToken: account.accessToken,
      accountId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }

    this.tokenCache.set(accountId, tokenInfo)
    return tokenInfo
  }

  invalidateToken(accountId: string): void {
    this.tokenCache.delete(accountId)
  }

  clearAll(): void {
    this.tokenCache.clear()
    this.refreshPromises.clear()
  }
}
```

## 使用方法
1. MetaAccountManagerConvexを更新してTokenManagerを使用
2. MetaApiClientを新規作成してTokenManagerから動的にトークン取得
3. useAdFatigueMonitoredを更新
