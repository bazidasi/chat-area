import {
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MessageSquare,
  Plus,
  Server,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { languageNameMap, languages, loadAndSwitchLanguage } from '@/i18n'
import { testProviderConnection } from '@/lib/chatClient'
import { useChatStore } from '@/store/chatStore'
import type { Language, SettingsTab, ThemeMode } from '@/types'

export function SettingsModal() {
  const { t } = useTranslation()
  const {
    settingsModalOpen,
    settingsTab,
    settingsFocusProviderId,
    providers,
    settings,
    envProviders,
    closeSettings,
    openSettings,
    updateProvider,
    updateSettings,
    setLanguage,
    exportBackupJson,
    importBackupJson,
    clearAllData,
  } = useChatStore()

  const [selectedProviderId, setSelectedProviderId] = useState(
    settingsFocusProviderId || settings.defaultProviderId || 'fibonacci'
  )
  const [showKey, setShowKey] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (settingsFocusProviderId) {
      setSelectedProviderId(settingsFocusProviderId)
      setTestResult(null)
    }
  }, [settingsFocusProviderId])

  if (!settingsModalOpen) return null

  const activeProvider = providers.find((p) => p.id === selectedProviderId) || providers[0]
  const hasServerEnv = Boolean(envProviders[activeProvider.id])

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testProviderConnection({ provider: activeProvider })
      if (res.ok) {
        setTestResult({ ok: true, text: res.message || 'Connected!' })
      } else {
        setTestResult({ ok: false, text: res.error || 'Connection failed' })
      }
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleAddModel = () => {
    const trimmed = newModelName.trim()
    if (!trimmed) return
    if (!activeProvider.models.includes(trimmed)) {
      updateProvider(activeProvider.id, { models: [...activeProvider.models, trimmed] })
    }
    setNewModelName('')
  }

  const handleExport = () => {
    const json = exportBackupJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fibonacci-chat-area-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup exported')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const res = importBackupJson(text)
    if (res.ok) {
      toast.success('Backup imported successfully')
    } else {
      toast.error(res.error || 'Import failed')
    }
    e.target.value = ''
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'provider', label: t('Model Provider'), icon: <Server className="h-4 w-4" /> },
    { id: 'chat', label: t('Chat Settings'), icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'appearance', label: t('Display'), icon: <Globe className="h-4 w-4" /> },
    { id: 'data', label: t('Data Backup'), icon: <Database className="h-4 w-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[min(640px,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 md:flex-row">
        {/* Left Settings Nav */}
        <div className="flex shrink-0 flex-row gap-1 border-b border-black/8 bg-zinc-50/80 p-3 dark:border-white/10 dark:bg-zinc-950/50 md:w-56 md:flex-col md:border-b-0 md:border-e">
          <div className="hidden px-2 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 md:block">
            {t('Settings')}
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => openSettings(tab.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                settingsTab === tab.id
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-black/8 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10'
                  : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Panel */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/8 px-5 py-3.5 dark:border-white/10">
            <h2 className="text-sm font-semibold">{tabs.find((tItem) => tItem.id === settingsTab)?.label}</h2>
            <button
              type="button"
              onClick={closeSettings}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {settingsTab === 'provider' && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
                {/* Provider List */}
                <div className="space-y-1">
                  {providers.map((p) => {
                    const configured = Boolean(p.apiKey.trim()) || Boolean(envProviders[p.id])
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProviderId(p.id)
                          setTestResult(null)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-xs font-medium transition ${
                          activeProvider.id === p.id
                            ? 'bg-[#d6199b]/12 text-[#d6199b]'
                            : 'text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {configured && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </button>
                    )
                  })}
                </div>

                {/* Provider Details */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{activeProvider.name}</h3>
                      {hasServerEnv && (
                        <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          Server env key active
                        </span>
                      )}
                    </div>
                    {activeProvider.description && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{activeProvider.description}</p>
                    )}
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t('API Key')}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={activeProvider.apiKey}
                          onChange={(e) => updateProvider(activeProvider.id, { apiKey: e.target.value })}
                          placeholder={hasServerEnv ? 'Using server environment key (or override here)' : 'sk-...'}
                          className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 pe-9 text-xs outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="absolute inset-y-0 end-2 flex items-center text-zinc-400 hover:text-zinc-700"
                        >
                          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={testing}
                        onClick={() => void handleTestConnection()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{t('Check')}</span>
                      </button>
                    </div>

                    {testResult && (
                      <div
                        className={`flex items-center gap-1.5 text-xs ${
                          testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                        }`}
                      >
                        {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span>{testResult.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Base URL (when applicable) */}
                  {activeProvider.kind !== 'gemini' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {t('API Host')}
                      </label>
                      <input
                        type="url"
                        value={activeProvider.baseUrl}
                        onChange={(e) => updateProvider(activeProvider.id, { baseUrl: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 font-mono text-xs outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
                      />
                    </div>
                  )}

                  {/* Default Provider & Model button */}
                  <div className="flex items-center justify-between rounded-xl border border-black/8 bg-zinc-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-zinc-800/50">
                    <div>
                      <div className="text-xs font-medium">Default Provider for New Chats</div>
                      <div className="text-[11px] text-zinc-500">
                        Current: {settings.defaultProviderId} / {settings.defaultModel}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          defaultProviderId: activeProvider.id,
                          defaultModel: activeProvider.models[0] || settings.defaultModel,
                        })
                      }
                      className="rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900"
                    >
                      Set Default
                    </button>
                  </div>

                  {/* Models Management */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t('Models')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddModel()
                        }}
                        placeholder="Add model ID (e.g. gpt-4.1-mini)"
                        className="flex-1 rounded-xl border border-black/10 bg-zinc-50 px-3 py-1.5 font-mono text-xs outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddModel}
                        className="inline-flex items-center gap-1 rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('Add')}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeProvider.models.map((modelId) => (
                        <span
                          key={modelId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] dark:border-white/10 dark:bg-zinc-800"
                        >
                          <span>{modelId}</span>
                          {activeProvider.models.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateProvider(activeProvider.id, {
                                  models: activeProvider.models.filter((m) => m !== modelId),
                                })
                              }
                              className="text-zinc-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'chat' && (
              <div className="space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium">Default System Prompt</label>
                  <textarea
                    rows={3}
                    value={settings.defaultSystemPrompt}
                    onChange={(e) => updateSettings({ defaultSystemPrompt: e.target.value })}
                    placeholder="Optional default instruction applied to new conversations..."
                    className="w-full rounded-xl border border-black/10 bg-zinc-50 p-3 text-xs outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{t('Temperature')}</span>
                    <span className="font-mono text-zinc-500">{settings.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={settings.temperature}
                    onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
                    className="w-full accent-[#d6199b]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Top P</span>
                    <span className="font-mono text-zinc-500">{settings.topP.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={settings.topP}
                    onChange={(e) => updateSettings({ topP: Number(e.target.value) })}
                    className="w-full accent-[#d6199b]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Max Context Messages</span>
                    <span className="font-mono text-zinc-500">{settings.maxContextMessages}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={50}
                    step={2}
                    value={settings.maxContextMessages}
                    onChange={(e) => updateSettings({ maxContextMessages: Number(e.target.value) })}
                    className="w-full accent-[#d6199b]"
                  />
                </div>

                <label className="flex items-center justify-between text-xs">
                  <span>Send message with Enter (Shift+Enter for newline)</span>
                  <input
                    type="checkbox"
                    checked={settings.sendOnEnter}
                    onChange={(e) => updateSettings({ sendOnEnter: e.target.checked })}
                    className="h-4 w-4 accent-[#d6199b]"
                  />
                </label>

                <label className="flex items-center justify-between text-xs">
                  <span>Show message timestamps (with Jalali dates in Persian)</span>
                  <input
                    type="checkbox"
                    checked={settings.showTimestamps}
                    onChange={(e) => updateSettings({ showTimestamps: e.target.checked })}
                    className="h-4 w-4 accent-[#d6199b]"
                  />
                </label>

                <label className="flex items-center justify-between text-xs">
                  <span>Show word / token counts</span>
                  <input
                    type="checkbox"
                    checked={settings.showWordCount}
                    onChange={(e) => updateSettings({ showWordCount: e.target.checked })}
                    className="h-4 w-4 accent-[#d6199b]"
                  />
                </label>
              </div>
            )}

            {settingsTab === 'appearance' && (
              <div className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <label className="block text-xs font-medium">{t('Theme')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSettings({ theme: mode })}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition ${
                          settings.theme === mode
                            ? 'border-[#d6199b] bg-[#d6199b]/10 text-[#d6199b]'
                            : 'border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium">{t('Language')}</label>
                  <select
                    value={settings.language}
                    onChange={(e) => {
                      const lang = e.target.value as Language
                      setLanguage(lang)
                      void loadAndSwitchLanguage(lang)
                    }}
                    className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-xs outline-none focus:border-[#2979ff] dark:border-white/10 dark:bg-zinc-800"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {languageNameMap[lang]} ({lang})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {settingsTab === 'data' && (
              <div className="space-y-4 max-w-md">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Your conversations and settings are saved locally in your browser. Export a JSON backup at any time (API keys are omitted for security).
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t('Export')} JSON</span>
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{t('Import')} JSON</span>
                    <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
                  </label>
                </div>

                <div className="border-t border-black/8 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllData()
                      toast.success('All local conversations cleared')
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All Conversations</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
