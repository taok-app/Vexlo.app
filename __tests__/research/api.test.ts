/**
 * API route integration tests.
 * Service layer and auth are mocked — tests verify HTTP contract:
 * status codes, response shapes, validation enforcement.
 * Compatible with Vitest (vi.mock) or Jest (jest.mock) with no external imports.
 */

vi.mock('@/lib/session/get-server-session', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'user-1' } })),
}))

const mockListSessions = vi.fn(async () => [])
const mockCreateSession = vi.fn()
const mockGetSession = vi.fn()
const mockRemoveSession = vi.fn()
const mockSubmitFollowup = vi.fn()
const mockBuildMarkdownReport = vi.fn()
const mockBuildJsonReport = vi.fn()

vi.mock('@/lib/research/service', () => ({
  listSessions: mockListSessions,
  createSession: mockCreateSession,
  getSession: mockGetSession,
  removeSession: mockRemoveSession,
  submitFollowup: mockSubmitFollowup,
  buildMarkdownReport: mockBuildMarkdownReport,
  buildJsonReport: mockBuildJsonReport,
}))

import { NextRequest } from 'next/server'

function makeRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

const fakeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/research', () => {
  it('returns 200 with sessions array', async () => {
    const fakeSession = {
      id: 's1', userId: 'user-1', organizationId: null,
      title: 'Session 1', query: 'query', status: 'completed' as const,
      reportContent: null, sourceCount: 3, confidenceScore: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    mockListSessions.mockResolvedValueOnce([fakeSession])
    const { GET } = await import('@/app/api/research/route')
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(json.sessions)).toBe(true)
    expect(json.sessions[0].id).toBe('s1')
  })
})

describe('POST /api/research', () => {
  const fakeCreated = {
    id: 'new-id', userId: 'user-1', organizationId: null,
    title: 'Test', query: 'What is X?', status: 'in-progress' as const,
    reportContent: null, sourceCount: 0, confidenceScore: null,
    createdAt: new Date(), updatedAt: new Date(),
  }

  it('returns 201 on valid payload', async () => {
    mockCreateSession.mockResolvedValueOnce(fakeCreated)
    const { POST } = await import('@/app/api/research/route')
    const req = makeRequest('http://localhost/api/research', 'POST', { query: 'What is X?' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.session.id).toBe('new-id')
  })

  it('returns 422 when query is missing', async () => {
    const { POST } = await import('@/app/api/research/route')
    const req = makeRequest('http://localhost/api/research', 'POST', {})
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 422 when query is empty string', async () => {
    const { POST } = await import('@/app/api/research/route')
    const req = makeRequest('http://localhost/api/research', 'POST', { query: '   ' })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/research/[id]', () => {
  it('returns 200 when session deleted', async () => {
    mockRemoveSession.mockResolvedValueOnce(true)
    const { DELETE } = await import('@/app/api/research/[id]/route')
    const req = makeRequest('http://localhost/api/research/sess-1', 'DELETE')
    const res = await DELETE(req, fakeParams('sess-1'))
    expect(res.status).toBe(200)
  })

  it('returns 404 when session not found', async () => {
    mockRemoveSession.mockResolvedValueOnce(false)
    const { DELETE } = await import('@/app/api/research/[id]/route')
    const req = makeRequest('http://localhost/api/research/missing', 'DELETE')
    const res = await DELETE(req, fakeParams('missing'))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/research/[id]/followup', () => {
  it('returns 200 with question and answer', async () => {
    const fakeFollowup = {
      id: 'f1', sessionId: 'sess-1',
      question: 'Why?', answer: 'Because.', createdAt: new Date(),
    }
    const fakeUpdatedSession = {
      id: 'sess-1', userId: 'user-1', organizationId: null,
      title: 'Session', query: 'query', status: 'in-progress' as const,
      reportContent: null, sourceCount: 1, confidenceScore: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    mockSubmitFollowup.mockResolvedValueOnce({ followup: fakeFollowup, session: fakeUpdatedSession })
    const { POST } = await import('@/app/api/research/[id]/followup/route')
    const req = makeRequest('http://localhost/api/research/sess-1/followup', 'POST', { question: 'Why?' })
    const res = await POST(req, fakeParams('sess-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.question).toBe('Why?')
    expect(json.answer).toBe('Because.')
  })

  it('returns 422 when question is empty', async () => {
    const { POST } = await import('@/app/api/research/[id]/followup/route')
    const req = makeRequest('http://localhost/api/research/sess-1/followup', 'POST', { question: '' })
    const res = await POST(req, fakeParams('sess-1'))
    expect(res.status).toBe(422)
  })

  it('returns 404 when session not found', async () => {
    mockSubmitFollowup.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/research/[id]/followup/route')
    const req = makeRequest('http://localhost/api/research/missing/followup', 'POST', { question: 'Why?' })
    const res = await POST(req, fakeParams('missing'))
    expect(res.status).toBe(404)
  })
})
