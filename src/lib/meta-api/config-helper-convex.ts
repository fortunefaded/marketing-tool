/**
 * Meta API設定ヘルパー（Convex版）
 * Convexデータベースと環境変数から設定を読み込み
 */

import { ConvexReactClient } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// 簡易ロガー
const logger = {
  info: (...args: any[]) => console.log('[ConfigHelper]', ...args),
  warn: (...args: any[]) => console.warn('[ConfigHelper]', ...args),
  error: (...args: any[]) => console.error('[ConfigHelper]', ...args),
}

export interface MetaApiConfig {
  appId: string
  appSecret?: string
  adAccountId: string
  accessToken?: string
}

// Convexクライアントのインスタンスを保持
let convexClient: ConvexReactClient | null = null

/**
 * Convexクライアントを設定
 */
export function setConvexClient(client: ConvexReactClient) {
  convexClient = client
}

/**
 * Meta API設定を取得（非同期）
 * 1. Convexデータベースから読み込み
 * 2. 環境変数から読み込み（フォールバック）
 */
export async function getMetaApiConfig(): Promise<MetaApiConfig> {
  if (!convexClient) {
    logger.warn('Convex client not initialized, using environment variables')
    return getConfigFromEnv()
  }

  try {
    // 1. metaAccountsテーブルからアクティブなアカウントを取得
    const activeAccount = await convexClient.query(api.metaAccounts.getActiveAccount, {})
    
    // 2. Convexから設定を読み込み（フォールバック）
    const savedConfig = await convexClient.query(api.apiConfig.getMetaConfig, {})
    
    // 3. tokensテーブルからトークンを取得（フォールバック）
    const longLivedToken = await convexClient.query(api.tokens.getToken, { tokenType: 'long' })
    
    logger.info('[getMetaApiConfig] Found config:', {
      hasActiveAccount: !!activeAccount,
      activeAccountId: activeAccount?.accountId,
      hasSavedConfig: !!savedConfig,
      hasLongLivedToken: !!longLivedToken?.token,
      savedConfigFields: savedConfig ? Object.keys(savedConfig) : []
    })
    
    if (activeAccount || savedConfig || longLivedToken) {
      return {
        appId: savedConfig?.appId || import.meta.env.VITE_META_APP_ID || '',
        appSecret: savedConfig?.appSecret || import.meta.env.VITE_META_APP_SECRET || '',
        adAccountId: activeAccount?.accountId || savedConfig?.adAccountId || import.meta.env.VITE_META_AD_ACCOUNT_ID || '',
        accessToken: activeAccount?.accessToken || longLivedToken?.token || savedConfig?.accessToken || '',
      }
    }
  } catch (e) {
    logger.error('Failed to load config from Convex:', e)
  }

  // 環境変数から読み込み（フォールバック）
  return getConfigFromEnv()
}

/**
 * 環境変数から設定を取得
 */
function getConfigFromEnv(): MetaApiConfig {
  return {
    appId: import.meta.env.VITE_META_APP_ID || '',
    appSecret: import.meta.env.VITE_META_APP_SECRET || '',
    adAccountId: import.meta.env.VITE_META_AD_ACCOUNT_ID || '',
    accessToken: import.meta.env.VITE_META_ACCESS_TOKEN || '',
  }
}

/**
 * アクセストークンを取得（非同期）
 * 1. Convexデータベース
 * 2. 環境変数
 */
export async function getAccessToken(): Promise<string | null> {
  const config = await getMetaApiConfig()
  return config.accessToken || null
}

/**
 * 同期的にアクセストークンを取得（環境変数のみ）
 * 初期化時など、非同期処理ができない場合に使用
 */
export function getAccessTokenSync(): string | null {
  return import.meta.env.VITE_META_ACCESS_TOKEN || null
}

/**
 * 設定が有効かチェック
 */
export function isConfigValid(config: MetaApiConfig): boolean {
  return !!(config.appId && config.adAccountId && config.accessToken)
}

/**
 * 設定を保存（非同期）
 */
export async function saveMetaApiConfig(config: MetaApiConfig): Promise<void> {
  if (!convexClient) {
    throw new Error('Convex client not initialized')
  }

  try {
    await convexClient.mutation(api.apiConfig.saveMetaConfig, {
      appId: config.appId,
      appSecret: config.appSecret,
      adAccountId: config.adAccountId,
      accessToken: config.accessToken,
    })
  } catch (e) {
    logger.error('Failed to save config to Convex:', e)
    throw e
  }
}

/**
 * 設定をクリア（非同期）
 */
export async function clearMetaApiConfig(): Promise<void> {
  if (!convexClient) {
    throw new Error('Convex client not initialized')
  }

  try {
    await convexClient.mutation(api.apiConfig.deleteConfig, {
      provider: 'meta',
    })
  } catch (e) {
    logger.error('Failed to clear config from Convex:', e)
    throw e
  }
}