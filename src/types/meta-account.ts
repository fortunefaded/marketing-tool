// Meta広告アカウントの型定義
export interface MetaAccount {
  id: string
  accountId: string // act_なしのID
  fullAccountId: string // act_付きのID
  name: string
  accessToken: string
  currency?: string
  isActive: boolean
  createdAt: Date
  lastUsedAt?: Date
}

export interface MetaAccountStorage {
  accounts: MetaAccount[]
  activeAccountId?: string
}