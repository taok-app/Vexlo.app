'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  SendHorizontal,
  Trash2,
} from 'lucide-react'
import type { ResearchSession, ResearchFollowup } from '@/lib/db/schema'

interface SessionDetailProps {
  session: ResearchSession | undefined
  followups: ResearchFollowup[]
  isLoading: boolean
  isError: boolean
  isDeleting: boolean
  isExporting: boolean
  isSubmittingFollowup: boolean
  onDelete: (id: string) => void
  onExport: (id: string, format: 'markdown' | 'json') => void
  onFollowup: (question: string) => void
  onRetry: () => void
}

const STATUS_CONFIG: Record<
  ResearchSession['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  completed: { label: 'Completed', variant: 'default' },
  'in-progress': { label: 'In Progress', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function SessionDetail({
  session,
  followups,
  isLoading,
  isError,
  isDeleting,
  isExporting,
  isSubmittingFollowup,
  onDelete,
  onExport,
  onRetry,
  onFollowup,
}: SessionDetailProps) {
  const [question, setQuestion] = useState('')
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  function handleSendFollowup() {
    if (!question.trim() || isSubmittingFollowup) return
    onFollowup(question.trim())
    setQuestion('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSendFollowup()
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load session.</span>
          <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 ml-3">
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!session) {
    return (
      <Card className="flex items-center justify-center">
        <CardContent className="text-center py-12">
          <BookOpen className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No session selected</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Select a session from the list or create a new one.
          </p>
        </CardContent>
      </Card>
    )
  }

  const status = STATUS_CONFIG[session.status]

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">{session.title}</CardTitle>
                <CardDescription className="mt-1 text-xs line-clamp-2">{session.query}</CardDescription>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Session actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => onExport(session.id, 'markdown')}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    <Download className="size-4" />
                    Export Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onExport(session.id, 'json')}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    <ChevronDown className="size-4" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setShowDeleteAlert(true)}
                    disabled={isDeleting}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(session.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>
                Updated{' '}
                {new Date(session.updatedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {session.sourceCount > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>
                    {session.sourceCount} source{session.sourceCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Report content */}
        {session.reportContent && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {session.reportContent}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Follow-up conversation */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="size-4" />
              Follow-up Questions
              {followups.length > 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {followups.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <ScrollArea className="max-h-80">
              {followups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="size-7 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Ask a follow-up question about this research.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pr-1">
                  {[...followups].reverse().map((f) => (
                    <div key={f.id} className="flex flex-col gap-1.5">
                      <div className="self-end max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
                        {f.question}
                      </div>
                      <div className="self-start max-w-[90%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground leading-relaxed">
                        {f.answer}
                      </div>
                    </div>
                  ))}
                  {isSubmittingFollowup && (
                    <div className="self-start flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Researching...
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Follow-up input */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask a follow-up question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmittingFollowup}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendFollowup}
                disabled={!question.trim() || isSubmittingFollowup}
                className="size-9 shrink-0"
              >
                {isSubmittingFollowup ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
                <span className="sr-only">Send follow-up</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{session.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteAlert(false)
                onDelete(session.id)
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
