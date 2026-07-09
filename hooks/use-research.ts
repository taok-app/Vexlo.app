import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ResearchSession } from '@/lib/research/store'

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
  if (!res.ok) throw new Error('Failed to fetch research sessions')
  const data = await res.json()
  return data.sessions
}

async function fetchSession(id: string): Promise<ResearchSession> {
  const res = await fetch(`/api/research/${id}`)
  if (!res.ok) throw new Error('Research session not found')
  const data = await res.json()
  return data.session
}

async function createSession(payload: { title?: string; query: string; tags?: string[] }): Promise<ResearchSession> {
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
  if (!res.ok) throw new Error('Failed to delete session')
}

async function exportReport(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<string | ResearchSession> {
  const res = await fetch(`/api/research/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  })
  if (!res.ok) throw new Error('Failed to export report')
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
  })
}

export function useResearchSession(id: string | null) {
  return useQuery({
    queryKey: researchKeys.detail(id ?? ''),
    queryFn: () => fetchSession(id!),
    enabled: !!id,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
      toast.success(`Research session created: "${session.title}"`)
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
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
      qc.removeQueries({ queryKey: researchKeys.detail(id) })
      toast.success('Session deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message)
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

export function useFollowup(sessionId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ question }: { question: string }) => submitFollowup(sessionId!, question),
    onSuccess: (data) => {
      // Update the cached session with the new sources
      qc.setQueryData(researchKeys.detail(sessionId!), data.session)
      qc.invalidateQueries({ queryKey: researchKeys.lists() })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
