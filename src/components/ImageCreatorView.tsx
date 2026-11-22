import { Download, ImagePlus, Loader2, Menu, Settings, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { generateImageRequest } from '@/lib/chatClient'
import { useChatStore } from '@/store/chatStore'

const STARTER_IMAGE_PROMPTS = [
  'A serene mountain landscape at sunset',
  'A futuristic city with flying cars',
  'A cute rabbit in Pixar animation style',
  'A cozy coffee shop interior',
]

export function ImageCreatorView() {
  const { t } = useTranslation()
  const {
    providers,
    generatedImages,
    sidebarOpen,
    setSidebarOpen,
    addGeneratedImage,
    deleteGeneratedImage,
    openSettings,
  } = useChatStore()

  const imageProviders = useMemo(
    () => providers.filter((p) => p.imageModels && p.imageModels.length > 0),
    [providers]
  )

  const [selectedProviderId, setSelectedProviderId] = useState(imageProviders[0]?.id || 'gemini')
  const selectedProvider =
    imageProviders.find((p) => p.id === selectedProviderId) || imageProviders[0] || providers[0]
  const [selectedModel, setSelectedModel] = useState(
    selectedProvider?.imageModels?.[0] || 'gemini-2.5-flash-image'
  )
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt ?? prompt).trim()
    if (!finalPrompt || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await generateImageRequest({
        provider: selectedProvider,
        model: selectedModel,
        prompt: finalPrompt,
        aspectRatio,
      })
      if (result.error) {
        setError(result.error)
      } else if (result.images && result.images.length > 0) {
        for (const img of result.images) {
          addGeneratedImage({
            id: uuidv4(),
            prompt: finalPrompt,
            dataUrl: img.dataUrl,
            model: selectedModel,
            providerId: selectedProvider.id,
            createdAt: Date.now(),
          })
        }
      } else {
        setError('No image returned from provider.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
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
          <ImagePlus className="h-4 w-4 text-[#d6199b]" />
          <h1 className="text-sm font-semibold">{t('Create Image')}</h1>
        </div>

        <button
          type="button"
          onClick={() => openSettings('provider', selectedProvider.id)}
          className="flex items-center gap-1.5 rounded-xl border border-black/10 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>{selectedProvider.name}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Prompt Box */}
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the image you want to create..."
              className="w-full resize-none bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedProviderId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setSelectedProviderId(nextId)
                    const nextProvider = imageProviders.find((p) => p.id === nextId)
                    if (nextProvider?.imageModels?.[0]) {
                      setSelectedModel(nextProvider.imageModels[0])
                    }
                  }}
                  className="rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-1.5 text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
                >
                  {imageProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
                >
                  {(selectedProvider.imageModels || []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="rounded-xl border border-black/10 bg-zinc-50 px-2.5 py-1.5 text-xs outline-none dark:border-white/10 dark:bg-zinc-800"
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                </select>
              </div>

              <button
                type="button"
                disabled={loading || !prompt.trim()}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{loading ? t('Generating...') : t('Generate')}</span>
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Starter Chips */}
          <div className="flex flex-wrap gap-2">
            {STARTER_IMAGE_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setPrompt(t(sample))}
                className="rounded-xl border border-black/8 bg-white/80 px-3 py-1.5 text-xs text-zinc-600 hover:border-[#d6199b]/40 hover:text-[#d6199b] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {t(sample)}
              </button>
            ))}
          </div>

          {/* Gallery */}
          {generatedImages.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generatedImages.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
                >
                  <img src={item.dataUrl} alt={item.prompt} className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{item.prompt}</p>
                      <p className="text-[11px] text-zinc-400">{item.model}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={item.dataUrl}
                        download={`fibonacci-image-${item.id.slice(0, 6)}.png`}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteGeneratedImage(item.id)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
