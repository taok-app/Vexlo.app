'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Status = 'completed' | 'in-progress'

type Source = {
  id: string
  title: string
  url: string
}

type Session = {
  id: string
  title: string
  date: string
  status: Status
  sources: Source[]
  notes?: string
}

const INITIAL_SESSIONS: Session[] = [
  {
    id: '1',
    title: 'AI-assisted testing strategies',
    date: '2026-07-07',
    status: 'completed',
    sources: [
      { id: 's1', title: 'Testing React Applications', url: 'https://testing-library.com' },
      { id: 's2', title: 'Jest Docs', url: 'https://jestjs.io' },
    ],
  },
  {
    id: '2',
    title: 'Vercel Sandbox research',
    date: '2026-06-29',
    status: 'in-progress',
    sources: [{ id: 's3', title: 'Vercel Docs', url: 'https://vercel.com/docs' }],
  },
]

const AI_STATUSES = ['Planning', 'Searching', 'Browsing', 'Synthesizing', 'Verifying', 'Writing']

export default function ResearchPage() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null)
  const selectedSession = useMemo(() => sessions.find((s) => s.id === selectedId) || sessions[0], [sessions, selectedId])

  // Chat / streaming state
  const [query, setQuery] = useState<string>('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [streaming, setStreaming] = useState(false)
  const [aiStatusIndex, setAiStatusIndex] = useState(0)

  useEffect(() => {
    // Reset messages when session changes
    setMessages([])
    setStreaming(false)
    setAiStatusIndex(0)
  }, [selectedId])

  function createNewResearch() {
    const now = new Date()
    const newSession: Session = {
      id: String(Date.now()),
      title: `New research - ${now.toLocaleDateString()}`,
      date: now.toISOString().slice(0, 10),
      status: 'in-progress',
      sources: [],
    }

    setSessions((s) => [newSession, ...s])
    setSelectedId(newSession.id)
  }

  function openSession(id: string) {
    setSelectedId(id)
  }

  function simulateStreamingResponse(prompt: string) {
    setStreaming(true)
    setAiStatusIndex(0)

    // Append a placeholder assistant message
    setMessages((m) => [...m, { role: 'assistant', text: '' }])

    // Simulate status progression and incremental text
    let charIndex = 0
    const responseText = `This is a synthesized research summary for the query: ${prompt}. It highlights key findings, recommended next steps, and cites sources.`

    const statusInterval = 1500
    const statuses = AI_STATUSES

    // Cycle statuses
    let statusTimer = setInterval(() => {
      setAiStatusIndex((i) => Math.min(i + 1, statuses.length - 1))
    }, statusInterval)

    // Simulate typing
    const typingTimer = setInterval(() => {
      charIndex += 4
      setMessages((m) => {
        const copy = [...m]
        const last = copy.pop()
        if (!last) return m
        last.text = responseText.slice(0, charIndex)
        copy.push(last)
        return copy
      })

      if (charIndex >= responseText.length) {
        clearInterval(typingTimer)
        clearInterval(statusTimer)
        setStreaming(false)
        setAiStatusIndex(statuses.length - 1)

        // Add mock sources to session
        if (selectedSession) {
          const newSources: Source[] = [
            { id: 'g1', title: 'Example Research Article', url: 'https://example.com/article' },
            { id: 'g2', title: 'Related Docs', url: 'https://example.com/docs' },
          ]
          setSessions((s) =>
            s.map((sess) => (sess.id === selectedSession.id ? { ...sess, sources: newSources, status: 'completed' } : sess)),
          )
        }
      }
    }, 60)
  }

  function handleSend() {
    const trimmed = query.trim()
    if (!trimmed) return

    // Add user message
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setQuery('')

    // Start simulated streaming assistant response
    simulateStreamingResponse(trimmed)
  }

  function downloadMarkdown() {
    if (!selectedSession) return

    const md = [`# ${selectedSession.title}`, `Date: ${selectedSession.date}`, '', '## Notes', '', ...messages.map((m) => `- **${m.role}**: ${m.text}`), '', '## Sources', '', ...selectedSession.sources.map((s) => `- [${s.title}](${s.url})`)].join('\n')

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSession.title.replace(/[^a-z0-9\-]/gi, '_')}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    if (!selectedSession) return

    // Simple printable window - user can save to PDF from print dialog
    const html = `
      <html>
        <head>
          <title>${selectedSession.title}</title>
          <style>body{font-family:system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; padding:24px; color:#111; background:#fff}</style>
        </head>
        <body>
          <h1>${selectedSession.title}</h1>
          <p>Date: ${selectedSession.date}</p>
          <h2>Notes</h2>
          ${messages.map((m) => `<p><strong>${m.role}</strong>: ${escapeHtml(m.text)}</p>`).join('')}
          <h2>Sources</h2>
          <ul>${selectedSession.sources.map((s) => `<li><a href="${s.url}">${escapeHtml(s.title)}</a></li>`).join('')}</ul>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      w.print()
    }
  }

  function escapeHtml(input: string) {
    return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  return (
    <div className="flex-1 bg-background text-foreground min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Research</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={createNewResearch}>
              New Research
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions list */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Past Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openSession(s.id)}
                      className={`w-full text-left rounded-md p-3 transition-colors hover:bg-accent/10 ${{}} ${
                        selectedId === s.id ? 'ring-2 ring-primary/40 bg-accent/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.date}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={s.status === 'completed' ? 'default' : 'outline'}>
                            {s.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">{s.sources.length} sources</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main detail */}
          <div className="col-span-1 lg:col-span-2">
            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle>{selectedSession?.title ?? 'Select a session'}</CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Chat input */}
                <div className="flex items-start gap-3">
                  <Input
                    placeholder="Ask a research question..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <Button onClick={handleSend} size="sm">
                    Send
                  </Button>
                </div>

                {/* Streaming / AI response area */}
                <div className="border rounded-md p-4 bg-muted/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">AI Assistant</div>
                      <div className="text-xs text-muted-foreground">Interactive research stream</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge variant="outline">{AI_STATUSES[aiStatusIndex]}</Badge>
                    </div>
                  </div>

                  <div className="min-h-[140px] max-h-[420px] overflow-auto rounded-md p-3 bg-background">
                    {messages.length === 0 && (
                      <div className="text-sm text-muted-foreground">No messages yet — ask the assistant a question to begin.</div>
                    )}

                    {messages.map((m, idx) => (
                      <div key={idx} className={`mb-3 ${m.role === 'assistant' ? 'prose' : ''}`}>
                        <div className={`text-xs font-semibold ${m.role === 'assistant' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {m.role === 'assistant' ? 'Assistant' : 'You'}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.text || (streaming && m.role === 'assistant' ? 'Thinking...' : '')}</div>
                      </div>
                    ))}

                    {streaming && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">AI is thinking...</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={downloadMarkdown}>
                    Export Markdown
                  </Button>
                  <Button variant="outline" onClick={exportPDF}>
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sources panel */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSession?.sources && selectedSession.sources.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {selectedSession.sources.map((src) => (
                      <li key={src.id}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                        >
                          {src.title}
                        </a>
                        <div className="text-xs text-muted-foreground">{new URL(src.url).hostname}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">No sources cited yet for this session.</div>
                )}
              </CardContent>
              <CardFooter>
                <div className="text-xs text-muted-foreground">Sources are collected during research and appended here.</div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
