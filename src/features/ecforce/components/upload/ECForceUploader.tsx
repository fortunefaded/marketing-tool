import React, { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { CSVDropzone } from './CSVDropzone'
import { CSVPreview } from './CSVPreview'
import { UploadProgress } from './UploadProgress'
import { parseECForceCSV, previewECForceCSV } from '../../utils/csvParser'

export const ECForceUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [skipDuplicates, setSkipDuplicates] = useState(false) // デフォルトは更新モード
  const [previewData, setPreviewData] = useState<{
    headers: string[]
    rows: any[]
    dateRange?: { startDate: string; endDate: string; uniqueDates: string[] }
    totalRows?: number
    filteredRows?: number
  } | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  // 重複チェック機能は無効化済み

  const createImport = useMutation(api.ecforce.createImport)
  const savePerformanceData = useMutation(api.ecforce.savePerformanceData)
  const updateImportStatus = useMutation(api.ecforce.updateImportStatus)

  // 重複チェック機能は完全に無効化（大量データ対応）

  // ファイル選択時の処理
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setErrors([])
    setUploadResult(null)

    // プレビュー生成
    const preview = await previewECForceCSV(selectedFile)
    if (preview.error) {
      console.error('CSVプレビューエラー:', preview.error)
      // エラーメッセージをより詳細に
      if (preview.error.includes('日付')) {
        setErrors([
          preview.error,
          'CSVファイルに日付フィールドが見つかりません。',
          '「日付」「期間」「購入日」などのヘッダーが含まれているか確認してください。'
        ])
      } else {
        setErrors([preview.error])
      }
      return
    }

    setPreviewData(preview)

    // 重複チェックを完全に無効化（大量データ対応）
    if (preview.rows.length > 0 && preview.dateRange) {
      const uniqueDates = preview.dateRange.uniqueDates
      setWarnings([
        `${uniqueDates.length}日分のデータが検出されました。重複処理はアップロード時に実行されます。`,
      ])
    }
  }, [])

  // アップロード処理
  const handleUpload = useCallback(async () => {
    if (!file) {
      setErrors(['ファイルを選択してください'])
      return
    }

    if (!previewData?.dateRange) {
      console.error('dateRange が見つかりません:', previewData)
      setErrors([
        'CSV内に有効な日付データが見つかりません',
        'プレビューデータ:',
        `- ヘッダー数: ${previewData?.headers?.length || 0}`,
        `- 行数: ${previewData?.rows?.length || 0}`,
        `- dateRange: ${JSON.stringify(previewData?.dateRange || 'undefined')}`
      ])
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setErrors([])

    try {
      // CSVパース（複数日付対応）
      setUploadProgress(10)
      const parseResult = await parseECForceCSV(file)

      if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
        setErrors(parseResult.errors.map((e) => `行${e.row}: ${e.message}`))
        setIsUploading(false)
        return
      }

      // インポートセッション作成
      setUploadProgress(20)
      const importSession = await createImport({
        fileName: file.name,
        fileSize: file.size,
        dataDate: parseResult.dateRange?.startDate || 'unknown',
        source: 'manual',
        totalRows: parseResult.totalRows,
        filteredRows: parseResult.filteredRows,
      })

      // バッチサイズ設定（一度に処理するレコード数）
      const batchSize = 50
      const batches = []
      for (let i = 0; i < parseResult.data.length; i += batchSize) {
        batches.push(parseResult.data.slice(i, i + batchSize))
      }

      let totalProcessed = 0
      let totalSuccess = 0
      let totalDuplicates = 0
      let totalErrors = 0
      const allErrors: Array<{ row: number; advertiser?: string; message: string }> = []

      // バッチごとに処理
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const progress = 20 + (70 * (i + 1)) / batches.length
        setUploadProgress(progress)

        try {
          const result = await savePerformanceData({
            importId: importSession.importId,
            data: batch,
            skipDuplicates,
          })

          totalProcessed += batch.length
          totalSuccess += result.success
          totalDuplicates += result.duplicates
          totalErrors += result.errors

          if (result.errorDetails) {
            allErrors.push(
              ...result.errorDetails.map((e: any, idx: number) => ({
                row: i * batchSize + idx + 2,
                advertiser: e.advertiser,
                message: e.message,
              }))
            )
          }

          // 進捗更新
          await updateImportStatus({
            importId: importSession.importId,
            processedRows: totalProcessed,
            successRows: totalSuccess,
            duplicateRows: totalDuplicates,
            errorRows: totalErrors,
          })
        } catch (error) {
          console.error('バッチ処理エラー:', error)
          totalErrors += batch.length
          allErrors.push({
            row: i * batchSize + 2,
            message: error instanceof Error ? error.message : 'バッチ処理エラー',
          })
        }
      }

      // 最終ステータス更新
      setUploadProgress(90)
      const finalStatus = totalErrors === 0 ? 'success' : totalSuccess === 0 ? 'failed' : 'partial'

      await updateImportStatus({
        importId: importSession.importId,
        status: finalStatus,
        processedRows: totalProcessed,
        successRows: totalSuccess,
        duplicateRows: totalDuplicates,
        errorRows: totalErrors,
        errors: allErrors.slice(0, 100), // 最大100件のエラーを保存
      })

      setUploadProgress(100)
      setUploadResult({
        importId: importSession.importId,
        status: finalStatus,
        processedRows: totalProcessed,
        successRows: totalSuccess,
        duplicateRows: totalDuplicates,
        errorRows: totalErrors,
        errors: allErrors,
      })

      // 成功時はフォームをリセット
      if (finalStatus === 'success') {
        setTimeout(() => {
          setFile(null)
          setPreviewData(null)
          setWarnings([])
          setUploadProgress(0)
        }, 3000)
      }
    } catch (error) {
      console.error('アップロードエラー:', error)
      setErrors([error instanceof Error ? error.message : 'アップロード中にエラーが発生しました'])
    } finally {
      setIsUploading(false)
    }
  }, [file, skipDuplicates, createImport, savePerformanceData, updateImportStatus, previewData])

  return (
    <div className="space-y-6">
      {/* ファイルアップロード */}
      <div className="rounded-lg bg-white p-6 shadow">
        <CSVDropzone
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          selectedFile={file}
        />
      </div>

      {/* プレビュー */}
      {previewData && (
        <div className="rounded-lg bg-white p-6 shadow">
          <CSVPreview
            headers={previewData.headers}
            rows={previewData.rows}
            dateRange={previewData.dateRange}
            duplicates={[]} // 事前重複チェック無効化
            totalRows={previewData.totalRows}
            filteredRows={previewData.filteredRows}
          />
        </div>
      )}

      {/* 重複処理オプション */}
      {previewData && !isUploading && (
        <div className="rounded-lg bg-blue-50 p-6">
          <h3 className="text-sm font-medium text-blue-900">重複データの処理設定</h3>
          <p className="text-sm text-blue-700 mt-1">
            アップロード時に重複データが検出された場合の処理方法を選択してください
          </p>
          <div className="mt-3 space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                checked={skipDuplicates}
                onChange={() => setSkipDuplicates(true)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                重複データをスキップ（既存データを保持）
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!skipDuplicates}
                onChange={() => setSkipDuplicates(false)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                重複データを上書き（新しいデータで更新）
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 警告表示 */}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <h3 className="text-sm font-medium text-yellow-800">注意</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-yellow-700">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">エラー</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* アップロードボタン */}
      {file && !isUploading && !uploadResult && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            アップロード開始
          </button>
        </div>
      )}

      {/* アップロード進捗 */}
      {isUploading && uploadResult && (
        <UploadProgress
          progress={uploadProgress}
          processedRows={uploadResult.processedRows || 0}
          totalRows={
            previewData?.filteredRows ||
            previewData?.rows.filter((r: any) => r['デバイス'] === '合計').length ||
            0
          }
          successRows={uploadResult.successRows || 0}
          errorRows={uploadResult.errorRows || 0}
          duplicateRows={uploadResult.duplicateRows || 0}
          errors={uploadResult.errors || []}
        />
      )}

      {/* 完了メッセージ */}
      {uploadResult && !isUploading && (
        <div
          className={`rounded-lg p-4 ${
            uploadResult.status === 'success'
              ? 'bg-green-50'
              : uploadResult.status === 'partial'
                ? 'bg-yellow-50'
                : 'bg-red-50'
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              uploadResult.status === 'success'
                ? 'text-green-800'
                : uploadResult.status === 'partial'
                  ? 'text-yellow-800'
                  : 'text-red-800'
            }`}
          >
            {uploadResult.status === 'success'
              ? 'アップロード完了'
              : uploadResult.status === 'partial'
                ? '部分的に完了'
                : 'アップロード失敗'}
          </h3>
          <div className="mt-2 text-sm">
            <p>処理済み: {uploadResult.processedRows}件</p>
            <p>成功: {uploadResult.successRows}件</p>
            <p>重複: {uploadResult.duplicateRows}件</p>
            <p>エラー: {uploadResult.errorRows}件</p>
          </div>
        </div>
      )}
    </div>
  )
}
