'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ResearchSession, ResearchSource, ResearchFollowup } from '@/lib/db/schema'

export type { ResearchSession, ResearchSource, ResearchFollowup }

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const researchKeys = {
  all: ['research'] as const,
  lists: () => [...researchKeys.all, 'list'] as const,
  detail: (id: string) => [...researchKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchSessions(): Promise<ResearchSession[]> {
  const res = await fetch('/api/research')
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error('Failed to fetch research sessions')
  const data = await res.json()
  return data.sessions
}

async function fetchSession(
  id: string,
): Promise<{ session: ResearchSession; sources: ResearchSource[]; followups: ResearchFollowup[] }> {
  const res = await fetch(`/api/research/${id}`)
  if (res.status === 401) throw new Error('Unauthorized')
  if (res.status === 404) throw new Error('Research session not found')
  if (!res.ok) throw new Error('Failed to fetch research session')
  return res.json()
}

async function createSession(payload: {
  title?: string
  query: string
  organizationId?: string
}): Promise<ResearchSession> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to create session')
  }
  const data = await res.json()
  return data.session
}

async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/research/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to delete session')
  }
}

async function exportReport(
  id: string,
  format: 'markdown' | 'json' = 'markdown',
): Promise<string | { session: ResearchSession; sources: ResearchSource[]; followups: ResearchFollowup[] }> {
  const res = await fetch(`/api/research/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to export report')
  }
  if (format === 'json') {
    const data = await res.json()
    return data.report
  }
  return res.text()
}

async function submitFollowup(
  id: string,
  question: string,
): Promise<{ question: string; answer: string; session: ResearchSession }> {
  const res = await fetch(`/api/research/${id}/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to submit follow-up')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useResearchSessions() {
  return useQuery({
    queryKey: researchKeys.lists(),
    queryFn: fetchSessions,
    staleTime: 1000 * 30, // 30 seconds
    retry: (count, err) => {
      if ((err as Error).message === 'Unauthorized') return false
      return count < 2
    },
  })
}

export function useResearchSession(id: string | null) {
  return useQuery({
    queryKey: researchKeys.detail(id ?? ''),
    queryFn: () => fetchSession(id!),
    enabled: !!id,
    staleTime: 1000 * 15,
    retry: (count, err) => {
      if ((err as Error).message === 'Unauthorized') return false
      if ((err as Error).message === 'Research session not found') return false
      return count < 2
    },
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
      toast.success(`Session created: "${session.title}"`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSession,
    // Optimistic update: remove from list cache immediately
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: researchKeys.lists() })
      const previous = qc.getQueryData<ResearchSession[]>(researchKeys.lists())
      qc.setQueryData<ResearchSession[]>(researchKeys.lists(), (old) =>
        old ? old.filter((s) => s.id !== id) : [],
      )
      return { previous }
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: researchKeys.detail(id) })
      toast.success('Session deleted')
    },
    onError: (err: Error, _id, ctx) => {
      // Roll back optimistic update
      if (ctx?.previous) {
        qc.setQueryData(researchKeys.lists(), ctx.previous)
      }
      toast.error(err.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
    },
  })
}

export function useExportReport() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'markdown' | 'json' }) => exportReport(id, format),
    onSuccess: (result, { format }) => {
      if (format === 'markdown' && typeof result === 'string') {
        const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'research-report.md'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('Markdown report downloaded')
      } else {
        toast.success('JSON report exported')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useFollowup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, question }: { id: string; question: string }) => submitFollowup(id, question),
    onSuccess: (data, { id }) => {
      // Invalidate detail so sources + followups refetch
      qc.invalidateQueries({ queryKey: researchKeys.detail(id) })
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
