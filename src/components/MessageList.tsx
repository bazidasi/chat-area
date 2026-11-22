import {
  AlertCircle,
  ArrowDown,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  GitBranch,
  Pencil,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FibonacciLogo } from '@/components/FibonacciLogo'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { formatJalali } from '@/lib/jalali'
import { useChatStore } from '@/store/chatStore'
import type { ChatMessage, ChatSession } from '@/types'

interface MessageListProps {
  session: ChatSession
  onRegenerate: (assistantMessageId: string) => void
  onEditAndResend: (messageId: string, newContent: string) => void
  onQuickPrompt: (prompt: string) => void
}

function formatMessageTime(ts: number, language: string): string {
  const date = new Date(ts)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (language === 'fa') {
    return `${formatJalali(date, { year: false })} · ${timeStr}`
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${timeStr}`
}

function MessageItem({
  message,
  showTimestamps,
  showWordCount,
  language,
  onCopy,
  onDelete,
  onFork,
  onRegenerate,
  onEditAndResend,
}: {
  message: ChatMessage
  showTimestamps: boolean
  showWordCount: boolean
  language: string
  onCopy: (content: string) => void
  onDelete: () => void
  onFork: () => void
  onRegenerate?: () => void
  onEditAndResend?: (newContent: string) => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(Boolean(message.generating))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  const isUser = message.role === 'user'

  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className={`group flex gap-3.5 px-4 py-4 md:px-6 ${isUser ? '' : ''}`}>
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          isUser
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'border border-black/8 bg-white text-[#d6199b] dark:border-white/10 dark:bg-zinc-900'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {isUser ? t('You') : message.model || 'Assistant'}
          </span>
          {showTimestamps && <span>{formatMessageTime(message.createdAt, language)}</span>}
          {showWordCount && !isUser && message.content && (
            <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
              {message.usage?.totalTokens
                ? `${message.usage.totalTokens} tokens`
                : `${message.content.trim().split(/\s+/).filter(Boolean).length} words`}
            </span>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) =>
              att.dataUrl && att.mimeType.startsWith('image/') ? (
                <img
                  key={att.id}
                  src={att.dataUrl}
                  alt={att.name}
                  className="max-h-56 rounded-xl border border-black/10 object-cover shadow-sm dark:border-white/10"
                />
              ) : (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <FileText className="h-3.5 w-3.5 text-[#2979ff]" />
                  <span className="max-w-[200px] truncate">{att.name}</span>
                </div>
              )
            )}
          </div>
        )}

        {/* Collapsible Reasoning */}
        {message.reasoning && (
          <div className="rounded-xl border border-black/8 bg-black/[0.025] px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setShowReasoning((v) => !v)}
              className="flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Brain className="h-3.5 w-3.5 text-[#d6199b]" />
              <span>{message.generating && !message.content ? t('Thinking...') : t('Reasoning')}</span>
              {showReasoning ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {showReasoning && (
              <div className="mt-2 whitespace-pre-wrap border-t border-black/5 pt-2 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                {message.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Message Body / Editor */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none focus:border-[#2979ff] dark:border-white/15 dark:bg-zinc-900"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  if (draft.trim() && onEditAndResend) {
                    onEditAndResend(draft.trim())
                  }
                }}
                className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                {t('Save & Resend')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content)
                  setEditing(false)
                }}
                className="rounded-lg px-3 py-1 text-xs text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900/75 dark:ring-white/10">
            {message.error ? (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="whitespace-pre-wrap">{message.error}</span>
              </div>
            ) : message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : message.generating ? (
              <div className="flex items-center gap-1.5 py-1 text-xs text-zinc-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#d6199b]" />
                <span>{t('Generating...')}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Action Toolbar */}
        {!editing && !message.generating && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              title={t('Copy')}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {isUser && onEditAndResend && (
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content)
                  setEditing(true)
                }}
                title={t('Edit')}
                className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                title={t('Regenerate')}
                className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onFork}
              title={t('Fork conversation')}
              className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title={t('Delete')}
              className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const STARTER_PROMPTS = [
  {
    title: 'Explain a concept clearly',
    prompt: 'Explain the Fibonacci sequence, its golden ratio convergence, and three real-world engineering uses.',
  },
  {
    title: 'Write & review code',
    prompt: 'Write a clean TypeScript LRU cache with O(1) get/set and unit test examples.',
  },
  {
    title: 'Draw a Mermaid architecture diagram',
    prompt: 'Create a Mermaid sequence diagram showing an SSE streaming AI request through a Node.js proxy.',
  },
  {
    title: 'Translate or polish writing',
    prompt: 'Polish this paragraph into crisp, executive-ready prose and give 2 concise headline options.',
  },
]

export function MessageList({ session, onRegenerate, onEditAndResend, onQuickPrompt }: MessageListProps) {
  const { t } = useTranslation()
  const { settings, providers, envProviders, openSettings, deleteMessage, forkSessionAtMessage } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const currentProvider = providers.find((p) => p.id === session.providerId) || providers[0]
  const hasAnyProviderKey =
    Boolean(currentProvider?.apiKey.trim()) ||
    Boolean(envProviders[currentProvider?.id]) ||
    providers.some((p) => p.apiKey.trim().length > 0) ||
    Object.values(envProviders).some(Boolean)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages.length, session.messages[session.messages.length - 1]?.content])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceFromBottom > 180)
  }

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content)
  }

  if (session.messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-2xl space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
            <FibonacciLogo size={44} accent />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Fibonacci Chat Area
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {currentProvider.name} · <span className="font-mono">{session.model}</span>
            </p>
          </div>

          {!hasAnyProviderKey && (
            <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/75">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('Connect Fibonacci AI')}
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t('Add your Fibonacci AI API token to start chatting')} — or configure Google Gemini, OpenAI, Anthropic, or DeepSeek in Settings.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openSettings('provider', currentProvider.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>{t('Add API Token')}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 text-start sm:grid-cols-2">
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onQuickPrompt(item.prompt)}
                className="group rounded-2xl border border-black/8 bg-white/75 p-3.5 transition hover:border-[#d6199b]/40 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-zinc-900/70 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 group-hover:text-[#d6199b] dark:text-zinc-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{item.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl py-4">
        {session.messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            showTimestamps={settings.showTimestamps}
            showWordCount={settings.showWordCount}
            language={settings.language}
            onCopy={handleCopy}
            onDelete={() => deleteMessage(session.id, msg.id)}
            onFork={() => forkSessionAtMessage(session.id, msg.id)}
            onRegenerate={msg.role === 'assistant' ? () => onRegenerate(msg.id) : undefined}
            onEditAndResend={msg.role === 'user' ? (txt) => onEditAndResend(msg.id, txt) : undefined}
          />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>

      {showScrollBottom && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-32 end-8 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-lg hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
