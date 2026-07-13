import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Code2, Brain, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard',
  description: 'Welcome to Vexlo AI dashboard',
}

interface StatCard {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

function StatsCard({ label, value, icon: Icon, href }: StatCard) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">View details →</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function RecentActivityItem() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">Research session started</p>
        <p className="text-xs text-muted-foreground">2 hours ago</p>
      </div>
      <Link href="/research">
        <Button variant="ghost" size="sm">
          View
        </Button>
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardLayout breadcrumb={<Breadcrumb items={[{ label: 'Dashboard' }]} />}>
      <div className="space-y-8 p-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your workspace today.</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Research Sessions" value="12" icon={BookOpen} href="/research" />
          <StatsCard label="Engineering Tasks" value="8" icon={Code2} href="/engineering" />
          <StatsCard label="Knowledge Docs" value="24" icon={Brain} href="/knowledge" />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Code2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/research">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm">New Research</span>
              </Button>
            </Link>
            <Link href="/engineering">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Code2 className="h-5 w-5" />
                <span className="text-sm">New Task</span>
              </Button>
            </Link>
            <Link href="/knowledge">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Brain className="h-5 w-5" />
                <span className="text-sm">Upload Document</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Settings</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <RecentActivityItem key={i} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">API Quota</span>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm text-muted-foreground">45%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
