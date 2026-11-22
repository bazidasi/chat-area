import {
  Archive,
  Check,
  ImagePlus,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FibonacciLogo } from '@/components/FibonacciLogo'
import { isRTL } from '@/i18n'
import { useChatStore } from '@/store/chatStore'

export function Sidebar() {
  const { t } = useTranslation()
  const {
    sessions,
    activeSessionId,
    activeView,
    sidebarOpen,
    sidebarWidth,
    settings,
    setSidebarOpen,
    setSidebarWidth,
    setActiveView,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    toggleStarSession,
    toggleArchiveSession,
    openSettings,
    setSearchModalOpen,
    setArchiveModalOpen,
    updateSettings,
  } = useChatStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const resizingRef = useRef(false)
  const isRtl = isRTL(settings.language)

  const activeSessions = useMemo(() => {
    return sessions
      .filter((s) => !s.archived)
      .slice()
      .sort((a, b) => {
        if (Boolean(a.starred) !== Boolean(b.starred)) return a.starred ? -1 : 1
        return b.updatedAt - a.updatedAt
      })
  }, [sessions])

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMove = (moveEvt: MouseEvent) => {
      if (!resizingRef.current) return
      const delta = isRtl ? startX - moveEvt.clientX : moveEvt.clientX - startX
      setSidebarWidth(startWidth + delta)
    }

    const onUp = () => {
      resizingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const cycleTheme = () => {
    const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark'
    updateSettings({ theme: isCurrentlyDark ? 'light' : 'dark' })
  }

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (!sidebarOpen) {
    return null
  }

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="relative flex h-full shrink-0 flex-col border-e border-black/8 bg-[#f1f2f5]/90 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#141416] max-md:fixed max-md:inset-y-0 max-md:start-0 max-md:z-40 max-md:shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
        <button
          type="button"
          onClick={() => setActiveView('chat')}
          className="flex items-center gap-2 text-start group"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
            <FibonacciLogo size={22} accent />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Chat Area
            </div>
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              Fibonacci AI
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          title={t('Close sidebar')}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
        >
          <PanelLeftClose className="h-4 w-4 rtl:scale-x-[-1]" />
        </button>
      </div>

      {/* Primary Action Card */}
      <div className="px-3 py-1.5">
        <div className="space-y-1 rounded-2xl border border-black/5 bg-white/80 p-1.5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => createSession()}
            className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>{t('New chat')}</span>
            </span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] opacity-80 dark:bg-black/10">
              Ctrl+N
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('Search')}</span>
            </span>
            <kbd className="font-mono text-[10px] text-zinc-400">Ctrl+K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('image-creator')}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              activeView === 'image-creator'
                ? 'bg-[#d6199b]/12 text-[#d6199b]'
                : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'
            }`}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span>{t('Create Image')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('copilots')}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              activeView === 'copilots'
                ? 'bg-[#d6199b]/12 text-[#d6199b]'
                : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('Copilots')}</span>
          </button>

          <button
            type="button"
            onClick={() => setArchiveModalOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <Archive className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('Archive')}</span>
          </button>
        </div>
      </div>

      {/* Recent Chats List */}
      <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between px-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('Recent chats')}
          </span>
          <span className="text-[10px] text-zinc-400">{activeSessions.length}</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pe-1">
          {activeSessions.map((session) => {
            const isActive = activeView === 'chat' && session.id === activeSessionId
            const isEditing = editingId === session.id

            return (
              <div
                key={session.id}
                className={`group relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/8 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10'
                    : 'text-zinc-700 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingTitle.trim()) renameSession(session.id, editingTitle.trim())
                          setEditingId(null)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-black/15 bg-white px-1.5 py-0.5 text-xs outline-none dark:border-white/20 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editingTitle.trim()) renameSession(session.id, editingTitle.trim())
                        setEditingId(null)
                      }}
                      className="rounded p-0.5 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded p-0.5 text-zinc-400 hover:bg-black/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      {session.starred ? (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      )}
                      <span className="truncate font-medium">{session.title || t('New chat')}</span>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title={session.starred ? t('Remove from favorites') : t('Add to favorites')}
                        onClick={() => toggleStarSession(session.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-amber-500 dark:hover:bg-white/10"
                      >
                        <Star className={`h-3 w-3 ${session.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        title={t('Rename')}
                        onClick={() => {
                          setEditingId(session.id)
                          setEditingTitle(session.title)
                        }}
                        className="rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title={t('Archive')}
                        onClick={() => toggleArchiveSession(session.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title={t('Delete')}
                        onClick={() => deleteSession(session.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 pt-1">
        <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/80 px-2.5 py-2 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#d6199b] to-[#2979ff] text-[11px] font-semibold text-white">
              Y
            </div>
            <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{t('You')}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cycleTheme}
              title={t('Theme')}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => openSettings('provider')}
              title={t('Settings')}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Resize Handle (Desktop) */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute inset-y-0 end-0 hidden w-1 cursor-col-resize hover:bg-[#d6199b]/40 md:block"
      />
    </aside>
  )
}
