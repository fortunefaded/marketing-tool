import React, { useState, useEffect } from 'react'
import { 
  Calendar,
  Clock,
  Mail,
  FileText,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Check,
  X
} from 'lucide-react'
import { 
  scheduledReportService, 
  ScheduledReport,
  reportTemplates 
} from '../../services/scheduledReports'

export const ScheduledReportManager: React.FC = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'daily' as ScheduledReport['type'],
    format: 'pdf' as ScheduledReport['format'],
    recipients: [''],
    reportType: 'summary' as ScheduledReport['reportType'],
    schedule: {
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: 'Asia/Tokyo'
    },
    isActive: true
  })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = () => {
    const allReports = scheduledReportService.getReports()
    setReports(allReports)
  }

  const handleCreateReport = () => {
    if (!formData.name || formData.recipients.every(r => !r)) {
      alert('レポート名と配信先を入力してください')
      return
    }

    const validRecipients = formData.recipients.filter(r => r.trim())
    
    scheduledReportService.createReport({
      ...formData,
      recipients: validRecipients,
      includeSections: getDefaultSections(formData.reportType)
    })

    loadReports()
    setShowCreateModal(false)
    resetForm()
  }

  const handleUpdateReport = () => {
    if (!editingReport) return

    scheduledReportService.updateReport(editingReport.id, {
      ...formData,
      recipients: formData.recipients.filter(r => r.trim())
    })

    loadReports()
    setEditingReport(null)
    resetForm()
  }

  const handleDeleteReport = (id: string) => {
    if (window.confirm('このレポートを削除しますか？')) {
      scheduledReportService.deleteReport(id)
      loadReports()
    }
  }

  const handleToggleActive = (report: ScheduledReport) => {
    scheduledReportService.updateReport(report.id, {
      isActive: !report.isActive
    })
    loadReports()
  }

  const handleRunNow = async (id: string) => {
    const result = await scheduledReportService.runReport(id)
    if (result.success) {
      alert('レポートの生成が完了しました')
    } else {
      alert(`エラー: ${result.error}`)
    }
    loadReports()
  }

  const handleEditReport = (report: ScheduledReport) => {
    setEditingReport(report)
    setFormData({
      name: report.name,
      type: report.type,
      format: report.format,
      recipients: report.recipients.length > 0 ? report.recipients : [''],
      reportType: report.reportType,
      schedule: report.schedule,
      isActive: report.isActive
    })
  }

  const handleAddRecipient = () => {
    setFormData({
      ...formData,
      recipients: [...formData.recipients, '']
    })
  }

  const handleRemoveRecipient = (index: number) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index)
    })
  }

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...formData.recipients]
    newRecipients[index] = value
    setFormData({
      ...formData,
      recipients: newRecipients
    })
  }

  const handleUseTemplate = (templateKey: keyof typeof reportTemplates) => {
    const template = reportTemplates[templateKey]
    setFormData({
      ...formData,
      ...template,
      recipients: ['']
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'daily',
      format: 'pdf',
      recipients: [''],
      reportType: 'summary',
      schedule: {
        time: '09:00',
        dayOfWeek: 1,
        dayOfMonth: 1,
        timezone: 'Asia/Tokyo'
      },
      isActive: true
    })
  }

  const getDefaultSections = (reportType: string): string[] => {
    switch (reportType) {
      case 'summary':
        return ['sales', 'customers', 'top-products']
      case 'detailed':
        return ['sales', 'customers', 'rfm', 'cohort', 'basket']
      case 'kpi':
        return ['kpi-overview', 'roas', 'ltv', 'churn']
      default:
        return []
    }
  }

  const formatSchedule = (report: ScheduledReport): string => {
    const time = report.schedule.time
    
    switch (report.type) {
      case 'daily':
        return `毎日 ${time}`
      case 'weekly':
        const days = ['日', '月', '火', '水', '木', '金', '土']
        return `毎週${days[report.schedule.dayOfWeek || 0]}曜日 ${time}`
      case 'monthly':
        return `毎月${report.schedule.dayOfMonth}日 ${time}`
      default:
        return time
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            スケジュールレポート
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* レポート一覧 */}
      <div className="p-6">
        {reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>スケジュールされたレポートがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div
                key={report.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">
                        {report.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.isActive ? '有効' : '無効'}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatSchedule(report)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {report.format.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {report.recipients.length}件
                      </span>
                    </div>

                    {report.lastRun && (
                      <p className="mt-2 text-xs text-gray-500">
                        最終実行: {new Date(report.lastRun).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      次回実行: {new Date(report.nextRun).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(report)}
                      className={`p-2 rounded-md ${
                        report.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={report.isActive ? '無効化' : '有効化'}
                    >
                      {report.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleRunNow(report.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                      title="今すぐ実行"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditReport(report)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                      title="編集"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {(showCreateModal || editingReport) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingReport ? 'レポートを編集' : '新規レポートを作成'}
            </h3>

            {/* テンプレート選択（新規作成時のみ） */}
            {!editingReport && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  テンプレートを使用
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUseTemplate('dailySummary')}
                    className="p-2 text-sm border rounded hover:bg-gray-50"
                  >
                    日次サマリー
                  </button>
                  <button
                    onClick={() => handleUseTemplate('weeklyAnalysis')}
                    className="p-2 text-sm border rounded hover:bg-gray-50"
                  >
                    週次分析
                  </button>
                  <button
                    onClick={() => handleUseTemplate('monthlyKPI')}
                    className="p-2 text-sm border rounded hover:bg-gray-50"
                  >
                    月次KPI
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* レポート名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  レポート名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="例：日次売上レポート"
                />
              </div>

              {/* レポートタイプ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    配信頻度
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ファイル形式
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>

              {/* スケジュール設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配信時刻
                </label>
                <div className="flex gap-4">
                  <input
                    type="time"
                    value={formData.schedule.time}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, time: e.target.value }
                    })}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  {formData.type === 'weekly' && (
                    <select
                      value={formData.schedule.dayOfWeek}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule, dayOfWeek: Number(e.target.value) }
                      })}
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={0}>日曜日</option>
                      <option value={1}>月曜日</option>
                      <option value={2}>火曜日</option>
                      <option value={3}>水曜日</option>
                      <option value={4}>木曜日</option>
                      <option value={5}>金曜日</option>
                      <option value={6}>土曜日</option>
                    </select>
                  )}
                  
                  {formData.type === 'monthly' && (
                    <select
                      value={formData.schedule.dayOfMonth}
                      onChange={(e) => setFormData({
                        ...formData,
                        schedule: { ...formData.schedule, dayOfMonth: Number(e.target.value) }
                      })}
                      className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}日</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* 配信先 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配信先メールアドレス
                </label>
                {formData.recipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={recipient}
                      onChange={(e) => handleRecipientChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                      placeholder="example@company.com"
                    />
                    {formData.recipients.length > 1 && (
                      <button
                        onClick={() => handleRemoveRecipient(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddRecipient}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  + 配信先を追加
                </button>
              </div>

              {/* レポートタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  レポートタイプ
                </label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="summary">サマリー</option>
                  <option value="detailed">詳細</option>
                  <option value="kpi">KPI</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingReport(null)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={editingReport ? handleUpdateReport : handleCreateReport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {editingReport ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}