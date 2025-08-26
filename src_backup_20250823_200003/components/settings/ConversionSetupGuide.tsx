import { useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface ChecklistItem {
  id: string
  title: string
  description: string
  isCompleted: boolean
  priority: 'high' | 'medium' | 'low'
  helpUrl?: string
}

export function ConversionSetupGuide() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'pixel',
      title: 'Meta Pixelの設置',
      description: 'ウェブサイトにMeta Pixel（Facebook Pixel）が正しく設置されていますか？',
      isCompleted: false,
      priority: 'high',
      helpUrl: 'https://developers.facebook.com/docs/facebook-pixel/implementation',
    },
    {
      id: 'purchase_event',
      title: '購入イベントの送信',
      description: '購入完了時にPurchaseイベントがMetaに送信されていますか？',
      isCompleted: false,
      priority: 'high',
      helpUrl:
        'https://developers.facebook.com/docs/facebook-pixel/implementation/conversion-tracking',
    },
    {
      id: 'conversion_api',
      title: 'コンバージョンAPIの設定',
      description: 'サーバーサイドからのコンバージョンAPI（CAPI）は設定済みですか？',
      isCompleted: false,
      priority: 'high',
      helpUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
    },
    {
      id: 'event_verification',
      title: 'イベントマネージャーでの確認',
      description: 'イベントマネージャーで購入イベントが正常に受信されていますか？',
      isCompleted: false,
      priority: 'high',
      helpUrl: 'https://business.facebook.com/events_manager',
    },
    {
      id: 'attribution_settings',
      title: 'アトリビューション設定',
      description:
        'アトリビューションウィンドウ設定は適切ですか？（通常7日間クリック、1日間ビュー）',
      isCompleted: false,
      priority: 'medium',
      helpUrl: 'https://www.facebook.com/business/help/458681590974355',
    },
    {
      id: 'test_events',
      title: 'テストイベントの確認',
      description: 'テストイベントツールで実際の購入フローをテストしましたか？',
      isCompleted: false,
      priority: 'medium',
      helpUrl:
        'https://developers.facebook.com/docs/facebook-pixel/implementation/conversion-tracking',
    },
    {
      id: 'domain_verification',
      title: 'ドメイン認証',
      description: 'ウェブサイトのドメイン認証は完了していますか？',
      isCompleted: false,
      priority: 'medium',
      helpUrl: 'https://www.facebook.com/business/help/286768115176155',
    },
    {
      id: 'ios14_setup',
      title: 'iOS14.5+対応',
      description: 'SKAdNetworkやAggregated Event Measurementの設定は完了していますか？',
      isCompleted: false,
      priority: 'low',
      helpUrl: 'https://www.facebook.com/business/help/331612538028890',
    },
  ])

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: !item.isCompleted } : item))
    )
  }

  const getCompletionStatus = () => {
    const total = checklist.length
    const completed = checklist.filter((item) => item.isCompleted).length
    const highPriorityTotal = checklist.filter((item) => item.priority === 'high').length
    const highPriorityCompleted = checklist.filter(
      (item) => item.priority === 'high' && item.isCompleted
    ).length

    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100),
      highPriorityTotal,
      highPriorityCompleted,
      highPriorityPercentage: Math.round((highPriorityCompleted / highPriorityTotal) * 100),
    }
  }

  const status = getCompletionStatus()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '必須'
      case 'medium':
        return '推奨'
      case 'low':
        return '任意'
      default:
        return ''
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">コンバージョン設定チェックリスト</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Meta APIでCV/ROAS/CPAデータを正しく取得するために、以下の設定を確認してください。
        </p>

        {/* 進捗表示 */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">全体進捗</span>
            <span className="text-sm text-gray-600">
              {status.completed}/{status.total} 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-red-700">必須項目</span>
            <span className="text-sm text-red-600">
              {status.highPriorityCompleted}/{status.highPriorityTotal} 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.highPriorityPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* チェックリスト */}
      <div className="space-y-3 mb-6">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`p-4 bg-white rounded-lg border transition-all duration-200 ${
              item.isCompleted
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* チェックボックス */}
              <button onClick={() => toggleItem(item.id)} className="mt-1 flex-shrink-0">
                {item.isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full hover:border-gray-400" />
                )}
              </button>

              {/* コンテンツ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={`font-medium ${item.isCompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}
                  >
                    {item.title}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}
                  >
                    {getPriorityLabel(item.priority)}
                  </span>
                </div>

                <p className={`text-sm ${item.isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                  {item.description}
                </p>

                {/* ヘルプリンク */}
                {item.helpUrl && (
                  <a
                    href={item.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    詳細を確認
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 重要なリンク */}
      <div className="bg-white p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-3">重要なツール・リンク</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="https://business.facebook.com/events_manager"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">イベントマネージャー</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-blue-600" />
          </a>

          <a
            href="https://developers.facebook.com/tools/debug/events/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">テストイベント</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-blue-600" />
          </a>

          <a
            href="https://business.facebook.com/help/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">ビジネスヘルプセンター</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-blue-600" />
          </a>

          <a
            href="https://www.facebook.com/business/help/952192354843755"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">Pixelヘルパー</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-blue-600" />
          </a>
        </div>
      </div>

      {/* 警告メッセージ */}
      {status.highPriorityCompleted < status.highPriorityTotal && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">必須設定が未完了です</h4>
              <p className="text-sm text-red-700">
                必須項目がすべて完了していない場合、コンバージョンデータが正しく取得できない可能性があります。
                特にMeta PixelとPurchaseイベントの設定は必須です。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
