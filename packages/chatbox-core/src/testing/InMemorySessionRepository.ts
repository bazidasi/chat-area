import type { SessionListFilter, SessionRepositoryPort } from '../ports'
import type { Session, SessionMetaPage, SessionMetaRecord } from '../types'

function matchesFilter(record: SessionMetaRecord, filter?: SessionListFilter): boolean {
  return filter?.projectId === undefined || record.projectId === filter.projectId
}

function sortVisible(records: SessionMetaRecord[]): SessionMetaRecord[] {
  return records
    .filter((record) => !record.hidden)
    .sort((left, right) => {
      if (left.starred && !right.starred) return -1
      if (!left.starred && right.starred) return 1
      return right.sortOrder - left.sortOrder
    })
}

function page(items: SessionMetaRecord[], cursor: number, limit: number): SessionMetaPage {
  const pageItems = items.slice(cursor, cursor + limit)
  return {
    items: pageItems,
    nextCursor: cursor + pageItems.length < items.length ? cursor + pageItems.length : null,
    total: items.length,
  }
}

export class InMemorySessionRepository implements SessionRepositoryPort {
  readonly sessions = new Map<string, Session>()
  readonly records = new Map<string, SessionMetaRecord>()
  initializeCount = 0

  readonly meta = {
    initialize: () => this.initializeMeta(),
    create: (record: SessionMetaRecord) => this.createMeta(record),
    createMany: (records: SessionMetaRecord[]) => this.createMetaMany(records),
    update: (id: string, updates: Partial<SessionMetaRecord>) => this.updateMeta(id, updates),
    getById: (id: string) => Promise.resolve(this.records.get(id) ?? null),
    delete: (id: string) => this.deleteMeta(id),
    deleteMany: (ids: string[]) => this.deleteMetaMany(ids),
    getAll: () => Promise.resolve(sortVisible([...this.records.values()])),
    getAllIncludingHidden: () => Promise.resolve([...this.records.values()].sort((a, b) => b.sortOrder - a.sortOrder)),
    getArchived: () => Promise.resolve(this.archivedRecords()),
    getArchivedPage: (cursor: number, limit = 2, filter?: SessionListFilter) =>
      Promise.resolve(page(this.archivedRecords(filter), cursor, limit)),
    getPage: (cursor: number, limit = 2, filter?: SessionListFilter) =>
      Promise.resolve(page(sortVisible(this.filteredRecords(filter)), cursor, limit)),
    getTotal: (filter?: SessionListFilter) => Promise.resolve(sortVisible(this.filteredRecords(filter)).length),
    getAllTotal: (filter?: SessionListFilter) => Promise.resolve(this.filteredRecords(filter).length),
    getArchivedTotal: (filter?: SessionListFilter) => Promise.resolve(this.archivedRecords(filter).length),
    clear: () => {
      this.records.clear()
      return Promise.resolve()
    },
  }

  initialize(): Promise<void> {
    return this.meta.initialize()
  }

  getSession(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.get(id) ?? null)
  }

  setSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session)
    return Promise.resolve()
  }

  deleteSession(id: string): Promise<void> {
    this.sessions.delete(id)
    return Promise.resolve()
  }

  getAllSessionIds(): Promise<string[]> {
    return Promise.resolve([...this.sessions.keys()])
  }

  private initializeMeta(): Promise<void> {
    this.initializeCount += 1
    return Promise.resolve()
  }

  private createMeta(record: SessionMetaRecord): Promise<void> {
    this.records.set(record.id, record)
    return Promise.resolve()
  }

  private createMetaMany(records: SessionMetaRecord[]): Promise<void> {
    for (const record of records) this.records.set(record.id, record)
    return Promise.resolve()
  }

  private updateMeta(id: string, updates: Partial<SessionMetaRecord>): Promise<SessionMetaRecord | null> {
    const current = this.records.get(id)
    if (!current) return Promise.resolve(null)
    const updated = { ...current, ...updates }
    this.records.set(id, updated)
    return Promise.resolve(updated)
  }

  private deleteMeta(id: string): Promise<void> {
    this.records.delete(id)
    return Promise.resolve()
  }

  private deleteMetaMany(ids: string[]): Promise<void> {
    for (const id of ids) this.records.delete(id)
    return Promise.resolve()
  }

  private filteredRecords(filter?: SessionListFilter): SessionMetaRecord[] {
    return [...this.records.values()].filter((record) => matchesFilter(record, filter))
  }

  private archivedRecords(filter?: SessionListFilter): SessionMetaRecord[] {
    return this.filteredRecords(filter)
      .filter((record) => record.archivedAt !== undefined)
      .sort((left, right) => (right.archivedAt ?? 0) - (left.archivedAt ?? 0))
  }
}
