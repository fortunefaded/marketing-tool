import { useMemo, useCallback, useEffect } from 'react'
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
  // プレースホルダー画像
  const placeholderImage =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzc1IiBoZWlnaHQ9IjM3NSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE4Ny41IiB5PSIxODcuNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='

  // 動画判定ロジック
  const isVideo = useMemo(() => {
    // object_typeがVIDEOの場合
    if (mediaType === 'VIDEO' || objectType === 'VIDEO') return true

    // STATUSでも動画URLや動画IDがあれば動画として扱う
    if ((mediaType === 'STATUS' || objectType === 'STATUS') && (videoUrl || videoId)) return true

    // 動画URLまたは動画IDが存在する場合
    if (videoUrl || videoId || previewShareableLink?.includes('video')) return true

    // サムネイルURLにvideo関連の文字列が含まれる場合
    if (thumbnailUrl && thumbnailUrl.includes('/v/t15.')) return true

    return false
  }, [mediaType, objectType, videoUrl, videoId, thumbnailUrl, previewShareableLink])

  // 表示する画像
  const displayImage = thumbnailUrl || imageUrl || placeholderImage

  // 動画プレビューを開くハンドラー
  const handleVideoClick = useCallback(() => {
    console.log('🎬 Opening video preview:', {
      previewShareableLink,
      videoId,
      videoUrl,
    })

    // Facebook広告プレビューリンクを優先（最も確実）
    if (previewShareableLink) {
      console.log('✅ Opening Facebook Ads preview:', previewShareableLink)
      window.open(previewShareableLink, '_blank', 'noopener,noreferrer')
    } else if (videoId) {
      // 通常のFacebook動画ページを試す
      const watchUrl = `https://www.facebook.com/watch/?v=${videoId}`
      console.log('📺 Trying regular video page:', watchUrl)
      window.open(watchUrl, '_blank', 'noopener,noreferrer')
    } else if (videoUrl) {
      const finalUrl = videoUrl.startsWith('/') ? `https://www.facebook.com${videoUrl}` : videoUrl
      console.log('📺 Opening video URL:', finalUrl)
      window.open(finalUrl, '_blank', 'noopener,noreferrer')
    } else {
      console.warn('⚠️ No preview URL available')
      alert('プレビューを開けませんでした')
    }
  }, [previewShareableLink, videoId, videoUrl])

  // デバッグ情報
  useEffect(() => {
    if (isVideo) {
      console.log('📱 SimplePhoneMockup - Ad Preview Debug:', {
        creativeName,
        mediaType,
        objectType,
        previewShareableLink,
        isBusinessManagerPreview: previewShareableLink?.includes('business.facebook.com'),
        isFbMeLink: previewShareableLink?.includes('fb.me'),
        videoId,
        thumbnailUrl,
        displayImage,
      })
    }
  }, [
    creativeName,
    mediaType,
    objectType,
    previewShareableLink,
    videoId,
    thumbnailUrl,
    displayImage,
    isVideo,
  ])

  return (
    <div className="w-full">
      {/* スマートフォンフレーム（簡略版） - 中央配置 */}
      <div className="flex justify-center">
        <div
          className="relative bg-gray-900 rounded-[2rem] p-4 shadow-xl"
          style={{ width: '350px' }}
        >
          {/* スクリーン */}
          <div className="bg-white rounded-[1.5rem] overflow-hidden">
            {/* コンテンツエリア */}
            <div className="bg-white" style={{ height: '600px' }}>
              {/* 広告コンテンツ */}
              <div className="bg-white h-full flex flex-col">
                {/* メディアコンテンツ */}
                <div className="relative" style={{ height: '350px' }}>
                  {isVideo ? (
                    // 動画広告：サムネイル＋再生ボタン（Facebook広告は埋め込み不可）
                    <div className="relative w-full h-full bg-black group">
                      {/* サムネイル画像 */}
                      <img
                        src={displayImage}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn('⚠️ Thumbnail load error, using placeholder')
                          e.currentTarget.src = placeholderImage
                        }}
                      />

                      {/* 再生ボタンオーバーレイ */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black bg-opacity-30 hover:bg-opacity-50 transition-all"
                        onClick={handleVideoClick}
                      >
                        {/* 再生ボタン */}
                        <div className="bg-white rounded-full p-4 shadow-lg transform group-hover:scale-110 transition-transform">
                          <PlayIcon className="w-8 h-8 text-gray-900" />
                        </div>
                        {/* テキスト */}
                        <div className="mt-3 bg-black bg-opacity-60 px-3 py-1 rounded">
                          <span className="text-white text-xs">タップしてFacebookで視聴</span>
                        </div>
                      </div>

                      {/* ラベル */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded pointer-events-none">
                        <span className="text-white text-xs">動画広告</span>
                      </div>

                      {/* Facebook広告であることを示すインジケーター */}
                      {previewShareableLink?.includes('fb.me') && (
                        <div className="absolute top-2 right-2 bg-blue-600 px-2 py-1 rounded pointer-events-none">
                          <span className="text-white text-xs">FB Ad</span>
                        </div>
                      )}
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
                      {/* 画像広告ラベル */}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded">
                        <span className="text-white text-xs">画像広告</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 広告テキスト（タイトル・本文がある場合） */}
                {(title || body) && (
                  <div className="p-3 border-t flex-1 overflow-y-auto">
                    {title && <div className="font-semibold text-sm mb-2">{title}</div>}
                    {body && (
                      <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {body}
                      </div>
                    )}
                  </div>
                )}

                {/* Instagramで確認ボタン */}
                {(title || body) && instagramPermalinkUrl && (
                  <div className="px-3 pb-3">
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
