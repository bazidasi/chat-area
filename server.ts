import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'
import express, { type Request, type Response } from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT) || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

type ProviderKind = 'gemini' | 'anthropic' | 'openai-compatible'

interface IncomingAttachment {
  name: string
  mimeType: string
  dataUrl?: string
  textContent?: string
}

interface IncomingMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: IncomingAttachment[]
}

interface ChatRequestBody {
  providerId: string
  providerKind: ProviderKind
  apiKey?: string
  baseUrl?: string
  model: string
  messages: IncomingMessage[]
  systemPrompt?: string
  temperature?: number
  topP?: number
  thinkingBudget?: number
}

function resolveEnvApiKey(providerId: string, providerKind: ProviderKind): string | undefined {
  if (providerId === 'fibonacci') return process.env.FIBONACCI_API_KEY
  if (providerId === 'gemini' || providerKind === 'gemini') return process.env.GEMINI_API_KEY
  if (providerId === 'openai') return process.env.OPENAI_API_KEY
  if (providerId === 'anthropic' || providerKind === 'anthropic') return process.env.ANTHROPIC_API_KEY
  if (providerId === 'deepseek') return process.env.DEEPSEEK_API_KEY
  if (providerId === 'openrouter') return process.env.OPENROUTER_API_KEY
  return undefined
}

function getDefaultBaseUrl(providerId: string): string {
  switch (providerId) {
    case 'fibonacci':
      return 'https://my.fibonacci.monster/v1'
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'deepseek':
      return 'https://api.deepseek.com/v1'
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    default:
      return 'https://api.openai.com/v1'
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function sendSseEvent(res: Response, payload: Record<string, unknown>) {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

function formatMessageTextWithTextAttachments(msg: IncomingMessage): string {
  let text = msg.content || ''
  const textFiles = (msg.attachments || []).filter((att) => att.textContent)
  if (textFiles.length > 0) {
    const fileBlocks = textFiles
      .map((f) => `\n\n--- File: ${f.name} ---\n${f.textContent}`)
      .join('')
    text = text ? `${text}${fileBlocks}` : fileBlocks.trimStart()
  }
  return text
}

async function handleGeminiChat(
  res: Response,
  apiKey: string,
  body: ChatRequestBody,
  signal: AbortSignal
) {
  const ai = new GoogleGenAI({ apiKey })

  const contents = body.messages
    .filter((m) => m.role !== 'system')
    .map((msg) => {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
      const text = formatMessageTextWithTextAttachments(msg)
      if (text) {
        parts.push({ text })
      }
      for (const att of msg.attachments || []) {
        if (att.dataUrl && att.mimeType.startsWith('image/')) {
          const parsed = parseDataUrl(att.dataUrl)
          if (parsed) {
            parts.push({ inlineData: parsed })
          }
        }
      }
      if (parts.length === 0) {
        parts.push({ text: ' ' })
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      }
    })

  const config: Record<string, unknown> = {}
  if (body.systemPrompt?.trim()) {
    config.systemInstruction = body.systemPrompt.trim()
  }
  if (typeof body.temperature === 'number') {
    config.temperature = body.temperature
  }
  if (typeof body.topP === 'number') {
    config.topP = body.topP
  }

  const stream = await ai.models.generateContentStream({
    model: body.model || 'gemini-2.5-flash',
    contents,
    config,
  })

  for await (const chunk of stream) {
    if (signal.aborted) break
    const candidates = chunk.candidates || []
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || []
      for (const part of parts) {
        const partAny = part as { text?: string; thought?: boolean }
        if (typeof partAny.text === 'string' && partAny.text.length > 0) {
          if (partAny.thought) {
            sendSseEvent(res, { type: 'reasoning', delta: partAny.text })
          } else {
            sendSseEvent(res, { type: 'text', delta: partAny.text })
          }
        }
      }
    }
    if (chunk.usageMetadata) {
      sendSseEvent(res, {
        type: 'usage',
        usage: {
          promptTokens: chunk.usageMetadata.promptTokenCount || 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
          totalTokens: chunk.usageMetadata.totalTokenCount || 0,
        },
      })
    }
  }
}

async function handleAnthropicChat(
  res: Response,
  apiKey: string,
  body: ChatRequestBody,
  signal: AbortSignal
) {
  const baseUrl = normalizeBaseUrl(body.baseUrl || getDefaultBaseUrl('anthropic'))
  const messages = body.messages
    .filter((m) => m.role !== 'system')
    .map((msg) => {
      const text = formatMessageTextWithTextAttachments(msg)
      const imageAttachments = (msg.attachments || []).filter(
        (att) => att.dataUrl && att.mimeType.startsWith('image/')
      )
      if (imageAttachments.length === 0) {
        return { role: msg.role, content: text || ' ' }
      }
      const contentParts: Array<Record<string, unknown>> = []
      for (const att of imageAttachments) {
        const parsed = att.dataUrl ? parseDataUrl(att.dataUrl) : null
        if (parsed) {
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data },
          })
        }
      }
      if (text) {
        contentParts.push({ type: 'text', text })
      }
      return { role: msg.role, content: contentParts }
    })

  const payload: Record<string, unknown> = {
    model: body.model,
    max_tokens: 4096,
    stream: true,
    messages,
  }
  if (body.systemPrompt?.trim()) {
    payload.system = body.systemPrompt.trim()
  }
  if (typeof body.temperature === 'number') {
    payload.temperature = body.temperature
  }

  const upstream = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => upstream.statusText)
    throw new Error(`Anthropic API error (${upstream.status}): ${errText}`)
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done || signal.aborted) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr || dataStr === '[DONE]') continue
      try {
        const event = JSON.parse(dataStr)
        if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta' && event.delta.text) {
            sendSseEvent(res, { type: 'text', delta: event.delta.text })
          } else if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
            sendSseEvent(res, { type: 'reasoning', delta: event.delta.thinking })
          }
        }
      } catch {
        // Ignore non-JSON SSE lines
      }
    }
  }
}

async function handleOpenAICompatibleChat(
  res: Response,
  apiKey: string,
  body: ChatRequestBody,
  signal: AbortSignal
) {
  const baseUrl = normalizeBaseUrl(body.baseUrl || getDefaultBaseUrl(body.providerId))
  const chatMessages: Array<Record<string, unknown>> = []

  if (body.systemPrompt?.trim()) {
    chatMessages.push({ role: 'system', content: body.systemPrompt.trim() })
  }

  for (const msg of body.messages) {
    if (msg.role === 'system') continue
    const text = formatMessageTextWithTextAttachments(msg)
    const imageAttachments = (msg.attachments || []).filter(
      (att) => att.dataUrl && att.mimeType.startsWith('image/')
    )
    if (imageAttachments.length === 0) {
      chatMessages.push({ role: msg.role, content: text || ' ' })
    } else {
      const parts: Array<Record<string, unknown>> = []
      if (text) parts.push({ type: 'text', text })
      for (const att of imageAttachments) {
        if (att.dataUrl) {
          parts.push({ type: 'image_url', image_url: { url: att.dataUrl } })
        }
      }
      chatMessages.push({ role: msg.role, content: parts })
    }
  }

  const payload: Record<string, unknown> = {
    model: body.model,
    messages: chatMessages,
    stream: true,
  }
  if (typeof body.temperature === 'number') {
    payload.temperature = body.temperature
  }
  if (typeof body.topP === 'number') {
    payload.top_p = body.topP
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (body.providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://my.fibonacci.monster'
    headers['X-Title'] = 'Fibonacci Chat Area'
  }

  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => upstream.statusText)
    throw new Error(`Provider API error (${upstream.status}): ${errText}`)
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done || signal.aborted) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr || dataStr === '[DONE]') continue
      try {
        const chunk = JSON.parse(dataStr)
        const delta = chunk.choices?.[0]?.delta
        if (delta) {
          const reasoning = delta.reasoning_content ?? delta.reasoning
          if (typeof reasoning === 'string' && reasoning.length > 0) {
            sendSseEvent(res, { type: 'reasoning', delta: reasoning })
          }
          if (typeof delta.content === 'string' && delta.content.length > 0) {
            sendSseEvent(res, { type: 'text', delta: delta.content })
          }
        }
        if (chunk.usage) {
          sendSseEvent(res, {
            type: 'usage',
            usage: {
              promptTokens: chunk.usage.prompt_tokens || 0,
              completionTokens: chunk.usage.completion_tokens || 0,
              totalTokens: chunk.usage.total_tokens || 0,
            },
          })
        }
      } catch {
        // Ignore partial or malformed lines
      }
    }
  }
}

async function startServer() {
  const app = express()
  app.use(express.json({ limit: '25mb' }))

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      envProviders: {
        fibonacci: Boolean(process.env.FIBONACCI_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      },
    })
  })

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = req.body as ChatRequestBody
    const apiKey = body.apiKey?.trim() || resolveEnvApiKey(body.providerId, body.providerKind)

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    if (!apiKey) {
      sendSseEvent(res, {
        type: 'error',
        error: `No API key configured for ${body.providerId}. Open Settings → Model Provider to add your API key.`,
      })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    const controller = new AbortController()
    req.on('close', () => {
      controller.abort()
    })

    try {
      if (body.providerKind === 'gemini') {
        await handleGeminiChat(res, apiKey, body, controller.signal)
      } else if (body.providerKind === 'anthropic') {
        await handleAnthropicChat(res, apiKey, body, controller.signal)
      } else {
        await handleOpenAICompatibleChat(res, apiKey, body, controller.signal)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error)
        sendSseEvent(res, { type: 'error', error: message })
      }
    } finally {
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n')
        res.end()
      }
    }
  })

  app.post('/api/image', async (req: Request, res: Response) => {
    try {
      const { providerId, providerKind, apiKey: clientKey, baseUrl, model, prompt, aspectRatio } = req.body as {
        providerId: string
        providerKind: ProviderKind
        apiKey?: string
        baseUrl?: string
        model?: string
        prompt: string
        aspectRatio?: string
      }

      const apiKey = clientKey?.trim() || resolveEnvApiKey(providerId, providerKind)
      if (!apiKey) {
        res.status(400).json({ error: `No API key configured for ${providerId}.` })
        return
      }

      if (providerKind === 'gemini') {
        const ai = new GoogleGenAI({ apiKey })
        const imageModel = model || 'gemini-2.5-flash-image'
        if (imageModel.startsWith('imagen-')) {
          const response = await ai.models.generateImages({
            model: imageModel,
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: (aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4') || '1:1',
            },
          })
          const images = (response.generatedImages || [])
            .map((img) => img.image?.imageBytes)
            .filter(Boolean)
            .map((b64) => ({ dataUrl: `data:image/png;base64,${b64}` }))
          res.json({ images })
          return
        }

        const response = await ai.models.generateContent({
          model: imageModel,
          contents: prompt,
        })
        const images: Array<{ dataUrl: string }> = []
        const parts = response.candidates?.[0]?.content?.parts || []
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            images.push({
              dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            })
          }
        }
        if (images.length === 0) {
          res.status(422).json({ error: 'The selected Gemini model did not return an image. Try gemini-2.5-flash-image or imagen-3.0-generate-002.' })
          return
        }
        res.json({ images })
        return
      }

      const resolvedBase = normalizeBaseUrl(baseUrl || getDefaultBaseUrl(providerId))
      const upstream = await fetch(`${resolvedBase}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'dall-e-3',
          prompt,
          n: 1,
          response_format: 'b64_json',
        }),
      })
      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => upstream.statusText)
        res.status(upstream.status).json({ error: errText })
        return
      }
      const data = (await upstream.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
      const images = (data.data || [])
        .map((item) => {
          if (item.b64_json) return { dataUrl: `data:image/png;base64,${item.b64_json}` }
          if (item.url) return { dataUrl: item.url }
          return null
        })
        .filter((x): x is { dataUrl: string } => Boolean(x))
      res.json({ images })
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
  })

  app.post('/api/test-connection', async (req: Request, res: Response) => {
    try {
      const { providerId, providerKind, apiKey: clientKey, baseUrl, model } = req.body as {
        providerId: string
        providerKind: ProviderKind
        apiKey?: string
        baseUrl?: string
        model?: string
      }

      const apiKey = clientKey?.trim() || resolveEnvApiKey(providerId, providerKind)
      if (!apiKey) {
        res.status(400).json({ ok: false, error: 'Missing API key' })
        return
      }

      if (providerKind === 'gemini') {
        const ai = new GoogleGenAI({ apiKey })
        await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: 'Reply with OK',
          config: { maxOutputTokens: 5 },
        })
        res.json({ ok: true, message: 'Connected to Google Gemini' })
        return
      }

      if (providerKind === 'anthropic') {
        const resolvedBase = normalizeBaseUrl(baseUrl || getDefaultBaseUrl('anthropic'))
        const upstream = await fetch(`${resolvedBase}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })
        if (!upstream.ok) {
          const errText = await upstream.text().catch(() => upstream.statusText)
          res.status(upstream.status).json({ ok: false, error: errText })
          return
        }
        res.json({ ok: true, message: 'Connected to Anthropic' })
        return
      }

      const resolvedBase = normalizeBaseUrl(baseUrl || getDefaultBaseUrl(providerId))
      const upstream = await fetch(`${resolvedBase}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!upstream.ok) {
        const chatCheck = await fetch(`${resolvedBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5,
          }),
        })
        if (!chatCheck.ok) {
          const errText = await chatCheck.text().catch(() => chatCheck.statusText)
          res.status(chatCheck.status).json({ ok: false, error: errText })
          return
        }
      }
      res.json({ ok: true, message: 'Connection verified' })
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distDir = path.resolve(__dirname, 'dist')
    app.use(express.static(distDir))
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html')
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile)
      } else {
        res.status(404).send('Build output not found. Run npm run build first.')
      }
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fibonacci Chat Area listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
