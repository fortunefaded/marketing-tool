/**
 * Meta API設定ヘルパー
 * 環境変数とローカルストレージから設定を読み込み
 */

export interface MetaApiConfig {
  appId: string
  appSecret?: string
  adAccountId: string
  accessToken?: string
}

/**
 * Meta API設定を取得
 * 1. ローカルストレージから読み込み
 * 2. 環境変数から読み込み（フォールバック）
 */
export function getMetaApiConfig(): MetaApiConfig {
  // ローカルストレージから設定を読み込み
  const savedConfig = localStorage.getItem('meta_api_config')
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig)
      const accessToken = localStorage.getItem('meta_access_token') || parsed.accessToken
      
      return {
        appId: parsed.appId,
        appSecret: parsed.appSecret,
        adAccountId: parsed.adAccountId,
        accessToken,
      }
    } catch (e) {
      console.error('Failed to parse saved config:', e)
    }
  }

  // 環境変数から読み込み（フォールバック）
  return {
    appId: import.meta.env.VITE_META_APP_ID || '',
    appSecret: import.meta.env.VITE_META_APP_SECRET || '',
    adAccountId: import.meta.env.VITE_META_AD_ACCOUNT_ID || '',
    accessToken: import.meta.env.VITE_META_ACCESS_TOKEN || '',
  }
}

/**
 * アクセストークンを取得
 * 1. ローカルストレージ（meta_access_token）
 * 2. ローカルストレージ（meta_token_long）
 * 3. 環境変数
 */
export function getAccessToken(): string | null {
  // 直接保存されたトークン
  const directToken = localStorage.getItem('meta_access_token')
  if (directToken) {
    return directToken
  }

  // トークンマネージャーで保存されたトークン
  const longToken = localStorage.getItem('meta_token_long')
  if (longToken) {
    try {
      const parsed = JSON.parse(longToken)
      return parsed.token
    } catch (e) {
      console.error('Failed to parse long token:', e)
    }
  }

  // 環境変数
  return import.meta.env.VITE_META_ACCESS_TOKEN || null
}

/**
 * 設定が有効かチェック
 */
export function isConfigValid(config: MetaApiConfig): boolean {
  return !!(config.appId && config.adAccountId && config.accessToken)
}

/**
 * 設定をクリア
 */
export function clearMetaApiConfig() {
  localStorage.removeItem('meta_api_config')
  localStorage.removeItem('meta_access_token')
  localStorage.removeItem('meta_token_long')
  localStorage.removeItem('meta_token_system')
}