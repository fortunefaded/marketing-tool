import React from 'react'
import { ECForceNav } from './ECForceNav'

interface ECForceLayoutProps {
  children: React.ReactNode
}

export const ECForceLayout: React.FC<ECForceLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ECForceNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
