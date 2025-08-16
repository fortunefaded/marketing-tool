import React, { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FilePlus2 } from 'lucide-react'
import { ECForceOrder } from '../../types/ecforce'
import { exportToCSV } from '../../utils/export/csvExporter'
import { exportToExcel } from '../../utils/export/excelExporter'
import { generatePDFReport } from '../../utils/export/pdfReportGenerator'

interface DataExporterProps {
  orders: ECForceOrder[]
  filteredOrders?: ECForceOrder[]
  reportType?: 'sales' | 'customer' | 'product' | 'full'
}

export const DataExporter: React.FC<DataExporterProps> = ({
  orders,
  filteredOrders,
  reportType = 'full'
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv')

  const dataToExport = filteredOrders || orders

  const handleExport = async () => {
    setIsExporting(true)

    try {
      switch (exportFormat) {
        case 'csv':
          await exportToCSV(dataToExport, reportType)
          break
        case 'excel':
          await exportToExcel(dataToExport, reportType)
          break
        case 'pdf':
          await generatePDFReport(dataToExport, reportType)
          break
      }
    } catch (error) {
      console.error('エクスポートエラー:', error)
      alert('エクスポート中にエラーが発生しました')
    } finally {
      setIsExporting(false)
    }
  }

  const exportOptions = [
    {
      value: 'csv',
      label: 'CSV',
      icon: FileText,
      description: 'データをCSV形式でエクスポート'
    },
    {
      value: 'excel',
      label: 'Excel',
      icon: FileSpreadsheet,
      description: 'データをExcel形式でエクスポート'
    },
    {
      value: 'pdf',
      label: 'PDFレポート',
      icon: FilePlus2,
      description: '分析レポートをPDFで生成'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        データエクスポート
      </h3>

      <div className="space-y-4">
        {/* フォーマット選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            エクスポート形式
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {exportOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setExportFormat(option.value as any)}
                  className={`
                    relative rounded-lg border p-4 flex flex-col items-center text-center
                    transition-all cursor-pointer
                    ${exportFormat === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`h-8 w-8 mb-2 ${
                    exportFormat === option.value ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    exportFormat === option.value ? 'text-indigo-900' : 'text-gray-900'
                  }`}>
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* データ情報 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between mb-1">
              <span>総データ数:</span>
              <span className="font-medium">{orders.length}件</span>
            </div>
            {filteredOrders && (
              <div className="flex justify-between">
                <span>フィルター適用後:</span>
                <span className="font-medium">{dataToExport.length}件</span>
              </div>
            )}
          </div>
        </div>

        {/* エクスポートボタン */}
        <button
          onClick={handleExport}
          disabled={isExporting || dataToExport.length === 0}
          className={`
            w-full px-4 py-2 text-sm font-medium rounded-md
            flex items-center justify-center
            ${isExporting || dataToExport.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }
          `}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              エクスポート中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              エクスポート
            </>
          )}
        </button>
      </div>
    </div>
  )
}