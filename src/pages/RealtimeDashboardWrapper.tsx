import React from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { RealtimeDashboard } from './RealtimeDashboard'

export const RealtimeDashboardWrapper: React.FC = () => {
  return (
    <ErrorBoundary>
      <RealtimeDashboard />
    </ErrorBoundary>
  )
}