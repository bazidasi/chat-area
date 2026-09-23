import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'
import AbstractAISDKModel from '../../../models/abstract-ai-sdk'
import { ApiError } from '../../../models/errors'
import { fetchRemoteModels } from '../../../models/openai-compatible'
import type { CallChatCompletionOptions } from '../../../models/types'
import { createFetchWithProxy } from '../../../models/utils/fetch-proxy'
import type { ProviderModelInfo } from '../../../types'
import type { ModelDependencies } from '../../../types/adapters'
import { normalizeOpenAIApiHostAndPath } from '../../../utils/llm_utils'

const FIBONACCI_IMAGE_SIZES: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '4:3': '1536x1152',
    '3:4': '1152x1536',
    '5:4': '1536x1224',
    '4:5': '1224x1536',
    '21:9': '2100x900',
    '9:21': '900x2100',
}

function aspectRatioToSize(ratio?: string): string {
    return FIBONACCI_IMAGE_SIZES[ratio || ''] ?? '1024x1024'
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

interface Options {
  apiKey: string
  apiHost: string
  apiPath: string
  model: ProviderModelInfo
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  stream?: boolean
  useProxy?: boolean
}

type FetchFunction = typeof globalThis.fetch

/**
 * Fibonacci AI — OpenAI-compatible provider (https://my.fibonacci.monster).
 *
 * Chat endpoint: POST {apiHost}{apiPath} (default
 * https://my.fibonacci.monster/api/v1/chat/completions) with
 * `Authorization: Bearer <token>`. Streaming uses standard OpenAI SSE chunks
 * (`data: {...}` lines, content in `choices[0].delta.content`, terminated by
 * `data: [DONE]`), which the AI SDK's OpenAI-compatible transport handles.
 *
 * Note: custom knowledge (RAG) is injected server-side into the system prompt
 * by the Fibonacci API — no client-side work is required.
 */
export default class FibonacciAI extends AbstractAISDKModel {
  public name = 'Fibonacci AI'

  constructor(
    public options: Options,
    dependencies: ModelDependencies
  ) {
    super(options, dependencies)
    const { apiHost, apiPath } = normalizeOpenAIApiHostAndPath(options)
    this.options = { ...options, apiHost, apiPath }
  }

  protected getCallSettings(options: CallChatCompletionOptions) {
    return {
      temperature: this.options.temperature,
      topP: this.options.topP,
      maxOutputTokens: this.options.maxOutputTokens,
      stream: this.options.stream,
    }
  }

  protected getProvider(_options: CallChatCompletionOptions, fetchFunction?: FetchFunction) {
    return createOpenAICompatible({
      name: this.name,
      apiKey: this.options.apiKey,
      baseURL: this.options.apiHost,
      fetch: fetchFunction,
    })
  }

  protected getChatModel(options: CallChatCompletionOptions) {
    const { apiHost, apiPath } = this.options
    const provider = this.getProvider(options, async (_input, init) => {
      return createFetchWithProxy(this.options.useProxy, this.dependencies)(`${apiHost}${apiPath}`, init)
    })
    return wrapLanguageModel({
      model: provider.languageModel(this.options.model.modelId),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })
  }

  public async listModels(): Promise<ProviderModelInfo[]> {
    try {
      const remote = await fetchRemoteModels(
        {
          apiHost: this.options.apiHost,
          apiKey: this.options.apiKey,
          useProxy: this.options.useProxy,
        },
        this.dependencies
      )
      if (remote.length > 0) return remote
    } catch {
      // fall through to the curated catalog below
    }
    return FIBONACCI_MODELS.map((m) => ({ ...m, type: 'chat' as const }))
  }

  protected getImageModel() {
    return FIBONACCI_IMAGE_MODELS[0]?.modelId ?? null
  }

  public async paint(
    params: {
      prompt: string
      images?: { imageUrl: string }[]
      num: number
      aspectRatio?: string
    },
    signal?: AbortSignal,
    callback?: (picBase64: string) => void | Promise<void>,
  ): Promise<string[]> {
    const imageModel = this.getImageModel()
    if (!imageModel) {
      throw new ApiError('Provider does not support image generation')
    }

    const url = `${this.options.apiHost}/images/generations`
    const size = aspectRatioToSize(params.aspectRatio)
    const results: string[] = []

    for (let i = 0; i < params.num; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: imageModel,
          prompt: params.prompt,
          size,
          n: 1,
        }),
        signal,
      })

      if (!res.ok) {
        throw new ApiError(`Image generation failed: ${res.status} ${res.statusText}`)
      }

      const json = await res.json()
      const imageUrl = json?.data?.[0]?.url
      if (!imageUrl) {
        throw new ApiError('No image generated')
      }

      const imageRes = await fetch(imageUrl, { signal })
      if (!imageRes.ok) {
        throw new ApiError(`Image download failed: ${imageRes.status}`)
      }

      const blob = await imageRes.blob()
      const dataUrl = `data:${blob.type};base64,${await blobToBase64(blob)}`
      results.push(dataUrl)
      await callback?.(dataUrl)
    }

    return results
  }
}

/** Curated Fibonacci AI chat catalog (always available offline). */
export const FIBONACCI_MODELS: ProviderModelInfo[] = [

  {
    modelId: 'fibonacci-1-pro-max',
    nickname: 'Fibonacci 1 Pro Max',
    contextWindow: 128_000,
    maxOutput: 8_000,
    capabilities: ['reasoning', 'tool_use'],
  },
  {
    modelId: 'fibonacci-1-agentic',
    nickname: 'Fibonacci 1 Agentic',
    contextWindow: 128_000,
    maxOutput: 8_000,
    capabilities: ['reasoning', 'tool_use'],
  },
  {
    modelId: 'fibonacci-2-sentiment',
    nickname: 'Fibonacci 2 Sentiment',
    contextWindow: 128_000,
    maxOutput: 8_000,
    capabilities: [],
  },
  {
    modelId: 'fibonacci-2-phoenix',
    nickname: 'Fibonacci 2 Phoenix',
    contextWindow: 128_000,
    maxOutput: 8_000,
    capabilities: ['tool_use'],
  },
  {
    modelId: 'fibonacci-2-coder',
    nickname: 'Fibonacci 2 Coder',
    contextWindow: 128_000,
    maxOutput: 8_000,
    capabilities: ['tool_use'],
  },
]

/** Fibonacci AI image generation catalog. */
export const FIBONACCI_IMAGE_MODELS: ProviderModelInfo[] = [
  {
    modelId: 'fibonacci-1-image',
    nickname: 'Fibonacci 1 Image',
    type: 'image',
    capabilities: ['vision'],
  },
  {
    modelId: 'fibonacci-1-image-pro',
    nickname: 'Fibonacci 1 Image Pro',
    type: 'image',
    capabilities: ['vision'],
  },
]
