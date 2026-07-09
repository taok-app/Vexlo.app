import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon ? <Icon className="h-12 w-12 text-muted-foreground mb-4" /> : null}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description ? <p className="text-muted-foreground mb-6 max-w-sm">{description}</p> : null}
      <div className="flex gap-3">
        {action && (
          <Link href={action.href} aria-label={action.label}>
            <a className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-95">
              {action.label}
            </a>
          </Link>
        )}
        {secondaryAction && (
          <Link href={secondaryAction.href} aria-label={secondaryAction.label}>
            <a className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-input">
              {secondaryAction.label}
            </a>
          </Link>
        )}
      </div>
    </div>
  )
}
