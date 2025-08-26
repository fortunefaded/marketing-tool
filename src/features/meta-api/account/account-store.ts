import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { MetaAccount } from '@/types'
import { vibe } from '@/lib/vibelogger'

export class SimpleAccountStore {
  constructor(private convexClient: ConvexReactClient) {}
  
  async getAccounts(): Promise<MetaAccount[]> {
    try {
      // Safely check if API is available
      if (!api?.metaAccounts?.getAccounts) {
        vibe.warn('Convex API metaAccounts.getAccounts not available')
        return []
      }
      
      const accounts = await this.convexClient.query(api.metaAccounts.getAccounts, {})
      return accounts.map((acc: any) => ({
        accountId: acc.accountId,
        name: acc.name,
        accessToken: acc.accessToken
      }))
    } catch (error) {
      vibe.bad('アカウント取得失敗', { error })
      return []
    }
  }
  
  async getActiveAccount(): Promise<MetaAccount | null> {
    try {
      // Safely check if API is available
      if (!api?.metaAccounts?.getActiveAccount) {
        vibe.warn('Convex API metaAccounts.getActiveAccount not available')
        return null
      }
      
      const account = await this.convexClient.query(api.metaAccounts.getActiveAccount, {})
      if (!account) return null
      
      return {
        accountId: account.accountId,
        name: account.name,
        accessToken: account.accessToken
      }
    } catch (error) {
      vibe.bad('アクティブアカウント取得失敗', { error })
      return null
    }
  }
  
  async setActiveAccount(accountId: string): Promise<void> {
    // Safely check if API is available
    if (!api?.metaAccounts?.setActiveAccount) {
      vibe.warn('Convex API metaAccounts.setActiveAccount not available')
      throw new Error('Convex API not initialized')
    }
    
    await this.convexClient.mutation(api.metaAccounts.setActiveAccount, {
      accountId
    })
  }
}