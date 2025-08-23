import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'

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

export class ScheduledReportServiceConvex {
  private convexClient: ConvexReactClient
  private timerId: NodeJS.Timeout | null = null

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient
    this.startScheduler()
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

    try {
      const reports = await this.convexClient.query(api.scheduledReports.getReports, {
        enabled: true,
      })

      for (const report of reports) {
        if (new Date(report.nextRun) <= now) {
          await this.runReport(report.id)
        }
      }
    } catch (error) {
      logger.error('Failed to check and run reports:', error)
    }
  }

  // 次回実行時刻の計算
  private calculateNextRun(report: ScheduledReport): Date {
    const now = new Date()
    const schedule = report.schedule
    const [hours, minutes] = schedule.time.split(':').map(Number)

    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    switch (report.type) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break

      case 'weekly': {
        const targetDay = schedule.dayOfWeek || 1 // デフォルトは月曜日
        let daysUntilTarget = (targetDay - nextRun.getDay() + 7) % 7
        if (daysUntilTarget === 0 && nextRun <= now) {
          daysUntilTarget = 7
        }
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        break
      }

      case 'monthly': {
        const targetDate = schedule.dayOfMonth || 1
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
  async createReport(
    report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'nextRun'>
  ): Promise<ScheduledReport> {
    const id = `report-${Date.now()}`
    const nextRun = this.calculateNextRun(report as ScheduledReport)

    const reportConfig = {
      filters: report.filters,
      reportType: report.reportType,
      includeSections: report.includeSections,
      schedule: report.schedule,
      format: report.format,
    }

    await this.convexClient.mutation(api.scheduledReports.saveReport, {
      id,
      name: report.name,
      type: report.type,
      config: reportConfig,
      recipients: report.recipients,
      enabled: report.isActive,
      nextRun: nextRun.toISOString(),
    })

    return {
      ...report,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRun,
    }
  }

  // レポートの更新
  async updateReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    try {
      const existing = await this.convexClient.query(api.scheduledReports.getReport, { id })
      if (!existing) return null

      const updateData: any = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.recipients !== undefined) updateData.recipients = updates.recipients
      if (updates.isActive !== undefined) updateData.enabled = updates.isActive

      // configの更新
      if (updates.filters || updates.reportType || updates.includeSections || updates.schedule || updates.format) {
        updateData.config = {
          ...(existing.config as any),
          filters: updates.filters,
          reportType: updates.reportType || (existing.config as any)?.reportType,
          includeSections: updates.includeSections || (existing.config as any)?.includeSections,
          schedule: updates.schedule || (existing.config as any)?.schedule,
          format: updates.format || (existing.config as any)?.format,
        }
      }

      // スケジュールが変更された場合は次回実行時刻を再計算
      if (updates.type || updates.schedule) {
        const updatedReport = { ...existing, ...updates } as ScheduledReport
        updateData.nextRun = this.calculateNextRun(updatedReport).toISOString()
      }

      await this.convexClient.mutation(api.scheduledReports.updateReport, {
        id,
        ...updateData,
      })

      // 更新されたレポートを返す
      const updated = await this.convexClient.query(api.scheduledReports.getReport, { id })
      if (!updated) return null

      return this.convertFromConvex(updated)
    } catch (error) {
      logger.error('Failed to update report:', error)
      return null
    }
  }

  // レポートの削除
  async deleteReport(id: string): Promise<boolean> {
    try {
      const result = await this.convexClient.mutation(api.scheduledReports.deleteReport, { id })
      return result.deleted
    } catch (error) {
      logger.error('Failed to delete report:', error)
      return false
    }
  }

  // レポートの実行
  async runReport(id: string): Promise<ReportGenerationResult> {
    try {
      const report = await this.convexClient.query(api.scheduledReports.getReport, { id })
      if (!report) {
        return {
          success: false,
          error: 'Report not found',
          generatedAt: new Date(),
        }
      }

      // ダミーのレポート生成（実際の実装では適切なデータ取得とエクスポートを行う）
      const result = await this.generateReport(this.convertFromConvex(report))

      // 実行履歴を更新
      const nextRun = this.calculateNextRun(this.convertFromConvex(report))
      await this.convexClient.mutation(api.scheduledReports.updateReport, {
        id,
        lastRun: new Date().toISOString(),
        nextRun: nextRun.toISOString(),
      })

      // メール送信のシミュレーション（実際の実装ではメールAPIを使用）
      if (result.success && result.filePath) {
        await this.sendReportEmail(this.convertFromConvex(report), result.filePath)
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
      const format = report.format || 'pdf'
      const filePath = `/reports/${report.name}_${new Date().toISOString()}.${format}`

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
  async getReports(): Promise<ScheduledReport[]> {
    try {
      const reports = await this.convexClient.query(api.scheduledReports.getReports, {})
      return reports.map(this.convertFromConvex)
    } catch (error) {
      logger.error('Failed to get reports:', error)
      return []
    }
  }

  // レポートの取得
  async getReport(id: string): Promise<ScheduledReport | undefined> {
    try {
      const report = await this.convexClient.query(api.scheduledReports.getReport, { id })
      return report ? this.convertFromConvex(report) : undefined
    } catch (error) {
      logger.error('Failed to get report:', error)
      return undefined
    }
  }

  // アクティブなレポートの取得
  async getActiveReports(): Promise<ScheduledReport[]> {
    try {
      const reports = await this.convexClient.query(api.scheduledReports.getReports, {
        enabled: true,
      })
      return reports.map(this.convertFromConvex)
    } catch (error) {
      logger.error('Failed to get active reports:', error)
      return []
    }
  }

  // Convexからの変換
  private convertFromConvex(report: any): ScheduledReport {
    const config = report.config || {}
    return {
      id: report.id,
      name: report.name,
      type: report.type,
      format: config.format || 'pdf',
      recipients: report.recipients,
      filters: config.filters,
      reportType: config.reportType || 'summary',
      includeSections: config.includeSections,
      schedule: config.schedule || { time: '09:00', timezone: 'Asia/Tokyo' },
      lastRun: report.lastRun ? new Date(report.lastRun) : undefined,
      nextRun: new Date(report.nextRun),
      isActive: report.enabled,
      createdAt: new Date(report.createdAt),
      updatedAt: new Date(report.updatedAt),
    }
  }

  // クリーンアップ
  destroy() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}

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