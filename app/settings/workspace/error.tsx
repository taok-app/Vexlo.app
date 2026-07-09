'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ErrorState } from '@/components/empty-state'
import { useEffect } from 'react'

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Workspace error:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="p-8">
        <ErrorState
          title="Workspace Error"
          description="Failed to load workspace settings. Please try again."
          onRetry={reset}
          error={error}
        />
      </div>
    </DashboardLayout>
  )
}
