import { v4 as uuidv4 } from 'uuid'
import type { Attachment, ChatMessage, ProviderConfig, TokenUsage } from '@/types'

export interface StreamCallbacks {
  onText: (delta: string) => void
  onReasoning: (delta: string) => void
  onUsage?: (usage: TokenUsage) => void
  onError: (message: string) => void
}

export async function fetchServerHealth(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return {}
    const data = (await res.json()) as { envProviders?: Record<string, boolean> }
    return data.envProviders || {}
  } catch {
    return {}
  }
}

export async function streamChatCompletion(params: {
  provider: ProviderConfig
  model: string
  messages: ChatMessage[]
  systemPrompt: string
  temperature: number
  topP: number
  signal: AbortSignal
  callbacks: StreamCallbacks
}) {
  const { provider, model, messages, systemPrompt, temperature, topP, signal, callbacks } = params

  const payloadMessages = messages
    .filter((m) => !m.error && (m.content.trim().length > 0 || (m.attachments && m.attachments.length > 0)))
    .map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments?.map((a) => ({
        name: a.name,
        mimeType: a.mimeType,
        dataUrl: a.dataUrl,
        textContent: a.textContent,
      })),
    }))

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: provider.id,
      providerKind: provider.kind,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      model,
      messages: payloadMessages,
      systemPrompt,
      temperature,
      topP,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText)
    callbacks.onError(text || `HTTP ${response.status}`)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr || dataStr === '[DONE]') continue
      try {
        const evt = JSON.parse(dataStr) as {
          type: 'text' | 'reasoning' | 'usage' | 'error'
          delta?: string
          usage?: TokenUsage
          error?: string
        }
        if (evt.type === 'text' && evt.delta) {
          callbacks.onText(evt.delta)
        } else if (evt.type === 'reasoning' && evt.delta) {
          callbacks.onReasoning(evt.delta)
        } else if (evt.type === 'usage' && evt.usage) {
          callbacks.onUsage?.(evt.usage)
        } else if (evt.type === 'error' && evt.error) {
          callbacks.onError(evt.error)
        }
      } catch {
        // Ignore non-JSON frames
      }
    }
  }
}

export async function generateImageRequest(params: {
  provider: ProviderConfig
  model: string
  prompt: string
  aspectRatio?: string
}): Promise<{ images?: Array<{ dataUrl: string }>; error?: string }> {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: params.provider.id,
      providerKind: params.provider.kind,
      apiKey: params.provider.apiKey,
      baseUrl: params.provider.baseUrl,
      model: params.model,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
    }),
  })
  const data = (await res.json()) as { images?: Array<{ dataUrl: string }>; error?: string }
  if (!res.ok) {
    return { error: data.error || `HTTP ${res.status}` }
  }
  return data
}

export async function testProviderConnection(params: {
  provider: ProviderConfig
  model?: string
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch('/api/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId: params.provider.id,
      providerKind: params.provider.kind,
      apiKey: params.provider.apiKey,
      baseUrl: params.provider.baseUrl,
      model: params.model || params.provider.models[0],
    }),
  })
  return (await res.json()) as { ok: boolean; message?: string; error?: string }
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'yaml', 'yml', 'toml', 'xml',
  'html', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'java',
  'c', 'cpp', 'h', 'hpp', 'rb', 'php', 'sh', 'sql', 'log', 'env', 'ini',
])

export async function readFileAsAttachment(file: File): Promise<Attachment> {
  const id = uuidv4()
  const mimeType = file.type || 'application/octet-stream'

  if (mimeType.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    return { id, name: file.name, mimeType, size: file.size, dataUrl }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (mimeType.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || file.size < 512 * 1024) {
    const textContent = await file.text()
    return { id, name: file.name, mimeType: mimeType || 'text/plain', size: file.size, textContent }
  }

  return {
    id,
    name: file.name,
    mimeType,
    size: file.size,
    textContent: `[Binary attachment: ${file.name}, ${Math.round(file.size / 1024)} KB]`,
  }
}
