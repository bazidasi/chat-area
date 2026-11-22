import { ArrowUp, ChevronDown, FileText, Paperclip, SlidersHorizontal, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { readFileAsAttachment } from '@/lib/chatClient'
import { useChatStore } from '@/store/chatStore'
import type { Attachment, ChatSession } from '@/types'

interface InputBoxProps {
  session: ChatSession
  isGenerating: boolean
  onSend: (text: string, attachments: Attachment[]) => void
  onStop: () => void
  onOpenSessionSettings: () => void
}

export function InputBox({ session, isGenerating, onSend, onStop, onOpenSessionSettings }: InputBoxProps) {
  const { t } = useTranslation()
  const { providers, settings, updateSessionConfig } = useChatStore()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentProvider = providers.find((p) => p.id === session.providerId) || providers[0]

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFiles = async (files: FileList | File[]) => {
    const loaded = await Promise.all(Array.from(files).map((f) => readFileAsAttachment(f)))
    setAttachments((prev) => [...prev, ...loaded])
  }

  const handleSubmit = () => {
    const trimmed = text.trim()
    if ((!trimmed && attachments.length === 0) || isGenerating) return
    if (trimmed) {
      setHistory((prev) => [trimmed, ...prev.slice(0, 30)])
    }
    setHistoryIndex(-1)
    onSend(trimmed, attachments)
    setText('')
    setAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && settings.sendOnEnter) {
      e.preventDefault()
      handleSubmit()
      return
    }
    if (e.key === 'ArrowUp' && !text && history.length > 0) {
      e.preventDefault()
      const next = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(next)
      setText(history[next])
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 md:px-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files.length > 0) {
            void handleFiles(e.dataTransfer.files)
          }
        }}
        className={`mx-auto max-w-4xl rounded-2xl border bg-white/95 p-3 shadow-sm transition dark:bg-zinc-900/95 ${
          isDragging
            ? 'border-[#d6199b] ring-2 ring-[#d6199b]/25'
            : 'border-black/10 focus-within:border-black/25 dark:border-white/10 dark:focus-within:border-white/25'
        }`}
      >
        {/* Attachments strip */}
        {attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-zinc-800"
              >
                {att.dataUrl && att.mimeType.startsWith('image/') ? (
                  <img src={att.dataUrl} alt={att.name} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <FileText className="h-4 w-4 text-[#2979ff]" />
                )}
                <span className="max-w-[160px] truncate text-zinc-700 dark:text-zinc-200">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="rounded-full p-0.5 text-zinc-400 hover:bg-black/10 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={t('Type your question here...')}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  void handleFiles(e.target.files)
                  e.target.value = ''
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={t('Attach files or images')}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenSessionSettings}
              title={t('Session settings')}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            {/* Model Selector Dropdown */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setModelMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-black/8 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <span className="h-2 w-2 rounded-full bg-[#d6199b]" />
                <span className="max-w-[180px] truncate">
                  {currentProvider.name} / {session.model}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {modelMenuOpen && (
                <div className="absolute bottom-full start-0 z-30 mb-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900">
                  {providers.map((provider) => (
                    <div key={provider.id} className="mb-2 last:mb-0">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {provider.name}
                      </div>
                      <div className="space-y-0.5">
                        {provider.models.map((modelId) => {
                          const selected = session.providerId === provider.id && session.model === modelId
                          return (
                            <button
                              key={`${provider.id}:${modelId}`}
                              type="button"
                              onClick={() => {
                                updateSessionConfig(session.id, {
                                  providerId: provider.id,
                                  model: modelId,
                                })
                                setModelMenuOpen(false)
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-start text-xs transition ${
                                selected
                                  ? 'bg-[#d6199b]/10 font-semibold text-[#d6199b]'
                                  : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'
                              }`}
                            >
                              <span className="truncate font-mono">{modelId}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-zinc-400 sm:inline">
              {settings.sendOnEnter ? 'Enter to send · Shift+Enter newline' : 'Click Send'}
            </span>
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                title={t('Stop generating')}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm transition hover:bg-red-600"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!text.trim() && attachments.length === 0}
                onClick={handleSubmit}
                title={t('Send')}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
