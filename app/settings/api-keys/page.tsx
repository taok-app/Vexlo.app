import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Plus, Trash2 } from 'lucide-react'

export const metadata = {
  title: 'API Keys',
  description: 'Manage your API keys',
}

export default function APIKeysPage() {
  return (
    <DashboardLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings', href: '/settings' },
            { label: 'API Keys' },
          ]}
        />
      }
    >
      <div className="space-y-8 p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground">Manage your API keys and access tokens</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Key
          </Button>
        </div>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>Keep your API keys secure and never share them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Production Key</p>
                  <p className="text-sm text-muted-foreground truncate">sk_live_••••••••••••••••</p>
                  <p className="text-xs text-muted-foreground mt-1">Created Dec 15, 2024</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Learn how to use the API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">Check out our API documentation to get started with integrations.</p>
              <Button variant="outline">View Documentation</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
