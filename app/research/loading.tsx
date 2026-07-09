import { PageSkeleton } from '@/components/skeletons'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function ResearchLoading() {
  return (
    <DashboardLayout>
      <PageSkeleton />
    </DashboardLayout>
  )
}
