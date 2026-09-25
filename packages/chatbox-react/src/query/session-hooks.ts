import { uniqueSessionRecords } from '@chatbox/core/utils/session-sort'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { SessionQueryDefinitions } from './session-query-options'

/** `'all'` keeps the legacy global sidebar; any other value is a project id. */
export type SessionListScope = 'all' | string

function scopeFilter(scope: SessionListScope): { projectId: string } | undefined {
  return scope === 'all' ? undefined : { projectId: scope }
}

export function createSessionHooks(definitions: SessionQueryDefinitions) {
  function useSession(sessionId: string | null) {
    const { data: session, ...rest } = useQuery({
      ...definitions.session(sessionId ?? ''),
      enabled: !!sessionId,
    })
    return { session, ...rest }
  }

  function useSessionList(scope: SessionListScope = 'all') {
    const result = useInfiniteQuery(definitions.sessions(scopeFilter(scope)))
    const sessionMetaList = useMemo(
      () => (result.data ? uniqueSessionRecords(result.data.pages.flatMap((page) => page.items)) : undefined),
      [result.data]
    )
    return {
      sessionMetaList,
      refetch: result.refetch,
      fetchNextPage: result.fetchNextPage,
      hasNextPage: result.hasNextPage,
      isFetchingNextPage: result.isFetchingNextPage,
    }
  }

  function useArchivedSessionList(scope: SessionListScope = 'all') {
    const result = useInfiniteQuery(definitions.archivedSessions(scopeFilter(scope)))
    const archivedSessionMetaList = useMemo(
      () => (result.data ? uniqueSessionRecords(result.data.pages.flatMap((page) => page.items)) : undefined),
      [result.data]
    )
    return {
      archivedSessionMetaList,
      refetch: result.refetch,
      fetchNextPage: result.fetchNextPage,
      hasNextPage: result.hasNextPage,
      isFetchingNextPage: result.isFetchingNextPage,
      isLoading: result.isLoading,
    }
  }

  return {
    useSession,
    useSessionList,
    useArchivedSessionList,
  }
}
