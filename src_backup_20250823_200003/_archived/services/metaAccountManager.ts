import { MetaAccount, MetaAccountStorage } from '../../types/meta-account'
import { MetaApiService } from './metaApiService'
import { ConvexClient } from 'convex/browser'

const STORAGE_KEY = 'meta_accounts_v1'

export class MetaAccountManager {
  private static instance: MetaAccountManager | null = null
  private storage: MetaAccountStorage
  private convexClient?: ConvexClient

  private constructor(convexClient?: ConvexClient) {
    this.storage = this.loadStorage()
    this.convexClient = convexClient
  }

  static getInstance(convexClient?: ConvexClient): MetaAccountManager {
    if (!MetaAccountManager.instance) {
      MetaAccountManager.instance = new MetaAccountManager(convexClient)
    }
    return MetaAccountManager.instance
  }

  private loadStorage(): MetaAccountStorage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // 日付文字列をDateオブジェクトに変換
        data.accounts = data.accounts.map((acc: any) => ({
          ...acc,
          id: acc.id || acc.accountId, // 後方互換性のため
          fullAccountId: acc.fullAccountId || `act_${acc.accountId}`, // 後方互換性のため
          createdAt: new Date(acc.createdAt),
          lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined,
        }))
        return data
      }
    } catch (error) {
      console.error('Failed to load Meta accounts:', error)
    }
    return { accounts: [] }
  }

  private saveStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage))
  }

  // アカウント一覧を取得
  getAccounts(): MetaAccount[] {
    return [...this.storage.accounts]
  }

  // アクティブなアカウントを取得
  getActiveAccount(): MetaAccount | null {
    if (!this.storage.activeAccountId) return null
    return (
      this.storage.accounts.find((acc) => acc.accountId === this.storage.activeAccountId) || null
    )
  }

  // アカウントを追加または更新
  async addAccount(account: {
    accountId: string
    name: string
    accessToken: string
    permissions?: string[]
  }): Promise<void> {
    const existing = this.storage.accounts.find((acc) => acc.accountId === account.accountId)

    if (existing) {
      // 既存のアカウントを更新
      existing.name = account.name
      existing.accessToken = account.accessToken
      existing.permissions = account.permissions || existing.permissions
      existing.lastUsedAt = new Date()
    } else {
      // 新規アカウントを追加
      const newAccount: MetaAccount = {
        ...account,
        id: account.accountId, // idはaccountIdと同じ
        fullAccountId: `act_${account.accountId}`, // act_を付けたID
        permissions: account.permissions || [],
        createdAt: new Date(),
        lastUsedAt: new Date(),
        isActive: true,
      }
      this.storage.accounts.push(newAccount)
    }

    // アクティブなアカウントがない場合は、このアカウントをアクティブにする
    if (!this.storage.activeAccountId) {
      this.storage.activeAccountId = account.accountId
    }

    // MetaApiServiceインスタンスを作成してデータを取得
    try {
      const apiService = new MetaApiService(
        {
          accessToken: account.accessToken,
          accountId: account.accountId,
        },
        this.convexClient
      )

      // アカウント情報を取得
      const accountInfo = await apiService.getAccountInfo()
      const existingAccount = this.storage.accounts.find(
        (acc) => acc.accountId === account.accountId
      )
      if (existingAccount && accountInfo) {
        existingAccount.name = accountInfo.name || existingAccount.name
        existingAccount.currency = accountInfo.currency
        existingAccount.timezone = accountInfo.timezone_name
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error)
    }

    this.saveStorage()
  }

  // アカウントを削除
  removeAccount(accountId: string): void {
    this.storage.accounts = this.storage.accounts.filter((acc) => acc.accountId !== accountId)

    // アクティブなアカウントが削除された場合、別のアカウントをアクティブにする
    if (this.storage.activeAccountId === accountId) {
      this.storage.activeAccountId =
        this.storage.accounts.length > 0 ? this.storage.accounts[0].accountId : undefined
    }

    this.saveStorage()
  }

  // アクティブなアカウントを設定
  setActiveAccount(accountId: string): void {
    const account = this.storage.accounts.find((acc) => acc.accountId === accountId)
    if (account) {
      this.storage.activeAccountId = accountId
      account.lastUsedAt = new Date()
      this.saveStorage()
    }
  }

  // アカウント情報を更新
  updateAccount(accountId: string, updates: Partial<MetaAccount>): void {
    const account = this.storage.accounts.find((acc) => acc.accountId === accountId)
    if (account) {
      Object.assign(account, updates)
      this.saveStorage()
    }
  }

  // アクティブなアカウントのMetaApiServiceインスタンスを取得
  getActiveApiService(): MetaApiService | null {
    const activeAccount = this.getActiveAccount()
    if (!activeAccount) return null

    return new MetaApiService(
      {
        accessToken: activeAccount.accessToken,
        accountId: activeAccount.accountId,
      },
      this.convexClient
    )
  }

  // 指定されたアカウントのMetaApiServiceインスタンスを取得
  getApiService(accountId: string): MetaApiService | null {
    const account = this.storage.accounts.find((acc) => acc.accountId === accountId)
    if (!account) return null

    return new MetaApiService(
      {
        accessToken: account.accessToken,
        accountId: account.accountId,
      },
      this.convexClient
    )
  }

  // 全アカウントのデータ同期状況を取得
  async getAllAccountsData(): Promise<{ accountId: string; name: string; hasData: boolean }[]> {
    const results = []

    for (const account of this.storage.accounts) {
      const accountData = {
        accountId: account.accountId,
        name: account.name,
        hasData: false,
      }

      // ローカルストレージのキーを確認
      const keys = [
        `meta_insights_${account.accountId}`,
        `meta_campaigns_${account.accountId}`,
        `meta_creatives_${account.accountId}`,
      ]

      accountData.hasData = keys.some((key) => {
        const data = localStorage.getItem(key)
        return data && JSON.parse(data).length > 0
      })

      results.push(accountData)
    }

    return results
  }
}
