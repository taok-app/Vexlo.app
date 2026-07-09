import { PageSkeleton } from '@/components/skeletons'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function WorkspaceLoading() {
  return (
    <DashboardLayout>
      <PageSkeleton />
    </DashboardLayout>
  )
}
