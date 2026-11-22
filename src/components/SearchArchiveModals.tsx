import { ArchiveRestore, MessageSquare, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/chatStore'
import type { ChatSession } from '@/types'

export function SearchModal() {
  const { t } = useTranslation()
  const { searchModalOpen, setSearchModalOpen, sessions, selectSession } = useChatStore()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sessions
      .filter((s) => !s.archived)
      .filter((s) => {
        if (!q) return true
        if (s.title.toLowerCase().includes(q)) return true
        return s.messages.some((m) => m.content.toLowerCase().includes(q))
      })
      .slice(0, 25)
  }, [query, sessions])

  if (!searchModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5 border-b border-black/8 px-4 py-3 dark:border-white/10">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchModalOpen(false)
            }}
            placeholder={t('Search')}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchModalOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {matches.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">No matching chats found</div>
          ) : (
            matches.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  selectSession(s.id)
                  setSearchModalOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-xs hover:bg-black/5 dark:hover:bg-white/10"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{s.title}</div>
                    <div className="truncate text-[11px] text-zinc-400">
                      {s.messages.length} messages · {s.model}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ArchiveModal() {
  const { t } = useTranslation()
  const { archiveModalOpen, setArchiveModalOpen, sessions, toggleArchiveSession, deleteSession, selectSession } =
    useChatStore()

  const archived = useMemo(() => sessions.filter((s) => s.archived), [sessions])

  if (!archiveModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold">{t('Archive')}</h2>
          <button
            type="button"
            onClick={() => setArchiveModalOpen(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3">
          {archived.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">No archived chats</div>
          ) : (
            <div className="space-y-1.5">
              {archived.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-black/8 px-3 py-2 text-xs dark:border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => {
                      toggleArchiveSession(s.id)
                      selectSession(s.id)
                      setArchiveModalOpen(false)
                    }}
                    className="min-w-0 flex-1 text-start"
                  >
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="text-[11px] text-zinc-400">{s.messages.length} messages</div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Restore"
                      onClick={() => toggleArchiveSession(s.id)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={t('Delete')}
                      onClick={() => deleteSession(s.id)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function SessionSettingsModal({
  session,
  open,
  onClose,
}: {
  session: ChatSession
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { providers, updateSessionConfig } = useChatStore()
  const [title, setTitle] = useState(session.title)
  const [providerId, setProviderId] = useState(session.providerId)
  const [model, setModel] = useState(session.model)
  const [systemPrompt, setSystemPrompt] = useState(session.systemPrompt)

  if (!open) return null

  const activeProvider = providers.find((p) => p.id === providerId) || providers[0]

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSessionConfig(session.id, {
      title: title.trim() || 'New chat',
      providerId,
      model,
      systemPrompt,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('Session settings')}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium">{t('Name')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium">{t('Model Provider')}</label>
            <select
              value={providerId}
              onChange={(e) => {
                const nextId = e.target.value
                setProviderId(nextId)
                const nextP = providers.find((p) => p.id === nextId)
                if (nextP?.models[0]) setModel(nextP.models[0])
              }}
              className="w-full rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-2 text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium">{t('Model')}</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-2 font-mono text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
            >
              {activeProvider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium">System Prompt</label>
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Custom instructions for this conversation..."
            className="w-full rounded-xl border border-black/10 bg-zinc-50 p-3 text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3.5 py-1.5 text-xs text-zinc-500 hover:bg-black/5"
          >
            {t('Cancel')}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            {t('Save')}
          </button>
        </div>
      </form>
    </div>
  )
}
