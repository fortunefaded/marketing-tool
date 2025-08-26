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
}

export function SimplePhoneMockup({ 
  mediaType, 
  thumbnailUrl, 
  videoUrl,
  videoId,
  creativeName = 'Ad Creative'
}: SimplePhoneMockupProps) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  
  // プレースホルダー画像
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE4Ny41IiB5PSIxODcuNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmm9udC1zaXplPSIyNCIgZmlsbD0iIzljYTNhZiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
  
  const isVideo = mediaType === 'VIDEO' || !!videoUrl || !!videoId
  
  return (
    <div className="inline-block">
      {/* スマートフォンフレーム（簡略版） */}
      <div className="relative bg-gray-900 rounded-[2rem] p-3 shadow-xl" style={{ width: '280px' }}>
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl"></div>
        
        {/* スクリーン */}
        <div className="relative bg-white rounded-[1.5rem] overflow-hidden" style={{ width: '254px', height: '520px' }}>
          {/* ステータスバー */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-white z-10 flex items-center justify-between px-4 pt-1">
            <span className="text-xs font-semibold">9:41</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-gray-800 rounded-sm"></div>
              <div className="w-3 h-2 bg-gray-800 rounded-sm"></div>
              <div className="w-4 h-2 bg-gray-800 rounded-sm"></div>
            </div>
          </div>

          {/* アプリヘッダー */}
          <div className="absolute top-8 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-3 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full"></div>
              <div>
                <div className="text-xs font-semibold">広告アカウント</div>
                <div className="text-xs text-gray-500">スポンサー</div>
              </div>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="pt-20 h-full bg-gray-50">
            {/* メディア表示 */}
            <div className="relative bg-black" style={{ height: '254px' }}>
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
                    src={thumbnailUrl || placeholderImage} 
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
                    src={thumbnailUrl || placeholderImage} 
                    alt="Ad creative" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                    <span className="text-white text-xs">画像広告</span>
                  </div>
                </div>
              )}
            </div>

            {/* 広告テキストエリア */}
            <div className="bg-white p-3">
              <div className="h-2 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-2 bg-gray-300 rounded w-5/6"></div>
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
          </div>
        </div>
      </div>
    </div>
  )
}