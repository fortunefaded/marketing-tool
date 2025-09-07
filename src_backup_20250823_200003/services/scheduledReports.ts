// Removed unused imports
import { logger } from '../utils/logger'

export interface ScheduledReport {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly'
  format: 'csv' | 'excel' | 'pdf'
  recipients: string[]
  filters?: {
    dateRange?: { start: Date; end: Date }
    categories?: string[]
    status?: string[]
  }
  reportType: 'summary' | 'detailed' | 'kpi' | 'custom'
  includeSections?: string[]
  schedule: {
    time: string // HH:MM format
    dayOfWeek?: number // 0-6 for weekly
    dayOfMonth?: number // 1-31 for monthly
    timezone: string
  }
  lastRun?: Date
  nextRun: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface ReportGenerationResult {
  success: boolean
  filePath?: string
  error?: string
  generatedAt: Date
}

class ScheduledReportService {
  private reports: ScheduledReport[] = []
  private timerId: NodeJS.Timeout | null = null
  private STORAGE_KEY = 'scheduled_reports'

  constructor() {
    this.loadReports()
    this.startScheduler()
  }

  // レポートの読み込み
  private loadReports() {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        this.reports = parsed.map((report: any) => ({
          ...report,
          lastRun: report.lastRun ? new Date(report.lastRun) : undefined,
          nextRun: new Date(report.nextRun),
          createdAt: new Date(report.createdAt),
          updatedAt: new Date(report.updatedAt),
          filters: report.filters
            ? {
                ...report.filters,
                dateRange: report.filters.dateRange
                  ? {
                      start: new Date(report.filters.dateRange.start),
                      end: new Date(report.filters.dateRange.end),
                    }
                  : undefined,
              }
            : undefined,
        }))
      } catch (error) {
        logger.error('Failed to load scheduled reports:', error)
      }
    }
  }

  // レポートの保存
  private saveReports() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.reports))
  }

  // スケジューラーの開始
  private startScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId)
    }

    // 1分ごとにチェック
    this.timerId = setInterval(() => {
      this.checkAndRunReports()
    }, 60000) // 60秒
  }

  // レポートの実行チェック
  private async checkAndRunReports() {
    const now = new Date()

    for (const report of this.reports) {
      if (!report.isActive) continue

      if (now >= report.nextRun) {
        await this.runReport(report.id)
      }
    }
  }

  // 次回実行時刻の計算
  private calculateNextRun(report: ScheduledReport): Date {
    const now = new Date()
    const [hours, minutes] = report.schedule.time.split(':').map(Number)

    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    switch (report.type) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break

      case 'weekly': {
        const targetDay = report.schedule.dayOfWeek || 1 // デフォルトは月曜日
        let daysUntilTarget = (targetDay - nextRun.getDay() + 7) % 7
        if (daysUntilTarget === 0 && nextRun <= now) {
          daysUntilTarget = 7
        }
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        break
      }

      case 'monthly': {
        const targetDate = report.schedule.dayOfMonth || 1
        nextRun.setDate(targetDate)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
      }
    }

    return nextRun
  }

  // レポートの作成
  createReport(
    report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'nextRun'>
  ): ScheduledReport {
    const newReport: ScheduledReport = {
      ...report,
      id: `report-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRun: this.calculateNextRun(report as ScheduledReport),
    }

    this.reports.push(newReport)
    this.saveReports()

    return newReport
  }

  // レポートの更新
  updateReport(id: string, updates: Partial<ScheduledReport>): ScheduledReport | null {
    const index = this.reports.findIndex((r) => r.id === id)
    if (index === -1) return null

    const updatedReport = {
      ...this.reports[index],
      ...updates,
      updatedAt: new Date(),
    }

    // スケジュールが変更された場合は次回実行時刻を再計算
    if (updates.type || updates.schedule) {
      updatedReport.nextRun = this.calculateNextRun(updatedReport)
    }

    this.reports[index] = updatedReport
    this.saveReports()

    return updatedReport
  }

  // レポートの削除
  deleteReport(id: string): boolean {
    const index = this.reports.findIndex((r) => r.id === id)
    if (index === -1) return false

    this.reports.splice(index, 1)
    this.saveReports()

    return true
  }

  // レポートの実行
  async runReport(id: string): Promise<ReportGenerationResult> {
    const report = this.reports.find((r) => r.id === id)
    if (!report) {
      return {
        success: false,
        error: 'Report not found',
        generatedAt: new Date(),
      }
    }

    try {
      // ダミーのレポート生成（実際の実装では適切なデータ取得とエクスポートを行う）
      const result = await this.generateReport(report)

      // 実行履歴を更新
      report.lastRun = new Date()
      report.nextRun = this.calculateNextRun(report)
      this.saveReports()

      // メール送信のシミュレーション（実際の実装ではメールAPIを使用）
      if (result.success && result.filePath) {
        await this.sendReportEmail(report, result.filePath)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedAt: new Date(),
      }
    }
  }

  // レポートの生成
  private async generateReport(report: ScheduledReport): Promise<ReportGenerationResult> {
    try {
      // ここで実際のデータ取得とレポート生成を行う
      // 今回はシミュレーション
      const filePath = `/reports/${report.name}_${new Date().toISOString()}.${report.format}`

      return {
        success: true,
        filePath,
        generatedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        generatedAt: new Date(),
      }
    }
  }

  // メール送信（シミュレーション）
  private async sendReportEmail(report: ScheduledReport, filePath: string): Promise<void> {
    logger.debug(`Sending report "${report.name}" to:`, report.recipients)
    logger.debug(`Report file: ${filePath}`)

    // 実際の実装では、ここでメールAPIを呼び出す
    // 例: SendGrid, AWS SES, nodemailer など
  }

  // レポート一覧の取得
  getReports(): ScheduledReport[] {
    return [...this.reports]
  }

  // レポートの取得
  getReport(id: string): ScheduledReport | undefined {
    return this.reports.find((r) => r.id === id)
  }

  // アクティブなレポートの取得
  getActiveReports(): ScheduledReport[] {
    return this.reports.filter((r) => r.isActive)
  }

  // クリーンアップ
  destroy() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}

// シングルトンインスタンス
export const scheduledReportService = new ScheduledReportService()

// レポートテンプレート
export const reportTemplates = {
  dailySummary: {
    name: '日次売上サマリー',
    type: 'daily' as const,
    format: 'pdf' as const,
    reportType: 'summary' as const,
    includeSections: ['sales', 'customers', 'top-products'],
    schedule: {
      time: '09:00',
      timezone: 'Asia/Tokyo',
    },
  },
  weeklyAnalysis: {
    name: '週次分析レポート',
    type: 'weekly' as const,
    format: 'excel' as const,
    reportType: 'detailed' as const,
    includeSections: ['sales', 'customers', 'rfm', 'cohort'],
    schedule: {
      time: '10:00',
      dayOfWeek: 1, // 月曜日
      timezone: 'Asia/Tokyo',
    },
  },
  monthlyKPI: {
    name: '月次KPIレポート',
    type: 'monthly' as const,
    format: 'pdf' as const,
    reportType: 'kpi' as const,
    includeSections: ['kpi-overview', 'roas', 'ltv', 'churn'],
    schedule: {
      time: '09:30',
      dayOfMonth: 1,
      timezone: 'Asia/Tokyo',
    },
  },
}
