import { StorageInterface } from './StorageInterface'
import { MetaAccount } from '@/types'
import { vibe } from '@/lib/vibelogger'

const ACCOUNTS_KEY = 'meta_accounts_v1'
const ACTIVE_ACCOUNT_KEY = 'meta_active_account_id'

export class LocalStorageAdapter implements StorageInterface {
  async getAccounts(): Promise<MetaAccount[]> {
    try {
      const stored = localStorage.getItem(ACCOUNTS_KEY)
      if (!stored) return []
      
      const data = JSON.parse(stored)
      return data.accounts || []
    } catch (error) {
      vibe.bad('LocalStorageからのアカウント読み込み失敗', { error })
      return []
    }
  }

  async getAccount(id: string): Promise<MetaAccount | null> {
    const accounts = await this.getAccounts()
    return accounts.find(acc => acc.id === id || acc.accountId === id) || null
  }

  async saveAccount(account: MetaAccount): Promise<void> {
    const accounts = await this.getAccounts()
    const existing = accounts.findIndex(acc => acc.id === account.id)
    
    if (existing >= 0) {
      accounts[existing] = account
    } else {
      accounts.push(account)
    }
    
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ accounts }))
  }

  async updateAccount(id: string, updates: Partial<MetaAccount>): Promise<void> {
    const accounts = await this.getAccounts()
    const index = accounts.findIndex(acc => acc.id === id || acc.accountId === id)
    
    if (index >= 0) {
      accounts[index] = { ...accounts[index], ...updates }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ accounts }))
    }
  }

  async deleteAccount(id: string): Promise<void> {
    const accounts = await this.getAccounts()
    const filtered = accounts.filter(acc => acc.id !== id && acc.accountId !== id)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ accounts: filtered }))
  }

  async getActiveAccountId(): Promise<string | null> {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY)
  }

  async setActiveAccountId(id: string | null): Promise<void> {
    if (id) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }
}