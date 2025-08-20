import { MetaAccountManager } from './metaAccountManager'

/**
 * 開発環境用のテストアカウントセットアップ
 */
export async function setupTestAccount() {
  const manager = MetaAccountManager.getInstance()

  // 既存のテストアカウントを確認
  const existingAccounts = manager.getAccounts()
  const testAccount = existingAccounts.find((acc) => acc.accountId === 'test-account-001')

  if (!testAccount) {
    // テストアカウントを追加
    await manager.addAccount({
      accountId: 'test-account-001',
      name: '開発用テストアカウント',
      accessToken: 'test-access-token-001',
      permissions: ['ads_read', 'ads_management', 'business_management'],
    })

    // アクティブに設定
    manager.setActiveAccount('test-account-001')

    console.log('Test account created and activated:', 'test-account-001')
  } else {
    // 既存のアカウントをアクティブに設定
    manager.setActiveAccount('test-account-001')
    console.log('Test account activated:', 'test-account-001')
  }

  return manager.getActiveAccount()
}

/**
 * 実際のMeta Business Accountを使用する場合のセットアップ
 */
export async function setupRealAccount(accountId: string, accessToken: string, name?: string) {
  const manager = MetaAccountManager.getInstance()

  // アカウントを追加
  await manager.addAccount({
    accountId,
    name: name || `Business Account ${accountId}`,
    accessToken,
    permissions: ['ads_read', 'ads_management', 'business_management'],
  })

  // アクティブに設定
  manager.setActiveAccount(accountId)

  console.log('Real account created and activated:', accountId)

  return manager.getActiveAccount()
}
