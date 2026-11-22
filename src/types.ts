export type Language =
  | 'en'
  | 'zh-Hans'
  | 'zh-Hant'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'de'
  | 'fr'
  | 'pt-PT'
  | 'es'
  | 'ar'
  | 'fa'
  | 'it-IT'
  | 'sv'
  | 'nb-NO'

export type ThemeMode = 'system' | 'light' | 'dark'

export type ProviderKind = 'gemini' | 'anthropic' | 'openai-compatible'

export interface ProviderConfig {
  id: string
  name: string
  kind: ProviderKind
  baseUrl: string
  apiKey: string
  models: string[]
  imageModels?: string[]
  description?: string
}

export interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
  dataUrl?: string
  textContent?: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  attachments?: Attachment[]
  model?: string
  providerId?: string
  createdAt: number
  generating?: boolean
  error?: string
  usage?: TokenUsage
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  providerId: string
  model: string
  systemPrompt: string
  starred?: boolean
  archived?: boolean
  createdAt: number
  updatedAt: number
}

export interface CopilotPreset {
  id: string
  name: string
  description: string
  prompt: string
  starred?: boolean
  builtin?: boolean
}

export interface GeneratedImageItem {
  id: string
  prompt: string
  dataUrl: string
  model: string
  providerId: string
  createdAt: number
}

export interface AppSettings {
  theme: ThemeMode
  language: Language
  defaultProviderId: string
  defaultModel: string
  defaultSystemPrompt: string
  temperature: number
  topP: number
  maxContextMessages: number
  showWordCount: boolean
  showTimestamps: boolean
  sendOnEnter: boolean
}

export type ActiveView = 'chat' | 'image-creator' | 'copilots'

export type SettingsTab = 'provider' | 'chat' | 'appearance' | 'data'
