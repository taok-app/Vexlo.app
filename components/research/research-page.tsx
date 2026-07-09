'use client'

import { useState } from 'react'
import { QueryProvider } from '@/components/providers/query-provider'
import { SessionList } from '@/components/research/session-list'
import { SessionDetail } from '@/components/research/session-detail'
import { SourcesPanel } from '@/components/research/sources-panel'
import { NewSessionDialog } from '@/components/research/new-session-dialog'
import {
  useResearchSessions,
  useResearchSession,
  useCreateSession,
  useDeleteSession,
  useExportReport,
  useFollowup,
} from '@/hooks/use-research'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

function ResearchContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)

  // List query
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isError: isSessionsError,
    refetch: refetchSessions,
  } = useResearchSessions()

  // Resolve which session is displayed (auto-select first on load)
  const resolvedSelectedId = selectedId ?? sessions[0]?.id ?? null

  // Detail query — returns { session, sources, followups }
  const {
    data: detailData,
    isLoading: isLoadingDetail,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useResearchSession(resolvedSelectedId)

  const resolvedSession = detailData?.session
  const sources = detailData?.sources ?? []
  const followups = detailData?.followups ?? []

  // Mutations
  const createMutation = useCreateSession()
  const deleteMutation = useDeleteSession()
  const exportMutation = useExportReport()
  const followupMutation = useFollowup()

  function handleSelect(id: string) {
    setSelectedId(id)
  }

  function handleCreate(payload: { title?: string; query: string }) {
    createMutation.mutate(payload, {
      onSuccess: (session) => {
        setSelectedId(session.id)
        setShowNewDialog(false)
      },
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null)
      },
    })
  }

  function handleFollowup(question: string) {
    if (!resolvedSelectedId) return
    followupMutation.mutate({ id: resolvedSelectedId, question })
  }

  return (
    <div className="flex-1 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Research</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and track your research sessions, sources, and findings.
          </p>
        </div>

        {/* Top-level error (list failed to load and nothing cached) */}
        {isSessionsError && sessions.length === 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Failed to load sessions</AlertTitle>
            <AlertDescription>Unable to reach the server. Please try again.</AlertDescription>
          </Alert>
        )}

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-4 items-start">
          {/* Column 1: Sessions list */}
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
            <SessionList
              sessions={sessions}
              selectedId={resolvedSelectedId}
              isLoading={isLoadingSessions}
              isError={isSessionsError}
              onSelect={handleSelect}
              onNew={() => setShowNewDialog(true)}
              onRetry={() => refetchSessions()}
            />
          </div>

          {/* Column 2: Session detail + follow-ups */}
          <SessionDetail
            session={resolvedSession}
            followups={followups}
            isLoading={isLoadingDetail && !!resolvedSelectedId}
            isError={isDetailError}
            isDeleting={deleteMutation.isPending}
            isExporting={exportMutation.isPending}
            isSubmittingFollowup={followupMutation.isPending}
            onDelete={handleDelete}
            onExport={(id, format) => exportMutation.mutate({ id, format })}
            onFollowup={handleFollowup}
            onRetry={() => refetchDetail()}
          />

          {/* Column 3: Sources */}
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
            <SourcesPanel
              sources={sources}
              isLoading={isLoadingDetail && !!resolvedSelectedId}
              hasSession={!!resolvedSession}
            />
          </div>
        </div>
      </div>

      {/* New session dialog */}
      <NewSessionDialog
        open={showNewDialog}
        isPending={createMutation.isPending}
        onOpenChange={setShowNewDialog}
        onSubmit={handleCreate}
      />
    </div>
  )
}

export default function ResearchPage() {
  return (
    <QueryProvider>
      <ResearchContent />
    </QueryProvider>
  )
}
