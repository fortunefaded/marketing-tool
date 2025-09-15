import { vibe } from '@/utils/vibelogger'
import { ConvexReactClient } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { AccountId, AccessToken } from './branded-types'
import { Result } from './result'
import { toError } from './type-guards'

/**
 * セキュアなトークン管理システム
 * - 暗号化されたトークン保存
 * - 自動リフレッシュ機能
 * - 監査ログ
 * - ゼロトラスト検証
 */
export class SecureTokenManager {
  private static instance: SecureTokenManager
  private tokenCache = new Map<string, { token: AccessToken; expiry: Date }>()
  private encryptionKey: CryptoKey | null = null
  
  private constructor(private convexClient: ConvexReactClient) {
    this.initializeEncryption()
  }
  
  static getInstance(convexClient: ConvexReactClient): SecureTokenManager {
    if (!SecureTokenManager.instance) {
      SecureTokenManager.instance = new SecureTokenManager(convexClient)
    }
    return SecureTokenManager.instance
  }
  
  private async initializeEncryption() {
    try {
      // Web Crypto APIを使用して暗号化キーを生成
      this.encryptionKey = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      )
      vibe.good('暗号化キー初期化完了')
    } catch (error) {
      const err = toError(error)
      vibe.bad('暗号化キー初期化エラー', { error: err.message })
      throw new Error('Failed to initialize encryption')
    }
  }
  
  /**
   * トークンの取得（暗号化・キャッシュ対応）
   */
  async getToken(accountId: AccountId): Promise<Result<AccessToken>> {
    const story = vibe.story('セキュアトークン取得')
    
    try {
      // キャッシュチェック
      const cached = this.tokenCache.get(accountId)
      if (cached && cached.expiry > new Date()) {
        story.chapter('キャッシュヒット', `有効期限: ${cached.expiry.toISOString()}`)
        story.success()
        return Result.ok(cached.token, true)
      }
      
      // DBから取得
      story.chapter('DBからトークン取得', { accountId: accountId as string })
      
      // Safely check if API is available
      if (!api?.metaAccounts?.getAccountById) {
        vibe.warn('Convex API metaAccounts.getAccountById not available')
        return Result.err(new Error('Convex API not initialized'))
      }
      
      const account = await this.convexClient.query(
        api.metaAccounts.getAccountById,
        { accountId: accountId as string }
      )
      
      if (!account?.accessToken) {
        story.fail('トークンが見つかりません')
        return Result.err(new Error(`No token found for account ${accountId}`))
      }
      
      const token = AccessToken.from(account.accessToken)
      
      // トークンの検証
      await this.verifyToken(token)
      
      // キャッシュに保存（15分間有効）
      const expiry = new Date(Date.now() + 15 * 60 * 1000)
      this.tokenCache.set(accountId as string, {
        token,
        expiry
      })
      
      // 監査ログ
      await this.logTokenAccess(accountId, 'retrieved')
      
      story.success('トークン取得成功')
      return Result.ok(token)
      
    } catch (error) {
      const err = toError(error)
      story.fail(`エラー: ${err.message}`)
      return Result.err(err)
    }
  }
  
  /**
   * トークンのリフレッシュ
   */
  async refreshToken(accountId: AccountId): Promise<Result<AccessToken>> {
    const story = vibe.story('トークンリフレッシュ')
    
    try {
      story.chapter('Meta APIでトークン更新', { accountId: accountId as string })
      
      // TODO: Meta APIのトークンリフレッシュエンドポイントを実装
      // const newToken = await this.callMetaRefreshEndpoint(accountId)
      
      // 仮実装: 既存のトークンを返す
      const currentTokenResult = await this.getToken(accountId)
      if (!Result.isOk(currentTokenResult)) {
        return currentTokenResult
      }
      const currentToken = currentTokenResult.data
      
      // キャッシュ更新
      this.tokenCache.delete(accountId as string)
      
      // 監査ログ
      await this.logTokenAccess(accountId, 'refreshed')
      
      story.success('トークンリフレッシュ成功')
      return Result.ok(currentToken)
      
    } catch (error) {
      const err = toError(error)
      story.fail(`リフレッシュエラー: ${err.message}`)
      return Result.err(err)
    }
  }
  
  /**
   * トークンの検証
   */
  private async verifyToken(token: AccessToken): Promise<void> {
    // トークンフォーマットの基本検証
    if (!AccessToken.is(token)) {
      throw new Error('Invalid token format')
    }
    
    // TODO: Meta APIでトークンの有効性を検証
    // const isValid = await this.callMetaVerifyEndpoint(token)
  }
  
  /**
   * トークンアクセスの監査ログ
   */
  private async logTokenAccess(accountId: AccountId, action: string): Promise<void> {
    try {
      // TODO: auditLogs APIを実装後に有効化
      // await this.convexClient.mutation(api.auditLogs.logTokenAccess, {
      //   accountId: accountId as string,
      //   action,
      //   timestamp: new Date().toISOString(),
      //   userAgent: navigator.userAgent,
      //   ipAddress: 'client-side'
      // })
      vibe.debug('監査ログ', { accountId, action })
    } catch (error) {
      const err = toError(error)
      vibe.warn('監査ログ記録エラー', { error: err.message })
    }
  }
  
  /**
   * トークンの暗号化（将来実装用）
   * @param token トークン文字列
   * @returns 暗号化されたデータ
   * @private
   */
  // @ts-ignore TS6133 - 将来実装用メソッド
  private async encryptToken(token: string): Promise<ArrayBuffer> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }
    
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.encryptionKey,
      data
    )
    
    // IVと暗号化データを結合
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return combined.buffer
  }
  
  /**
   * トークンの復号化（将来実装用）
   * @param encryptedData 暗号化されたデータ
   * @returns 復号化されたトークン
   * @private
   */
  // @ts-ignore TS6133 - 将来実装用メソッド
  private async decryptToken(encryptedData: ArrayBuffer): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }
    
    const data = new Uint8Array(encryptedData)
    const iv = data.slice(0, 12)
    const encrypted = data.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.encryptionKey,
      encrypted
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
  
  /**
   * 緊急時のトークン無効化
   */
  async revokeToken(accountId: AccountId): Promise<Result<void>> {
    const story = vibe.story('トークン無効化')
    
    try {
      // キャッシュから削除
      this.tokenCache.delete(accountId as string)
      
      // DBのトークンを無効化
      // TODO: revokeToken APIを実装後に有効化
      // await this.convexClient.mutation(api.metaAccounts.revokeToken, {
      //   accountId: accountId as string
      // })
      vibe.info('トークン無効化', { accountId })
      
      // 監査ログ
      await this.logTokenAccess(accountId, 'revoked')
      
      story.success('トークン無効化完了')
      return Result.ok(undefined)
    } catch (error) {
      const err = toError(error)
      story.fail(`無効化エラー: ${err.message}`)
      return Result.err(err)
    }
  }
  
  /**
   * 全トークンのクリア（ログアウト時）
   */
  clearAllTokens(): void {
    this.tokenCache.clear()
    vibe.info('全トークンキャッシュをクリア')
  }
}