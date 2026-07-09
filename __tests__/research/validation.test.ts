import { createSessionSchema, followupSchema, exportSchema, parseBody } from '@/lib/research/store'

describe('createSessionSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = createSessionSchema.safeParse({ query: 'How does Vercel work?' })
    expect(result.success).toBe(true)
  })

  it('accepts an optional title and organizationId', () => {
    const result = createSessionSchema.safeParse({
      query: 'Test query',
      title: 'My title',
      organizationId: 'org_123',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('My title')
  })

  it('rejects an empty query', () => {
    const result = createSessionSchema.safeParse({ query: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.errors[0].message).toMatch(/required/i)
  })

  it('rejects a query that is too long', () => {
    const result = createSessionSchema.safeParse({ query: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from query', () => {
    const result = createSessionSchema.safeParse({ query: '  hello  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.query).toBe('hello')
  })

  it('rejects a missing query field', () => {
    const result = createSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('followupSchema', () => {
  it('accepts a valid question', () => {
    const result = followupSchema.safeParse({ question: 'What are the limitations?' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty question', () => {
    const result = followupSchema.safeParse({ question: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a question that is too long', () => {
    const result = followupSchema.safeParse({ question: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from question', () => {
    const result = followupSchema.safeParse({ question: '  why?  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.question).toBe('why?')
  })
})

describe('exportSchema', () => {
  it('defaults to markdown format', () => {
    const result = exportSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.format).toBe('markdown')
  })

  it('accepts json format', () => {
    const result = exportSchema.safeParse({ format: 'json' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.format).toBe('json')
  })

  it('rejects an unknown format', () => {
    const result = exportSchema.safeParse({ format: 'csv' })
    expect(result.success).toBe(false)
  })
})

describe('parseBody', () => {
  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns parsed data for valid payload', async () => {
    const req = makeRequest({ query: 'How does React work?' })
    const { data, error } = await parseBody(req, createSessionSchema)
    expect(error).toBeNull()
    expect(data?.query).toBe('How does React work?')
  })

  it('returns an error string for invalid payload', async () => {
    const req = makeRequest({ query: '' })
    const { data, error } = await parseBody(req, createSessionSchema)
    expect(data).toBeNull()
    expect(error).toBeTruthy()
  })

  it('returns an error for malformed JSON', async () => {
    const req = new Request('http://localhost/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const { data, error } = await parseBody(req, createSessionSchema)
    expect(data).toBeNull()
    expect(typeof error).toBe('string')
  })
})
