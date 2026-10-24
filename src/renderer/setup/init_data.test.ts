import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionMetaStorage } from '@/storage/SessionMetaStorage'
import { initData } from './init_data'

const metaStorage = vi.hoisted(() => ({
  getAllTotal: vi.fn(),
  createMany: vi.fn(),
}))

const storageMock = vi.hoisted(() => ({
  setItemNow: vi.fn(),
}))

vi.mock('@/packages/initial_data', () => ({
  defaultSessionsForCN: [],
  defaultSessionsForEN: [
    {
      id: 'default-session',
      name: 'Default Session',
      messages: [],
      type: 'chat',
    },
  ],
}))

vi.mock('@/platform', () => ({
  default: {
    getLocale: vi.fn(() => Promise.resolve('en')),
  },
}))

vi.mock('@/storage', () => ({
  default: storageMock,
}))

vi.mock('@/storage/StoreStorage', () => ({
  StorageKeyGenerator: {
    session: (id: string) => `session:${id}`,
  },
}))

vi.mock('@/stores/sessionHelpers', () => ({
  getMetaStorage: vi.fn(() => Promise.resolve(metaStorage)),
  getSessionMeta: (session: { id: string; name: string; type: 'chat' | 'picture' }) => ({
    id: session.id,
    name: session.name,
    type: session.type,
  }),
}))

describe('initData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaStorage.createMany.mockResolvedValue(undefined)
    storageMock.setItemNow.mockResolvedValue(undefined)
  })

  // Fibonacci fork: demo session seeding is disabled entirely — the app starts
  // with an empty chat list. initData is kept as a no-op for the migration
  // pipeline and must not touch session storage at all.
  it('never seeds demo sessions, regardless of existing session count', async () => {
    metaStorage.getAllTotal.mockResolvedValue(0)

    await initData()

    expect(metaStorage.getAllTotal).not.toHaveBeenCalled()
    expect(storageMock.setItemNow).not.toHaveBeenCalled()
    expect(metaStorage.createMany).not.toHaveBeenCalled()
  })

  it('does not touch session storage when sessions already exist either', async () => {
    metaStorage.getAllTotal.mockResolvedValue(5)

    await initData()

    expect(metaStorage.getAllTotal).not.toHaveBeenCalled()
    expect(storageMock.setItemNow).not.toHaveBeenCalled()
    expect(metaStorage.createMany).not.toHaveBeenCalled()
  })
})

metaStorage satisfies Pick<SessionMetaStorage, 'getAllTotal' | 'createMany'>
