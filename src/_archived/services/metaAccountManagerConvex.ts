import { ConvexReactClient } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MetaAccount } from '../../types/meta-account'
import { MetaApiService } from './MetaApiServiceSimple'

export class MetaAccountManagerConvex {
  private static instance: MetaAccountManagerConvex | null = null
  private convexClient: ConvexReactClient
  private cachedAccounts: MetaAccount[] = []
  private cachedActiveAccount: MetaAccount | null = null

  private constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
  }

  static getInstance(convexClient: ConvexReactClient): MetaAccountManagerConvex {
    if (!MetaAccountManagerConvex.instance) {
      MetaAccountManagerConvex.instance = new MetaAccountManagerConvex(convexClient)
    }
    return MetaAccountManagerConvex.instance
  }

  // インスタンスをクリア（テスト用）
  static clearInstance(): void {
    MetaAccountManagerConvex.instance = null
  }

  // アカウント一覧を取得
  async getAccounts(): Promise<MetaAccount[]> {
    try {
      const accounts = await this.convexClient.query(api.metaAccounts.getAccounts, {})
      // Convexの_idフィールドをidにマップし、日付をDateオブジェクトに変換
      this.cachedAccounts = accounts.map((acc: any) => ({
        ...acc,
        id: acc.accountId, // MetaAccountインターフェースに合わせる
        createdAt: new Date(acc.createdAt),
        lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined,
      })) as MetaAccount[]
      return this.cachedAccounts
    } catch (error) {
      console.error('Failed to get accounts from Convex:', error)
      return this.cachedAccounts
    }
  }

  // アクティブなアカウントを取得
  async getActiveAccount(): Promise<MetaAccount | null> {
    try {
      const account = await this.convexClient.query(api.metaAccounts.getActiveAccount, {})
      if (account) {
        // Convexの_idフィールドをidにマップし、日付をDateオブジェクトに変換
        this.cachedActiveAccount = {
          ...account,
          id: account.accountId, // MetaAccountインターフェースに合わせる
          createdAt: new Date(account.createdAt),
          lastUsedAt: account.lastUsedAt ? new Date(account.lastUsedAt) : undefined,
        } as MetaAccount
      } else {
        this.cachedActiveAccount = null
      }
      return this.cachedActiveAccount
    } catch (error) {
      console.error('Failed to get active account from Convex:', error)
      return this.cachedActiveAccount
    }
  }

  // アカウントを追加または更新
  async addAccount(account: {
    accountId: string
    name: string
    accessToken: string
    permissions?: string[]
  }): Promise<void> {
    try {
      // MetaApiServiceインスタンスを作成してデータを取得
      const apiService = new MetaApiService({
        accessToken: account.accessToken,
        accountId: account.accountId,
      })

      let accountInfo
      try {
        accountInfo = await apiService.getAccountInfo()
      } catch (error) {
        console.error('Failed to fetch account info:', error)
      }

      // Convexに保存
      await this.convexClient.mutation(api.metaAccounts.addOrUpdateAccount, {
        accountId: account.accountId,
        name: accountInfo?.name || account.name,
        accessToken: account.accessToken,
        permissions: account.permissions,
        currency: accountInfo?.currency,
        timezone: accountInfo?.timezone_name,
      })

      // キャッシュをクリア
      this.cachedAccounts = []
      this.cachedActiveAccount = null
    } catch (error) {
      console.error('Failed to add account to Convex:', error)
      throw error
    }
  }

  // アカウントを削除
  async removeAccount(accountId: string): Promise<void> {
    try {
      await this.convexClient.mutation(api.metaAccounts.removeAccount, {
        accountId,
      })

      // キャッシュをクリア
      this.cachedAccounts = []
      this.cachedActiveAccount = null
    } catch (error) {
      console.error('Failed to remove account from Convex:', error)
      throw error
    }
  }

  // アクティブなアカウントを設定
  async setActiveAccount(accountId: string): Promise<void> {
    try {
      await this.convexClient.mutation(api.metaAccounts.setActiveAccount, {
        accountId,
      })

      // キャッシュをクリア
      this.cachedActiveAccount = null
    } catch (error) {
      console.error('Failed to set active account in Convex:', error)
      throw error
    }
  }

  // アカウント情報を更新
  async updateAccount(accountId: string, updates: Partial<MetaAccount>): Promise<void> {
    try {
      await this.convexClient.mutation(api.metaAccounts.addOrUpdateAccount, {
        accountId,
        name: updates.name!,
        accessToken: updates.accessToken!,
        permissions: updates.permissions,
        currency: updates.currency,
        timezone: updates.timezone,
      })

      // キャッシュをクリア
      this.cachedAccounts = []
      this.cachedActiveAccount = null
    } catch (error) {
      console.error('Failed to update account in Convex:', error)
      throw error
    }
  }

  // アクティブなアカウントのMetaApiServiceインスタンスを取得
  async getActiveApiService(): Promise<MetaApiService | null> {
    const activeAccount = await this.getActiveAccount()
    if (!activeAccount) return null

    return new MetaApiService(
      {
        accessToken: activeAccount.accessToken,
        accountId: activeAccount.accountId,
      },
      undefined // MetaApiServiceはConvexClientを期待するが、ConvexReactClientは互換性がない
    )
  }

  // 指定されたアカウントのMetaApiServiceインスタンスを取得
  async getApiService(accountId: string): Promise<MetaApiService | null> {
    try {
      const account = await this.convexClient.query(api.metaAccounts.getAccountById, {
        accountId,
      })

      if (!account) return null

      return new MetaApiService(
        {
          accessToken: account.accessToken,
          accountId: account.accountId,
        },
        undefined // MetaApiServiceはConvexClientを期待するが、ConvexReactClientは互換性がない
      )
    } catch (error) {
      console.error('Failed to get API service:', error)
      return null
    }
  }

  // 全アカウントのデータ同期状況を取得
  async getAllAccountsData(): Promise<{ accountId: string; name: string; hasData: boolean }[]> {
    const accounts = await this.getAccounts()
    const results = []

    for (const account of accounts) {
      const accountData = {
        accountId: account.accountId,
        name: account.name,
        hasData: false,
      }

      try {
        // Convexでデータの存在を確認
        const insights = await this.convexClient.query(api.metaInsights.getInsights, {
          accountId: account.accountId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          limit: 1,
        })

        accountData.hasData = insights && insights.items && insights.items.length > 0
      } catch (error) {
        console.error('Failed to check data for account:', account.accountId, error)
      }

      results.push(accountData)
    }

    return results
  }
}
