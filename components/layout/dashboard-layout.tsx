'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useSession } from '@/lib/atoms/session'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardLayoutProps {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
}

export function DashboardLayout({ children, breadcrumb }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const session = useSession()
  const router = useRouter()

  // Close sidebar on route change
  useEffect(() => {
    const t = setTimeout(() => setSidebarOpen(false), 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  // Check for authentication on client side
  useEffect(() => {
    if (mounted && !session?.user) {
      // Use replace to prevent back button to login
      router.replace('/auth/login')
    }
  }, [session, mounted, router])

  if (!mounted) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-16 border-b border-border bg-card" />
        <div className="flex-1 flex">
          <div className="hidden lg:block w-64 border-r border-border bg-card" />
          <div className="flex-1 overflow-auto p-8">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  // Render empty state while redirecting
  if (!session?.user) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-16 border-b border-border bg-card" />
        <div className="flex-1 flex">
          <div className="hidden lg:block w-64 border-r border-border bg-card" />
          <div className="flex-1 overflow-auto p-8">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        breadcrumb={breadcrumb}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}
