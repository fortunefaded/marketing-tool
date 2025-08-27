/**
 * Meta API クリエイティブタイプの正規化ユーティリティ
 */

/**
 * Meta APIの object_type を標準化された creative_media_type に変換
 * @param objectType Meta APIから取得したobject_type値
 * @returns 標準化されたクリエイティブメディアタイプ
 */
export function normalizeCreativeMediaType(objectType: string | undefined | null): string {
  if (!objectType) return 'text'
  
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
    default:
      return 'text'
  }
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