import type { SessionListFilter } from '@chatbox/core'

const chatSessionsListKey = ['chat-sessions-list'] as const
const archivedChatSessionsListKey = ['archived-chat-sessions-list'] as const

export function sessionListQueryKey(baseKey: readonly string[], filter?: SessionListFilter): readonly string[] {
  if (filter?.projectId === undefined) return baseKey
  return [...baseKey, `project:${filter.projectId}`]
}

export const QueryKeys = {
  /** The unscoped list remains the backwards-compatible key for global callers. */
  ChatSessionsList: chatSessionsListKey,
  ArchivedChatSessionsList: archivedChatSessionsListKey,
  ChatSessionsListFor: (filter?: SessionListFilter) => sessionListQueryKey(chatSessionsListKey, filter),
  ArchivedChatSessionsListFor: (filter?: SessionListFilter) => sessionListQueryKey(archivedChatSessionsListKey, filter),
  ChatSession: (id: string) => ['chat-session', id],
  ChatSessionSettings: (id: string) => ['chat-session-settings', id],
}
