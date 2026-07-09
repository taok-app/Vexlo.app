'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ErrorState } from '@/components/empty-state'
import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="p-8">
        <ErrorState
          title="Dashboard Error"
          description="Failed to load the dashboard. Please try again."
          onRetry={reset}
          error={error}
        />
      </div>
    </DashboardLayout>
  )
}
