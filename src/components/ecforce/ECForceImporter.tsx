import React, { useState, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { ECForceOrder, ECForceImportProgress } from '../../types/ecforce'
import { ECForceCSVParserV2 } from '../../utils/ecforce-csv-parser-v2'
import { ECForceDuplicateHandler, DuplicateStrategy } from '../../utils/ecforce-duplicate-handler'
import { ECForceStorage } from '../../utils/ecforce-storage'
import { ECForceDataSummary } from './ECForceDataSummary'
import { ProgressBar } from '../common/ProgressBar'
import { ImportHistoryManager } from '../../utils/import-history'
import { ImportHistoryComponent } from './ImportHistory'

export const ECForceImporter: React.FC = () => {
  const [importProgress, setImportProgress] = useState<ECForceImportProgress>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  // 初期データをストレージから読み込む
  const [importedData, setImportedData] = useState<ECForceOrder[]>(() => {
    return ECForceStorage.load()
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip')
  const [duplicateStats, setDuplicateStats] = useState<{
    skipped: number
    replaced: number
    imported: number
  } | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['CSVファイルを選択してください'])
      return
    }

    setImportProgress({
      status: 'uploading',
      progress: 20,
      message: 'ファイルを読み込んでいます...'
    })
    setErrors([])

    const fileSize = file.size
    const filename = file.name

    try {
      // CSVファイルをパース
      setImportProgress({
        status: 'parsing',
        progress: 50,
        message: 'データを解析しています...'
      })

      const orders = await ECForceCSVParserV2.parseFile(file)

      // 現在の保存済みデータを取得
      const existingOrders = ECForceStorage.load()
      
      // 重複チェック
      const stats = ECForceDuplicateHandler.getDuplicateStats(existingOrders, orders)
      
      setImportProgress({
        status: 'importing',
        progress: 80,
        message: `${orders.length}件のデータを処理しています（${stats.duplicates}件の重複を検出）...`
      })

      // 重複処理
      const result = ECForceDuplicateHandler.handleDuplicates(
        existingOrders,
        orders,
        duplicateStrategy
      )

      // ストレージに保存
      ECForceStorage.save(result.imported)
      
      setImportedData(result.imported)
      setDuplicateStats({
        skipped: result.skipped.length,
        replaced: result.replaced.length,
        imported: stats.unique
      })
      
      // データ更新イベントを発火
      window.dispatchEvent(new CustomEvent('ecforce-data-updated', {
        detail: result.imported
      }))

      setImportProgress({
        status: 'complete',
        progress: 100,
        message: `${stats.unique}件の新規データをインポートしました${stats.duplicates > 0 ? `（${stats.duplicates}件の重複を${duplicateStrategy === 'skip' ? 'スキップ' : '置換'}）` : ''}`
      })

      // インポート履歴を保存
      ImportHistoryManager.addHistory({
        filename,
        recordCount: orders.length,
        duplicatesFound: stats.duplicates,
        duplicatesSkipped: duplicateStrategy === 'skip' ? result.skipped.length : 0,
        totalProcessed: stats.unique,
        fileSize,
        status: 'success',
        metadata: {
          uniqueCustomers: new Set(result.imported.map(o => o.顧客番号)).size,
          uniqueProducts: new Set(result.imported.flatMap(o => o.購入商品 || [])).size,
          totalRevenue: result.imported.reduce((sum, o) => sum + o.合計, 0)
        }
      })

    } catch (error) {
      setImportProgress({
        status: 'error',
        progress: 0,
        message: 'インポートに失敗しました'
      })
      setErrors([error instanceof Error ? error.message : 'エラーが発生しました'])

      // エラー履歴を保存
      ImportHistoryManager.addHistory({
        filename,
        recordCount: 0,
        duplicatesFound: 0,
        duplicatesSkipped: 0,
        totalProcessed: 0,
        fileSize,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'エラーが発生しました'
      })
    }
  }, [duplicateStrategy])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        EC Force データインポート
      </h1>

      {/* 重複処理設定 */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">重複データの処理方法</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="duplicateStrategy"
              value="skip"
              checked={duplicateStrategy === 'skip'}
              onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateStrategy)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              スキップ - 既存データを保持し、重複する新規データを無視
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="duplicateStrategy"
              value="replace"
              checked={duplicateStrategy === 'replace'}
              onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateStrategy)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              置き換え - 重複データを新しいデータで上書き
            </span>
          </label>
        </div>
      </div>

      {/* ファイルアップロードエリア */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              CSVファイルをドラッグ＆ドロップ
            </p>
            <p className="text-sm text-gray-500 mt-1">
              または、クリックしてファイルを選択
            </p>
          </div>
          <div className="text-xs text-gray-500">
            EC Forceからエクスポートした注文CSVファイルをアップロードしてください
          </div>
          <div className="mt-2">
            <a
              href="/sample-data/ecforce-sample.csv"
              download
              className="text-xs text-indigo-600 hover:text-indigo-500 underline"
            >
              サンプルCSVファイルをダウンロード
            </a>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プログレスバー */}
      {importProgress.status !== 'idle' && (
        <div className="mt-6">
          <ProgressBar
            progress={importProgress.progress}
            message={importProgress.message}
            color={
              importProgress.status === 'error' ? 'red' :
              importProgress.status === 'complete' ? 'green' :
              'blue'
            }
          />
        </div>
      )}

      {/* インポート成功メッセージ */}
      {importProgress.status === 'complete' && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                インポートが完了しました
              </p>
              {duplicateStats && duplicateStats.skipped + duplicateStats.replaced > 0 && (
                <div className="mt-2 text-sm text-green-700">
                  <p>• 新規インポート: {duplicateStats.imported}件</p>
                  {duplicateStats.skipped > 0 && (
                    <p>• スキップ: {duplicateStats.skipped}件</p>
                  )}
                  {duplicateStats.replaced > 0 && (
                    <p>• 置き換え: {duplicateStats.replaced}件</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* データサマリー */}
      {importedData.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              データサマリー（全{importedData.length}件）
            </h2>
            <button
              onClick={() => {
                if (window.confirm('すべてのデータを削除しますか？')) {
                  ECForceStorage.clear()
                  setImportedData([])
                  window.dispatchEvent(new CustomEvent('ecforce-data-updated', {
                    detail: []
                  }))
                }
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              データをクリア
            </button>
          </div>
          <ECForceDataSummary data={importedData} />
        </div>
      )}

      {/* インポートデータのプレビュー */}
      {importedData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            インポートデータ ({importedData.length}件)
          </h2>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      受注ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      受注日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顧客番号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メールアドレス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      小計
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      購入オファー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      広告主
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      定期ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importedData.slice(0, 20).map((order) => (
                    <tr key={order.受注ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.受注ID}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.受注日}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.顧客番号}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.メールアドレス}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{order.小計.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.購入オファー}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.広告主名}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.定期ステータス === '有効'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.定期ステータス}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {importedData.length > 20 && (
              <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
                他 {importedData.length - 20} 件のデータ
              </div>
            )}
          </div>
        </div>
      )}

      {/* インポート履歴 */}
      <div className="mt-12">
        <ImportHistoryComponent />
      </div>
    </div>
  )
}