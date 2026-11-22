import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActiveView,
  AppSettings,
  ChatMessage,
  ChatSession,
  CopilotPreset,
  GeneratedImageItem,
  Language,
  ProviderConfig,
  SettingsTab,
} from '@/types'

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'fibonacci',
    name: 'Fibonacci AI',
    kind: 'openai-compatible',
    baseUrl: 'https://my.fibonacci.monster/v1',
    apiKey: '',
    models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-7-sonnet', 'deepseek-chat', 'deepseek-reasoner', 'gemini-2.5-flash'],
    imageModels: ['dall-e-3'],
    description: 'my.fibonacci.monster unified AI gateway',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'gemini',
    baseUrl: '',
    apiKey: '',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    imageModels: ['gemini-2.5-flash-image', 'imagen-3.0-generate-002'],
    description: 'Google Gemini models via @google/genai',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4.1'],
    imageModels: ['dall-e-3', 'gpt-image-1'],
    description: 'OpenAI Chat & Image models',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
    description: 'Anthropic Claude models',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    description: 'DeepSeek V3 & R1 reasoning models',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.7-sonnet', 'google/gemini-2.5-flash', 'deepseek/deepseek-r1'],
    description: 'Unified multi-provider OpenRouter gateway',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    kind: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    models: ['llama3.2', 'qwen2.5'],
    description: 'Ollama, vLLM, LM Studio, or any OpenAI-compatible endpoint',
  },
]

export const DEFAULT_COPILOTS: CopilotPreset[] = [
  {
    id: 'copilot-coder',
    name: 'Senior Software Architect',
    description: 'Clean architecture, debugging, code review, and concise technical solutions.',
    prompt:
      'You are a pragmatic senior software engineer and architect. Provide clear, well-structured, production-ready code and concise technical explanations.',
    starred: true,
    builtin: true,
  },
  {
    id: 'copilot-writer',
    name: 'Editorial Writing Assistant',
    description: 'Polishes prose, restructures arguments, and adapts tone in English or Persian.',
    prompt:
      'You are an expert editor and bilingual writer. Improve clarity, flow, and precision while preserving the author’s voice.',
    builtin: true,
  },
  {
    id: 'copilot-translator',
    name: 'Translator & Localizer',
    description: 'Natural, idiomatic translation across English, Persian, Chinese, Arabic, and European languages.',
    prompt:
      'You are a professional translator and localizer. Translate naturally with cultural accuracy, preserving formatting and technical terms.',
    builtin: true,
  },
  {
    id: 'copilot-research',
    name: 'Deep Analyst',
    description: 'Breaks down complex topics into structured hypotheses, trade-offs, and actionable summaries.',
    prompt:
      'You are a rigorous analytical researcher. Structure your responses with key takeaways, step-by-step reasoning, trade-offs, and clear citations of assumptions.',
    builtin: true,
  },
]

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'en',
  defaultProviderId: 'fibonacci',
  defaultModel: 'gpt-4o',
  defaultSystemPrompt: '',
  temperature: 0.7,
  topP: 1,
  maxContextMessages: 20,
  showWordCount: true,
  showTimestamps: true,
  sendOnEnter: true,
}

function createEmptySession(providerId: string, model: string, systemPrompt = '', title = 'New chat'): ChatSession {
  const now = Date.now()
  return {
    id: uuidv4(),
    title,
    messages: [],
    providerId,
    model,
    systemPrompt,
    starred: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
}

interface ChatStoreState {
  sessions: ChatSession[]
  activeSessionId: string
  activeView: ActiveView
  providers: ProviderConfig[]
  settings: AppSettings
  copilots: CopilotPreset[]
  generatedImages: GeneratedImageItem[]
  envProviders: Record<string, boolean>
  sidebarOpen: boolean
  sidebarWidth: number
  settingsModalOpen: boolean
  settingsTab: SettingsTab
  settingsFocusProviderId: string | null
  searchModalOpen: boolean
  archiveModalOpen: boolean

  setEnvProviders: (env: Record<string, boolean>) => void
  setActiveView: (view: ActiveView) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  openSettings: (tab?: SettingsTab, providerId?: string | null) => void
  closeSettings: () => void
  setSearchModalOpen: (open: boolean) => void
  setArchiveModalOpen: (open: boolean) => void

  createSession: (opts?: { title?: string; systemPrompt?: string; providerId?: string; model?: string }) => ChatSession
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  toggleStarSession: (id: string) => void
  toggleArchiveSession: (id: string) => void
  updateSessionConfig: (id: string, patch: Partial<Pick<ChatSession, 'providerId' | 'model' | 'systemPrompt' | 'title'>>) => void
  clearSessionMessages: (id: string) => void

  addMessage: (sessionId: string, message: ChatMessage) => void
  updateMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => void
  appendMessageDelta: (sessionId: string, messageId: string, field: 'content' | 'reasoning', delta: string) => void
  deleteMessage: (sessionId: string, messageId: string) => void
  truncateMessagesAfter: (sessionId: string, messageId: string, includeTarget?: boolean) => void
  forkSessionAtMessage: (sessionId: string, messageId: string) => ChatSession | null

  updateProvider: (providerId: string, patch: Partial<ProviderConfig>) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setLanguage: (language: Language) => void

  addCopilot: (copilot: Omit<CopilotPreset, 'id'>) => void
  deleteCopilot: (id: string) => void

  addGeneratedImage: (item: GeneratedImageItem) => void
  deleteGeneratedImage: (id: string) => void

  exportBackupJson: () => string
  importBackupJson: (raw: string) => { ok: boolean; error?: string }
  clearAllData: () => void
}

const initialSession = createEmptySession(DEFAULT_SETTINGS.defaultProviderId, DEFAULT_SETTINGS.defaultModel)

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      activeSessionId: initialSession.id,
      activeView: 'chat',
      providers: DEFAULT_PROVIDERS,
      settings: DEFAULT_SETTINGS,
      copilots: DEFAULT_COPILOTS,
      generatedImages: [],
      envProviders: {},
      sidebarOpen: true,
      sidebarWidth: 276,
      settingsModalOpen: false,
      settingsTab: 'provider',
      settingsFocusProviderId: null,
      searchModalOpen: false,
      archiveModalOpen: false,

      setEnvProviders: (envProviders) => {
        set((state) => {
          // If Fibonacci AI has no key and server has GEMINI_API_KEY, default new chats to Gemini seamlessly
          const hasClientKey = state.providers.some((p) => p.apiKey.trim().length > 0)
          if (!hasClientKey && !envProviders.fibonacci && envProviders.gemini) {
            const nextSettings = {
              ...state.settings,
              defaultProviderId: 'gemini',
              defaultModel: 'gemini-2.5-flash',
            }
            const nextSessions = state.sessions.map((s) =>
              s.messages.length === 0 && s.providerId === 'fibonacci'
                ? { ...s, providerId: 'gemini', model: 'gemini-2.5-flash' }
                : s
            )
            return { envProviders, settings: nextSettings, sessions: nextSessions }
          }
          return { envProviders }
        })
      },

      setActiveView: (activeView) => set({ activeView }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: Math.max(220, Math.min(440, sidebarWidth)) }),
      openSettings: (tab = 'provider', providerId = null) =>
        set({ settingsModalOpen: true, settingsTab: tab, settingsFocusProviderId: providerId }),
      closeSettings: () => set({ settingsModalOpen: false, settingsFocusProviderId: null }),
      setSearchModalOpen: (searchModalOpen) => set({ searchModalOpen }),
      setArchiveModalOpen: (archiveModalOpen) => set({ archiveModalOpen }),

      createSession: (opts) => {
        const { settings } = get()
        const session = createEmptySession(
          opts?.providerId || settings.defaultProviderId,
          opts?.model || settings.defaultModel,
          opts?.systemPrompt ?? settings.defaultSystemPrompt,
          opts?.title || 'New chat'
        )
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          activeView: 'chat',
        }))
        return session
      },

      selectSession: (id) => set({ activeSessionId: id, activeView: 'chat' }),

      deleteSession: (id) =>
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id)
          if (remaining.length === 0) {
            const fresh = createEmptySession(
              state.settings.defaultProviderId,
              state.settings.defaultModel,
              state.settings.defaultSystemPrompt
            )
            return { sessions: [fresh], activeSessionId: fresh.id }
          }
          const nextActive =
            state.activeSessionId === id
              ? (remaining.find((s) => !s.archived) || remaining[0]).id
              : state.activeSessionId
          return { sessions: remaining, activeSessionId: nextActive }
        }),

      renameSession: (id, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, title, updatedAt: Date.now() } : s)),
        })),

      toggleStarSession: (id) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s)),
        })),

      toggleArchiveSession: (id) =>
        set((state) => {
          const updated = state.sessions.map((s) => (s.id === id ? { ...s, archived: !s.archived } : s))
          const target = updated.find((s) => s.id === id)
          let nextActive = state.activeSessionId
          if (target?.archived && state.activeSessionId === id) {
            const nonArchived = updated.find((s) => !s.archived)
            if (nonArchived) {
              nextActive = nonArchived.id
            } else {
              const fresh = createEmptySession(
                state.settings.defaultProviderId,
                state.settings.defaultModel,
                state.settings.defaultSystemPrompt
              )
              return { sessions: [fresh, ...updated], activeSessionId: fresh.id }
            }
          }
          return { sessions: updated, activeSessionId: nextActive }
        }),

      updateSessionConfig: (id, patch) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
        })),

      clearSessionMessages: (id) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, messages: [], updatedAt: Date.now() } : s)),
        })),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
              : s
          ),
        })),

      updateMessage: (sessionId, messageId, patch) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                  updatedAt: Date.now(),
                }
              : s
          ),
        })),

      appendMessageDelta: (sessionId, messageId, field, delta) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, [field]: `${m[field] || ''}${delta}` } : m
                  ),
                }
              : s
          ),
        })),

      deleteMessage: (sessionId, messageId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== messageId), updatedAt: Date.now() }
              : s
          ),
        })),

      truncateMessagesAfter: (sessionId, messageId, includeTarget = false) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s
            const idx = s.messages.findIndex((m) => m.id === messageId)
            if (idx === -1) return s
            return {
              ...s,
              messages: s.messages.slice(0, includeTarget ? idx : idx + 1),
              updatedAt: Date.now(),
            }
          }),
        })),

      forkSessionAtMessage: (sessionId, messageId) => {
        const state = get()
        const source = state.sessions.find((s) => s.id === sessionId)
        if (!source) return null
        const idx = source.messages.findIndex((m) => m.id === messageId)
        if (idx === -1) return null
        const now = Date.now()
        const forked: ChatSession = {
          ...source,
          id: uuidv4(),
          title: `${source.title} (Fork)`,
          messages: source.messages.slice(0, idx + 1).map((m) => ({ ...m, id: uuidv4(), generating: false })),
          starred: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
        }
        set((prev) => ({
          sessions: [forked, ...prev.sessions],
          activeSessionId: forked.id,
          activeView: 'chat',
        }))
        return forked
      },

      updateProvider: (providerId, patch) =>
        set((state) => ({
          providers: state.providers.map((p) => (p.id === providerId ? { ...p, ...patch } : p)),
        })),

      updateSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, ...patch },
        })),

      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language },
        })),

      addCopilot: (copilot) =>
        set((state) => ({
          copilots: [{ ...copilot, id: uuidv4() }, ...state.copilots],
        })),

      deleteCopilot: (id) =>
        set((state) => ({
          copilots: state.copilots.filter((c) => c.id !== id),
        })),

      addGeneratedImage: (item) =>
        set((state) => ({
          generatedImages: [item, ...state.generatedImages].slice(0, 50),
        })),

      deleteGeneratedImage: (id) =>
        set((state) => ({
          generatedImages: state.generatedImages.filter((i) => i.id !== id),
        })),

      exportBackupJson: () => {
        const { sessions, settings, copilots, providers } = get()
        const sanitizedProviders = providers.map((p) => ({ ...p, apiKey: '' }))
        return JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            app: 'Fibonacci Chat Area',
            sessions,
            settings,
            copilots,
            providers: sanitizedProviders,
          },
          null,
          2
        )
      },

      importBackupJson: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<{
            sessions: ChatSession[]
            settings: AppSettings
            copilots: CopilotPreset[]
          }>
          if (!Array.isArray(parsed.sessions)) {
            return { ok: false, error: 'Invalid backup format: missing sessions array.' }
          }
          const validSessions = parsed.sessions.filter((s) => s && typeof s.id === 'string' && Array.isArray(s.messages))
          if (validSessions.length === 0) {
            return { ok: false, error: 'Backup contains no valid sessions.' }
          }
          set((state) => ({
            sessions: validSessions,
            activeSessionId: validSessions[0].id,
            settings: parsed.settings ? { ...state.settings, ...parsed.settings } : state.settings,
            copilots: Array.isArray(parsed.copilots) ? parsed.copilots : state.copilots,
          }))
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Failed to parse JSON' }
        }
      },

      clearAllData: () => {
        const fresh = createEmptySession(DEFAULT_SETTINGS.defaultProviderId, DEFAULT_SETTINGS.defaultModel)
        set({
          sessions: [fresh],
          activeSessionId: fresh.id,
          generatedImages: [],
          copilots: DEFAULT_COPILOTS,
          settings: DEFAULT_SETTINGS,
        })
      },
    }),
    {
      name: 'fibonacci-chat-area-state-v1',
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          messages: s.messages.map((m) => ({ ...m, generating: false })),
        })),
        activeSessionId: state.activeSessionId,
        providers: state.providers,
        settings: state.settings,
        copilots: state.copilots,
        generatedImages: state.generatedImages,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)
