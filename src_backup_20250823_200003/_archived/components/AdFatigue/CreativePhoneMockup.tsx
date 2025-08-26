/**
 * スマートフォンモックアップコンポーネント
 * 広告クリエイティブをモバイルデバイスでプレビュー
 */

import React, { useState } from 'react'
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid'

interface CreativePhoneMockupProps {
  creative: {
    type: 'image' | 'video' | 'carousel'
    imageUrl?: string
    videoUrl?: string
    thumbnailUrl?: string
    title?: string
    body?: string
    callToAction?: string
  }
  fatigueScore?: number
  className?: string
}

export const CreativePhoneMockup: React.FC<CreativePhoneMockupProps> = ({
  creative,
  fatigueScore = 0,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const getFatigueIndicatorColor = () => {
    if (fatigueScore >= 80) return 'bg-red-500'
    if (fatigueScore >= 60) return 'bg-orange-500'
    if (fatigueScore >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* スマートフォンフレーム */}
      <div className="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl">
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl"></div>
        
        {/* スクリーン */}
        <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ width: '375px', height: '812px' }}>
          {/* ステータスバー */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-white z-10 flex items-center justify-between px-8 pt-2">
            <span className="text-xs font-semibold">9:41</span>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
              <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
              <div className="w-6 h-3 bg-gray-800 rounded-sm"></div>
            </div>
          </div>

          {/* アプリヘッダー */}
          <div className="absolute top-12 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              <div>
                <div className="text-sm font-semibold">広告主名</div>
                <div className="text-xs text-gray-500">スポンサー</div>
              </div>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="pt-26 h-full bg-gray-50">
            {/* クリエイティブ表示 */}
            <div className="relative bg-black" style={{ height: '375px', marginTop: '66px' }}>
              {creative.type === 'video' ? (
                <div className="relative w-full h-full">
                  {creative.thumbnailUrl && (
                    <img 
                      src={creative.thumbnailUrl} 
                      alt="Video thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* 動画コントロール */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all"
                    >
                      {isPlaying ? (
                        <PauseIcon className="h-8 w-8 text-gray-900" />
                      ) : (
                        <PlayIcon className="h-8 w-8 text-gray-900 ml-1" />
                      )}
                    </button>
                  </div>
                  {/* 音声コントロール */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100"
                  >
                    {isMuted ? (
                      <SpeakerXMarkIcon className="h-5 w-5 text-gray-900" />
                    ) : (
                      <SpeakerWaveIcon className="h-5 w-5 text-gray-900" />
                    )}
                  </button>
                </div>
              ) : creative.type === 'image' ? (
                <img 
                  src={creative.imageUrl || '/api/placeholder/375/375'} 
                  alt="Ad creative" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">カルーセル広告</span>
                </div>
              )}
            </div>

            {/* 広告テキスト */}
            <div className="bg-white p-4">
              {creative.title && (
                <h3 className="font-semibold text-gray-900 mb-2">{creative.title}</h3>
              )}
              {creative.body && (
                <p className="text-sm text-gray-700 mb-3">{creative.body}</p>
              )}
              {creative.callToAction && (
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  {creative.callToAction}
                </button>
              )}
            </div>

            {/* エンゲージメントバー */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button className="flex items-center space-x-1 text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm">いいね</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm">コメント</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.316C18.114 15.562 18 16.018 18 16.5c0 .482.114.938.316 1.342m0-2.684a3 3 0 100 2.684M12 9a3 3 0 110-6 3 3 0 010 6zm0 12a3 3 0 110-6 3 3 0 010 6z" />
                  </svg>
                  <span className="text-sm">シェア</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 疲労度インジケーター */}
        {fatigueScore > 0 && (
          <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center z-20">
            <div className={`w-14 h-14 rounded-full ${getFatigueIndicatorColor()} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">{fatigueScore}</span>
            </div>
          </div>
        )}
      </div>

      {/* 疲労度レベル表示 */}
      {fatigueScore > 0 && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600">疲労度スコア</div>
          <div className={`text-lg font-semibold ${
            fatigueScore >= 80 ? 'text-red-600' :
            fatigueScore >= 60 ? 'text-orange-600' :
            fatigueScore >= 40 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {fatigueScore >= 80 ? '危険' :
             fatigueScore >= 60 ? '警告' :
             fatigueScore >= 40 ? '注意' :
             '健全'}
          </div>
        </div>
      )}
    </div>
  )
}