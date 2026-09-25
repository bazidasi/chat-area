import type {
  Message,
  Session,
  SessionApplicationEvent,
  SessionEventBus,
  SessionListFilter,
  SessionMeta,
  SessionMetaPage,
  SessionMetaRecord,
  Updater,
} from '@chatbox/core'
import { applyMessageUpdate } from '@chatbox/core/application/session'
import { sortSessionRecords, uniqueSessionRecords } from '@chatbox/core/utils/session-sort'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { QueryKeys, sessionListQueryKey } from './query-keys'
import { mergeCachedGeneratingMessages } from './session-cache-policy'
import {
  createSessionQueryDefinitions,
  type SessionQueryDefinitions,
  type SessionQuerySource,
} from './session-query-options'

export type InfiniteSessionData = InfiniteData<SessionMetaPage, number>

type SessionListCache = {
  queryKey: readonly unknown[]
  filter?: SessionListFilter
  archived: boolean
}

function matchesFilter(record: SessionMetaRecord, filter?: SessionListFilter): boolean {
  return filter?.projectId === undefined || record.projectId === filter.projectId
}

function filterFromQueryKey(queryKey: readonly unknown[]): SessionListFilter | undefined {
  if (queryKey.length === 1) return undefined
  const scope = queryKey[1]
  if (typeof scope !== 'string' || !scope.startsWith('project:')) return undefined
  return { projectId: scope.slice('project:'.length) }
}

function listCaches(queryClient: QueryClient, baseKey: readonly string[]): SessionListCache[] {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey: baseKey })
    .filter((query) => {
      if (query.queryKey.length > 2) return false
      return query.queryKey.length === 1 || (typeof query.queryKey[1] === 'string' && query.queryKey[1].startsWith('project:'))
    })
    .map((query) => ({
      queryKey: query.queryKey,
      filter: filterFromQueryKey(query.queryKey),
      archived: baseKey[0] === 'archived-chat-sessions-list',
    }))
}

export function applySessionListUpdate(
  old: InfiniteSessionData,
  updater: (items: SessionMetaRecord[]) => SessionMetaRecord[]
): InfiniteSessionData {
  if (old.pages.length === 0) return old
  const allItems = old.pages.flatMap((page) => page.items)
  const previousUnique = uniqueSessionRecords(allItems)
  const updated = uniqueSessionRecords(updater(allItems))
  const lastPage = old.pages[old.pages.length - 1]
  const total = Math.max(updated.length, (lastPage.total || 0) + (updated.length - previousUnique.length))
  return {
    pages: [
      {
        items: updated,
        nextCursor: updated.length < total ? updated.length : null,
        total,
      },
    ],
    pageParams: [0],
  }
}

function updateListData(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (items: SessionMetaRecord[]) => SessionMetaRecord[]
): void {
  queryClient.setQueryData<InfiniteSessionData>(queryKey, (old) => {
    if (!old || old.pages.length === 0) return old
    return applySessionListUpdate(old, updater)
  })
}

export class SessionQueryBridge {
  readonly definitions: SessionQueryDefinitions
  private readonly unsubscribe: () => void
  private visibleListRefreshGeneration = 0
  private visibleListRefreshTail: Promise<void> = Promise.resolve()
  private visibleListRefreshPending = false

  constructor(
    private readonly queryClient: QueryClient,
    private readonly source: SessionQuerySource,
    events: SessionEventBus
  ) {
    this.definitions = createSessionQueryDefinitions(source)
    this.unsubscribe = events.subscribe((event) => this.project(event))
  }

  dispose(): void {
    this.unsubscribe()
  }

  getCachedSessionsMeta(filter?: SessionListFilter): SessionMetaRecord[] {
    const data = this.queryClient.getQueryData<InfiniteSessionData>(QueryKeys.ChatSessionsListFor(filter))
    return uniqueSessionRecords(data?.pages.flatMap((page) => page.items) ?? [])
  }

  getCachedSession(sessionId: string): Session | null | undefined {
    return this.queryClient.getQueryData<Session | null>(QueryKeys.ChatSession(sessionId))
  }

  async listSessionsMeta(filter?: SessionListFilter): Promise<SessionMetaRecord[]> {
    const cached = this.getCachedSessionsMeta(filter)
    if (cached.length > 0) return cached
    const data = await this.queryClient.fetchInfiniteQuery(this.definitions.sessions(filter))
    return uniqueSessionRecords(data.pages.flatMap((page) => page.items))
  }

  getSession(sessionId: string): Promise<Session | null> {
    return this.queryClient.fetchQuery(this.definitions.session(sessionId))
  }

  discardSessionCache(sessionId: string): void {
    this.queryClient.removeQueries({ queryKey: QueryKeys.ChatSession(sessionId), exact: true })
  }

  updateSessionListData(
    updater: (items: SessionMetaRecord[]) => SessionMetaRecord[],
    filter?: SessionListFilter
  ): void {
    if (filter !== undefined) {
      updateListData(this.queryClient, QueryKeys.ChatSessionsListFor(filter), updater)
      return
    }
    updateListData(this.queryClient, QueryKeys.ChatSessionsList, updater)
    this.updateAllListData(
      this.visibleListCaches().filter((cache) => cache.filter !== undefined),
      updater
    )
  }

  updateArchivedSessionListData(
    updater: (items: SessionMetaRecord[]) => SessionMetaRecord[],
    filter?: SessionListFilter
  ): void {
    if (filter !== undefined) {
      updateListData(this.queryClient, QueryKeys.ArchivedChatSessionsListFor(filter), updater)
      return
    }
    updateListData(this.queryClient, QueryKeys.ArchivedChatSessionsList, updater)
    this.updateAllListData(
      this.archivedListCaches().filter((cache) => cache.filter !== undefined),
      updater
    )
  }

  resetSessionList(page: SessionMetaPage, filter?: SessionListFilter): void {
    this.queryClient.setQueryData<InfiniteSessionData>(QueryKeys.ChatSessionsListFor(filter), {
      pages: [page],
      pageParams: [0],
    })
  }

  resetArchivedSessionList(page: SessionMetaPage, filter?: SessionListFilter): void {
    this.queryClient.setQueryData<InfiniteSessionData>(QueryKeys.ArchivedChatSessionsListFor(filter), {
      pages: [page],
      pageParams: [0],
    })
  }

  updateSessionCache(sessionId: string, updater: Updater<Session>): void {
    this.queryClient.setQueryData(QueryKeys.ChatSession(sessionId), (old: Session | null | undefined) => {
      if (!old) return old
      return typeof updater === 'function' ? updater(old) : { ...old, ...updater }
    })
  }

  /**
   * Cache-only message update for streaming-frequency writes. Loads the session
   * through the query cache first so a missing session fails loudly instead of
   * silently dropping the update.
   */
  async updateMessageCache(sessionId: string, messageId: string, updater: Updater<Message>): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)
    this.updateSessionCache(sessionId, (current) => applyMessageUpdate(current, sessionId, messageId, updater))
  }

  private visibleListCaches(): SessionListCache[] {
    return listCaches(this.queryClient, QueryKeys.ChatSessionsList)
  }

  private archivedListCaches(): SessionListCache[] {
    return listCaches(this.queryClient, QueryKeys.ArchivedChatSessionsList)
  }

  private updateAllListData(
    caches: SessionListCache[],
    updater: (items: SessionMetaRecord[], cache: SessionListCache) => SessionMetaRecord[]
  ): void {
    for (const cache of caches) {
      updateListData(this.queryClient, cache.queryKey, (items) => updater(items, cache))
    }
  }

  private invalidateVisibleListRefresh(): void {
    this.visibleListRefreshGeneration += 1
  }

  private refreshVisibleSessionList(): Promise<void> {
    // Pin updates are not serialized across sessions, and this read is not a
    // React Query fetch, so cancelQueries cannot abort it. Queue refreshes and
    // drop superseded results so an older page cannot overwrite a newer one.
    const generation = ++this.visibleListRefreshGeneration
    const caches = this.visibleListCaches()
    const refresh = this.visibleListRefreshTail
      .catch(() => undefined)
      .then(async () => {
        if (generation !== this.visibleListRefreshGeneration) return
        await this.queryClient.cancelQueries({ queryKey: QueryKeys.ChatSessionsList })
        if (generation !== this.visibleListRefreshGeneration) return
        const pages = await Promise.all(
          caches.map(async (cache) => ({
            cache,
            page: await this.readVisibleSessionListPage(cache.filter, generation),
          }))
        )
        if (generation !== this.visibleListRefreshGeneration) return
        for (const { cache, page } of pages) {
          if (page) this.resetSessionList(page, cache.filter)
        }
      })
    this.visibleListRefreshTail = refresh
    this.visibleListRefreshPending = true
    return refresh.finally(() => {
      if (this.visibleListRefreshTail === refresh) this.visibleListRefreshPending = false
    })
  }

  private async readVisibleSessionListPage(
    filter: SessionListFilter | undefined,
    generation: number
  ): Promise<SessionMetaPage | null> {
    try {
      return await this.source.listSessionsMetaPage(0, undefined, filter)
    } catch {
      if (generation !== this.visibleListRefreshGeneration) return null
      try {
        return await this.source.listSessionsMetaPage(0, undefined, filter)
      } catch {
        if (generation !== this.visibleListRefreshGeneration) return null
        // The optimistic pin patch can leave a pagination-inconsistent prefix.
        // Infinite staleTime would keep that cache authoritative after a read
        // failure, so mark the list stale and let observers refetch.
        await this.queryClient
          .invalidateQueries({ queryKey: QueryKeys.ChatSessionsListFor(filter) })
          .catch(() => undefined)
        return null
      }
    }
  }

  private async refreshScopedListReset(archived: boolean): Promise<void> {
    const baseKey = archived ? QueryKeys.ArchivedChatSessionsList : QueryKeys.ChatSessionsList
    const caches = listCaches(this.queryClient, baseKey).filter((cache) => cache.filter)
    await Promise.all(
      caches.map(async (cache) => {
        try {
          const page = archived
            ? await this.source.listArchivedSessionsMetaPage(0, undefined, cache.filter)
            : await this.source.listSessionsMetaPage(0, undefined, cache.filter)
          if (archived) this.resetArchivedSessionList(page, cache.filter)
          else this.resetSessionList(page, cache.filter)
        } catch {
          await this.queryClient
            .invalidateQueries({ queryKey: sessionListQueryKey(baseKey, cache.filter) })
            .catch(() => undefined)
        }
      })
    )
  }

  private projectRecordUpdate(
    items: SessionMetaRecord[],
    session: Session,
    meta: SessionMeta,
    filter: SessionListFilter | undefined,
    oldRecord?: SessionMetaRecord
  ): SessionMetaRecord[] {
    const current = items.find((item) => item.id === session.id)
    if (!current && !oldRecord) return items
    const base = current ?? oldRecord!
    const updated = { ...base, ...meta, id: session.id }
    if (!matchesFilter(updated, filter)) return items.filter((item) => item.id !== session.id)
    if (current) return items.map((item) => (item.id === session.id ? updated : item))
    return sortSessionRecords([...items, updated])
  }

  private async project(event: SessionApplicationEvent): Promise<void> {
    switch (event.type) {
      case 'session-created': {
        const refreshPending = this.visibleListRefreshPending
        this.invalidateVisibleListRefresh()
        this.queryClient.setQueryData(QueryKeys.ChatSession(event.session.id), event.session)
        this.updateAllListData(this.visibleListCaches(), (items, cache) => {
          if (!matchesFilter(event.record, cache.filter)) return items.filter((item) => item.id !== event.record.id)
          return sortSessionRecords([...items.filter((item) => item.id !== event.record.id), event.record])
        })
        const caches = this.visibleListCaches().filter((cache) => matchesFilter(event.record, cache.filter))
        const needsRefresh = caches.some((cache) => {
          const data = this.queryClient.getQueryData<InfiniteSessionData>(cache.queryKey)
          const lastPage = data?.pages[data.pages.length - 1]
          return lastPage?.nextCursor !== null && lastPage?.items.at(-1)?.id === event.record.id
        })
        if (refreshPending || needsRefresh) await this.refreshVisibleSessionList()
        break
      }
      case 'session-updated':
        if (event.preserveCachedGeneratingMessages) {
          this.queryClient.setQueryData(QueryKeys.ChatSession(event.session.id), (cached: Session | null | undefined) =>
            mergeCachedGeneratingMessages(event.session, cached)
          )
        } else {
          this.queryClient.setQueryData(QueryKeys.ChatSession(event.session.id), event.session)
        }
        if (event.meta) {
          const oldRecords = [...this.visibleListCaches(), ...this.archivedListCaches()].map((cache) => ({
            cache,
            record: this.queryClient
              .getQueryData<InfiniteSessionData>(cache.queryKey)
              ?.pages.flatMap((page) => page.items)
              .find((item) => item.id === event.session.id),
          }))
          const migrationEntry = oldRecords.find(({ record }) => record !== undefined)
          const migrationRecord = migrationEntry?.record
          const projectChanged =
            migrationRecord !== undefined &&
            Object.hasOwn(event.meta, 'projectId') &&
            migrationRecord.projectId !== event.meta.projectId
          const refreshPending = this.visibleListRefreshPending
          const starredChanged = this.visibleListCaches().some((cache) => {
            const cached = this.queryClient
              .getQueryData<InfiniteSessionData>(cache.queryKey)
              ?.pages.flatMap((page) => page.items)
              .find((item) => item.id === event.session.id)
            return cached !== undefined && Boolean(cached.starred) !== Boolean(event.session.starred)
          })
          if (starredChanged || refreshPending) this.invalidateVisibleListRefresh()
          for (const { cache, record } of oldRecords) {
            const currentItems =
              this.queryClient.getQueryData<InfiniteSessionData>(cache.queryKey)?.pages.flatMap((page) => page.items) ?? []
            const updated = this.projectRecordUpdate(
              currentItems,
              event.session,
              event.meta,
              cache.filter,
              record ??
                (projectChanged && migrationEntry?.cache.archived === cache.archived ? migrationRecord : undefined)
            )
            updateListData(this.queryClient, cache.queryKey, () => updated)
          }
          if (starredChanged || refreshPending) await this.refreshVisibleSessionList()
        }
        break
      case 'session-deleted': {
        const refreshPending = this.visibleListRefreshPending
        const ids = new Set(event.ids)
        this.invalidateVisibleListRefresh()
        for (const sessionId of ids) this.queryClient.setQueryData(QueryKeys.ChatSession(sessionId), null)
        this.updateAllListData(this.visibleListCaches(), (items) => items.filter((item) => !ids.has(item.id)))
        this.updateAllListData(this.archivedListCaches(), (items) => items.filter((item) => !ids.has(item.id)))
        if (refreshPending) await this.refreshVisibleSessionList()
        break
      }
      case 'session-list-reset':
        this.invalidateVisibleListRefresh()
        if (event.visible) this.resetSessionList(event.visible)
        if (event.archived) this.resetArchivedSessionList(event.archived)
        await Promise.all([
          event.visible ? this.refreshScopedListReset(false) : Promise.resolve(),
          event.archived ? this.refreshScopedListReset(true) : Promise.resolve(),
        ])
        break
      case 'session-will-delete':
        break
    }
  }
}

export { SessionQueryBridge as ApplicationQueryBridge }
