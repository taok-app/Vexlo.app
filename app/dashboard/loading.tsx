import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageSkeleton } from '@/components/skeletons'

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <PageSkeleton />
    </DashboardLayout>
  )
}
