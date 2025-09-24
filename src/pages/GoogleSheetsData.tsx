/**
 * Google Sheets保存済みデータ表示ページ
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeft, Download, Trash2, AlertTriangle, Database, Upload, Filter, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Id } from '../../convex/_generated/dataModel'

export const GoogleSheetsData: React.FC = () => {
  const navigate = useNavigate()

  // フィルター状態管理
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [platformFilter, setPlatformFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<Id<'googleSheetsData'>>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // データ取得のための状態管理
  const [shouldFetchData, setShouldFetchData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchedData, setFetchedData] = useState<any[] | null>(null)
  const [fetchedSummary, setFetchedSummary] = useState<any>(null)

  // データ取得（明示的なフェッチフラグが立った時のみ）
  const data = useQuery(
    api.googleSheets.getGoogleSheetsData,
    shouldFetchData ? {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      platform: platformFilter === 'all' ? undefined : platformFilter,
    } : 'skip'
  )

  const summary = useQuery(
    api.googleSheets.getGoogleSheetsSummary,
    shouldFetchData ? {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    } : 'skip'
  )

  const deleteData = useMutation(api.googleSheets.deleteGoogleSheetsDataById)
  const deleteMultipleData = useMutation(api.googleSheets.deleteMultipleGoogleSheetsData)

  // 初期日付の設定（過去30日）
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    })
    // 初期状態ではデータを取得しない
    setShouldFetchData(false)
  }, [])

  // データ取得の結果を状態に保存
  useEffect(() => {
    if (data !== undefined && data !== 'skip') {
      setFetchedData(data)
      setIsLoading(false)
    }
  }, [data])

  useEffect(() => {
    if (summary !== undefined && summary !== 'skip') {
      setFetchedSummary(summary)
    }
  }, [summary])

  // データ取得ボタンのハンドラー
  const handleFetchData = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('開始日と終了日を選択してください')
      return
    }
    setIsLoading(true)
    setShouldFetchData(true)
  }

  // 削除処理
  const handleDelete = async (id: Id<'googleSheetsData'>) => {
    if (!confirm('このデータを削除しますか？')) return

    try {
      await deleteData({ id })
      setSelectedIds(new Set())
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  // 複数削除処理
  const handleMultipleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMultipleData({ ids: Array.from(selectedIds) })
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  // チェックボックス選択
  const handleSelectAll = () => {
    if (!fetchedData) return

    if (selectedIds.size === fetchedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(fetchedData.map((item: any) => item._id)))
    }
  }

  const handleSelectOne = (id: Id<'googleSheetsData'>) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // CSVエクスポート
  const handleExport = () => {
    if (!fetchedData || fetchedData.length === 0) {
      alert('エクスポートするデータがありません')
      return
    }

    // CSVヘッダー
    const headers = [
      '日付', '媒体', 'インプレッション', 'クリック', 'CTR', 'CPC', 'CPM',
      '配信金額(fee抜/税別)', '配信金額(fee込/税別)', '配信金額(fee込/税込)',
      'MCV', 'MCVR', 'MCPA', 'CV', '媒体CV', 'CVR',
      'CPA(fee抜/税別)', 'CPA(fee込/税別)'
    ]

    // CSVデータ
    const rows = fetchedData.map(item => [
      item.date,
      item.platform,
      item.impressions,
      item.clicks,
      (item.ctr * 100).toFixed(2) + '%',
      item.cpc,
      item.cpm,
      item.costWithoutFee,
      item.costWithFee,
      item.costWithFeeTax,
      item.mcv,
      (item.mcvr * 100).toFixed(2) + '%',
      item.mcpa,
      item.cv,
      item.mediaCv,
      (item.cvr * 100).toFixed(2) + '%',
      item.cpaWithoutFee,
      item.cpaWithFee,
    ])

    // CSV生成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // ダウンロード
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `google_sheets_data_${dateRange.startDate}_${dateRange.endDate}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/settings/google-sheets')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">保存済みデータ</h1>
              <p className="mt-1 text-sm text-gray-500">
                Google Sheetsからインポートした広告データ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/settings/google-sheets/import')}
              className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100"
            >
              <Upload className="h-4 w-4 inline mr-2" />
              データをインポート
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 inline mr-2" />
                選択したデータを削除 ({selectedIds.size}件)
              </button>
            )}

            <button
              onClick={handleExport}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 inline mr-2" />
              CSVエクスポート
            </button>
          </div>
        </div>

        {/* サマリー情報 */}
        {fetchedSummary && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2 text-gray-600" />
              データサマリー
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fetchedSummary.platformData?.map((item) => (
                <div key={item.platform} className="bg-gray-50 p-4 rounded">
                  <div className={`px-2 py-1 text-xs rounded-full inline-block mb-2 ${
                    item.platform === 'Facebook広告'
                      ? 'bg-blue-100 text-blue-800'
                      : item.platform === 'Google広告'
                      ? 'bg-yellow-100 text-yellow-800'
                      : item.platform === 'LINE広告'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.platform}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">件数:</span>
                      <span className="font-medium">{item.count}件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">費用:</span>
                      <span className="font-medium">¥{item.cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CV:</span>
                      <span className="font-medium">{item.cv}</span>
                    </div>
                    {item.cpa > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">CPA:</span>
                        <span className="font-medium">¥{Math.round(item.cpa).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 合計 */}
              {fetchedSummary.total && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="font-medium text-blue-900 mb-2">合計</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">件数:</span>
                      <span className="font-medium">{fetchedData?.length || 0}件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">費用:</span>
                      <span className="font-medium">¥{fetchedSummary.total.cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">CV:</span>
                      <span className="font-medium">{fetchedSummary.total.cv}</span>
                    </div>
                    {fetchedSummary.total.cpa > 0 && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">CPA:</span>
                        <span className="font-medium">¥{Math.round(fetchedSummary.total.cpa).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">フィルター</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange({ ...dateRange, startDate: e.target.value })
                  setShouldFetchData(false) // 日付変更時はフェッチフラグをリセット
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setDateRange({ ...dateRange, endDate: e.target.value })
                  setShouldFetchData(false) // 日付変更時はフェッチフラグをリセット
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                媒体
              </label>
              <select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value)
                  setShouldFetchData(false) // 媒体変更時はフェッチフラグをリセット
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">すべて</option>
                <option value="Facebook広告">Facebook広告</option>
                <option value="Google広告">Google広告</option>
                <option value="LINE広告">LINE広告</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                &nbsp;
              </label>
              <button
                onClick={handleFetchData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    取得中...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    データを取得
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* データテーブル */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              詳細データ
              {fetchedData && <span className="ml-2 text-sm text-gray-500">（{fetchedData.length}件）</span>}
            </h2>
          </div>

          {!fetchedData ? (
            <div className="text-center py-12">
              <p className="text-gray-500">データを取得するには、日付範囲を選択して「データを取得」ボタンをクリックしてください。</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">データを読み込み中...</p>
            </div>
          ) : fetchedData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === fetchedData.length && fetchedData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日付
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      媒体
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IMP
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CLICK
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CTR
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPC
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPM
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配信金額(税抜)
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配信金額(税込)
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MCV
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MCVR
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MCPA
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CV
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      媒体CV
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CVR
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPA(税抜)
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPA(税込)
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fetchedData.map((item: any) => (
                    <tr key={item._id} className={selectedIds.has(item._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item._id)}
                          onChange={() => handleSelectOne(item._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.date}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.platform === 'Facebook広告'
                            ? 'bg-blue-100 text-blue-800'
                            : item.platform === 'Google広告'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.platform === 'LINE広告'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.platform}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.impressions.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.clicks.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {(item.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.cpc > 0 ? `¥${Math.round(item.cpc).toLocaleString()}` : '¥0'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.cpm > 0 ? `¥${Math.round(item.cpm).toLocaleString()}` : '¥0'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ¥{Math.round(item.costWithFee).toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ¥{Math.round(item.costWithFeeTax).toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {Math.round(item.mcv)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {(item.mcvr * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.mcpa > 0 ? `¥${Math.round(item.mcpa).toLocaleString()}` : '¥0'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {Math.round(item.cv)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {Math.round(item.mediaCv)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {(item.cvr * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.cpaWithoutFee > 0 ? `¥${Math.round(item.cpaWithoutFee).toLocaleString()}` : '¥0'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.cpaWithFee > 0 ? `¥${Math.round(item.cpaWithFee).toLocaleString()}` : '¥0'}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">データがありません</p>
              <button
                onClick={() => navigate('/settings/google-sheets/import')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                データをインポート
              </button>
            </div>
          )}
        </div>

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75"
                onClick={() => setShowDeleteConfirm(false)}
              />

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pb-4 pt-5 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      データを削除しますか？
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        選択した{selectedIds.size}件のデータを削除します。この操作は取り消せません。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleMultipleDelete}
                    disabled={isDeleting}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isDeleting ? '削除中...' : '削除する'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}