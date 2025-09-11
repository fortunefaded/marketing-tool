import { useState, useMemo, useCallback, useEffect } from 'react'
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
  creativeId?: string
  creativeNameFull?: string
  previewShareableLink?: string
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
  instagramPermalinkUrl,
  creativeId,
  creativeNameFull,
  previewShareableLink,
}: SimplePhoneMockupProps) {
  const [embedError, setEmbedError] = useState(false)
  const [embedMethod, setEmbedMethod] = useState<'preview_link' | 'video_id' | 'video_url' | 'external'>('preview_link')
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  
  // プレースホルダー画像
  const placeholderImage =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE4Ny41IiB5PSIxODcuNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='

  // 動画判定ロジックを強化
  const isVideo = useMemo(() => {
    // object_typeがVIDEOの場合
    if (mediaType === 'VIDEO' || objectType === 'VIDEO') return true

    // STATUSでも動画URLや動画IDがあれば動画として扱う
    if ((mediaType === 'STATUS' || objectType === 'STATUS') && (videoUrl || videoId)) return true

    // 動画URLまたは動画IDが存在する場合
    if (videoUrl || videoId) return true

    // サムネイルURLにvideo関連の文字列が含まれる場合（フォールバック）
    if (thumbnailUrl && thumbnailUrl.includes('/v/t15.')) return true

    return false
  }, [mediaType, objectType, videoUrl, videoId, thumbnailUrl])

  const displayImage = thumbnailUrl || imageUrl || placeholderImage

  // thumbnailUrlからvideo_idを抽出する試み
  const extractedVideoId = (() => {
    if (videoId) return videoId
    if (thumbnailUrl && thumbnailUrl.includes('facebook.com')) {
      // Facebook thumbnailURLからvideo_idを抽出
      const match = thumbnailUrl.match(/\/(\d{15,})_/)
      return match ? match[1] : null
    }
    return null
  })()

  // 動画埋め込みURLの生成ロジック（fb.me短縮URL対応版）
  const getVideoEmbedUrl = useCallback(() => {
    try {
      // デバッグ情報
      console.log('🎬 getVideoEmbedUrl called:', {
        embedMethod,
        previewShareableLink,
        isFbMeLink: previewShareableLink?.includes('fb.me'),
        videoId,
        extractedVideoId,
        videoUrl
      })

      // fb.me短縮URLの場合は、videoIdを優先的に使用
      if (previewShareableLink?.includes('fb.me') && (videoId || extractedVideoId)) {
        const id = videoId || extractedVideoId
        console.log('🎬 fb.me detected, using video ID instead:', id)
        const videoPageUrl = `https://www.facebook.com/facebook/videos/${id}/`
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoPageUrl)}&show_text=false&width=254&height=240`
      }

      // フォールバック戦略に基づいてURLを生成
      if (embedMethod === 'preview_link' && previewShareableLink && !previewShareableLink.includes('fb.me')) {
        console.log('🎬 Using preview_shareable_link for embed')
        
        // preview_shareable_linkが既に埋め込み用URLの場合
        if (previewShareableLink.includes('facebook.com/plugins/')) {
          return previewShareableLink
        }
        
        // preview_shareable_linkが相対URLの場合
        if (previewShareableLink.startsWith('/')) {
          return `https://www.facebook.com${previewShareableLink}`
        }
        
        // 通常のFacebook URLの場合
        const encodedUrl = encodeURIComponent(previewShareableLink)
        return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=254&height=240&appId=`
      }
      
      if (embedMethod === 'video_id' && (videoId || extractedVideoId)) {
        const id = videoId || extractedVideoId
        const videoPageUrl = `https://www.facebook.com/facebook/videos/${id}/`
        console.log('🎬 Using video ID for embed:', id)
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoPageUrl)}&show_text=false&width=254&height=240&appId=`
      }
      
      if (embedMethod === 'video_url' && videoUrl) {
        console.log('🎬 Using video URL for embed')
        
        // 相対URLの場合
        if (videoUrl.startsWith('/')) {
          const fullUrl = `https://www.facebook.com${videoUrl}`
          return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fullUrl)}&show_text=false&width=254&height=240&appId=`
        }
        
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=254&height=240&appId=`
      }
      
      // 初回試行時のデフォルト優先順位（videoIdがある場合はそちらを優先）
      if (!embedError) {
        // videoIdがある場合は常にそれを優先（fb.me問題を回避）
        if (videoId || extractedVideoId) {
          const id = videoId || extractedVideoId
          const videoPageUrl = `https://www.facebook.com/facebook/videos/${id}/`
          console.log('🎬 Prioritizing video ID for embed:', id)
          return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoPageUrl)}&show_text=false&width=254&height=240`
        }
        
        if (previewShareableLink && !previewShareableLink.includes('fb.me')) {
          console.log('🎬 Default: Using preview_shareable_link')
          
          if (previewShareableLink.includes('facebook.com/plugins/')) {
            return previewShareableLink
          }
          
          if (previewShareableLink.startsWith('/')) {
            return `https://www.facebook.com${previewShareableLink}`
          }
          
          const encodedUrl = encodeURIComponent(previewShareableLink)
          return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=254&height=240&appId=`
        }
        
        if (videoUrl) {
          console.log('🎬 Default: Using video URL')
          
          if (videoUrl.startsWith('/')) {
            const fullUrl = `https://www.facebook.com${videoUrl}`
            return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fullUrl)}&show_text=false&width=254&height=240&appId=`
          }
          
          return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=254&height=240&appId=`
        }
      }
    } catch (error) {
      console.error('❌ Error generating embed URL:', error)
    }
    
    return null
  }, [embedMethod, previewShareableLink, videoId, extractedVideoId, videoUrl, embedError])

  // videoUrlが無い場合、videoIdから生成（レガシー用）
  const effectiveVideoUrl = useMemo(() => {
    if (videoUrl) return videoUrl
    if (videoId) {
      return `https://www.facebook.com/facebook/videos/${videoId}/`
    }
    if (extractedVideoId) {
      return `https://www.facebook.com/facebook/videos/${extractedVideoId}/`
    }
    return null
  }, [videoUrl, videoId, extractedVideoId])

  // エラーハンドリング
  const handleEmbedError = useCallback(() => {
    console.error('❌ Current embed method failed:', embedMethod)
    
    // フォールバック戦略
    switch(embedMethod) {
      case 'preview_link':
        setEmbedMethod('video_id')
        setEmbedError(false)
        break
      case 'video_id':
        setEmbedMethod('video_url')
        setEmbedError(false)
        break
      case 'video_url':
        setEmbedMethod('external')
        setEmbedError(false)
        break
      default:
        setEmbedError(true)
    }
  }, [embedMethod])

  // 動画再生ハンドラー（外部リンク用）
  const handlePlayClick = () => {
    console.log('🎬 Play button clicked (external):', {
      videoUrl,
      videoId: videoId || extractedVideoId,
      previewShareableLink
    })

    // preview_shareable_linkを優先
    if (previewShareableLink && !previewShareableLink.includes('/plugins/')) {
      window.open(previewShareableLink, '_blank', 'noopener,noreferrer')
    } else if (videoId || extractedVideoId) {
      const fbVideoId = videoId || extractedVideoId
      const facebookVideoUrl = `https://www.facebook.com/watch/?v=${fbVideoId}`
      window.open(facebookVideoUrl, '_blank', 'noopener,noreferrer')
    } else if (videoUrl) {
      const finalUrl = videoUrl.startsWith('/') ? `https://www.facebook.com${videoUrl}` : videoUrl
      window.open(finalUrl, '_blank', 'noopener,noreferrer')
    } else {
      console.warn('⚠️ 動画URL/IDが見つかりません')
    }
  }

  // デバッグログ: 動画検出情報
  useEffect(() => {
    const embedUrl = getVideoEmbedUrl()
    console.log('🎬 Video Embed Debug:', {
      mediaType,
      objectType,
      previewShareableLink,
      videoUrl,
      videoId,
      thumbnailUrl,
      imageUrl,
      isVideo,
      displayImage,
      extractedVideoId,
      embedMethod,
      embedUrl,
      embedError,
      isIframeLoaded,
      willUseVideoPlayer: isVideo && embedUrl,
      hasVideoData: !!(videoUrl || videoId || extractedVideoId || previewShareableLink),
      creativeName: creativeName || 'Ad Creative',
    })
  }, [mediaType, objectType, previewShareableLink, videoUrl, videoId, thumbnailUrl, imageUrl, isVideo, displayImage, extractedVideoId, embedMethod, embedError, isIframeLoaded, creativeName, getVideoEmbedUrl])

  return (
    <div className="w-full">
      {/* スマートフォンフレーム（簡略版） - 中央配置 */}
      <div className="flex justify-center">
        <div
          className="relative bg-gray-900 rounded-[2rem] p-3 shadow-xl"
          style={{ width: '280px' }}
        >
          {/* スクリーン */}
          <div className="bg-white rounded-[1.5rem] overflow-hidden">
            {/* ステータスバー */}
            <div className="bg-white h-6 flex items-center justify-between px-6 text-xs">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 border border-gray-900 rounded-sm">
                  <div className="w-2 h-2 bg-gray-900 rounded-sm m-0.5"></div>
                </div>
              </div>
            </div>

            {/* コンテンツエリア */}
            <div className="bg-gray-100" style={{ height: '400px' }}>
              {/* Facebook/Instagramヘッダー */}
              <div className="bg-white border-b px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">facebook</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* 広告コンテンツ */}
              <div className="bg-white mt-2">
                {/* 広告主情報 */}
                <div className="flex items-center p-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                  <div>
                    <div className="font-semibold text-sm">広告主名</div>
                    <div className="text-xs text-gray-500">広告</div>
                  </div>
                </div>

                {/* メディアコンテンツ */}
                <div className="relative" style={{ height: '254px' }}>
                  {isVideo && getVideoEmbedUrl() && embedMethod !== 'external' ? (
                    <div className="relative w-full h-full bg-black">
                      <iframe
                        src={getVideoEmbedUrl()}
                        width="254"
                        height="240"
                        style={{ 
                          border: 'none', 
                          overflow: 'hidden',
                          display: 'block',
                          margin: '0 auto'
                        }}
                        scrolling="no"
                        frameBorder="0"
                        allowFullScreen={true}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                        title="動画広告"
                        onError={(e) => {
                          console.error('❌ iframe error:', e)
                          handleEmbedError()
                        }}
                        onLoad={() => {
                          setIsIframeLoaded(true)
                          console.log('✅ Video iframe loaded successfully with method:', embedMethod)
                        }}
                      />
                      {!isIframeLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                          <div className="text-white text-sm">読み込み中...</div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded pointer-events-none z-10">
                        <span className="text-white text-xs">動画広告</span>
                      </div>
                    </div>
                  ) : isVideo && embedMethod === 'external' ? (
                    // 外部リンクフォールバック
                    <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center">
                      <img
                        src={displayImage}
                        alt="Video thumbnail"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                      />
                      <button
                        onClick={handlePlayClick}
                        className="relative z-10 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <PlayIcon className="w-5 h-5" />
                        <span>Facebookで視聴</span>
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded z-10">
                        <span className="text-white text-xs">動画広告（外部再生）</span>
                      </div>
                    </div>
                  ) : (
                    // 画像広告の表示
                    <div className="relative w-full h-full">
                      <img
                        src={displayImage}
                        alt={creativeName || 'Ad creative'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn('⚠️ Image load error, using placeholder')
                          e.currentTarget.src = placeholderImage
                        }}
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                        <span className="text-white text-xs">画像広告</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* クリエイティブ情報 - モックアップの下に配置 */}
      {(creativeId || creativeNameFull) && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 w-full">
          <div className="space-y-2">
            {creativeId && (
              <div className="flex items-start">
                <span className="text-xs font-medium text-gray-500 w-16">ID:</span>
                <span className="text-xs text-gray-700 font-mono">{creativeId}</span>
              </div>
            )}
            {creativeNameFull && (
              <div className="flex items-start">
                <span className="text-xs font-medium text-gray-500 w-16">Name:</span>
                <span className="text-xs text-gray-700 break-all">{creativeNameFull}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
