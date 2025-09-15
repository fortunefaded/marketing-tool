import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { ECForceLayout } from '../components/ECForceLayout'
import {
  ChartBarIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const ECForceMain: React.FC = () => {
  const statistics = useQuery(api.ecforce.getStatistics)
  const recentImports = useQuery(api.ecforce.getImportHistory, {
    limit: 5,
    offset: 0,
  })

  return (
    <ECForceLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ECForce データ連携ダッシュボード</h1>
          <p className="mt-2 text-sm text-gray-600">
            ECForceの広告パフォーマンスデータを管理・分析します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">総レコード数</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {statistics?.totalRecords?.toLocaleString() || 0}
            </dd>
          </div>

          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">広告主数</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {statistics?.uniqueAdvertisers || 0}
            </dd>
          </div>

          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">データ期間</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {statistics?.earliestDate && statistics?.latestDate ? (
                <>
                  {statistics.earliestDate}
                  <br />〜 {statistics.latestDate}
                </>
              ) : (
                'データなし'
              )}
            </dd>
          </div>

          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">最終インポート</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {statistics?.lastImportAt
                ? format(new Date(statistics.lastImportAt), 'MM/dd HH:mm', { locale: ja })
                : '未実行'}
            </dd>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Link
            to="/settings/ecforce/upload"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
          >
            <div>
              <span className="inline-flex rounded-lg bg-blue-50 p-3 text-blue-600">
                <CloudArrowUpIcon className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                データアップロード
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                CSVファイルをアップロードして新しいデータをインポート
              </p>
            </div>
          </Link>

          <Link
            to="/settings/ecforce/history"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
          >
            <div>
              <span className="inline-flex rounded-lg bg-green-50 p-3 text-green-600">
                <DocumentTextIcon className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                インポート履歴
              </h3>
              <p className="mt-2 text-sm text-gray-500">過去のインポート履歴と詳細を確認</p>
            </div>
          </Link>

          <Link
            to="/settings/ecforce/sync"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
          >
            <div>
              <span className="inline-flex rounded-lg bg-purple-50 p-3 text-purple-600">
                <CalendarIcon className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                自動同期設定
              </h3>
              <p className="mt-2 text-sm text-gray-500">定期的な自動データ同期を設定</p>
            </div>
          </Link>
        </div>

        {/* 最近のインポート */}
        {recentImports && recentImports.imports.length > 0 && (
          <div className="rounded-lg bg-white shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">最近のインポート</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentImports.imports.map((importRecord) => (
                <li key={importRecord.importId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {importRecord.dataDate} のデータ
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(importRecord.startedAt), 'yyyy/MM/dd HH:mm', {
                            locale: ja,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          importRecord.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : importRecord.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : importRecord.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {importRecord.status === 'success'
                          ? '成功'
                          : importRecord.status === 'partial'
                            ? '部分的'
                            : importRecord.status === 'failed'
                              ? '失敗'
                              : '処理中'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {importRecord.successRows}/{importRecord.filteredRows} 件
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-6 py-3 bg-gray-50">
              <Link
                to="/settings/ecforce/history"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                すべての履歴を見る →
              </Link>
            </div>
          </div>
        )}
      </div>
    </ECForceLayout>
  )
}
