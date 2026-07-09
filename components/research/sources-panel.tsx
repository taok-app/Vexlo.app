'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Link2 } from 'lucide-react'
import type { ResearchSession } from '@/lib/research/store'

interface SourcesPanelProps {
  session: ResearchSession | undefined
  isLoading: boolean
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function SourcesPanel({ session, isLoading }: SourcesPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="size-4" />
          Sources
          {session && session.sources.length > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {session.sources.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : !session || session.sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Link2 className="size-7 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {session ? 'No sources yet for this session.' : 'Select a session to see its sources.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {session.sources.map((src, idx) => (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-start gap-2.5 p-2.5 rounded-md border border-transparent hover:border-border hover:bg-accent transition-colors"
                >
                  <span className="shrink-0 mt-0.5 size-5 rounded bg-muted text-muted-foreground text-xs font-mono flex items-center justify-center leading-none">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">
                      {src.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{getDomain(src.url)}</p>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
