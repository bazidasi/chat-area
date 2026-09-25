import * as Sentry from '@sentry/react'
import React from 'react'
import { getLogger } from '../../lib/utils'
import { router } from '../../router'

const log = getLogger('ErrorBoundary')

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  name?: string
}

/**
 * ErrorBoundary component using Sentry's built-in ErrorBoundary
 * Automatically reports errors to Sentry with proper context
 *
 * Implementation:
 * - ErrorBoundary errors are tagged with 'errorBoundary'
 * - These errors are 100% reported to Sentry (see sentry_init.ts)
 * - Other errors are subject to 10% sampling
 */
export function ErrorBoundary({ children, fallback: CustomFallback, name = 'ErrorBoundary' }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={(fallbackProps) => {
        const { error, resetError } = fallbackProps
        const errorObj = error instanceof Error ? error : new Error(String(error))

        // Log error locally
        log.error(`${name} caught an error:`, errorObj)

        // Use custom fallback if provided, otherwise use default
        if (CustomFallback) {
          return <CustomFallback error={errorObj} retry={resetError} />
        }

        return <DefaultErrorFallback error={errorObj} retry={resetError} />
      }}
      beforeCapture={(scope, error, componentStack) => {
        // Add custom context to Sentry
        scope.setTag('errorBoundary', name)
        scope.setTag('component', 'ui')
        scope.setTag('operation', name)
        scope.setTag('error_domain', 'ui')
        scope.setTag('error_operation', name)
        scope.setTag('error_priority', 'critical')
        scope.setTag('error_handled', 'true')
        scope.setLevel('error')

        // Add component stack information if available
        if (typeof componentStack === 'string' && componentStack) {
          scope.setContext('react', {
            componentStack,
            errorBoundary: name,
          })
        }

        // Log error details locally
        log.error(`${name} caught an error:`, error, componentStack)
      }}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}

interface DefaultErrorFallbackProps {
  error: Error | null
  retry: () => void
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--neo-surface)' }}
    >
      <div className="max-w-md w-full rounded-2xl p-6 text-center"
        style={{
          background: 'var(--neo-surface-raised)',
          boxShadow: 'var(--neo-shadow-outset-lg)',
        }}
      >
        <div className="text-6xl mb-4" style={{ color: 'var(--chatbox-brand)' }}>⚠️</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--chatbox-tint-primary)' }}>Something went wrong!</h1>
        <p className="mb-6" style={{ color: 'var(--chatbox-tint-secondary)' }}>
          The application encountered an unexpected error. This error has been automatically reported.
        </p>

        <div className="space-y-3">
          <button
            onClick={retry}
            className="w-full hover:brightness-90 text-white px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--chatbox-brand)' }}
          >
            Try Again
          </button>

          <button
            onClick={() => {
              retry()
              router.navigate({ to: '/', replace: true })
            }}
            className="w-full hover:brightness-90 text-white px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--chatbox-tint-secondary)' }}
          >
            Reload App
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 py-2 rounded-lg transition-colors text-sm"
            style={{ color: 'var(--chatbox-tint-tertiary)' }}
          >
            {showDetails ? 'Hide Error' : 'Show Error'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 p-3 rounded-lg text-start"
            style={{
              background: 'var(--chatbox-background-tertiary)',
              border: '1px solid var(--chatbox-border-primary)',
            }}
          >
            <div className="text-sm space-y-2" style={{ color: 'var(--chatbox-tint-secondary)' }}>
              {error && (
                <div>
                  <strong>Error:</strong>
                  <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap">
                    {error.name}: {error.message}
                  </pre>
                </div>
              )}
              {error?.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap max-h-32">{error.stack}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sentry Error Boundary (alternative approach using Sentry's built-in ErrorBoundary)
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError }) => (
      <DefaultErrorFallback error={error instanceof Error ? error : new Error(String(error))} retry={resetError} />
    ),
    beforeCapture: (scope) => {
      scope.setTag('errorBoundary', 'sentry')
      scope.setTag('component', 'ui')
      scope.setTag('operation', 'sentry')
      scope.setTag('error_domain', 'ui')
      scope.setTag('error_operation', 'sentry')
      scope.setTag('error_priority', 'critical')
      scope.setTag('error_handled', 'true')
      scope.setLevel('error')
    },
  }
)
