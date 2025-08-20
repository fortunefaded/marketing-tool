import { useState } from 'react'
import { ArrowTopRightOnSquareIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export function AppSecretGuide() {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">App Secretの取得手順</h3>
        <p className="text-sm text-blue-800 mb-4">
          App Secretは、Meta開発者ダッシュボードから取得できます。以下の手順に従ってください。
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Meta開発者ダッシュボードにアクセス</h4>
            <p className="text-sm text-gray-600 mt-1">
              以下のリンクから開発者ダッシュボードにアクセスしてください。
            </p>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Meta開発者ダッシュボードを開く
              <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">アプリを選択</h4>
            <p className="text-sm text-gray-600 mt-1">
              作成済みのアプリをクリックして選択します。
              まだアプリを作成していない場合は、「アプリを作成」から新規作成してください。
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">設定画面に移動</h4>
            <p className="text-sm text-gray-600 mt-1">
              左側のメニューから「設定」→「ベーシック」を選択します。
            </p>
            <div className="mt-2 p-3 bg-gray-100 rounded-md">
              <p className="text-xs text-gray-600">直接アクセスする場合のURL形式：</p>
              <code className="text-xs bg-white px-2 py-1 rounded mt-1 block">
                https://developers.facebook.com/apps/[YOUR_APP_ID]/settings/basic/
              </code>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              4
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">App Secretを確認</h4>
            <p className="text-sm text-gray-600 mt-1">
              「アプリシークレット」フィールドで、「表示」ボタンをクリックします。
              Facebookのパスワードを入力すると、App Secretが表示されます。
            </p>
            <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ セキュリティ上の重要な注意事項
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• App Secretは絶対に公開しないでください</li>
                <li>• GitHubなどのバージョン管理システムにコミットしないでください</li>
                <li>• クライアントサイドのコードに直接記述しないでください</li>
                <li>• 本番環境では必ずサーバーサイドで管理してください</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              5
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">App Secretをコピー</h4>
            <p className="text-sm text-gray-600 mt-1">
              表示されたApp Secret（32文字の英数字）をコピーして、環境変数設定画面に貼り付けます。
            </p>
            <div className="mt-3 p-3 bg-gray-100 rounded-md">
              <p className="text-xs text-gray-600 mb-2">App Secretの形式：</p>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded">
                <code className="text-xs font-mono">
                  {showSecret
                    ? 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
                    : '••••••••••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  {showSecret ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">便利なリンク</h3>
        <div className="space-y-2">
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
            Meta開発者ダッシュボード
          </a>
          <a
            href="https://developers.facebook.com/docs/facebook-login/security#appsecret"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
            App Secretセキュリティガイド（公式ドキュメント）
          </a>
          <a
            href="https://developers.facebook.com/docs/marketing-api/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
          >
            <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
            Marketing API概要
          </a>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">App Secretが必要な理由</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 短期トークンを長期トークン（60日間有効）に交換するため</li>
          <li>• トークンの有効期限を正確に検証するため</li>
          <li>• トークンの自動更新機能を有効にするため</li>
          <li>• より安全なAPI認証を実現するため</li>
        </ul>
        <p className="text-sm text-gray-500 mt-3">
          ※ 基本的なデータ取得機能はApp Secretなしでも動作しますが、
          トークンの永続化や自動更新機能を使用する場合は必要です。
        </p>
      </div>
    </div>
  )
}
