/**
 * ActionMetricsExtractor.tsx
 * Meta Ads APIのactions配列を分析し、購入ファネル、エンゲージメント、トラフィックに分類して表示
 */

import React from 'react'
import {
  TrendingUp,
  ShoppingCart,
  Users,
  MousePointer,
  Video,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

// アクションの型定義
interface Action {
  action_type: string
  value: string | number
}

interface CostPerAction {
  action_type: string
  value: string | number
}

// カテゴリごとのアクション定義
const ACTION_CATEGORIES = {
  // 購入ファネル
  purchase_funnel: {
    label: '購入ファネル',
    icon: ShoppingCart,
    color: 'green',
    actions: [
      'purchase',
      'omni_purchase',
      'add_to_cart',
      'omni_add_to_cart',
      'initiate_checkout',
      'omni_initiated_checkout',
      'add_payment_info',
      'add_to_wishlist',
      'complete_registration',
      'lead',
    ],
    labels: {
      purchase: '購入',
      omni_purchase: 'オムニチャネル購入',
      add_to_cart: 'カート追加',
      omni_add_to_cart: 'オムニカート追加',
      initiate_checkout: 'チェックアウト開始',
      omni_initiated_checkout: 'オムニチェックアウト開始',
      add_payment_info: '支払い情報追加',
      add_to_wishlist: 'ウィッシュリスト追加',
      complete_registration: '登録完了',
      lead: 'リード獲得',
    },
  },

  // エンゲージメント
  engagement: {
    label: 'エンゲージメント',
    icon: Users,
    color: 'blue',
    actions: [
      'post_engagement',
      'page_engagement',
      'like',
      'comment',
      'post_reaction',
      'onsite_conversion.post_save',
      'onsite_conversion.messaging_conversation_started_7d',
      'link_click',
      'landing_page_view',
    ],
    labels: {
      post_engagement: '投稿エンゲージメント',
      page_engagement: 'ページエンゲージメント',
      like: 'いいね',
      comment: 'コメント',
      post_reaction: 'リアクション',
      'onsite_conversion.post_save': '投稿保存',
      'onsite_conversion.messaging_conversation_started_7d': 'メッセージ開始',
      link_click: 'リンククリック',
      landing_page_view: 'ランディングページ表示',
    },
  },

  // トラフィック
  traffic: {
    label: 'トラフィック',
    icon: MousePointer,
    color: 'purple',
    actions: [
      'view_content',
      'search',
      'page_view',
      'omni_view_content',
      'omni_search',
      'outbound_click',
    ],
    labels: {
      view_content: 'コンテンツ表示',
      search: '検索',
      page_view: 'ページビュー',
      omni_view_content: 'オムニコンテンツ表示',
      omni_search: 'オムニ検索',
      outbound_click: '外部クリック',
    },
  },

  // 動画
  video: {
    label: '動画',
    icon: Video,
    color: 'red',
    actions: ['video_view', 'omni_complete_registration'],
    labels: {
      video_view: '動画視聴',
      omni_complete_registration: 'オムニ登録完了',
    },
  },

  // アプリ
  app: {
    label: 'アプリ',
    icon: ExternalLink,
    color: 'indigo',
    actions: [
      'app_install',
      'omni_app_install',
      'app_custom_event',
      'omni_custom',
      'mobile_app_install',
    ],
    labels: {
      app_install: 'アプリインストール',
      omni_app_install: 'オムニアプリインストール',
      app_custom_event: 'アプリカスタムイベント',
      omni_custom: 'オムニカスタム',
      mobile_app_install: 'モバイルアプリインストール',
    },
  },
}

/**
 * actions配列を分析してカテゴリ別に分類
 */
export function extractActionMetrics(
  actions: Action[] | undefined,
  costPerAction: CostPerAction[] | undefined
): {
  categorized: Record<string, any>
  summary: {
    totalActions: number
    totalCost: number
    topActions: Array<{ type: string; value: number; cost: number }>
    conversionFunnel?: {
      views: number
      addToCart: number
      checkout: number
      purchase: number
    }
  }
} {
  if (!actions || actions.length === 0) {
    return {
      categorized: {},
      summary: {
        totalActions: 0,
        totalCost: 0,
        topActions: [],
      },
    }
  }

  // コストマップを作成
  const costMap: Record<string, number> = {}
  if (costPerAction) {
    costPerAction.forEach((item) => {
      const value = parseFloat(String(item.value))
      costMap[item.action_type] = isNaN(value) ? 0 : value
    })
  }

  // カテゴリ別に分類
  const categorized: Record<string, any> = {}
  let totalActions = 0
  let totalCost = 0

  // 各アクションをカテゴリに分類
  actions.forEach((action) => {
    const actionValue = parseInt(String(action.value))
    const validActionValue = isNaN(actionValue) ? 0 : actionValue
    totalActions += validActionValue

    // どのカテゴリに属するか確認
    for (const [categoryKey, category] of Object.entries(ACTION_CATEGORIES)) {
      if (category.actions.includes(action.action_type)) {
        if (!categorized[categoryKey]) {
          categorized[categoryKey] = {
            label: category.label,
            icon: category.icon,
            color: category.color,
            actions: [],
            totalValue: 0,
            totalCost: 0,
          }
        }

        const actionCost = costMap[action.action_type] || 0
        const totalActionCost = actionCost * validActionValue

        categorized[categoryKey].actions.push({
          type: action.action_type,
          label: category.labels[action.action_type] || action.action_type,
          value: validActionValue,
          costPerAction: actionCost,
          totalCost: totalActionCost,
        })

        categorized[categoryKey].totalValue += validActionValue
        categorized[categoryKey].totalCost += totalActionCost
        totalCost += totalActionCost
      }
    }
  })

  // トップアクションを計算
  const allActions = actions.map((action) => {
    const value = parseInt(String(action.value))
    return {
      type: action.action_type,
      value: isNaN(value) ? 0 : value,
      cost: costMap[action.action_type] || 0,
    }
  })
  const topActions = allActions.sort((a, b) => b.value - a.value).slice(0, 5)

  // コンバージョンファネルを計算
  const conversionFunnel = {
    views: 0,
    addToCart: 0,
    checkout: 0,
    purchase: 0,
  }

  actions.forEach((action) => {
    const value = parseInt(String(action.value))
    const validValue = isNaN(value) ? 0 : value
    if (action.action_type === 'view_content' || action.action_type === 'omni_view_content') {
      conversionFunnel.views += validValue
    } else if (action.action_type === 'add_to_cart' || action.action_type === 'omni_add_to_cart') {
      conversionFunnel.addToCart += validValue
    } else if (
      action.action_type === 'initiate_checkout' ||
      action.action_type === 'omni_initiated_checkout'
    ) {
      conversionFunnel.checkout += validValue
    } else if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
      conversionFunnel.purchase += validValue
    }
  })

  return {
    categorized,
    summary: {
      totalActions,
      totalCost,
      topActions,
      conversionFunnel: conversionFunnel.views > 0 ? conversionFunnel : undefined,
    },
  }
}

/**
 * アクションメトリクスの表示コンポーネント
 */
export function ActionMetricsDisplay({
  actions,
  costPerAction,
}: {
  actions: Action[] | undefined
  costPerAction?: CostPerAction[] | undefined
}) {
  const metrics = extractActionMetrics(actions, costPerAction)

  if (!actions || actions.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded-lg">
        アクションデータがありません
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          アクション分析
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded shadow-sm">
            <p className="text-xs text-gray-600">総アクション数</p>
            <p className="text-xl font-bold text-gray-900">
              {(metrics.summary.totalActions || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <p className="text-xs text-gray-600">総コスト</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics.summary.totalCost || 0)}
            </p>
          </div>
          {metrics.summary.totalActions > 0 && (
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-gray-600">平均CPA</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(
                  (metrics.summary.totalCost || 0) / (metrics.summary.totalActions || 1)
                )}
              </p>
            </div>
          )}
          {metrics.summary.conversionFunnel && (
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-gray-600">購入率</p>
              <p className="text-xl font-bold text-green-600">
                {(
                  ((metrics.summary.conversionFunnel.purchase || 0) /
                    (metrics.summary.conversionFunnel.views || 1)) *
                  100
                ).toFixed(2)}
                %
              </p>
            </div>
          )}
        </div>
      </div>

      {/* コンバージョンファネル */}
      {metrics.summary.conversionFunnel && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">コンバージョンファネル</h4>
          <div className="space-y-2">
            {[
              {
                label: 'ビュー',
                value: metrics.summary.conversionFunnel.views,
                color: 'bg-blue-500',
              },
              {
                label: 'カート追加',
                value: metrics.summary.conversionFunnel.addToCart,
                color: 'bg-yellow-500',
              },
              {
                label: 'チェックアウト',
                value: metrics.summary.conversionFunnel.checkout,
                color: 'bg-orange-500',
              },
              {
                label: '購入',
                value: metrics.summary.conversionFunnel.purchase,
                color: 'bg-green-500',
              },
            ].map((step, index) => {
              const percentage =
                metrics.summary.conversionFunnel!.views > 0
                  ? (step.value / metrics.summary.conversionFunnel!.views) * 100
                  : 0
              return (
                <div key={step.label} className="flex items-center">
                  <div className="w-24 text-sm text-gray-600">{step.label}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`${step.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                      {step.value || 0} ({(percentage || 0).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* カテゴリ別アクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(metrics.categorized).map(([key, category]) => {
          const Icon = category.icon
          return (
            <div key={key} className={`rounded-lg border p-4 ${getColorClass(category.color)}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center">
                  <Icon className="w-4 h-4 mr-2" />
                  {category.label}
                </h4>
                <span className="text-sm font-bold">{category.totalValue.toLocaleString()}件</span>
              </div>
              <div className="space-y-2">
                {category.actions.slice(0, 3).map((action: any) => (
                  <div key={action.type} className="flex justify-between items-center text-sm">
                    <span className="truncate flex-1">{action.label}</span>
                    <div className="text-right ml-2">
                      <span className="font-semibold">{action.value}</span>
                      {action.costPerAction > 0 && (
                        <span className="text-xs ml-1">
                          (@{formatCurrency(action.costPerAction)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {category.actions.length > 3 && (
                  <div className="text-xs opacity-75">
                    他 {category.actions.length - 3} アクション
                  </div>
                )}
              </div>
              {category.totalCost > 0 && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>合計コスト</span>
                    <span>{formatCurrency(category.totalCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* トップアクション */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-3">トップ5アクション</h4>
        <div className="space-y-2">
          {metrics.summary.topActions.map((action, index) => (
            <div key={action.type} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-500 w-6">#{index + 1}</span>
                <span className="text-sm ml-2">{action.type}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{(action.value || 0).toLocaleString()}</span>
                {action.cost > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    CPA: {formatCurrency(action.cost)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ActionMetricsDisplay
