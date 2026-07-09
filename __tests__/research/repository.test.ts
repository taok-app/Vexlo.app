/**
 * Repository unit tests.
 * Uses Vitest / Jest globals (describe, it, expect, vi/jest.mock).
 * The db client is mocked so these run without a real database.
 */

// Mock Drizzle db — vi.mock is hoisted by the bundler
vi.mock('@/lib/db/client', () => {
  const mockReturning = vi.fn().mockResolvedValue([
    {
      id: 'test-id-123',
      userId: 'user-1',
      organizationId: null,
      title: 'Test session',
      query: 'Test query',
      status: 'in-progress',
      reportContent: null,
      sourceCount: 0,
      confidenceScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const mockValues = vi.fn(() => ({ returning: mockReturning }))
  const mockInsert = vi.fn(() => ({ values: mockValues }))
  const mockWhere = vi.fn().mockResolvedValue([])
  const mockOrderBy = vi.fn(() => ({ where: mockWhere }))
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  const mockSet = vi.fn(() => ({ where: mockWhere }))
  const mockUpdate = vi.fn(() => ({ set: mockSet }))
  const mockDelete = vi.fn(() => ({ where: mockWhere }))
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
  }
})

vi.mock('nanoid', () => ({ nanoid: () => 'test-id-123' }))

describe('research repository — createSession', () => {
  it('inserts a row and returns it', async () => {
    const { createSession } = await import('@/lib/db/repositories/research')
    const result = await createSession({
      userId: 'user-1',
      title: 'Test session',
      query: 'Test query',
    })
    expect(result.id).toBe('test-id-123')
    expect(result.title).toBe('Test session')
  })
})

describe('research repository — deleteSession', () => {
  it('returns false when no rows deleted', async () => {
    const { deleteSession } = await import('@/lib/db/repositories/research')
    const deleted = await deleteSession('nonexistent', 'user-1')
    expect(deleted).toBe(false)
  })
})
