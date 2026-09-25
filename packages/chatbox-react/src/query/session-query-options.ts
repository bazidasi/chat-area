import type { Session, SessionListFilter, SessionMetaPage } from '@chatbox/core'
import { QueryKeys } from './query-keys'

export interface SessionQuerySource {
  getSession(sessionId: string): Promise<Session | null>
  listSessionsMetaPage(cursor: number, limit?: number, filter?: SessionListFilter): Promise<SessionMetaPage>
  listArchivedSessionsMetaPage(cursor: number, limit?: number, filter?: SessionListFilter): Promise<SessionMetaPage>
}

export function createSessionQueryDefinitions(source: SessionQuerySource) {
  const sessionsFor = (filter?: SessionListFilter) => ({
    queryKey: QueryKeys.ChatSessionsListFor(filter),
    queryFn: ({ pageParam }: { pageParam: number }) => source.listSessionsMetaPage(pageParam, undefined, filter),
    getNextPageParam: (lastPage: SessionMetaPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: Infinity,
  })
  const archivedSessionsFor = (filter?: SessionListFilter) => ({
    queryKey: QueryKeys.ArchivedChatSessionsListFor(filter),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      source.listArchivedSessionsMetaPage(pageParam, undefined, filter),
    getNextPageParam: (lastPage: SessionMetaPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: Infinity,
  })
  const sessions = Object.assign(sessionsFor, sessionsFor())
  const archivedSessions = Object.assign(archivedSessionsFor, archivedSessionsFor())
  return {
    session: (sessionId: string) => ({
      queryKey: QueryKeys.ChatSession(sessionId),
      queryFn: () => source.getSession(sessionId),
      staleTime: Infinity,
    }),
    sessions,
    archivedSessions,
  }
}

export type SessionQueryDefinitions = ReturnType<typeof createSessionQueryDefinitions>
