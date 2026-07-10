'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Menu, Search } from 'lucide-react'
import { sessionAtom } from '@/lib/atoms/session'
import { useAtomValue } from 'jotai'
import { UserMenu } from './user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick?: () => void
  breadcrumb?: React.ReactNode
}

export function Header({ onMenuClick, breadcrumb }: HeaderProps) {
  const [searchFocus, setSearchFocus] = useState(false)
  const session = useAtomValue(sessionAtom)

  return (
    <header className="h-16 border-b border-border bg-card sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          {breadcrumb && <div className="hidden md:block text-sm text-muted-foreground">{breadcrumb}</div>}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 h-9 rounded-lg bg-muted"
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
              />
            </div>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu */}
          {session?.user && <UserMenu user={session.user} />}
        </div>
      </div>
    </header>
  )
}
