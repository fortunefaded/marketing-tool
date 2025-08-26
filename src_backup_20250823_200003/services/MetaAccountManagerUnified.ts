import { MetaAccount } from '../types/meta-account'
// TODO: Replace with new Meta API service
// import { MetaApiService } from '../_archived/services/metaApiService'
import { MetaApiService } from '../features/meta-api/core/stub-service'
import { StorageInterface, StorageType } from '../modules/storage/interfaces/StorageInterface'
import { LocalStorageAdapter } from '../modules/storage/adapters/LocalStorageAdapter'
import { ConvexStorageAdapter } from '../modules/storage/adapters/ConvexStorageAdapter'
import { ConvexReactClient } from 'convex/react'

export class MetaAccountManagerUnified {
  private static instance: MetaAccountManagerUnified | null = null
  private storage: StorageInterface

  private constructor(storage: StorageInterface) {
    this.storage = storage
  }

  static getInstance(storageType: StorageType = 'localStorage', convexClient?: ConvexReactClient): MetaAccountManagerUnified {
    if (!MetaAccountManagerUnified.instance) {
      const storage = storageType === 'convex' && convexClient
        ? new ConvexStorageAdapter(convexClient)
        : new LocalStorageAdapter()
      
      MetaAccountManagerUnified.instance = new MetaAccountManagerUnified(storage)
    }
    return MetaAccountManagerUnified.instance
  }

  // アカウント一覧を取得
  async getAccounts(): Promise<MetaAccount[]> {
    return await this.storage.getAccounts()
  }

  // アカウントを取得
  async getAccount(id: string): Promise<MetaAccount | null> {
    return await this.storage.getAccount(id)
  }

  // アカウントを保存
  async saveAccount(account: Omit<MetaAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const newAccount: MetaAccount = {
      ...account,
      id: account.accountId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await this.storage.saveAccount(newAccount)
    
    // 最初のアカウントの場合は自動的にアクティブにする
    const accounts = await this.getAccounts()
    if (accounts.length === 1) {
      await this.setActiveAccount(newAccount.id)
    }
  }

  // アカウントを更新
  async updateAccount(id: string, updates: Partial<MetaAccount>): Promise<void> {
    await this.storage.updateAccount(id, {
      ...updates,
      updatedAt: new Date()
    })
  }

  // アカウントを削除
  async deleteAccount(id: string): Promise<void> {
    const activeId = await this.getActiveAccountId()
    
    await this.storage.deleteAccount(id)
    
    // アクティブアカウントが削除された場合
    if (activeId === id) {
      const accounts = await this.getAccounts()
      if (accounts.length > 0) {
        await this.setActiveAccount(accounts[0].id)
      } else {
        await this.storage.setActiveAccountId(null)
      }
    }
  }

  // アクティブアカウントを取得
  async getActiveAccount(): Promise<MetaAccount | null> {
    const activeId = await this.getActiveAccountId()
    if (!activeId) {
      const accounts = await this.getAccounts()
      if (accounts.length > 0) {
        await this.setActiveAccount(accounts[0].id)
        return accounts[0]
      }
      return null
    }
    
    return await this.getAccount(activeId)
  }

  // アクティブアカウントIDを取得
  async getActiveAccountId(): Promise<string | null> {
    return await this.storage.getActiveAccountId()
  }

  // アクティブアカウントを設定
  async setActiveAccount(id: string): Promise<void> {
    const account = await this.getAccount(id)
    if (!account) {
      throw new Error('Account not found')
    }
    
    await this.storage.setActiveAccountId(id)
  }

  // アカウントのアクセストークンを検証
  async validateAccount(account: MetaAccount): Promise<boolean> {
    try {
      // TODO: Replace with new Meta API service
      const api = new MetaApiService({
        accessToken: account.accessToken,
        accountId: account.accountId
      })
      
      const user = await api.getUser()
      
      // Temporary: always return false during migration (stub will throw error)
      return false
      // return !!user
    } catch {
      return false
    }
  }

  // トークンをリフレッシュ
  async refreshToken(accountId: string): Promise<string | null> {
    const account = await this.getAccount(accountId)
    if (!account) return null
    
    // TODO: 実際のトークンリフレッシュロジックを実装
    // 現在は既存のトークンを返す
    return account.accessToken
  }

  // アカウントを検索
  async findAccount(predicate: (account: MetaAccount) => boolean): Promise<MetaAccount | null> {
    const accounts = await this.getAccounts()
    return accounts.find(predicate) || null
  }

  // アカウント数を取得
  async getAccountCount(): Promise<number> {
    const accounts = await this.getAccounts()
    return accounts.length
  }

  // すべてのアカウントをクリア
  async clearAllAccounts(): Promise<void> {
    const accounts = await this.getAccounts()
    for (const account of accounts) {
      await this.deleteAccount(account.id)
    }
  }
}