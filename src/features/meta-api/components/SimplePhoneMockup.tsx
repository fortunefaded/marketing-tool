import { PlayIcon } from '@heroicons/react/24/solid'

interface SimplePhoneMockupProps {
  mediaType?: string
  thumbnailUrl?: string
  videoUrl?: string
  videoId?: string
  platform?: string
  creativeName?: string
  adId?: string
  accountId?: string
  title?: string
  body?: string
  imageUrl?: string
  objectType?: string
  instagramPermalinkUrl?: string
}

export function SimplePhoneMockup({ 
  mediaType, 
  thumbnailUrl, 
  videoUrl,
  videoId,
  creativeName = 'Ad Creative',
  adId,
  accountId,
  title,
  body,
  imageUrl,
  objectType,
  instagramPermalinkUrl
}: SimplePhoneMockupProps) {
  // プレースホルダー画像
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE4Ny41IiB5PSIxODcuNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmm9udC1zaXplPSIyNCIgZmlsbD0iIzljYTNhZiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
  
  // 動画判定ロジックを改善
  const isVideo = 
    mediaType === 'VIDEO' || 
    objectType === 'VIDEO' || 
    mediaType?.toLowerCase().includes('video') ||
    objectType?.toLowerCase().includes('video') ||
    !!videoUrl || 
    !!videoId
  
  const displayImage = thumbnailUrl || imageUrl || placeholderImage
  
  // 動画の埋め込みURLを生成
  const getVideoEmbedUrl = () => {
    if (videoId) {
      // Facebook/Instagram動画の埋め込みURL
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${videoId}/&show_text=false&width=254`
    } else if (videoUrl) {
      // 直接の動画URLがある場合
      if (videoUrl.includes('instagram.com')) {
        // Instagram動画の場合
        const postId = videoUrl.match(/\/p\/([^/?]+)/)?.[1]
        if (postId) {
          return `https://www.instagram.com/p/${postId}/embed`
        }
      }
      return videoUrl
    }
    return null
  }
  
  const videoEmbedUrl = getVideoEmbedUrl()
  
  return (
    <div className="inline-block">
      {/* スマートフォンフレーム（簡略版） */}
      <div className="relative bg-gray-900 rounded-[2rem] p-3 shadow-xl" style={{ width: '280px' }}>
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl"></div>
        
        {/* スクリーン */}
        <div className="relative bg-white rounded-[1.5rem] overflow-hidden" style={{ width: '254px', height: '520px' }}>
          {/* コンテンツエリア */}
          <div className="h-full bg-gray-50">
            {/* メディア表示 - 高さを縮小してテキストエリアを確保 */}
            <div className="relative bg-black" style={{ height: '240px' }}>
              {isVideo && videoEmbedUrl ? (
                // 動画のiframe埋め込み（自動再生）
                <div className="relative w-full h-full bg-black">
                  <iframe
                    src={videoEmbedUrl}
                    width="254"
                    height="240"
                    frameBorder="0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    title="動画広告"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded pointer-events-none">
                    <span className="text-white text-xs">動画広告</span>
                  </div>
                </div>
              ) : isVideo ? (
                // 動画URLがない場合のフォールバック
                <div className="relative w-full h-full">
                  <img 
                    src={displayImage} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                      <PlayIcon className="h-6 w-6 text-gray-900 ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                    <span className="text-white text-xs">動画広告</span>
                  </div>
                </div>
              ) : (
                // 画像広告の表示
                <div className="relative w-full h-full">
                  <img 
                    src={displayImage} 
                    alt="Ad creative" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                    <span className="text-white text-xs">画像広告</span>
                  </div>
                </div>
              )}
            </div>

            {/* 広告テキストエリア - スクロール可能に */}
            <div className="bg-white p-4 overflow-y-auto" style={{ maxHeight: '280px' }}>
              {title && (
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
              )}
              {body && (
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{body}</p>
              )}
              {(title || body) && instagramPermalinkUrl && (
                <a 
                  href={instagramPermalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                  Instagramで確認
                </a>
              )}
            </div>
            
            {/* Facebookで見るボタン */}
            {adId && (
              <div className="bg-white border-t border-gray-200 p-3">
                <a
                  href={(() => {
                    // Facebook Ads ManagerのURL形式
                    // パターン1: 広告編集ページへの直接リンク
                    if (accountId) {
                      // アカウントIDがある場合
                      const cleanAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
                      return `https://business.facebook.com/adsmanager/manage/ads?act=${cleanAccountId}&selected_ad_ids=${adId}`;
                    } else {
                      // アカウントIDがない場合は広告IDのみで試す
                      return `https://business.facebook.com/ads/manager/creative_preview/${adId}`;
                    }
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  title={`広告を Facebook Ads Manager で確認`}
                  onClick={(e) => {
                    // デバッグ用ログ
                    console.log('Facebook link clicked:', {
                      adId,
                      accountId,
                      url: e.currentTarget.href
                    });
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebookで見る</span>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}