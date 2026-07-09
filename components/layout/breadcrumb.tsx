'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
}

export function Breadcrumb({ items = [], showHome = true }: BreadcrumbProps) {
  const pathname = usePathname()

  if (items.length === 0 && !showHome) {
    return null
  }

  const breadcrumbItems: BreadcrumbItem[] = []

  if (showHome) {
    breadcrumbItems.push({ label: 'Home', href: '/dashboard' })
  }

  breadcrumbItems.push(...items)

  return (
    <nav className="flex items-center gap-1" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
