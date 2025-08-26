import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SecureTokenManager } from '../secure-token-manager'
import { AccountId, AccessToken } from '../branded-types'
import { Result } from '../result'
// import { ConvexReactClient } from 'convex/react' // Mocked module

// モックの設定
vi.mock('convex/react')
vi.mock('@/lib/vibelogger', () => ({
  vibe: {
    good: vi.fn(),
    bad: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    story: vi.fn(() => ({
      chapter: vi.fn(),
      success: vi.fn(),
      fail: vi.fn()
    }))
  }
}))

describe('SecureTokenManager', () => {
  let tokenManager: SecureTokenManager
  let mockConvexClient: any

  beforeEach(() => {
    // Convexクライアントのモック
    mockConvexClient = {
      query: vi.fn(),
      mutation: vi.fn()
    }

    // テスト用のインスタンス作成
    tokenManager = SecureTokenManager.getInstance(mockConvexClient)
    
    // crypto.subtle のモック
    global.crypto = {
      subtle: {
        generateKey: vi.fn().mockResolvedValue('mock-key'),
        encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32))
      },
      getRandomValues: vi.fn((arr) => arr)
    } as any
  })

  describe('getToken', () => {
    it('新規トークンを取得できる', async () => {
      const accountId = AccountId.from('123456789')
      const mockToken = 'test-access-token-1234567890'
      
      mockConvexClient.query.mockResolvedValue({
        accessToken: mockToken
      })

      const result = await tokenManager.getToken(accountId)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(AccessToken.is(result.data)).toBe(true)
        expect(result.cached).toBe(false)
      }
    })

    it('キャッシュからトークンを返す', async () => {
      const accountId = AccountId.from('123456789')
      const mockToken = 'cached-token-1234567890'
      
      // 初回取得
      mockConvexClient.query.mockResolvedValue({
        accessToken: mockToken
      })
      await tokenManager.getToken(accountId)
      
      // 2回目はキャッシュから
      mockConvexClient.query.mockClear()
      const result = await tokenManager.getToken(accountId)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.cached).toBe(true)
        expect(mockConvexClient.query).not.toHaveBeenCalled()
      }
    })

    it('トークンが見つからない場合はエラーを返す', async () => {
      const accountId = AccountId.from('123456789')
      
      mockConvexClient.query.mockResolvedValue({
        accessToken: null
      })

      const result = await tokenManager.getToken(accountId)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('No token found')
      }
    })

    it('無効なトークン形式はエラーを返す', async () => {
      const accountId = AccountId.from('123456789')
      
      mockConvexClient.query.mockResolvedValue({
        accessToken: 'short' // 10文字未満
      })

      const result = await tokenManager.getToken(accountId)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error.message).toContain('Invalid access token format')
      }
    })
  })

  describe('refreshToken', () => {
    it('トークンをリフレッシュできる', async () => {
      const accountId = AccountId.from('123456789')
      const mockToken = 'refreshed-token-1234567890'
      
      mockConvexClient.query.mockResolvedValue({
        accessToken: mockToken
      })

      const result = await tokenManager.refreshToken(accountId)

      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(AccessToken.is(result.data)).toBe(true)
      }
    })

    it('リフレッシュ後はキャッシュがクリアされる', async () => {
      const accountId = AccountId.from('123456789')
      const oldToken = 'old-token-1234567890'
      const newToken = 'new-token-1234567890'
      
      // 初回取得
      mockConvexClient.query.mockResolvedValue({
        accessToken: oldToken
      })
      await tokenManager.getToken(accountId)
      
      // リフレッシュ
      mockConvexClient.query.mockResolvedValue({
        accessToken: newToken
      })
      await tokenManager.refreshToken(accountId)
      
      // 次回取得時は新しいトークン
      const result = await tokenManager.getToken(accountId)
      
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.data).toBe(newToken as AccessToken)
      }
    })
  })

  describe('revokeToken', () => {
    it('トークンを無効化できる', async () => {
      const accountId = AccountId.from('123456789')
      
      const result = await tokenManager.revokeToken(accountId)

      expect(Result.isOk(result)).toBe(true)
    })

    it('無効化後はキャッシュから削除される', async () => {
      const accountId = AccountId.from('123456789')
      const mockToken = 'to-be-revoked-1234567890'
      
      // トークンを取得してキャッシュ
      mockConvexClient.query.mockResolvedValue({
        accessToken: mockToken
      })
      await tokenManager.getToken(accountId)
      
      // 無効化
      await tokenManager.revokeToken(accountId)
      
      // 次回取得時はDBから再取得
      mockConvexClient.query.mockClear()
      mockConvexClient.query.mockResolvedValue({
        accessToken: null // 無効化されている
      })
      
      const result = await tokenManager.getToken(accountId)
      
      expect(Result.isErr(result)).toBe(true)
      expect(mockConvexClient.query).toHaveBeenCalled()
    })
  })

  describe('clearAllTokens', () => {
    it('すべてのトークンキャッシュをクリアする', async () => {
      const accountId1 = AccountId.from('111111111')
      const accountId2 = AccountId.from('222222222')
      
      // 複数のトークンをキャッシュ
      mockConvexClient.query.mockResolvedValue({
        accessToken: 'token1-1234567890'
      })
      await tokenManager.getToken(accountId1)
      
      mockConvexClient.query.mockResolvedValue({
        accessToken: 'token2-1234567890'
      })
      await tokenManager.getToken(accountId2)
      
      // すべてクリア
      tokenManager.clearAllTokens()
      
      // 両方ともDBから再取得される
      mockConvexClient.query.mockClear()
      await tokenManager.getToken(accountId1)
      await tokenManager.getToken(accountId2)
      
      expect(mockConvexClient.query).toHaveBeenCalledTimes(2)
    })
  })
})