import { useState } from 'react'
import { PlayIcon } from '@heroicons/react/24/solid'
import { VideoPlayer } from '@/components/creatives/VideoPlayer'

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
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  
  // プレースホルダー画像
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE4Ny41IiB5PSIxODcuNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmm9udC1zaXplPSIyNCIgZmlsbD0iIzljYTNhZiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
  
  const isVideo = mediaType === 'VIDEO' || objectType === 'VIDEO' || !!videoUrl || !!videoId
  const displayImage = thumbnailUrl || imageUrl || placeholderImage
  
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
            {/* メディア表示 - 高さを拡大 */}
            <div className="relative bg-black" style={{ height: '320px' }}>
              {showVideoPlayer && (videoUrl || videoId) ? (
                // VideoPlayerコンポーネントを使用
                <VideoPlayer
                  videoUrl={videoUrl}
                  videoId={videoId}
                  thumbnailUrl={thumbnailUrl}
                  creativeName={creativeName}
                  mobileOptimized={true}
                  onClose={() => setShowVideoPlayer(false)}
                />
              ) : isVideo ? (
                // 動画のサムネイル表示（クリックで再生）
                <div 
                  className="relative w-full h-full cursor-pointer"
                  onClick={() => setShowVideoPlayer(true)}
                >
                  <img 
                    src={displayImage} 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  {/* 再生ボタンオーバーレイ */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-opacity">
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

            {/* 広告テキストエリア - 上部マージンを調整 */}
            <div className="bg-white p-4">
              {title ? (
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h3>
              ) : (
                <div className="h-2 bg-gray-300 rounded w-3/4 mb-2"></div>
              )}
              {body ? (
                <p className="text-xs text-gray-600 line-clamp-3">{body}</p>
              ) : (
                <>
                  <div className="h-2 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                </>
              )}
              {(title || body) && instagramPermalinkUrl && (
                <a 
                  href={instagramPermalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  詳しくはこちら →
                </a>
              )}
            </div>

            {/* エンゲージメントバー */}
            <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.316C18.114 15.562 18 16.018 18 16.5c0 .482.114.938.316 1.342m0-2.684a3 3 0 100 2.684M12 9a3 3 0 110-6 3 3 0 010 6zm0 12a3 3 0 110-6 3 3 0 010 6z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
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
                <p className="text-xs text-gray-500 text-center mt-1">
                  広告ID: {adId}
                  {accountId && <><br/>アカウント: {accountId}</>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}