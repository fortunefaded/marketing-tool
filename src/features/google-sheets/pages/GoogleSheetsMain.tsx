/**
 * Google Sheets統合メインページ
 */

import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { GoogleAuthButton } from '../components/GoogleAuth/GoogleAuthButton'
import { DocumentTextIcon, CogIcon, ArrowDownTrayIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { GoogleSheetsApiClient } from '../utils/google-sheets-api'
import { MogumoPrismaParser } from '../parsers/mogumo-parser'

export const GoogleSheetsMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'configs' | 'history'>('import')
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string>('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [agencyName, setAgencyName] = useState('')

  const tokenInfo = useQuery(api.googleSheets.getValidToken)
  const sheetConfigs = useQuery(api.googleSheets.listSheetConfigs)
  const importHistory = useQuery(api.googleSheets.listImportHistory, { limit: 10 })

  const createConfig = useMutation(api.googleSheets.createSheetConfig)
  const saveData = useMutation(api.googleSheets.saveUnifiedPerformanceData)
  const createHistory = useMutation(api.googleSheets.createImportHistory)

  // 認証済みかどうか
  const isAuthenticated = tokenInfo && !tokenInfo.isExpired

  // 手動インポート
  const handleManualImport = async () => {
    if (!sheetUrl || !agencyName) {
      alert('スプレッドシートURLと代理店名を入力してください')
      return
    }

    if (!tokenInfo?.accessToken) {
      alert('Googleアカウントでログインしてください')
      return
    }

    setIsImporting(true)
    setImportStatus('データを取得中...')

    try {
      // スプレッドシートIDを抽出
      const sheetId = GoogleSheetsApiClient.extractSheetId(sheetUrl)
      if (!sheetId) {
        throw new Error('無効なスプレッドシートURLです')
      }

      // APIクライアントを初期化
      const client = new GoogleSheetsApiClient(tokenInfo.accessToken)

      // スプレッドシートのメタデータを取得
      setImportStatus('スプレッドシート情報を取得中...')
      const metadata = await client.getSpreadsheetMetadata(sheetId)
      const sheetName = metadata.sheets[0].properties.title

      // データ範囲を自動検出
      setImportStatus('データ範囲を検出中...')
      const rangeInfo = await client.detectDataRange(sheetId, sheetName)

      // 設定を作成
      const configId = await createConfig({
        sheetId,
        sheetName,
        sheetUrl,
        agencyName,
        formatType: 'mogumo-prisma', // とりあえずmogumo形式と仮定
        dataRange: rangeInfo.dataRange,
        headerRow: rangeInfo.headerRow,
        dataStartRow: rangeInfo.dataStartRow,
        columnMappings: {},
        syncFrequency: 'manual',
        isActive: true,
      })

      // データを取得
      setImportStatus('データを取得中...')
      const sheetData = await client.getSheetData(sheetId, rangeInfo.dataRange)

      // パーサーで変換
      setImportStatus('データを変換中...')
      const parser = new MogumoPrismaParser()
      const config = {
        _id: configId.configId,
        sheetId,
        sheetName,
        sheetUrl,
        agencyName,
        formatType: 'mogumo-prisma' as const,
        headerRow: rangeInfo.headerRow,
        dataStartRow: rangeInfo.dataStartRow,
        columnMappings: {},
        syncFrequency: 'manual' as const,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const parsedData = parser.parse(sheetData.values || [], config)

      // データを保存
      setImportStatus('データを保存中...')
      const importId = `import_${Date.now()}`
      const saveResult = await saveData({
        data: parsedData,
        importId,
        sheetConfigId: configId.configId,
      })

      // インポート履歴を作成
      await createHistory({
        sheetConfigId: configId.configId,
        importId,
        status: 'success',
        totalRows: sheetData.values?.length || 0,
        processedRows: parsedData.length,
        successRows: saveResult.saved + saveResult.updated,
        errorRows: saveResult.errors,
      })

      setImportStatus(`インポート完了: ${saveResult.saved}件新規追加、${saveResult.updated}件更新`)

      // フォームをリセット
      setSheetUrl('')
      setAgencyName('')
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-green-600" />
            Google Sheets統合
          </h1>
          <p className="mt-2 text-gray-600">
            複数の代理店からのスプレッドシートデータを統合管理
          </p>
        </div>

        {/* 認証セクション */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Google認証</h2>
          <GoogleAuthButton />
        </div>

        {isAuthenticated && (
          <>
            {/* タブナビゲーション */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('import')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'import'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ArrowDownTrayIcon className="inline w-5 h-5 mr-1" />
                  インポート
                </button>
                <button
                  onClick={() => setActiveTab('configs')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'configs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CogIcon className="inline w-5 h-5 mr-1" />
                  設定一覧
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CalendarIcon className="inline w-5 h-5 mr-1" />
                  履歴
                </button>
              </nav>
            </div>

            {/* インポートタブ */}
            {activeTab === 'import' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">手動インポート</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      スプレッドシートURL
                    </label>
                    <input
                      type="text"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isImporting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      代理店名
                    </label>
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="例: mogumo Prisma"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isImporting}
                    />
                  </div>

                  {importStatus && (
                    <div className={`p-3 rounded-md ${
                      importStatus.includes('エラー')
                        ? 'bg-red-50 text-red-700'
                        : importStatus.includes('完了')
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {importStatus}
                    </div>
                  )}

                  <button
                    onClick={handleManualImport}
                    disabled={isImporting || !sheetUrl || !agencyName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isImporting ? 'インポート中...' : 'インポート開始'}
                  </button>
                </div>
              </div>
            )}

            {/* 設定一覧タブ */}
            {activeTab === 'configs' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">設定一覧</h2>

                {sheetConfigs && sheetConfigs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            代理店名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            シート名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            フォーマット
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            同期頻度
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            最終同期
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状態
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sheetConfigs.map((config) => (
                          <tr key={config._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {config.agencyName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {config.sheetName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {config.formatType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {config.syncFrequency}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {config.lastSyncAt
                                ? new Date(config.lastSyncAt).toLocaleString('ja-JP')
                                : '未同期'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                config.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {config.isActive ? '有効' : '無効'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">設定がありません</p>
                )}
              </div>
            )}

            {/* 履歴タブ */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">インポート履歴</h2>

                {importHistory && importHistory.length > 0 ? (
                  <div className="space-y-4">
                    {importHistory.map((history) => (
                      <div key={history._id} className="border-l-4 border-gray-200 pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              インポートID: {history.importId}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(history.startedAt).toLocaleString('ja-JP')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            history.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : history.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {history.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          処理: {history.processedRows}行 / 成功: {history.successRows}行 / エラー: {history.errorRows}行
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">履歴がありません</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}