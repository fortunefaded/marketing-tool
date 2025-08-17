import React from 'react'
import { FileText, Calendar, Settings } from 'lucide-react'
import { ScheduledReportManager } from '../components/reports/ScheduledReportManager'
import { FavoriteAnalysisList } from '../components/favorites/FavoriteAnalysisList'
import { AddToFavoriteButton } from '../components/favorites/AddToFavoriteButton'

export const ReportManagement: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'scheduled' | 'favorites'>('scheduled')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="h-8 w-8 mr-3 text-indigo-600" />
              レポート管理
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              スケジュールレポートとお気に入り分析の管理
            </p>
          </div>
          <AddToFavoriteButton
            analysisName="レポート管理"
            analysisType="custom"
            route="/report-management"
            description="スケジュールレポートとお気に入り分析の一元管理"
          />
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'scheduled'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              スケジュールレポート
            </div>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'favorites'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              お気に入り分析
            </div>
          </button>
        </nav>
      </div>

      {/* コンテンツエリア */}
      <div className="mt-6">
        {activeTab === 'scheduled' ? (
          <div className="space-y-6">
            <ScheduledReportManager />
            
            {/* レポート設定の説明 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                レポート配信について
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• レポートは指定された時刻に自動的に生成され、メールで配信されます</p>
                <p>• 日次、週次、月次の頻度で配信スケジュールを設定できます</p>
                <p>• PDF、Excel、CSVの形式でレポートを出力できます</p>
                <p>• 複数の配信先を設定して、チームで共有することができます</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FavoriteAnalysisList />
            
            {/* お気に入りの説明 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                お気に入り分析について
              </h3>
              <div className="space-y-2 text-sm text-yellow-700">
                <p>• よく使う分析画面をお気に入りに登録して、すぐにアクセスできます</p>
                <p>• フィルター条件も一緒に保存されるため、同じ条件で分析を再開できます</p>
                <p>• タグを使って分析を整理し、検索しやすくできます</p>
                <p>• アクセス頻度が高い順に自動的に並び替えられます</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}