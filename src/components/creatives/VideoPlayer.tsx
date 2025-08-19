import React, { useState, useEffect } from 'react'
import { PlayIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface VideoPlayerProps {
  videoUrl?: string | null
  thumbnailUrl?: string
  videoId?: string
  creativeName: string
  onClose?: () => void
  mobileOptimized?: boolean
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  videoId,
  creativeName,
  onClose,
  mobileOptimized = false
}) => {
  const [error, setError] = useState(false)
  const [useIframe, setUseIframe] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset error state when video URL changes
    setError(false)
    setIsLoading(true)
    
    // Facebook動画の場合、最初からiframeを使用
    if (videoUrl && (videoUrl.includes('facebook.com') || videoUrl.includes('/videos/'))) {
      setUseIframe(true)
    } else {
      setUseIframe(false)
    }
  }, [videoUrl, videoId])

  // Facebook SDK を初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.FB) {
      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0'
      document.body.appendChild(script)
    }
  }, [])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget
    console.error('Video playback error:', {
      videoUrl,
      videoId,
      error: e,
      videoElement: {
        src: videoElement.src,
        error: videoElement.error,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState
      }
    })
    setError(true)
    
    // Try iframe as fallback if we have a video ID or Facebook URL
    if (videoId || (videoUrl && (videoUrl.includes('facebook.com') || videoUrl.includes('/videos/')))) {
      console.log('Trying iframe fallback')
      setUseIframe(true)
    }
  }

  // 動画IDを抽出（相対URLからも抽出）
  const extractVideoId = () => {
    if (videoId) return videoId
    
    if (videoUrl) {
      // URLからvideo IDを抽出するパターン
      const patterns = [
        /\/videos\/(\d+)/,
        /v=(\d+)/,
        /video\.php\?v=(\d+)/,
        /watch\/\?v=(\d+)/,
        /\/(\d+)\/videos\/(\d+)/, // /page_id/videos/video_id パターン
      ]
      
      for (const pattern of patterns) {
        const match = videoUrl.match(pattern)
        if (match) {
          // /page_id/videos/video_id パターンの場合、2番目のグループを返す
          const vidId = match[2] || match[1]
          console.log('Extracted video ID from URL pattern:', vidId)
          return vidId
        }
      }
    }
    
    return null
  }
  
  const extractedVideoId = extractVideoId()
  
  // Facebook動画の埋め込みURLを生成
  const getFacebookEmbedUrl = () => {
    const vidId = extractedVideoId
    
    // モバイル最適化時のパラメーター
    const width = mobileOptimized ? 280 : 560
    const height = mobileOptimized ? 500 : 314
    
    if (vidId) {
      // video IDがある場合、直接埋め込みURLを生成
      const embedUrl = `https://www.facebook.com/plugins/video.php?height=${height}&href=${encodeURIComponent(`https://www.facebook.com/facebook/videos/${vidId}/`)}&show_text=false&width=${width}&t=0`
      console.log('Generated Facebook embed URL:', embedUrl)
      return embedUrl
    } else if (videoUrl) {
      // 完全なURLがある場合
      let fullUrl = videoUrl
      
      // 相対URLを絶対URLに変換
      if (!videoUrl.startsWith('http')) {
        if (videoUrl.includes('/videos/')) {
          // Facebook動画の相対パス
          fullUrl = `https://www.facebook.com${videoUrl.startsWith('/') ? videoUrl : '/' + videoUrl}`
        }
      }
      
      const embedUrl = `https://www.facebook.com/plugins/video.php?height=${height}&href=${encodeURIComponent(fullUrl)}&show_text=false&width=${width}&t=0`
      console.log('Generated Facebook embed URL from full URL:', embedUrl)
      return embedUrl
    }
    
    return null
  }
  
  const facebookEmbedUrl = getFacebookEmbedUrl()
  
  // プロキシ経由で動画を取得（CORSを回避）
  const getProxiedVideoUrl = () => {
    if (!videoUrl || useIframe) return null
    
    // 相対URLを処理
    if (videoUrl.startsWith('/')) {
      // Facebook APIの相対URLの場合、プロキシエンドポイントを使用
      return `/api/proxy/video?url=${encodeURIComponent(videoUrl)}`
    }
    
    // HTTPSのURLでFacebook以外の場合はそのまま返す
    if (videoUrl.startsWith('https://') && !videoUrl.includes('facebook.com')) {
      return videoUrl
    }
    
    // Facebookの動画URLの場合はiframeを使用
    return null
  }
  
  const proxiedVideoUrl = getProxiedVideoUrl()

  console.log('VideoPlayer Debug:', {
    originalUrl: videoUrl,
    videoId: videoId,
    extractedVideoId: extractedVideoId,
    useIframe: useIframe,
    embedUrl: facebookEmbedUrl,
    proxiedUrl: proxiedVideoUrl
  })

  // iframeを使用する場合（Facebook動画）
  if (useIframe && facebookEmbedUrl) {
    return (
      <div className={`relative bg-black ${mobileOptimized ? 'w-full h-full' : 'w-full h-full'}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white">読み込み中...</div>
          </div>
        )}
        {mobileOptimized ? (
          // モバイル最適化時は縦型フォーマットに対応
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              src={facebookEmbedUrl}
              className="w-full h-full"
              style={{ 
                border: 'none', 
                overflow: 'hidden',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              scrolling="no"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ) : (
          <iframe
            src={facebookEmbedUrl}
            className="w-full h-full"
            style={{ border: 'none', overflow: 'hidden', minHeight: '400px' }}
            scrolling="no"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            onLoad={() => setIsLoading(false)}
          />
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 z-10"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>
    )
  }

  // 通常の動画プレーヤー（非Facebook動画）
  if (proxiedVideoUrl && !error) {
    return (
      <div className={`relative bg-black ${mobileOptimized ? 'w-full h-full' : 'w-full h-full'}`}>
        <video
          src={proxiedVideoUrl}
          className={`w-full h-full ${mobileOptimized ? 'object-cover' : 'object-contain'}`}
          controls
          autoPlay
          muted
          playsInline
          onError={handleVideoError}
          onLoadStart={() => console.log('Video load started:', proxiedVideoUrl)}
          onLoadedData={() => console.log('Video loaded:', proxiedVideoUrl)}
          onCanPlay={() => console.log('Video can play:', proxiedVideoUrl)}
        />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>
    )
  }

  // エラー時またはフォールバック
  return (
    <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center p-8">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={creativeName || 'Video thumbnail'}
          className="max-w-full max-h-[60vh] object-contain mb-4"
        />
      )}
      <div className="text-center">
        <PlayIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-white mb-2">動画を再生できません</p>
        {extractedVideoId && (
          <a
            href={`https://www.facebook.com/watch/?v=${extractedVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Facebookで視聴
          </a>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}