'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ErrorState } from '@/components/empty-state'
import { useEffect } from 'react'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Settings error:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="p-8">
        <ErrorState
          title="Settings Error"
          description="Failed to load settings page. Please try again."
          onRetry={reset}
          error={error}
        />
      </div>
    </DashboardLayout>
  )
}
