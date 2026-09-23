import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import FibonacciAI, { FIBONACCI_IMAGE_MODELS, FIBONACCI_MODELS } from './models/fibonacci'

/**
 * Fibonacci AI provider — https://my.fibonacci.monster
 *
 * OpenAI-compatible API:
 *   POST https://my.fibonacci.monster/api/v1/chat/completions
 *   Headers: Authorization: Bearer <API_TOKEN>, Content-Type: application/json
 *   Body: model, messages, temperature (0.6), max_tokens (8000), stream (true)
 *
 * API tokens: https://my.fibonacci.monster/user/api-tokens
 * Dashboard:  https://my.fibonacci.monster/user/dashboard
 * (unsigned visitors of the dashboard are redirected to the login page automatically)
 *
 * RAG note: custom knowledge is injected server-side into the System Prompt —
 * no client-side configuration is needed.
 */
export const fibonacciProvider = defineProvider({
  id: ModelProviderEnum.Fibonacci,
  name: 'Fibonacci AI',
  type: ModelProviderType.OpenAI,
  description:
    'Fibonacci AI official service. Create your API token at my.fibonacci.monster/user/api-tokens and start chatting.',
  urls: {
    website: 'https://my.fibonacci.monster/user/dashboard',
    apiKey: 'https://my.fibonacci.monster/user/api-tokens',
    docs: 'https://my.fibonacci.monster/user/dashboard',
  },
  defaultSettings: {
    apiHost: 'https://my.fibonacci.monster/api/v1',
    apiPath: '/chat/completions',
    models: [...FIBONACCI_MODELS.map((m) => ({ ...m, type: 'chat' as const })), ...FIBONACCI_IMAGE_MODELS],
  },
  createModel: (config) => {
    return new FibonacciAI(
      {
        apiKey: config.effectiveApiKey,
        apiHost: config.formattedApiHost || 'https://my.fibonacci.monster/api/v1',
        apiPath: config.formattedApiPath || '/chat/completions',
        model: config.model,
        temperature: config.settings.temperature,
        topP: config.settings.topP,
        maxOutputTokens: config.settings.maxTokens,
        stream: config.settings.stream,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `Fibonacci AI (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})
