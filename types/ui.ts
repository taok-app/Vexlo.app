import type { ComponentType } from 'react'

export interface QuickActionCardProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  href: string
}
