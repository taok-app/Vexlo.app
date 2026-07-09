import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'Settings',
  description: 'Manage your settings and preferences',
}

interface SettingsItem {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}

const settingsItems: SettingsItem[] = [
  {
    title: 'Profile',
    description: 'Manage your account information and preferences',
    href: '/settings/profile',
    icon: '👤',
  },
  {
    title: 'Workspace',
    description: 'Configure workspace settings and members',
    href: '/settings/workspace',
    icon: '🏢',
  },
  {
    title: 'Appearance',
    description: 'Customize the look and feel of your dashboard',
    href: '/settings/appearance',
    icon: '🎨',
  },
  {
    title: 'API Keys',
    description: 'Manage your API keys and integrations',
    href: '/settings/api-keys',
    icon: '🔑',
  },
  {
    title: 'Billing',
    description: 'View your subscription and billing information',
    href: '/settings/billing',
    icon: '💳',
  },
]

export default function SettingsPage() {
  return (
    <DashboardLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings' },
          ]}
        />
      }
    >
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application settings</p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {settingsItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="ml-auto block">
                    Open →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
