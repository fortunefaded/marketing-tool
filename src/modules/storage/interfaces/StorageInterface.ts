import { MetaAccount } from '@/types'

// ストレージインターフェース
export interface StorageInterface {
  // アカウント管理
  getAccounts(): Promise<MetaAccount[]>
  getAccount(id: string): Promise<MetaAccount | null>
  saveAccount(account: MetaAccount): Promise<void>
  updateAccount(id: string, updates: Partial<MetaAccount>): Promise<void>
  deleteAccount(id: string): Promise<void>
  getActiveAccountId(): Promise<string | null>
  setActiveAccountId(id: string | null): Promise<void>
  
  // 汎用的なキーバリューストレージ
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// ストレージタイプ
export type StorageType = 'localStorage' | 'convex'