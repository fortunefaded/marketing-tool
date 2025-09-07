/**
 * キャッシュ設定用のフック
 * 環境変数や設定ファイルからキャッシュの設定を取得
 */
export function useCacheConfig() {
  // 環境変数からキャッシュ有効期限を取得（時間単位）
  // デフォルトは24時間
  const cacheHours = parseInt(import.meta.env.VITE_CACHE_EXPIRY_HOURS || '24', 10)

  // 最小1時間、最大7日間（168時間）に制限
  const validatedHours = Math.max(1, Math.min(168, cacheHours))

  return {
    // ミリ秒に変換
    cacheExpiry: validatedHours * 60 * 60 * 1000,
    cacheExpiryHours: validatedHours,
    cacheExpiryText: `${validatedHours}時間`,
  }
}

// 人間が読みやすい形式に変換するヘルパー関数
export function formatCacheExpiry(expiryMs: number): string {
  const hours = Math.floor(expiryMs / (60 * 60 * 1000))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days}日`
    }
    return `${days}日${remainingHours}時間`
  }

  return `${hours}時間`
}
