'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ErrorState } from '@/components/empty-state'
import { useEffect } from 'react'

export default function APIKeysError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('API Keys error:', error)
  }, [error])

  return (
    <DashboardLayout>
      <div className="p-8">
        <ErrorState
          title="API Keys Error"
          description="Failed to load API keys. Please try again."
          onRetry={reset}
          error={error}
        />
      </div>
    </DashboardLayout>
  )
}
