'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Clock, Plus, Microscope } from 'lucide-react'
import type { ResearchSession } from '@/lib/research/store'

interface SessionListProps {
  sessions: ResearchSession[]
  selectedId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onNew: () => void
}

function getTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const STATUS_VARIANTS: Record<ResearchSession['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  'in-progress': 'secondary',
  failed: 'destructive',
}

const STATUS_LABELS: Record<ResearchSession['status'], string> = {
  completed: 'Done',
  'in-progress': 'Active',
  failed: 'Failed',
}

export function SessionList({ sessions, selectedId, isLoading, onSelect, onNew }: SessionListProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="size-4" />
            Sessions
            {sessions.length > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                {sessions.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onNew} className="h-7 px-2 text-xs gap-1">
            <Plus className="size-3" />
            New
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Microscope className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
              <p className="text-xs text-muted-foreground/70">Start by clicking New.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    'w-full text-left rounded-md p-3 transition-colors border',
                    'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selectedId === s.id
                      ? 'bg-accent border-border ring-1 ring-ring'
                      : 'border-transparent bg-transparent',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{s.title}</p>
                    <Badge variant={STATUS_VARIANTS[s.status]} className="text-xs shrink-0 mt-0.5">
                      {STATUS_LABELS[s.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{getTimeAgo(s.createdAt)}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{s.sources.length} source{s.sources.length !== 1 ? 's' : ''}</span>
                  </div>
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
