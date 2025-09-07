import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export class SimpleTokenStore {
  constructor(private convexClient: ConvexReactClient) {}
  
  async getToken(accountId: string): Promise<string> {
    const account = await this.convexClient.query(
      api.metaAccounts.getAccountById,
      { accountId }
    )
    if (!account?.accessToken) {
      throw new Error(`No token found for account ${accountId}`)
    }
    return account.accessToken
  }
}