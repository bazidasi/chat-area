import { Menu, MessageSquarePlus, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/chatStore'

export function CopilotsView() {
  const { t } = useTranslation()
  const { copilots, sidebarOpen, setSidebarOpen, createSession, addCopilot, deleteCopilot } = useChatStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) return
    addCopilot({
      name: name.trim(),
      description: description.trim() || 'Custom AI Copilot',
      prompt: prompt.trim(),
    })
    setName('')
    setDescription('')
    setPrompt('')
    setCreating(false)
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <Sparkles className="h-4 w-4 text-[#d6199b]" />
          <h1 className="text-sm font-semibold">{t('Copilots')}</h1>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t('Create New Copilot')}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {creating && (
            <form
              onSubmit={handleCreate}
              className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Copilot name (e.g., SQL Performance Coach)"
                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
              />
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="System prompt instructions..."
                className="w-full rounded-xl border border-black/10 bg-zinc-50 p-3 text-sm outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-500 hover:bg-black/5"
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
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {copilots.map((copilot) => (
              <div
                key={copilot.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/90"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{copilot.name}</h2>
                    {!copilot.builtin && (
                      <button
                        type="button"
                        onClick={() => deleteCopilot(copilot.id)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{copilot.description}</p>
                  <p className="mt-2.5 line-clamp-3 rounded-xl bg-zinc-50 p-2.5 text-[11px] text-zinc-600 dark:bg-zinc-800/70 dark:text-zinc-300">
                    {copilot.prompt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    createSession({
                      title: copilot.name,
                      systemPrompt: copilot.prompt,
                    })
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2 text-xs font-medium text-zinc-800 transition hover:border-[#d6199b]/40 hover:text-[#d6199b] dark:border-white/10 dark:text-zinc-200"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  <span>Start Chat with Copilot</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
