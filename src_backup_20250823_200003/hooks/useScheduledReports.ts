import { useCallback, useEffect, useRef } from 'react'
import { useConvex, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ScheduledReportServiceConvex, ScheduledReport } from '../services/scheduledReportsConvex'

export function useScheduledReports() {
  const convex = useConvex()
  const serviceRef = useRef<ScheduledReportServiceConvex | null>(null)

  // Initialize service
  useEffect(() => {
    if (convex && !serviceRef.current) {
      serviceRef.current = new ScheduledReportServiceConvex(convex as any)
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy()
        serviceRef.current = null
      }
    }
  }, [convex])

  // Convex queries
  const reports = useQuery(api.scheduledReports.getReports, {})
  const upcomingReports = useQuery(api.scheduledReports.getUpcomingReports, { limit: 10 })

  // Convex mutations - will be used when implementing the actual functionality

  // Create report
  const createReport = useCallback(
    async (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt' | 'nextRun'>) => {
      if (!serviceRef.current) throw new Error('Service not initialized')
      return await serviceRef.current.createReport(report)
    },
    []
  )

  // Update report
  const updateReport = useCallback(
    async (id: string, updates: Partial<ScheduledReport>) => {
      if (!serviceRef.current) throw new Error('Service not initialized')
      return await serviceRef.current.updateReport(id, updates)
    },
    []
  )

  // Delete report
  const deleteReport = useCallback(
    async (id: string) => {
      if (!serviceRef.current) throw new Error('Service not initialized')
      return await serviceRef.current.deleteReport(id)
    },
    []
  )

  // Run report manually
  const runReport = useCallback(
    async (id: string) => {
      if (!serviceRef.current) throw new Error('Service not initialized')
      return await serviceRef.current.runReport(id)
    },
    []
  )

  // Get report by ID
  const getReport = useCallback(
    async (id: string) => {
      if (!serviceRef.current) throw new Error('Service not initialized')
      return await serviceRef.current.getReport(id)
    },
    []
  )

  // Convert Convex data to ScheduledReport format
  const convertReports = (convexReports: any[]): ScheduledReport[] => {
    if (!convexReports) return []
    
    return convexReports.map((report) => {
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
    })
  }

  return {
    reports: convertReports(reports || []),
    upcomingReports: convertReports(upcomingReports || []),
    isLoading: reports === undefined,
    createReport,
    updateReport,
    deleteReport,
    runReport,
    getReport,
  }
}