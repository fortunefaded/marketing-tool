import React from 'react'
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface TroubleshootingModalProps {
  isOpen: boolean
  onClose: () => void
  error?: any
}

export const TroubleshootingModal: React.FC<TroubleshootingModalProps> = ({
  isOpen,
  onClose,
  error,
}) => {
  if (!isOpen) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('クリップボードにコピーしました')
  }

  const getErrorSolution = (error: any) => {
    const errorCode = error?.response?.data?.error?.code
    const errorMessage = error?.response?.data?.error?.message || error?.message || ''

    if (errorCode === 190 || errorMessage.includes('Invalid OAuth access token')) {
      return {
        title: 'アクセストークンの問題',
        steps: [
          'Graph API Explorer (https://developers.facebook.com/tools/explorer/) にアクセス',
          '必要な権限（ads_read, ads_management, business_management）を選択',
          '新しいアクセストークンを生成',
          '新しいトークンでアカウントを再接続',
        ],
      }
    }

    if (errorCode === 100 || errorMessage.includes('Invalid parameter')) {
      return {
        title: 'アカウントIDの形式エラー',
        steps: [
          'ビジネスマネージャーで正しいアカウントIDを確認',
          'アカウントIDは数字のみを入力（act_は不要）',
          '例: 123456789012345',
        ],
      }
    }

    if (errorCode === 10 || errorMessage.includes('permission')) {
      return {
        title: 'アクセス権限の問題',
        steps: [
          'Meta Business Managerにログイン',
          '設定 → ユーザー → アカウントを確認',
          '対象の広告アカウントへのアクセス権限を確認',
          '権限がない場合は管理者に依頼',
        ],
      }
    }

    return {
      title: '一般的なトラブルシューティング',
      steps: [
        'アクセストークンが最新であることを確認',
        'すべての必要な権限が付与されていることを確認',
        'アカウントIDが正しいことを確認',
        'インターネット接続を確認',
      ],
    }
  }

  const solution = getErrorSolution(error)

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">トラブルシューティング</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* エラー情報 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">エラー情報</h3>
              <div className="text-xs text-red-700 font-mono bg-red-100 p-2 rounded">
                {error.message || 'エラーが発生しました'}
              </div>
              <button
                onClick={() => copyToClipboard(JSON.stringify(error, null, 2))}
                className="mt-2 inline-flex items-center text-xs text-red-600 hover:text-red-700"
              >
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                エラー詳細をコピー
              </button>
            </div>
          )}

          {/* 推奨される解決方法 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">{solution.title}</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              {solution.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          {/* クイックリンク */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">便利なリンク</h3>
            <div className="space-y-2">
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                Graph API Explorer
              </a>
              <a
                href="https://business.facebook.com/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                Business Manager設定
              </a>
              <a
                href="https://developers.facebook.com/tools/debug/accesstoken/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                Access Token Debugger
              </a>
            </div>
          </div>

          {/* テスト用cURLコマンド */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">テスト用cURLコマンド</h3>
            <div className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs font-mono">
              <pre className="whitespace-pre-wrap">
                {`curl -G \\
  -d "access_token=YOUR_ACCESS_TOKEN" \\
  "https://graph.facebook.com/v23.0/act_YOUR_ACCOUNT_ID/campaigns"`}
              </pre>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  `curl -G -d "access_token=YOUR_ACCESS_TOKEN" "https://graph.facebook.com/v23.0/act_YOUR_ACCOUNT_ID/campaigns"`
                )
              }
              className="mt-2 inline-flex items-center text-xs text-gray-600 hover:text-gray-700"
            >
              <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
              コマンドをコピー
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
