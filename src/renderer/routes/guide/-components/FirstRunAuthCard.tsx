/**
 * FirstRunAuthCard — the first screen a new user sees.
 *
 * Adapted from the vibefarsi `auth-card` block: same card anatomy (title, one
 * field, one primary action, one quiet escape), but the phone/OTP pair is
 * replaced by a Fibonacci AI API token, and the escape hatch goes straight to
 * the app instead of asking a question.
 */

import { ModelProviderEnum } from '@shared/types'
import { ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { trackJkClickEvent } from '@/analytics/jk'
import { JK_EVENTS, JK_PAGE_NAMES } from '@/analytics/jk-events'
import { cn } from '@/lib/utils'
import platform from '@/platform'
import { onboardingStore } from '@/stores/onboardingStore'
import { useProviderSettings } from '@/stores/settingsStore'
import { add as addToast } from '@/stores/toastActions'

const API_TOKEN_URL = 'https://my.fibonacci.monster/user/api-tokens'
const DASHBOARD_URL = 'https://my.fibonacci.monster/user/dashboard'
const MIN_TOKEN_LENGTH = 8

interface FirstRunAuthCardProps {
  onDone: () => void
}

export function FirstRunAuthCard({ onDone }: FirstRunAuthCardProps) {
  const { t } = useTranslation()
  const { providerSettings, setProviderSettings } = useProviderSettings(ModelProviderEnum.Fibonacci)

  const [token, setToken] = React.useState(providerSettings?.apiKey || '')
  const [revealed, setRevealed] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const titleId = React.useId()
  const tokenInputId = React.useId()
  const errorId = React.useId()

  const trimmed = token.trim()
  const canSubmit = trimmed.length >= MIN_TOKEN_LENGTH && !saving

  const track = React.useCallback((content: string) => {
    trackJkClickEvent(JK_EVENTS.ONBOARDING_CHOICE_CLICK, {
      pageName: JK_PAGE_NAMES.HELP_PAGE,
      content,
    })
  }, [])

  const finish = React.useCallback(() => {
    onboardingStore.getState().markCompleted()
    onDone()
  }, [onDone])

  const handleConnect = React.useCallback(() => {
    if (!canSubmit) {
      setError(t('Enter an API token to continue.'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      // The default session model already points at Fibonacci AI, so storing the
      // token is what makes the workspace usable straight after this screen.
      setProviderSettings({ apiKey: trimmed })
    } catch (err) {
      console.error('[first-run] failed to save API token:', err)
      addToast(t('Connection failed. Please try again.'))
      setSaving(false)
      return
    }
    track('api_token_connected')
    setSaving(false)
    finish()
  }, [canSubmit, t, setProviderSettings, trimmed, track, finish])

  const handlePaste = React.useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) {
        setToken(text.trim())
        setError(null)
      }
    } catch {
      addToast(t('Failed to read from clipboard'))
    }
  }, [t])

  const handleSkip = React.useCallback(() => {
    track('skip_setup')
    finish()
  }, [track, finish])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConnect()
      }
    },
    [handleConnect]
  )

  return (
    <div className="flex w-full flex-1 items-center justify-center px-5 py-8">
      <section
        aria-labelledby={titleId}
        className="oc-ring flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-chatbox-background-secondary p-6"
      >
        <header className="flex flex-col gap-1">
          <h1 id={titleId} className="text-lg font-bold text-balance text-foreground">
            {t('Connect Fibonacci AI')}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('Paste your Fibonacci AI API token to start chatting. It stays on this device.')}
          </p>
        </header>

        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleConnect()
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={tokenInputId} className="text-xs font-medium text-secondary-foreground">
              {t('Fibonacci AI API token')}
            </label>
            <div className="oc-input flex h-10 items-center gap-1.5 rounded-lg px-2 focus-within:shadow-[var(--neo-shadow-inset-focus)]">
              <KeyRound size={15} aria-hidden="true" className="ms-1 shrink-0 text-muted-foreground" />
              <input
                id={tokenInputId}
                name="api-token"
                type={revealed ? 'text' : 'password'}
                value={token}
                onChange={(e) => {
                  setToken(e.currentTarget.value)
                  if (error) setError(null)
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                placeholder="••••••••••••••••••"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="h-7 w-full min-w-0 flex-1 border-none bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-pressed={revealed}
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
              >
                {revealed ? t('Hide') : t('Show')}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => void handlePaste()}
                className="cursor-pointer text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline"
              >
                {t('Paste from clipboard')}
              </button>
              <button
                type="button"
                onClick={() => platform.openLink(API_TOKEN_URL)}
                className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {t('Create a token')}
                <ExternalLink size={12} aria-hidden="true" />
              </button>
            </div>

            {error && (
              <p id={errorId} role="alert" className="text-xs leading-5 text-destructive">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'oc-button oc-button--filled flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground',
              !canSubmit && 'cursor-not-allowed opacity-60'
            )}
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            {saving ? t('Connecting…') : t('Connect and continue')}
          </button>
        </form>

        <footer className="flex flex-col items-start gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer text-sm text-secondary-foreground underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline"
          >
            {t('Skip for now')}
          </button>
          <p className="text-xs leading-5 text-muted-foreground">{t('You can add a token later in Settings, under Model provider.')}</p>
          <button
            type="button"
            onClick={() => platform.openLink(DASHBOARD_URL)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {t('Fibonacci Dashboard')}
            <ExternalLink size={12} aria-hidden="true" />
          </button>
        </footer>
      </section>
    </div>
  )
}
