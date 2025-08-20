import React from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'
import { CreativeData } from './CreativePerformanceGrid'

interface CreativeDetailModalProps {
  creative: CreativeData | null
  isOpen: boolean
  onClose: () => void
}

export const CreativeDetailModal: React.FC<CreativeDetailModalProps> = ({
  creative,
  isOpen,
  onClose,
}) => {
  if (!creative) return null

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(2)}%`
  }

  const metrics = [
    {
      icon: EyeIcon,
      label: 'インプレッション',
      value: formatNumber(creative.metrics.impressions),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: CursorArrowRaysIcon,
      label: 'クリック数',
      value: formatNumber(creative.metrics.clicks),
      subValue: `CTR: ${formatPercentage(creative.metrics.ctr)}`,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      icon: ShoppingCartIcon,
      label: 'コンバージョン',
      value: formatNumber(creative.metrics.conversions),
      subValue: `CPA: ${formatCurrency(creative.metrics.cpa)}`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: CurrencyDollarIcon,
      label: '広告費用',
      value: formatCurrency(creative.metrics.spend),
      subValue: `CPC: ${formatCurrency(creative.metrics.cpc)}`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: ChartBarIcon,
      label: '売上',
      value: formatCurrency(creative.metrics.revenue),
      subValue: `ROAS: ${creative.metrics.roas.toFixed(2)}x`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                {/* Header */}
                <div className="bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      クリエイティブ詳細
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="sr-only">閉じる</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Creative Preview */}
                    <div>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        {creative.type === 'VIDEO' && creative.videoUrl ? (
                          <video
                            src={creative.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : creative.type === 'CAROUSEL' &&
                          creative.carouselCards &&
                          creative.carouselCards.length > 0 ? (
                          <div className="flex overflow-x-auto gap-2 p-4 h-full">
                            {creative.carouselCards.map((card, index) => (
                              <div
                                key={index}
                                className="flex-shrink-0 w-48 bg-white rounded-lg shadow-sm"
                              >
                                {card.image_url && (
                                  <img
                                    src={card.image_url}
                                    alt={card.name}
                                    className="w-full h-32 object-cover rounded-t-lg"
                                  />
                                )}
                                <div className="p-2">
                                  <h5 className="text-xs font-medium text-gray-900 truncate">
                                    {card.name}
                                  </h5>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {card.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : creative.thumbnailUrl ? (
                          <img
                            src={creative.thumbnailUrl}
                            alt={creative.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-gray-400">プレビューなし</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <h4 className="text-lg font-medium text-gray-900">{creative.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          キャンペーン: {creative.campaignName}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              creative.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {creative.status === 'ACTIVE' ? 'アクティブ' : '一時停止'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {creative.type === 'IMAGE'
                              ? '画像'
                              : creative.type === 'VIDEO'
                                ? '動画'
                                : 'カルーセル'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">パフォーマンス指標</h4>
                      <div className="space-y-3">
                        {metrics.map((metric) => (
                          <div
                            key={metric.label}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start">
                              <div className={`rounded-lg p-2 ${metric.bgColor}`}>
                                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-sm text-gray-500">{metric.label}</p>
                                <p className="text-xl font-semibold text-gray-900 mt-1">
                                  {metric.value}
                                </p>
                                {metric.subValue && (
                                  <p className="text-sm text-gray-600 mt-1">{metric.subValue}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="mt-6 bg-indigo-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-indigo-900 mb-2">
                      パフォーマンスサマリー
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-indigo-600">エンゲージメント率:</span>
                        <span className="ml-2 font-medium text-indigo-900">
                          {((creative.metrics.clicks / creative.metrics.impressions) * 100).toFixed(
                            2
                          )}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="text-indigo-600">コンバージョン率:</span>
                        <span className="ml-2 font-medium text-indigo-900">
                          {((creative.metrics.conversions / creative.metrics.clicks) * 100).toFixed(
                            2
                          )}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="text-indigo-600">平均注文額:</span>
                        <span className="ml-2 font-medium text-indigo-900">
                          {formatCurrency(creative.metrics.revenue / creative.metrics.conversions)}
                        </span>
                      </div>
                      <div>
                        <span className="text-indigo-600">利益率:</span>
                        <span className="ml-2 font-medium text-indigo-900">
                          {(
                            ((creative.metrics.revenue - creative.metrics.spend) /
                              creative.metrics.revenue) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
