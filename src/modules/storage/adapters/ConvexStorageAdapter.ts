import { StorageInterface } from './StorageInterface'
import { MetaAccount } from '../../types/meta-account'
import { ConvexReactClient } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export class ConvexStorageAdapter implements StorageInterface {
  constructor(private convexClient: ConvexReactClient) {}

  async getAccounts(): Promise<MetaAccount[]> {
    try {
      const accounts = await this.convexClient.query(api.metaAccounts.getAllAccounts) || []
      return accounts.map(acc => ({
        ...acc,
        id: acc._id,
        fullAccountId: acc.fullAccountId || `act_${acc.accountId}`,
        createdAt: new Date(acc._creationTime),
        updatedAt: acc.updatedAt ? new Date(acc.updatedAt) : new Date(acc._creationTime)
      }))
    } catch (error) {
      console.error('Failed to load accounts from Convex:', error)
      return []
    }
  }

  async getAccount(id: string): Promise<MetaAccount | null> {
    try {
      const account = await this.convexClient.query(
        api.metaAccounts.getAccount, 
        { id: id as Id<"metaAccounts"> }
      )
      if (!account) return null
      
      return {
        ...account,
        id: account._id,
        fullAccountId: account.fullAccountId || `act_${account.accountId}`,
        createdAt: new Date(account._creationTime),
        updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date(account._creationTime)
      }
    } catch {
      return null
    }
  }

  async saveAccount(account: MetaAccount): Promise<void> {
    await this.convexClient.mutation(api.metaAccounts.saveAccount, {
      account: {
        accountId: account.accountId,
        name: account.name,
        fullAccountId: account.fullAccountId || `act_${account.accountId}`,
        accessToken: account.accessToken,
        isActive: account.isActive || false,
        permissions: account.permissions || [],
        expiresAt: account.expiresAt?.toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
  }

  async updateAccount(id: string, updates: Partial<MetaAccount>): Promise<void> {
    await this.convexClient.mutation(api.metaAccounts.updateAccount, {
      id: id as Id<"metaAccounts">,
      updates: {
        ...updates,
        updatedAt: new Date().toISOString()
      }
    })
  }

  async deleteAccount(id: string): Promise<void> {
    await this.convexClient.mutation(api.metaAccounts.deleteAccount, {
      id: id as Id<"metaAccounts">
    })
  }

  async getActiveAccountId(): Promise<string | null> {
    const activeAccount = await this.convexClient.query(api.metaAccounts.getActiveAccount)
    return activeAccount?._id || null
  }

  async setActiveAccountId(id: string | null): Promise<void> {
    if (id) {
      await this.convexClient.mutation(api.metaAccounts.setActiveAccount, {
        id: id as Id<"metaAccounts">
      })
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Convexでは汎用的なキーバリューストレージは別途実装が必要
    // ここでは簡易的にnullを返す
    return null
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Convexでは汎用的なキーバリューストレージは別途実装が必要
  }

  async remove(key: string): Promise<void> {
    // Convexでは汎用的なキーバリューストレージは別途実装が必要
  }

  async clear(): Promise<void> {
    // Convexでは全データクリアは危険なので実装しない
  }
}