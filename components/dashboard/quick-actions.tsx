import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ReactNode } from 'react'

export interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
}

export function QuickActions({ actions, title = 'Quick Actions' }: QuickActionsProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{action.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
