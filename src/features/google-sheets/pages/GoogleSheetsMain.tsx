/**
 * Google Sheets統合メインページ
 */

import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useGoogleSheetsAuth } from '../hooks/useGoogleSheetsAuth'
import { DocumentTextIcon, CogIcon, ArrowDownTrayIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { GoogleSheetsApiClient } from '../utils/google-sheets-api'
import { MogumoPrismaParser } from '../parsers/mogumo-parser'

export const GoogleSheetsMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'configs' | 'history'>('import')
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string>('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [agencyName, setAgencyName] = useState('')

  // 認証フックを使用
  const {
    isAuthenticated,
    googleSheetsTokens,
    googleAdsTokens,
    startAuth,
    hasGoogleAdsAuth,
    getValidToken,
  } = useGoogleSheetsAuth()

  const sheetConfigs = useQuery(api.googleSheets.listSheetConfigs)
  const importHistory = useQuery(api.googleSheets.listImportHistory, { limit: 10 })

  const createConfig = useMutation(api.googleSheets.createSheetConfig)
  const saveData = useMutation(api.googleSheets.saveUnifiedPerformanceData)
  const createHistory = useMutation(api.googleSheets.createImportHistory)

  // 手動インポート
  const handleManualImport = async () => {
    if (!sheetUrl || !agencyName) {
      alert('スプレッドシートURLと代理店名を入力してください')
      return
    }

    const tokenInfo = await getValidToken()
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

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Google Sheetsと連携済み
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-2">
                  Google Sheetsと未連携
                </div>

                {!import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Google Client IDが設定されていません
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>.env.localファイルを確認してください。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={startAuth}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#4285f4] hover:bg-[#357ae8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285f4]"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="white"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="white"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="white"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="white"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Googleアカウントでログイン
                  </button>
                )}
              </div>
            )}
          </div>
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