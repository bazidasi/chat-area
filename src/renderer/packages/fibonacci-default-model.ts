import { ModelProviderEnum } from '@shared/types'

/**
 * The default chat model for this build. Every "new chat" flow that has no
 * explicit model selection resolves to this Fibonacci model, replacing the
 * upstream chatbox-ai license-based defaults which pointed at an
 * unregistered provider.
 */
export const FIBONACCI_DEFAULT_MODEL_ID = 'fibonacci-1-pro-max'

export const FIBONACCI_DEFAULT_MODEL = {
  provider: ModelProviderEnum.Fibonacci,
  modelId: FIBONACCI_DEFAULT_MODEL_ID,
} as const
