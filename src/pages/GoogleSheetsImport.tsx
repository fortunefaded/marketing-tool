/**
 * Google Sheetsデータインポートページ
 * プレビューと一括インポート機能
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowLeft, Calendar, RefreshCw, FileText, AlertCircle, CheckCircle, Upload, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const GoogleSheetsImport: React.FC = () => {
  const navigate = useNavigate()

  // 日付範囲の状態管理
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })

  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [skipExisting, setSkipExisting] = useState(true)
  const [showAllSampleData, setShowAllSampleData] = useState(true) // デフォルトで全データ表示

  // ソート用の状態
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const spreadsheetUrl = useQuery(api.googleSheets.getSpreadsheetUrl)
  const previewHistoricalData = useAction(api.googleSheets.previewHistoricalData)
  const extractSpreadsheetId = useAction(api.googleSheets.extractSpreadsheetId)
  const saveGoogleSheetsData = useMutation(api.googleSheets.saveGoogleSheetsData)


  // 初期日付の設定（今月）
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setDateRange({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    })
  }, [])

  // ソート処理
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // データをソート
  const getSortedData = (data: any[]) => {
    if (!data || data.length === 0) return data

    return [...data].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // 数値フィールドの場合
      if (['impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'costWithoutFee', 'costWithFee', 'costWithFeeTax',
           'mcv', 'mcvr', 'mcpa', 'cv', 'mediaCv', 'cvr', 'cpaWithoutFee', 'cpaWithFee'].includes(sortField)) {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // プレビュー処理
  const handlePreview = async (returnAllData: boolean = false) => {
    if (!spreadsheetUrl) {
      alert('スプレッドシートURLが設定されていません')
      return
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      alert('プレビューする日付範囲を指定してください')
      return
    }

    setIsPreviewing(true)
    if (!returnAllData) {
      setPreviewData(null)
      setImportResult(null)
    }

    try {
      console.log('プレビュー開始:', {
        spreadsheetUrl,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        returnAllData: returnAllData || showAllSampleData,
      })

      // スプレッドシートIDを抽出
      const extractResult = await extractSpreadsheetId({ url: spreadsheetUrl })
      console.log('スプレッドシートID抽出結果:', extractResult)

      if (!extractResult.success || !extractResult.spreadsheetId) {
        throw new Error('スプレッドシートIDの抽出に失敗しました')
      }

      // プレビューデータを取得
      console.log('プレビューAPI呼び出し中...')
      const result = await previewHistoricalData({
        spreadsheetId: extractResult.spreadsheetId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        returnAllData: returnAllData || showAllSampleData,
      })

      console.log('プレビュー結果:', {
        success: result?.success,
        hasError: !!result?.error,
        errorMessage: result?.error,
        totalData: result?.sampleData?.length,
        allData: result?.allData?.length,
        summaryTotalRows: result?.summary?.totalRows,
        platformCount: result?.platformSummary?.length,
        fullResult: result,
      })

      if (result && result.success) {
        setPreviewData(result)
      } else {
        setPreviewData({
          success: false,
          error: result?.error || 'プレビューデータの取得に失敗しました',
          sampleData: [],
          summary: null,
          platformSummary: [],
        })
      }
    } catch (error: any) {
      console.error('プレビューエラー:', error?.message || error?.toString() || '不明なエラー')
      setPreviewData({
        success: false,
        error: error?.message || 'プレビュー中にエラーが発生しました',
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  // インポート処理
  const handleImport = async () => {
    if (!spreadsheetUrl) {
      alert('スプレッドシートURLが設定されていません')
      return
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      alert('インポートする日付範囲を指定してください')
      return
    }

    // プレビューデータがない場合はプレビューを実行
    if (!previewData) {
      alert('先にプレビューを実行してください')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      // プレビューで取得したデータをそのまま保存（isNewフィールドを除去）
      const rawData = previewData.allData || previewData.sampleData || []
      const dataToSave = rawData.map(item => {
        const { isNew, ...cleanData } = item
        return cleanData
      })

      if (dataToSave.length === 0) {
        throw new Error('保存するデータがありません')
      }

      console.log(`[インポート] プレビューデータから ${dataToSave.length} 件のデータを保存します`)

      // プレビューデータを直接保存用関数に渡す
      const saveResult = await saveGoogleSheetsData({
        data: dataToSave,
        sheetName: 'preview_import',
        skipExisting,
      })

      setImportResult({
        success: true,
        imported: saveResult.saved,
        updated: saveResult.updated,
        skipped: saveResult.skipped,
        errors: saveResult.errors,
        totalRows: dataToSave.length,
      })

      // インポート成功後、プレビューをクリア
      setPreviewData(null)
    } catch (error: any) {
      console.error('インポートエラー:', error?.message || error?.toString() || '不明なエラー')
      setImportResult({
        success: false,
        error: error?.message || 'インポート中にエラーが発生しました',
      })
    } finally {
      setIsImporting(false)
    }
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
              <h1 className="text-2xl font-bold text-gray-900">データインポート</h1>
              <p className="mt-1 text-sm text-gray-500">
                Google Sheetsから広告データをインポート
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/settings/google-sheets/data')}
            className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100"
          >
            <FileText className="h-4 w-4 inline mr-2" />
            保存済みデータを見る
          </button>
        </div>

        {/* インポート設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">インポート設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
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
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center mr-4">
                <input
                  type="checkbox"
                  id="skipExisting"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="skipExisting" className="text-sm text-gray-700">
                  既存データをスキップ
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => handlePreview(true)}
              disabled={isPreviewing || isImporting}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPreviewing ? (
                <>
                  <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                  プレビュー中...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 inline mr-2" />
                  プレビュー
                </>
              )}
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting || isPreviewing || !previewData?.success}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                  インポート中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 inline mr-2" />
                  インポート実行
                </>
              )}
            </button>
          </div>
        </div>

        {/* プレビュー結果 */}
        {previewData && (
          <div className={`rounded-lg shadow p-6 mb-6 ${
            previewData.success ? 'bg-white' : 'bg-red-50'
          }`}>
            {previewData.success ? (
              <>
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">プレビュー結果</h3>
                </div>

                {/* サマリー情報 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-xs text-gray-500 mb-1">総データ数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {previewData.summary?.totalRows || 0}
                      <span className="text-sm font-normal text-gray-500">件</span>
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-xs text-gray-500 mb-1">新規データ</p>
                    <p className="text-2xl font-bold text-green-600">
                      {previewData.summary?.newData || 0}
                      <span className="text-sm font-normal text-green-500">件</span>
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded">
                    <p className="text-xs text-gray-500 mb-1">既存データ</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {previewData.summary?.existingData || 0}
                      <span className="text-sm font-normal text-blue-500">件</span>
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded">
                    <p className="text-xs text-gray-500 mb-1">処理対象</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {skipExisting
                        ? previewData.summary?.newData || 0
                        : previewData.summary?.totalRows || 0
                      }
                      <span className="text-sm font-normal text-yellow-500">件</span>
                    </p>
                  </div>
                </div>

                {/* 媒体別合算値 */}
                {previewData.platformSummary && previewData.platformSummary.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">媒体別合算値</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">合計データ数</p>
                        <p className="text-xl font-bold text-gray-900">
                          {previewData.platformSummary.reduce((sum: number, p: any) => sum + (p.count || 0), 0)}
                          <span className="text-sm font-normal text-gray-500">件</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">合計新規</p>
                        <p className="text-xl font-bold text-green-600">
                          {previewData.platformSummary.reduce((sum: number, p: any) => sum + (p.new || 0), 0)}
                          <span className="text-sm font-normal text-green-500">件</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">合計既存</p>
                        <p className="text-xl font-bold text-blue-600">
                          {previewData.platformSummary.reduce((sum: number, p: any) => sum + (p.existing || 0), 0)}
                          <span className="text-sm font-normal text-blue-500">件</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">媒体数</p>
                        <p className="text-xl font-bold text-purple-600">
                          {previewData.platformSummary.length}
                          <span className="text-sm font-normal text-purple-500">媒体</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 媒体別詳細データ（各指標の合算値） */}
                {previewData.platformSummary && previewData.platformSummary.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">媒体別詳細データ（各指標の合算値）</h4>
                    <div className="space-y-4">
                      {previewData.platformSummary.map((platform: any) => (
                        <div key={platform.platform} className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-lg transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                              platform.platform === 'Facebook広告'
                                ? 'bg-blue-100 text-blue-800'
                                : platform.platform === 'Google広告'
                                ? 'bg-yellow-100 text-yellow-800'
                                : platform.platform === 'LINE広告'
                                ? 'bg-green-100 text-green-800'
                                : platform.platform === 'Yahoo!広告'
                                ? 'bg-purple-100 text-purple-800'
                                : platform.platform === 'Twitter広告'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {platform.platform}
                            </span>
                            <span className="text-lg font-bold">{platform.count}件</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {/* 基本指標 */}
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">IMP</div>
                              <div className="font-semibold">{platform.impressions?.toLocaleString() || '-'}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CLICK</div>
                              <div className="font-semibold">{platform.clicks?.toLocaleString() || '-'}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CTR</div>
                              <div className="font-semibold">{platform.avgCtr ? `${(platform.avgCtr * 100).toFixed(2)}%` : '-'}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CPC</div>
                              <div className="font-semibold">{platform.avgCpc ? `¥${Math.round(platform.avgCpc).toLocaleString()}` : '-'}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CPM</div>
                              <div className="font-semibold">{platform.avgCpm ? `¥${Math.round(platform.avgCpm).toLocaleString()}` : '-'}</div>
                            </div>
                            {/* コスト指標 */}
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">配信金額(fee抜)</div>
                              <div className="font-semibold text-blue-700">¥{platform.costWithoutFee?.toLocaleString() || '-'}</div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">配信金額(fee込/税別)</div>
                              <div className="font-semibold text-blue-700">¥{platform.costWithFee?.toLocaleString() || '-'}</div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">配信金額(fee込/税込)</div>
                              <div className="font-semibold text-blue-700">¥{platform.costWithFeeTax?.toLocaleString() || '-'}</div>
                            </div>
                            {/* CV指標 */}
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">MCV</div>
                              <div className="font-semibold text-green-700">{platform.mcv || '-'}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">MCVR</div>
                              <div className="font-semibold text-green-700">{platform.avgMcvr ? `${(platform.avgMcvr * 100).toFixed(2)}%` : '-'}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">MCPA</div>
                              <div className="font-semibold text-green-700">{platform.avgMcpa ? `¥${Math.round(platform.avgMcpa).toLocaleString()}` : '-'}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CV</div>
                              <div className="font-semibold text-green-700">{platform.cv || '-'}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">媒体CV</div>
                              <div className="font-semibold text-green-700">{platform.mediaCv || '-'}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CVR</div>
                              <div className="font-semibold text-green-700">{platform.avgCvr ? `${(platform.avgCvr * 100).toFixed(2)}%` : '-'}</div>
                            </div>
                            <div className="bg-yellow-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CPA(fee抜)</div>
                              <div className="font-semibold text-yellow-700">{platform.avgCpaWithoutFee ? `¥${Math.round(platform.avgCpaWithoutFee).toLocaleString()}` : '-'}</div>
                            </div>
                            <div className="bg-yellow-50 p-2 rounded">
                              <div className="text-gray-600 mb-1">CPA(fee込/税別)</div>
                              <div className="font-semibold text-yellow-700">{platform.avgCpaWithFee ? `¥${Math.round(platform.avgCpaWithFee).toLocaleString()}` : '-'}</div>
                            </div>
                            {/* データ件数 */}
                            <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t border-gray-200">
                              <div className="flex justify-between">
                                <span className="text-gray-600">データ件数:</span>
                                <span>
                                  <span className="text-green-600 font-medium">新規 {platform.new || 0}件</span>
                                  <span className="text-gray-400 mx-2">/</span>
                                  <span className="text-blue-600 font-medium">既存 {platform.existing || 0}件</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* サンプルデータ */}
                {previewData.sampleData && previewData.sampleData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        データプレビュー（{showAllSampleData || previewData.allData ? '全' : ''}
                        {previewData.allData ? previewData.allData.length : previewData.sampleData.length}件
                        {!showAllSampleData && !previewData.allData && previewData.summary?.totalRows > previewData.sampleData.length
                          ? `／全${previewData.summary.totalRows}件` : ''}）
                      </h4>
                      {previewData.summary?.totalRows > 10 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()

                            if (!showAllSampleData && !previewData.allData) {
                              setShowAllSampleData(true)
                              // 非同期でプレビューを再実行
                              setTimeout(() => {
                                handlePreview(true)
                              }, 0)
                            } else {
                              setShowAllSampleData(!showAllSampleData)
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          {showAllSampleData ? '最初と最後を表示' : '全件表示'}
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">状態</th>
                            <th
                              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('date')}
                            >
                              <div className="flex items-center">
                                日付
                                {sortField === 'date' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('platform')}
                            >
                              <div className="flex items-center">
                                媒体
                                {sortField === 'platform' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('impressions')}
                            >
                              <div className="flex items-center justify-end">
                                IMP
                                {sortField === 'impressions' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('clicks')}
                            >
                              <div className="flex items-center justify-end">
                                CLICK
                                {sortField === 'clicks' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('ctr')}
                            >
                              <div className="flex items-center justify-end">
                                CTR
                                {sortField === 'ctr' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cpc')}
                            >
                              <div className="flex items-center justify-end">
                                CPC
                                {sortField === 'cpc' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cpm')}
                            >
                              <div className="flex items-center justify-end">
                                CPM
                                {sortField === 'cpm' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('costWithoutFee')}
                            >
                              <div className="flex items-center justify-end">
                                配信金額<br/>(fee抜/税別)
                                {sortField === 'costWithoutFee' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('costWithFee')}
                            >
                              <div className="flex items-center justify-end">
                                配信金額<br/>(fee込/税別)
                                {sortField === 'costWithFee' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('costWithFeeTax')}
                            >
                              <div className="flex items-center justify-end">
                                配信金額<br/>(fee込/税込)
                                {sortField === 'costWithFeeTax' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('mcv')}
                            >
                              <div className="flex items-center justify-end">
                                MCV
                                {sortField === 'mcv' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('mcvr')}
                            >
                              <div className="flex items-center justify-end">
                                MCVR
                                {sortField === 'mcvr' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('mcpa')}
                            >
                              <div className="flex items-center justify-end">
                                MCPA
                                {sortField === 'mcpa' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cv')}
                            >
                              <div className="flex items-center justify-end">
                                CV
                                {sortField === 'cv' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('mediaCv')}
                            >
                              <div className="flex items-center justify-end">
                                媒体CV
                                {sortField === 'mediaCv' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cvr')}
                            >
                              <div className="flex items-center justify-end">
                                CVR
                                {sortField === 'cvr' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cpaWithoutFee')}
                            >
                              <div className="flex items-center justify-end">
                                CPA<br/>(fee抜/税別)
                                {sortField === 'cpaWithoutFee' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('cpaWithFee')}
                            >
                              <div className="flex items-center justify-end">
                                CPA<br/>(fee込/税別)
                                {sortField === 'cpaWithFee' && (
                                  sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {showAllSampleData ? (
                            // 全件表示モード
                            previewData.allData ? (
                              getSortedData(previewData.allData).map((item: any, index: number) => (
                                <tr key={`all-${index}`} className={
                                  item.isNew
                                    ? 'bg-green-50'
                                    : item.platform === 'Google広告'
                                    ? 'bg-yellow-50'
                                    : item.platform === 'LINE広告'
                                    ? 'bg-emerald-50'
                                    : 'bg-blue-50'
                                }>
                                  <td className={`px-2 py-1 sticky left-0 z-10 ${
                                    item.isNew
                                      ? 'bg-green-50'
                                      : item.platform === 'Google広告'
                                      ? 'bg-yellow-50'
                                      : item.platform === 'LINE広告'
                                      ? 'bg-emerald-50'
                                      : 'bg-blue-50'
                                  }`}>
                                    <span className={`px-1 py-0.5 text-xs rounded-full ${
                                      item.isNew
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.isNew ? '新規' : '既存'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 text-xs">{item.date}</td>
                                  <td className="px-2 py-1 text-xs">
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
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
                                  <td className="px-2 py-1 text-xs text-right">{item.impressions !== undefined && item.impressions !== null ? item.impressions.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.clicks !== undefined && item.clicks !== null ? item.clicks.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.ctr !== undefined && item.ctr !== null ? `${(item.ctr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpc !== undefined && item.cpc !== null ? `¥${item.cpc.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpm !== undefined && item.cpm !== null ? `¥${item.cpm.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithoutFee !== undefined && item.costWithoutFee !== null ? `¥${item.costWithoutFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFee !== undefined && item.costWithFee !== null ? `¥${item.costWithFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFeeTax !== undefined && item.costWithFeeTax !== null ? `¥${item.costWithFeeTax.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcv !== undefined && item.mcv !== null ? item.mcv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcvr !== undefined && item.mcvr !== null ? `${(item.mcvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcpa !== undefined && item.mcpa !== null ? `¥${item.mcpa.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cv !== undefined && item.cv !== null ? item.cv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mediaCv !== undefined && item.mediaCv !== null ? item.mediaCv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cvr !== undefined && item.cvr !== null ? `${(item.cvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithoutFee !== undefined && item.cpaWithoutFee !== null ? `¥${item.cpaWithoutFee.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithFee !== undefined && item.cpaWithFee !== null ? `¥${item.cpaWithFee.toFixed(0)}` : '¥0'}</td>
                                </tr>
                              ))
                            ) : (
                              // sampleDataを全件として表示
                              previewData.sampleData.map((item: any, index: number) => (
                                <tr key={`sample-all-${index}`} className={
                                  item.isNew
                                    ? 'bg-green-50'
                                    : item.platform === 'Google広告'
                                    ? 'bg-yellow-50'
                                    : item.platform === 'LINE広告'
                                    ? 'bg-emerald-50'
                                    : 'bg-blue-50'
                                }>
                                  <td className={`px-2 py-1 sticky left-0 z-10 ${
                                    item.isNew
                                      ? 'bg-green-50'
                                      : item.platform === 'Google広告'
                                      ? 'bg-yellow-50'
                                      : item.platform === 'LINE広告'
                                      ? 'bg-emerald-50'
                                      : 'bg-blue-50'
                                  }`}>
                                    <span className={`px-1 py-0.5 text-xs rounded-full ${
                                      item.isNew
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {item.isNew ? '新規' : '既存'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 text-xs">{item.date}</td>
                                  <td className="px-2 py-1 text-xs">
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
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
                                  <td className="px-2 py-1 text-xs text-right">{item.impressions !== undefined && item.impressions !== null ? item.impressions.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.clicks !== undefined && item.clicks !== null ? item.clicks.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.ctr !== undefined && item.ctr !== null ? `${(item.ctr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpc !== undefined && item.cpc !== null ? `¥${item.cpc.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpm !== undefined && item.cpm !== null ? `¥${item.cpm.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithoutFee !== undefined && item.costWithoutFee !== null ? `¥${item.costWithoutFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFee !== undefined && item.costWithFee !== null ? `¥${item.costWithFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFeeTax !== undefined && item.costWithFeeTax !== null ? `¥${item.costWithFeeTax.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcv !== undefined && item.mcv !== null ? item.mcv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcvr !== undefined && item.mcvr !== null ? `${(item.mcvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcpa !== undefined && item.mcpa !== null ? `¥${item.mcpa.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cv !== undefined && item.cv !== null ? item.cv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mediaCv !== undefined && item.mediaCv !== null ? item.mediaCv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cvr !== undefined && item.cvr !== null ? `${(item.cvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithoutFee !== undefined && item.cpaWithoutFee !== null ? `¥${item.cpaWithoutFee.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithFee !== undefined && item.cpaWithFee !== null ? `¥${item.cpaWithFee.toFixed(0)}` : '¥0'}</td>
                                </tr>
                              ))
                            )
                          ) : (
                            // 最初と最後の表示モード
                            <>
                              {/* 最初の5件 */}
                              {previewData.sampleData.slice(0, 5).map((item: any, index: number) => (
                                <tr key={`first-${index}`} className={item.isNew ? 'bg-green-50' : 'bg-blue-50'}>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      item.isNew
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {item.isNew ? '新規' : '既存'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm">{item.date}</td>
                                  <td className="px-3 py-2 text-sm">{item.platform}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.impressions !== undefined && item.impressions !== null ? item.impressions.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.clicks !== undefined && item.clicks !== null ? item.clicks.toLocaleString() : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.ctr !== undefined && item.ctr !== null ? `${(item.ctr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpc !== undefined && item.cpc !== null ? `¥${item.cpc.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpm !== undefined && item.cpm !== null ? `¥${item.cpm.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithoutFee !== undefined && item.costWithoutFee !== null ? `¥${item.costWithoutFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFee !== undefined && item.costWithFee !== null ? `¥${item.costWithFee.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.costWithFeeTax !== undefined && item.costWithFeeTax !== null ? `¥${item.costWithFeeTax.toLocaleString()}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcv !== undefined && item.mcv !== null ? item.mcv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcvr !== undefined && item.mcvr !== null ? `${(item.mcvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mcpa !== undefined && item.mcpa !== null ? `¥${item.mcpa.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cv !== undefined && item.cv !== null ? item.cv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.mediaCv !== undefined && item.mediaCv !== null ? item.mediaCv : '0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cvr !== undefined && item.cvr !== null ? `${(item.cvr * 100).toFixed(2)}%` : '0.00%'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithoutFee !== undefined && item.cpaWithoutFee !== null ? `¥${item.cpaWithoutFee.toFixed(0)}` : '¥0'}</td>
                                  <td className="px-2 py-1 text-xs text-right">{item.cpaWithFee !== undefined && item.cpaWithFee !== null ? `¥${item.cpaWithFee.toFixed(0)}` : '¥0'}</td>
                                </tr>
                              ))}
                              {/* 省略表示 */}
                              {previewData.sampleData.length > 10 && (
                                <tr className="bg-gray-50">
                                  <td colSpan={19} className="px-3 py-2 text-center text-sm text-gray-500">
                                    ・・・ {previewData.summary?.totalRows - 10 || previewData.sampleData.length - 10}件省略 ・・・
                                  </td>
                                </tr>
                              )}
                              {/* 最後の5件 */}
                              {previewData.sampleData.length > 5 &&
                                previewData.sampleData.slice(-5).map((item: any, index: number) => (
                                  <tr key={`last-${index}`} className={item.isNew ? 'bg-green-50' : 'bg-blue-50'}>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        item.isNew
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {item.isNew ? '新規' : '既存'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{item.date}</td>
                                    <td className="px-3 py-2 text-sm">{item.platform}</td>
                                    <td className="px-3 py-2 text-sm text-right">{item.impressions?.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-sm text-right">{item.clicks?.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-sm text-right">{(item.ctr * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-2 text-sm text-right">¥{item.costWithFeeTax?.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-sm text-right">{item.cv}</td>
                                  </tr>
                                ))
                              }
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-2">エラーが発生しました</h3>
                  <p className="text-sm text-red-700">{previewData.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* インポート結果 */}
        {importResult && (
          <div className={`rounded-lg shadow p-6 ${
            importResult.success ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {importResult.success ? (
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-green-900 mb-2">インポート完了</h3>
                  <p className="text-sm text-green-700 mb-3">
                    {importResult.saved > 0 && `新規: ${importResult.saved}件`}
                    {importResult.updated > 0 && ` / 更新: ${importResult.updated}件`}
                    {importResult.skipped > 0 && ` / スキップ: ${importResult.skipped}件`}
                  </p>
                  <button
                    onClick={() => navigate('/settings/google-sheets/data')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    保存データを確認
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-2">インポートエラー</h3>
                  <p className="text-sm text-red-700">{importResult.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}