/**
 * Meta API クリエイティブタイプの正規化ユーティリティ
 */

/**
 * URLからクリエイティブタイプを推測
 * @param url 画像またはビデオのURL
 * @returns 推測されたタイプ
 */
function inferTypeFromUrl(url: string | undefined): string | null {
  if (!url) return null
  
  const lowerUrl = url.toLowerCase()
  
  // ビデオ拡張子
  if (lowerUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)(\?|$)/)) {
    return 'video'
  }
  
  // 画像拡張子
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/)) {
    return 'image'
  }
  
  // Facebook/Instagram CDN パターン
  if (lowerUrl.includes('video.') || lowerUrl.includes('/v/') || lowerUrl.includes('video_')) {
    return 'video'
  }
  
  if (lowerUrl.includes('scontent') || lowerUrl.includes('fbcdn')) {
    // デフォルトでは画像と判定
    return 'image'
  }
  
  return null
}

/**
 * Meta APIの object_type を標準化された creative_media_type に変換
 * @param objectType Meta APIから取得したobject_type値
 * @param additionalInfo 追加情報（video_url, thumbnail_url, carousel_cardsなど）
 * @returns 標準化されたクリエイティブメディアタイプ
 */
export function normalizeCreativeMediaType(
  objectType: string | undefined | null,
  additionalInfo?: {
    video_url?: string
    thumbnail_url?: string
    carousel_cards?: any[]
  }
): string {
  // object_typeが明確に定義されている場合
  if (objectType) {
    switch (objectType.toUpperCase()) {
      case 'PHOTO':
      case 'IMAGE':
        return 'image'
      case 'VIDEO_INLINE':
      case 'VIDEO':
        return 'video'
      case 'SHARE':
      case 'CAROUSEL':
        return 'carousel'
      case 'TEXT':
        return 'text'
    }
  }
  
  // additionalInfoから推測
  if (additionalInfo) {
    // カルーセルカードがある場合
    if (additionalInfo.carousel_cards && additionalInfo.carousel_cards.length > 0) {
      return 'carousel'
    }
    
    // video_urlがある場合
    if (additionalInfo.video_url) {
      return 'video'
    }
    
    // URLから推測
    const inferredType = inferTypeFromUrl(additionalInfo.thumbnail_url) || inferTypeFromUrl(additionalInfo.video_url)
    if (inferredType) {
      return inferredType
    }
  }
  
  // デフォルトはテキスト
  return 'text'
}

/**
 * 正規化されたクリエイティブタイプを大文字の表示形式に変換
 * @param normalizedType 正規化されたタイプ
 * @returns 表示用の大文字タイプ
 */
export function getDisplayCreativeType(normalizedType: string): string {
  switch (normalizedType) {
    case 'image':
      return 'IMAGE'
    case 'video':
      return 'VIDEO'
    case 'carousel':
      return 'CAROUSEL'
    default:
      return 'TEXT'
  }
}