import { Download, Eraser, Menu, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { CopilotsView } from '@/components/CopilotsView'
import { ImageCreatorView } from '@/components/ImageCreatorView'
import { InputBox } from '@/components/InputBox'
import { MessageList } from '@/components/MessageList'
import { ArchiveModal, SearchModal, SessionSettingsModal } from '@/components/SearchArchiveModals'
import { SettingsModal } from '@/components/SettingsModal'
import { Sidebar } from '@/components/Sidebar'
import { loadAndSwitchLanguage } from '@/i18n'
import { fetchServerHealth, streamChatCompletion } from '@/lib/chatClient'
import { useChatStore } from '@/store/chatStore'
import type { Attachment, ChatMessage, ChatSession } from '@/types'

export function App() {
  const { t } = useTranslation()
  const {
    sessions,
    activeSessionId,
    activeView,
    providers,
    settings,
    sidebarOpen,
    setSidebarOpen,
    setEnvProviders,
    createSession,
    addMessage,
    updateMessage,
    appendMessageDelta,
    truncateMessagesAfter,
    updateSessionConfig,
    clearSessionMessages,
    setSearchModalOpen,
  } = useChatStore()

  const [sessionSettingsOpen, setSessionSettingsOpen] = useState(false)
  const [generatingSessionIds, setGeneratingSessionIds] = useState<Record<string, boolean>>({})
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  )

  // Hydrate server env status & i18n language on startup
  useEffect(() => {
    void fetchServerHealth().then((env) => setEnvProviders(env))
    void loadAndSwitchLanguage(settings.language)
  }, [setEnvProviders, settings.language])

  // Sync theme to document root
  useEffect(() => {
    const applyTheme = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      const mode = dark ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', mode)
      document.documentElement.classList.toggle('dark', dark)
      localStorage.setItem('initial-theme', mode)
    }
    applyTheme()
    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', applyTheme)
      return () => media.removeEventListener('change', applyTheme)
    }
  }, [settings.theme])

  // Global keyboard shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+K)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchModalOpen(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        createSession()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createSession, setSearchModalOpen])

  const runCompletion = useCallback(
    async (session: ChatSession, contextMessages: ChatMessage[]) => {
      const provider = providers.find((p) => p.id === session.providerId) || providers[0]
      const assistantMsgId = uuidv4()
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        reasoning: '',
        model: session.model,
        providerId: provider.id,
        createdAt: Date.now(),
        generating: true,
      }

      addMessage(session.id, assistantMessage)

      const controller = new AbortController()
      abortControllersRef.current[session.id] = controller
      setGeneratingSessionIds((prev) => ({ ...prev, [session.id]: true }))

      const slicedContext = contextMessages.slice(-settings.maxContextMessages)

      try {
        await streamChatCompletion({
          provider,
          model: session.model,
          messages: slicedContext,
          systemPrompt: session.systemPrompt,
          temperature: settings.temperature,
          topP: settings.topP,
          signal: controller.signal,
          callbacks: {
            onText: (delta) => appendMessageDelta(session.id, assistantMsgId, 'content', delta),
            onReasoning: (delta) => appendMessageDelta(session.id, assistantMsgId, 'reasoning', delta),
            onUsage: (usage) => updateMessage(session.id, assistantMsgId, { usage }),
            onError: (error) => updateMessage(session.id, assistantMsgId, { error }),
          },
        })
      } catch (err) {
        if (!controller.signal.aborted) {
          updateMessage(session.id, assistantMsgId, {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      } finally {
        updateMessage(session.id, assistantMsgId, { generating: false })
        delete abortControllersRef.current[session.id]
        setGeneratingSessionIds((prev) => ({ ...prev, [session.id]: false }))
      }
    },
    [
      addMessage,
      appendMessageDelta,
      providers,
      settings.maxContextMessages,
      settings.temperature,
      settings.topP,
      updateMessage,
    ]
  )

  const handleSend = useCallback(
    (text: string, attachments: Attachment[] = []) => {
      if (!activeSession) return
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: Date.now(),
      }

      const isFirstMessage = activeSession.messages.length === 0 && activeSession.title === 'New chat'
      if (isFirstMessage && text) {
        updateSessionConfig(activeSession.id, {
          title: text.slice(0, 42) + (text.length > 42 ? '…' : ''),
        })
      }

      addMessage(activeSession.id, userMessage)
      const nextContext = [...activeSession.messages, userMessage]
      void runCompletion(activeSession, nextContext)
    },
    [activeSession, addMessage, runCompletion, updateSessionConfig]
  )

  const handleStop = useCallback(() => {
    if (!activeSession) return
    abortControllersRef.current[activeSession.id]?.abort()
  }, [activeSession])

  const handleRegenerate = useCallback(
    (assistantMessageId: string) => {
      if (!activeSession) return
      const idx = activeSession.messages.findIndex((m) => m.id === assistantMessageId)
      if (idx === -1) return
      const priorMessages = activeSession.messages.slice(0, idx)
      truncateMessagesAfter(activeSession.id, assistantMessageId, true)
      void runCompletion(activeSession, priorMessages)
    },
    [activeSession, runCompletion, truncateMessagesAfter]
  )

  const handleEditAndResend = useCallback(
    (messageId: string, newContent: string) => {
      if (!activeSession) return
      const idx = activeSession.messages.findIndex((m) => m.id === messageId)
      if (idx === -1) return
      const updatedUserMsg: ChatMessage = { ...activeSession.messages[idx], content: newContent }
      const nextContext = [...activeSession.messages.slice(0, idx), updatedUserMsg]
      truncateMessagesAfter(activeSession.id, messageId, false)
      updateMessage(activeSession.id, messageId, { content: newContent })
      void runCompletion(activeSession, nextContext)
    },
    [activeSession, runCompletion, truncateMessagesAfter, updateMessage]
  )

  const handleExportMarkdown = () => {
    if (!activeSession) return
    const lines = [
      `# ${activeSession.title}`,
      `> Model: ${activeSession.model}`,
      '',
      ...activeSession.messages.map((m) => `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n${m.content}\n`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeSession.title.replace(/[^\w-]+/g, '_') || 'chat'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported Markdown')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--chatbox-bg)] text-[var(--chatbox-text)]">
      <Sidebar />

      {activeView === 'image-creator' ? (
        <ImageCreatorView />
      ) : activeView === 'copilots' ? (
        <CopilotsView />
      ) : (
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Chat Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-black/8 px-4 py-2.5 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-2.5">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  title={t('Open sidebar')}
                  className="rounded-lg p-1.5 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}
              <h1 className="truncate text-sm font-semibold">{activeSession.title}</h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSessionSettingsOpen(true)}
                title={t('Session settings')}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleExportMarkdown}
                title={t('Export')}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSessionMessages(activeSession.id)
                  toast.success('Conversation cleared')
                }}
                title={t('Clear')}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <MessageList
            session={activeSession}
            onRegenerate={handleRegenerate}
            onEditAndResend={handleEditAndResend}
            onQuickPrompt={(prompt) => handleSend(prompt)}
          />

          {/* Composer */}
          <InputBox
            session={activeSession}
            isGenerating={Boolean(generatingSessionIds[activeSession.id])}
            onSend={handleSend}
            onStop={handleStop}
            onOpenSessionSettings={() => setSessionSettingsOpen(true)}
          />
        </main>
      )}

      <SettingsModal />
      <SearchModal />
      <ArchiveModal />
      {activeSession && (
        <SessionSettingsModal
          key={activeSession.id}
          session={activeSession}
          open={sessionSettingsOpen}
          onClose={() => setSessionSettingsOpen(false)}
        />
      )}
    </div>
  )
}
