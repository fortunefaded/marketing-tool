/* eslint-env browser */
import React, { useState, useCallback } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ECForceImportProgress } from '../../types/ecforce'
import { ECForceCSVParserV2 } from '../../utils/ecforce-csv-parser-v2'
import { DuplicateStrategy } from '../../utils/ecforce-duplicate-handler'
import { ECForceDataSummary } from './ECForceDataSummary'
import { ProgressBar } from '../common/ProgressBar'
import { ImportHistoryManager } from '../../utils/import-history'
import { ImportHistoryComponent } from './ImportHistory'
import { useECForceDataPaginated } from '../../hooks/useECForceDataPaginated'

export const ECForceImporter: React.FC = () => {
  const [importProgress, setImportProgress] = useState<ECForceImportProgress>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  
  // Convexからデータを取得（ページネーション対応）
  const { orders: importedData, totalCount, loadMore, hasMore } = useECForceDataPaginated({ pageSize: 100 })
  const importOrders = useMutation(api.ecforce.importOrders)
  const clearAllOrders = useMutation(api.ecforce.clearAllOrders)
  
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
      
      setImportProgress({
        status: 'importing',
        progress: 80,
        message: `${orders.length}件のデータをインポート中...`
      })

      // Convexに送信するためのデータを準備（日本語フィールドを英語に変換）
      const ordersForConvex = orders.map(order => ({
        orderId: order.受注ID || '',
        orderDate: order.受注日 || order.注文日 || '',
        purchaseDate: order.注文日 || order.受注日 || '',
        customerId: order.顧客ID || order.顧客番号 || '',
        customerNumber: order.顧客番号 || '',
        email: order.メールアドレス || '',
        postalCode: order.郵便番号,
        address: order.住所,
        subtotal: order.小計 || 0,
        discount: order.値引額,
        tax: order.消費税,
        shipping: order.送料,
        fee: order.手数料,
        pointsUsed: order.ポイント利用額,
        total: order.合計 || order.小計 || 0,
        products: order.購入商品,
        offer: order.購入オファー,
        subscriptionStatus: order.定期ステータス,
        deliveryStatus: order.配送ステータス,
        adCode: order.広告コード,
        advertiserName: order.広告主名,
        adMedia: order.広告媒体,
      }))

      // バッチサイズを設定（一度に大量のデータを送信しないように）
      const batchSize = 100
      let totalImported = 0
      let totalSkipped = 0
      let totalReplaced = 0

      for (let i = 0; i < ordersForConvex.length; i += batchSize) {
        const batch = ordersForConvex.slice(i, i + batchSize)
        
        // Convexにインポート
        const result = await importOrders({
          orders: batch,
          strategy: duplicateStrategy,
        })

        totalImported += result.imported
        totalSkipped += result.skipped
        totalReplaced += result.replaced

        // プログレスを更新
        const progress = 80 + (20 * (i + batch.length) / ordersForConvex.length)
        setImportProgress({
          status: 'importing',
          progress,
          message: `${i + batch.length}/${ordersForConvex.length}件を処理中...`
        })
      }
      
      setDuplicateStats({
        skipped: totalSkipped,
        replaced: totalReplaced,
        imported: totalImported
      })

      setImportProgress({
        status: 'complete',
        progress: 100,
        message: `${totalImported}件の新規データをインポートしました${totalSkipped > 0 || totalReplaced > 0 ? `（${totalSkipped}件スキップ、${totalReplaced}件置換）` : ''}`
      })

      // インポート履歴を保存
      ImportHistoryManager.addHistory({
        filename,
        recordCount: orders.length,
        duplicatesFound: totalSkipped + totalReplaced,
        duplicatesSkipped: totalSkipped,
        totalProcessed: totalImported,
        fileSize,
        status: 'success',
        metadata: {
          uniqueCustomers: new Set(ordersForConvex.map(o => o.customerNumber)).size,
          uniqueProducts: new Set(ordersForConvex.flatMap(o => o.products || [])).size,
          totalRevenue: ordersForConvex.reduce((sum, o) => sum + (o.total ?? 0), 0)
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
              データサマリー（{totalCount ? `全${totalCount.toLocaleString()}件中` : ''}{importedData.length.toLocaleString()}件表示）
            </h2>
            <button
              onClick={async () => {
                if (window.confirm('すべてのデータを削除しますか？')) {
                  try {
                    await clearAllOrders()
                    setDuplicateStats(null)
                    setImportProgress({
                      status: 'idle',
                      progress: 0,
                      message: ''
                    })
                  } catch (error) {
                    console.error('データクリアエラー:', error)
                    setErrors(['データのクリアに失敗しました'])
                  }
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
            インポートデータ ({importedData.length.toLocaleString()}件 / {totalCount?.toLocaleString() || '?'}件)
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
                        ¥{(order.小計 || 0).toLocaleString()}
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
            
            {(importedData.length > 20 || hasMore) && (
              <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500 flex justify-between items-center">
                <span>
                  {importedData.length > 20 && `最初の20件を表示中`}
                  {totalCount && ` (全${totalCount.toLocaleString()}件)`}
                </span>
                {hasMore && (
                  <button
                    onClick={loadMore}
                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    もっと読み込む
                  </button>
                )}
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