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
          {/* ノッチ */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl"></div>

          {/* スクリーン */}
          <div
            className="relative bg-white rounded-[1.5rem] overflow-hidden"
            style={{ width: '254px', height: '520px' }}
          >
            {/* コンテンツエリア */}
            <div className="h-full bg-gray-50">
              {/* メディア表示 - 高さを縮小してテキストエリアを確保 */}
              <div className="relative bg-black" style={{ height: '240px' }}>
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

                {/* 広告テキストエリア - スクロール可能に */}
                <div className="bg-white p-4 overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {title && <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>}
                  {body && <p className="text-xs text-gray-600 whitespace-pre-wrap">{body}</p>}
                  {(title || body) && instagramPermalinkUrl && (
                    <a
                      href={instagramPermalinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
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
                        // preview_shareable_linkがある場合は優先的に使用（fb.me以外）
                        if (previewShareableLink && !previewShareableLink.includes('fb.me')) {
                          console.log('🔗 Using preview_shareable_link:', previewShareableLink)
                          return previewShareableLink
                        }

                        // Facebook Ads ManagerのURL形式（フォールバック）
                        if (accountId) {
                          // アカウントIDからact_プレフィックスと数字を抽出
                          const accountIdMatch = accountId.match(/(\d+)/)
                          if (accountIdMatch) {
                            const numericAccountId = accountIdMatch[1]
                            // Facebook Ads Managerの広告詳細ページURL
                            return `https://business.facebook.com/adsmanager/manage/ads?act=${numericAccountId}&selected_ad_ids=${adId}`
                          }
                        }
                        // フォールバック: 広告プレビューページ
                        return `https://www.facebook.com/ads/manager/`
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
                          previewShareableLink,
                          url: e.currentTarget.href,
                        })
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
