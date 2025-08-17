import { MetaAccount, MetaAccountStorage } from '../types/meta-account'
import { MetaApiService } from './metaApiService'

const STORAGE_KEY = 'meta_accounts_v1'

export class MetaAccountManager {
  private storage: MetaAccountStorage

  constructor() {
    this.storage = this.loadStorage()
  }

  private loadStorage(): MetaAccountStorage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // 日付文字列をDateオブジェクトに変換
        data.accounts = data.accounts.map((acc: any) => ({
          ...acc,
          createdAt: new Date(acc.createdAt),
          lastUsedAt: acc.lastUsedAt ? new Date(acc.lastUsedAt) : undefined
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
    return this.storage.accounts.find(acc => acc.id === this.storage.activeAccountId) || null
  }

  // アカウントを追加
  async addAccount(params: {
    accountId: string
    accessToken: string
    name?: string
  }): Promise<MetaAccount> {
    // act_プレフィックスを正規化
    // 数字のみか、act_で始まる形式を受け入れる
    let cleanAccountId: string
    if (params.accountId.startsWith('act_')) {
      cleanAccountId = params.accountId.substring(4)
    } else {
      cleanAccountId = params.accountId
    }
    
    // 数字のみであることを検証
    if (!/^\d+$/.test(cleanAccountId)) {
      throw new Error('アカウントIDは数字のみで入力してください（例: 123456789012345）')
    }
    
    const fullAccountId = `act_${cleanAccountId}`

    // 既存のアカウントをチェック
    const existing = this.storage.accounts.find(
      acc => acc.accountId === cleanAccountId
    )
    if (existing) {
      throw new Error('このアカウントは既に登録されています')
    }

    // APIで検証
    const service = new MetaApiService({
      accessToken: params.accessToken,
      accountId: cleanAccountId,
      apiVersion: 'v23.0'
    })

    const isValid = await service.validateAccessToken()
    if (!isValid) {
      throw new Error('アクセストークンが無効です')
    }

    // 新しいアカウントを作成
    const newAccount: MetaAccount = {
      id: `meta_${Date.now()}`,
      accountId: cleanAccountId,
      fullAccountId,
      name: params.name || fullAccountId,
      accessToken: params.accessToken,
      currency: 'JPY', // TODO: APIから取得
      isActive: true,
      createdAt: new Date()
    }

    this.storage.accounts.push(newAccount)
    
    // 初めてのアカウントの場合、自動的にアクティブに
    if (this.storage.accounts.length === 1) {
      this.storage.activeAccountId = newAccount.id
    }

    this.saveStorage()
    return newAccount
  }

  // アカウントを削除
  removeAccount(accountId: string): void {
    const index = this.storage.accounts.findIndex(acc => acc.id === accountId)
    if (index === -1) return

    this.storage.accounts.splice(index, 1)
    
    // アクティブアカウントが削除された場合
    if (this.storage.activeAccountId === accountId) {
      this.storage.activeAccountId = this.storage.accounts[0]?.id
    }

    this.saveStorage()
  }

  // アクティブアカウントを切り替え
  setActiveAccount(accountId: string): void {
    const account = this.storage.accounts.find(acc => acc.id === accountId)
    if (!account) {
      throw new Error('アカウントが見つかりません')
    }

    this.storage.activeAccountId = accountId
    account.lastUsedAt = new Date()
    this.saveStorage()
  }

  // アカウント情報を更新
  updateAccount(accountId: string, updates: Partial<MetaAccount>): void {
    const account = this.storage.accounts.find(acc => acc.id === accountId)
    if (!account) {
      throw new Error('アカウントが見つかりません')
    }

    Object.assign(account, updates)
    this.saveStorage()
  }

  // アクティブアカウントのAPIサービスを取得
  getActiveApiService(): MetaApiService | null {
    const account = this.getActiveAccount()
    if (!account) return null

    return new MetaApiService({
      accessToken: account.accessToken,
      accountId: account.accountId,
      apiVersion: 'v23.0'
    })
  }

  // 特定アカウントのAPIサービスを取得
  getApiService(accountId: string): MetaApiService | null {
    const account = this.storage.accounts.find(acc => acc.id === accountId)
    if (!account) return null

    return new MetaApiService({
      accessToken: account.accessToken,
      accountId: account.accountId,
      apiVersion: 'v23.0'
    })
  }

  // 全アカウントのデータを一括取得（ダッシュボード用）
  async getAllAccountsData(): Promise<Array<{
    account: MetaAccount
    campaigns?: any[]
    error?: string
  }>> {
    const results = await Promise.all(
      this.storage.accounts.map(async (account) => {
        try {
          const service = this.getApiService(account.id)
          if (!service) {
            return { account, error: 'サービスの初期化に失敗しました' }
          }

          const campaigns = await service.getCampaigns({ limit: 10 })
          return { account, campaigns }
        } catch (error) {
          return { 
            account, 
            error: error instanceof Error ? error.message : '不明なエラー' 
          }
        }
      })
    )

    return results
  }
}