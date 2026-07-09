'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <StatsSkeleton />

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  )
}

export function SidebarSkeleton() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border z-50 p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </aside>
  )
}

export function HeaderSkeleton() {
  return (
    <header className="h-16 border-b border-border bg-card sticky top-0 z-30 px-4 flex items-center justify-between">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  )
}

export function TableSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border p-4 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-border p-4 flex gap-4 last:border-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border border-border rounded-lg">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
