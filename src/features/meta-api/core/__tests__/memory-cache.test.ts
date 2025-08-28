// TASK-103: メモリキャッシュ基本実装 - TDD テストスイート
// MemoryCacheクラスの詳細な単体テスト

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../memory-cache'

describe('TASK-103: Memory Cache Basic Implementation', () => {
  
  let cache: MemoryCache<string>
  
  beforeEach(() => {
    // 各テスト前に新しいキャッシュインスタンスを作成
    cache = new MemoryCache<string>({
      ttl: 5 * 60 * 1000, // 5分
      maxSize: 50 * 1024 * 1024, // 50MB
      enableLRU: true
    })
  })

  describe('キャッシュ読み書き機能', () => {
    
    it('should store and retrieve data correctly', () => {
      // 基本的なキャッシュ読み書きテスト
      const key = 'test-key-1'
      const value = 'test-value-1'
      
      // データを保存
      cache.set(key, value)
      
      // データを取得
      const result = cache.get(key)
      
      expect(result.hit).toBe(true)
      expect(result.data).toBe(value)
      expect(result.timestamp).toBeTypeOf('number')
    })

    it('should return cache miss for non-existent keys', () => {
      const result = cache.get('non-existent-key')
      
      expect(result.hit).toBe(false)
      expect(result.data).toBeUndefined()
    })

    it('should overwrite existing keys', () => {
      const key = 'overwrite-key'
      
      cache.set(key, 'original-value')
      cache.set(key, 'new-value')
      
      const result = cache.get(key)
      expect(result.data).toBe('new-value')
    })

    it('should handle different data types', () => {
      const stringCache = new MemoryCache<string>()
      const numberCache = new MemoryCache<number>()
      const objectCache = new MemoryCache<{ id: number; name: string }>()
      
      // String
      stringCache.set('str', 'hello')
      expect(stringCache.get('str').data).toBe('hello')
      
      // Number
      numberCache.set('num', 42)
      expect(numberCache.get('num').data).toBe(42)
      
      // Object
      const obj = { id: 1, name: 'test' }
      objectCache.set('obj', obj)
      expect(objectCache.get('obj').data).toEqual(obj)
    })
  })

  describe('TTL（有効期限）管理機能', () => {
    
    it('should respect TTL and expire data', () => {
      // 短いTTLでテスト（1ミリ秒）
      const shortCache = new MemoryCache<string>({ ttl: 1 })
      
      shortCache.set('ttl-test', 'ttl-value')
      
      // 最初は取得できる
      expect(shortCache.get('ttl-test').hit).toBe(true)
      
      // 少し待って期限切れを確認
      return new Promise(resolve => {
        setTimeout(() => {
          const result = shortCache.get('ttl-test')
          expect(result.hit).toBe(false)
          resolve(undefined)
        }, 10)
      })
    })

    it('should allow custom TTL per item', () => {
      const testCache = new MemoryCache<string>({ ttl: 60000 }) // デフォルト1分
      
      // 1ミリ秒TTL
      testCache.set('short-ttl', 'short-value', { ttl: 1 })
      // デフォルトTTL
      testCache.set('long-ttl', 'long-value')
      
      return new Promise(resolve => {
        setTimeout(() => {
          // 短いTTLは期限切れ
          expect(testCache.get('short-ttl').hit).toBe(false)
          // 長いTTLはまだ有効
          expect(testCache.get('long-ttl').hit).toBe(true)
          resolve(undefined)
        }, 10)
      })
    })

    it('should update access time on get (TTL refresh)', () => {
      // TTLの概念テストのため、この機能は実装上LRU機能として動作
      cache.set('refresh-test', 'value')
      
      // アクセス
      const result1 = cache.get('refresh-test')
      expect(result1.hit).toBe(true)
      
      // 再度アクセス（lastAccessedが更新される）
      const result2 = cache.get('refresh-test')
      expect(result2.hit).toBe(true)
    })
  })

  describe('サイズ制限機能', () => {
    
    it('should track memory usage', () => {
      cache.set('key1', 'a'.repeat(1024)) // 1KB
      cache.set('key2', 'b'.repeat(2048)) // 2KB
      
      const stats = cache.getStatistics()
      expect(stats.memoryUsage).toBeGreaterThan(3000) // 約3KB
      expect(stats.itemCount).toBe(2)
    })

    it('should enforce size limit and evict items', () => {
      // 小さなキャッシュを作成（10KB制限）
      const smallCache = new MemoryCache<string>({
        ttl: 5 * 60 * 1000,
        maxSize: 10 * 1024, // 10KB
        enableLRU: true
      })
      
      // 6KBのデータを追加
      smallCache.set('item1', 'x'.repeat(6 * 1024))
      expect(smallCache.getStatistics().itemCount).toBe(1)
      
      // さらに6KBのデータを追加（制限超過）
      smallCache.set('item2', 'y'.repeat(6 * 1024))
      
      // 古いアイテムがエビクションされる
      expect(smallCache.get('item1').hit).toBe(false)
      expect(smallCache.get('item2').hit).toBe(true)
      expect(smallCache.getStatistics().itemCount).toBe(1)
    })
  })

  describe('LRUエビクション機能', () => {
    
    it('should evict least recently used items', () => {
      // 小さなキャッシュで複数アイテムを保存
      const lruCache = new MemoryCache<string>({
        ttl: 60 * 60 * 1000, // 1時間（TTLは長め）
        maxSize: 5 * 1024, // 5KB制限
        enableLRU: true
      })
      
      // アイテムを追加（各2KB）
      lruCache.set('oldest', 'a'.repeat(2048))
      lruCache.set('middle', 'b'.repeat(2048))
      
      // oldest をアクセス（使用時間更新）
      lruCache.get('oldest')
      
      // 新しいアイテム追加（制限超過）
      lruCache.set('newest', 'c'.repeat(2048))
      
      // middle が最も使用されていないのでエビクション
      expect(lruCache.get('middle').hit).toBe(false)
      expect(lruCache.get('oldest').hit).toBe(true)
      expect(lruCache.get('newest').hit).toBe(true)
    })

    it('should handle access order correctly', () => {
      const lruCache = new MemoryCache<number>({
        maxSize: 3 * 1024,
        enableLRU: true
      })
      
      // 複数アイテム追加
      lruCache.set('a', 1)
      lruCache.set('b', 2)
      lruCache.set('c', 3)
      
      // アクセス順序: a → c → b
      lruCache.get('a')
      lruCache.get('c') 
      lruCache.get('b')
      
      // 新しいアイテム追加でa（最も古いアクセス）がエビクション
      lruCache.set('d', 4)
      
      expect(lruCache.get('a').hit).toBe(false)
      expect(lruCache.get('b').hit).toBe(true)
      expect(lruCache.get('c').hit).toBe(true)
      expect(lruCache.get('d').hit).toBe(true)
    })
  })

  describe('キャッシュキー生成ロジック', () => {
    
    it('should generate consistent cache keys', () => {
      const params1 = { accountId: '123', startDate: '2024-01-01' }
      const params2 = { accountId: '123', startDate: '2024-01-01' }
      const params3 = { accountId: '456', startDate: '2024-01-01' }
      
      const key1 = MemoryCache.generateKey('insights', params1)
      const key2 = MemoryCache.generateKey('insights', params2)
      const key3 = MemoryCache.generateKey('insights', params3)
      
      // 同じパラメータは同じキー
      expect(key1).toBe(key2)
      // 異なるパラメータは異なるキー
      expect(key1).not.toBe(key3)
    })

    it('should handle parameter order independence', () => {
      const params1 = { a: 1, b: 2, c: 3 }
      const params2 = { c: 3, a: 1, b: 2 }
      
      const key1 = MemoryCache.generateKey('test', params1)
      const key2 = MemoryCache.generateKey('test', params2)
      
      // パラメータの順序が違っても同じキー
      expect(key1).toBe(key2)
    })

    it('should include prefix in key generation', () => {
      const params = { test: 'value' }
      
      const key1 = MemoryCache.generateKey('prefix1', params)
      const key2 = MemoryCache.generateKey('prefix2', params)
      
      expect(key1).toContain('prefix1')
      expect(key2).toContain('prefix2')
      expect(key1).not.toBe(key2)
    })
  })

  describe('キャッシュヒット率測定機能', () => {
    
    it('should track hit and miss statistics', () => {
      // ヒット
      cache.set('hit-test', 'value')
      cache.get('hit-test')
      cache.get('hit-test')
      
      // ミス
      cache.get('miss-test-1')
      cache.get('miss-test-2')
      
      const stats = cache.getStatistics()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(2)
      expect(stats.hitRate).toBeCloseTo(0.5) // 50%
    })

    it('should calculate hit rate correctly', () => {
      // 10回ヒット
      cache.set('popular', 'data')
      for (let i = 0; i < 10; i++) {
        cache.get('popular')
      }
      
      // 5回ミス
      for (let i = 0; i < 5; i++) {
        cache.get(`miss-${i}`)
      }
      
      const stats = cache.getStatistics()
      expect(stats.hitRate).toBeCloseTo(10/15) // 66.7%
    })

    it('should reset statistics', () => {
      cache.set('test', 'value')
      cache.get('test')
      cache.get('nonexistent')
      
      expect(cache.getStatistics().hits).toBe(1)
      expect(cache.getStatistics().misses).toBe(1)
      
      cache.resetStatistics()
      
      const stats = cache.getStatistics()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })

  describe('メンテナンス機能', () => {
    
    it('should clear all cache items', () => {
      cache.set('item1', 'value1')
      cache.set('item2', 'value2')
      cache.set('item3', 'value3')
      
      expect(cache.getStatistics().itemCount).toBe(3)
      
      cache.clear()
      
      expect(cache.getStatistics().itemCount).toBe(0)
      expect(cache.get('item1').hit).toBe(false)
    })

    it('should manually clean expired items', () => {
      // 短いTTL（1ミリ秒）で複数アイテムを追加
      const testCache = new MemoryCache<string>({ ttl: 60000 })
      
      testCache.set('expire1', 'value1', { ttl: 1 }) // 1ミリ秒
      testCache.set('keep', 'value3', { ttl: 60000 })   // 1分
      
      expect(testCache.getStatistics().itemCount).toBe(2)
      
      return new Promise(resolve => {
        setTimeout(() => {
          // 手動クリーンアップ実行
          testCache.cleanup()
          
          // expire1 のみ削除される
          expect(testCache.getStatistics().itemCount).toBe(1)
          expect(testCache.get('expire1').hit).toBe(false)
          expect(testCache.get('keep').hit).toBe(true)
          resolve(undefined)
        }, 10)
      })
    })

    it('should provide cache health status', () => {
      // データを追加してステータス確認
      cache.set('health-test', 'data')
      cache.get('health-test')
      
      const health = cache.getHealth()
      
      expect(health.isHealthy).toBe(true)
      expect(health.memoryUsageRatio).toBeGreaterThan(0)
      expect(health.hitRate).toBeGreaterThan(0)
      expect(health.itemCount).toBe(1)
    })
  })

  describe('エラーハンドリング', () => {
    
    it('should handle invalid configurations gracefully', () => {
      expect(() => {
        new MemoryCache({ ttl: -1000 }) // 負のTTL
      }).toThrow('TTL must be positive')
      
      expect(() => {
        new MemoryCache({ maxSize: 0 }) // 0サイズ
      }).toThrow('Max size must be positive')
    })

    it('should handle extremely large data gracefully', () => {
      const smallCache = new MemoryCache<string>({ maxSize: 1024 }) // 1KB制限
      
      // 10KBのデータを保存しようとする
      const largeData = 'x'.repeat(10 * 1024)
      
      // エラーにならず、単純に保存されない
      expect(() => {
        smallCache.set('large', largeData)
      }).not.toThrow()
      
      // データは保存されない
      expect(smallCache.get('large').hit).toBe(false)
    })
  })
})