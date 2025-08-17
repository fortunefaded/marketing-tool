import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MetaTokenManager } from './token-manager'

// Mock fetch
global.fetch = vi.fn()

describe('MetaTokenManager', () => {
  const mockConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  }

  let tokenManager: MetaTokenManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
  })

  afterEach(() => {
    if (tokenManager) {
      tokenManager.clearTokens()
    }
  })

  describe('initialization', () => {
    it('should initialize with system user token', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'system-token-123',
      })

      // System tokens should be set immediately
      expect(tokenManager['currentToken']).toEqual({
        token: 'system-token-123',
        type: 'system',
      })
    })

    it('should initialize with long-lived token', () => {
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'long-token-123',
        expiresAt,
      })

      expect(tokenManager['currentToken']).toEqual({
        token: 'long-token-123',
        type: 'long',
        expiresAt,
      })
    })

    it('should exchange short-lived token on initialization', async () => {
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'long-token-456',
          expires_in: 5184000, // 60 days
        }),
      } as Response)

      tokenManager = new MetaTokenManager({
        ...mockConfig,
        shortLivedToken: 'short-token-123',
      })

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://graph.facebook.com/v23.0/oauth/access_token')
      )
      
      expect(tokenManager['currentToken']).toMatchObject({
        token: 'long-token-456',
        type: 'long',
      })
    })
  })

  describe('getAccessToken', () => {
    it('should return current token if valid', async () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'valid-token',
      })

      const token = await tokenManager.getAccessToken()
      expect(token).toBe('valid-token')
    })

    it('should throw error if no token available', async () => {
      tokenManager = new MetaTokenManager(mockConfig)

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'No access token available'
      )
    })

    it('should refresh expired long-lived token', async () => {
      const expiredDate = new Date(Date.now() - 1000) // Already expired
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'expired-token',
        expiresAt: expiredDate,
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'refreshed-token',
          expires_in: 5184000,
        }),
      } as Response)

      const token = await tokenManager.getAccessToken()
      
      expect(mockFetch).toHaveBeenCalled()
      expect(token).toBe('refreshed-token')
    })

    it('should throw error for expired non-refreshable token', async () => {
      tokenManager = new MetaTokenManager(mockConfig)
      
      // Manually set an expired short token
      tokenManager.setToken({
        token: 'short-expired',
        type: 'short',
        expiresAt: new Date(Date.now() - 1000),
      })

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'Token expired and cannot be refreshed'
      )
    })
  })

  describe('exchangeToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      tokenManager = new MetaTokenManager(mockConfig)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'long-token-789',
          expires_in: 5184000,
        }),
      } as Response)

      const tokenInfo = await tokenManager.exchangeToken('short-token-456')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fb_exchange_token=short-token-456')
      )
      
      expect(tokenInfo).toMatchObject({
        token: 'long-token-789',
        type: 'long',
      })
      
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date)
    })

    it('should handle exchange errors', async () => {
      tokenManager = new MetaTokenManager(mockConfig)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          error: {
            message: 'Invalid token',
          },
        }),
      } as Response)

      await expect(tokenManager.exchangeToken('invalid-token')).rejects.toThrow(
        'Token exchange failed: Invalid token'
      )
    })
  })

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'valid-token',
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            is_valid: true,
          },
        }),
      } as Response)

      const isValid = await tokenManager.validateToken()
      
      expect(isValid).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('debug_token')
      )
    })

    it('should return false for invalid token', async () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'invalid-token',
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            is_valid: false,
          },
        }),
      } as Response)

      const isValid = await tokenManager.validateToken()
      
      expect(isValid).toBe(false)
    })

    it('should handle validation errors gracefully', async () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'token',
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const isValid = await tokenManager.validateToken()
      
      expect(isValid).toBe(false)
    })
  })

  describe('getTokenInfo', () => {
    it('should return detailed token information', async () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'info-token',
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            is_valid: true,
            expires_at: Math.floor(Date.now() / 1000) + 5184000,
            scopes: ['ads_read', 'ads_management'],
            user_id: '123456',
          },
        }),
      } as Response)

      const info = await tokenManager.getTokenInfo()
      
      expect(info).toMatchObject({
        isValid: true,
        type: 'system',
        scopes: ['ads_read', 'ads_management'],
        userId: '123456',
      })
      
      expect(info.expiresAt).toBeInstanceOf(Date)
    })

    it('should return invalid status when no token', async () => {
      tokenManager = new MetaTokenManager(mockConfig)

      const info = await tokenManager.getTokenInfo()
      
      expect(info).toEqual({ isValid: false })
    })
  })

  describe('auto-refresh', () => {
    it('should setup auto-refresh for expiring tokens', () => {
      vi.useFakeTimers()
      
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'refresh-token',
        expiresAt,
        autoRefresh: true,
        refreshThreshold: 24, // Refresh 24 hours before expiry
      })

      // Should have a refresh timer set
      expect(tokenManager['refreshTimer']).toBeDefined()
      
      vi.useRealTimers()
    })

    it('should not setup auto-refresh for system tokens', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'system-token',
        autoRefresh: true,
      })

      // System tokens don't expire, so no timer
      expect(tokenManager['refreshTimer']).toBeUndefined()
    })

    it('should emit event on successful auto-refresh', async () => {
      vi.useFakeTimers()
      
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'soon-expiring',
        expiresAt,
        autoRefresh: true,
        refreshThreshold: 24,
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'auto-refreshed-token',
          expires_in: 5184000,
        }),
      } as Response)

      const autoRefreshedPromise = new Promise<void>((resolve) => {
        tokenManager.once('token:auto-refreshed', () => {
          resolve()
        })
      })

      // Trigger immediate refresh instead of waiting
      await tokenManager['refreshToken']()
      
      await autoRefreshedPromise
      
      expect(mockFetch).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('storage', () => {
    it('should save tokens to localStorage', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'storage-token',
      })

      const stored = localStorage.getItem('meta_token_system')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.token).toBe('storage-token')
      expect(parsed.type).toBe('system')
    })

    it('should load tokens from localStorage', async () => {
      // Pre-populate storage
      localStorage.setItem('meta_token_long', JSON.stringify({
        token: 'loaded-token',
        type: 'long',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      tokenManager = new MetaTokenManager(mockConfig)
      
      const loaded = await tokenManager.loadFromStorage()
      expect(loaded).toBe(true)
      
      const token = await tokenManager.getAccessToken()
      expect(token).toBe('loaded-token')
    })

    it('should not load expired tokens from storage', async () => {
      // Pre-populate with expired token
      localStorage.setItem('meta_token_long', JSON.stringify({
        token: 'expired-stored',
        type: 'long',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }))

      tokenManager = new MetaTokenManager(mockConfig)
      
      const loaded = await tokenManager.loadFromStorage()
      expect(loaded).toBe(false)
    })

    it('should clear all tokens and storage', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'clear-me',
      })

      tokenManager.clearTokens()
      
      expect(tokenManager['currentToken']).toBeNull()
      expect(localStorage.getItem('meta_token_system')).toBeNull()
    })
  })

  describe('utility methods', () => {
    it('should calculate time until expiry', () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'timed-token',
        expiresAt,
      })

      const remaining = tokenManager.getTimeUntilExpiry()
      expect(remaining).toBeGreaterThan(23 * 60 * 60 * 1000)
      expect(remaining).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
    })

    it('should return null for non-expiring tokens', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'permanent-token',
      })

      const remaining = tokenManager.getTimeUntilExpiry()
      expect(remaining).toBeNull()
    })

    it('should check if token is expiring soon', () => {
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'expiring-soon',
        expiresAt,
      })

      expect(tokenManager.isExpiringSoon(24)).toBe(true)
      expect(tokenManager.isExpiringSoon(6)).toBe(false)
    })
  })

  describe('event emissions', () => {
    it('should emit token:exchanged event', async () => {
      tokenManager = new MetaTokenManager(mockConfig)

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockClear() // Clear any previous mocks
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'exchanged-token',
          expires_in: 5184000,
        }),
      } as Response)

      const eventPromise = new Promise(resolve => {
        tokenManager.once('token:exchanged', resolve)
      })

      await tokenManager.exchangeToken('short-token')
      
      const eventData = await eventPromise
      expect(eventData).toMatchObject({
        token: expect.any(String),
        type: 'long',
      })
    })

    it('should emit token:refresh-failed on refresh error', async () => {
      vi.useFakeTimers()
      
      const expiresAt = new Date(Date.now() + 1000) // 1 second
      
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        longLivedToken: 'fail-refresh',
        expiresAt,
        autoRefresh: true,
        refreshThreshold: 0.001, // Very small threshold
      })

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockClear()
      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'))

      const errorPromise = new Promise<Error>((resolve) => {
        tokenManager.once('token:refresh-failed', (error) => {
          resolve(error)
        })
      })

      // Trigger refresh directly
      try {
        await tokenManager['refreshToken']()
      } catch {
        // Expected to fail
      }
      
      const error = await errorPromise
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Refresh failed')
      
      vi.useRealTimers()
    })

    it('should emit tokens:cleared event', () => {
      tokenManager = new MetaTokenManager({
        ...mockConfig,
        systemUserToken: 'clear-token',
      })

      const eventPromise = new Promise(resolve => {
        tokenManager.once('tokens:cleared', resolve)
      })

      tokenManager.clearTokens()
      
      return expect(eventPromise).resolves.toBeUndefined()
    })
  })
})