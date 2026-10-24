import type { ProviderModelInfo } from '@shared/types'
import type { ChatboxAIModelList } from '@/packages/remote'
import { useMemo } from 'react'

/**
 * Fibonacci fork: the upstream chatbox-ai cloud model catalog (license-gated,
 * served from the chatbox backend) is fully disabled. The hook keeps its
 * return shape and types so the model selector compiles unchanged, but every
 * list is permanently empty — the only built-in provider is Fibonacci.
 */
const useChatboxAIModels = () => {
  const emptyModels = useMemo<ProviderModelInfo[]>(() => [], [])
  const emptyModelList = useMemo<ChatboxAIModelList | null>(() => null, [])

  return {
    allChatboxAIModels: emptyModels,
    chatboxAIModels: emptyModels,
    chatboxAIImageModels: emptyModels,
    chatboxAIModelList: emptyModelList,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    isStale: true,
    refetch: async () => ({}) as never,
  }
}

export default useChatboxAIModels
