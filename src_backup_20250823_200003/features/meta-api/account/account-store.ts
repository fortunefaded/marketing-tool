import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { MetaAccount } from '../core/types'

export class SimpleAccountStore {
  constructor(private convexClient: ConvexReactClient) {}
  
  async getAccounts(): Promise<MetaAccount[]> {
    try {
      const accounts = await this.convexClient.query(api.metaAccounts.getAccounts, {})
      return accounts.map((acc: any) => ({
        accountId: acc.accountId,
        name: acc.name,
        accessToken: acc.accessToken
      }))
    } catch (error) {
      console.error('Failed to get accounts:', error)
      return []
    }
  }
  
  async getActiveAccount(): Promise<MetaAccount | null> {
    try {
      const account = await this.convexClient.query(api.metaAccounts.getActiveAccount, {})
      if (!account) return null
      
      return {
        accountId: account.accountId,
        name: account.name,
        accessToken: account.accessToken
      }
    } catch (error) {
      console.error('Failed to get active account:', error)
      return null
    }
  }
  
  async setActiveAccount(accountId: string): Promise<void> {
    await this.convexClient.mutation(api.metaAccounts.setActiveAccount, {
      accountId
    })
  }
}