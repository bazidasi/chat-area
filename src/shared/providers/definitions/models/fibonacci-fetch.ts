type FetchFunction = typeof globalThis.fetch

/** Maximum number of attempts (initial call + retries). */
export const FIBONACCI_RETRY_MAX_ATTEMPTS = 4
/** Upper bound for any single wait, even when Retry-After asks for more. */
export const FIBONACCI_RETRY_MAX_DELAY_MS = 20_000

interface RetryOptions {
  baseDelayMs?: number
  maxDelayMs?: number
  maxAttempts?: number
}

/**
 * Fibonacci gateway resilience. fibonacci-1-pro-max sessions that write long
 * code hit the gateway's rate limiter far more often than short chats: the
 * server answers 429 (or a transient 5xx) and the AI SDK surfaces it as a hard
 * chat error. This wrapper retries exactly the failures that are safe to
 * replay:
 *
 *  - HTTP 429 and 5xx responses, honoring `Retry-After` (seconds or HTTP-date,
 *    capped at maxDelayMs) with exponential backoff otherwise
 *  - network-level failures thrown by fetch() itself (DNS, socket resets)
 *
 * It never replays a request that already produced stream output: a retry only
 * happens while still inside fetch(), before any byte of a response body has
 * reached the caller, so the provider cannot double-bill a partially streamed
 * completion. Abort signals short-circuit immediately — a cancelled chat is
 * never re-issued. Bodies that cannot be replayed (streams) skip retrying.
 */
export function createFibonacciResilientFetch(
  baseFetch: FetchFunction = globalThis.fetch.bind(globalThis),
  options: RetryOptions = {}
): FetchFunction {
  const maxAttempts = options.maxAttempts ?? FIBONACCI_RETRY_MAX_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? 500
  const maxDelayMs = options.maxDelayMs ?? FIBONACCI_RETRY_MAX_DELAY_MS

  return async (input, init) => {
    const signal = init?.signal ?? null
    const replayableBody =
      init?.body == null ||
      typeof init.body === 'string' ||
      init.body instanceof URLSearchParams ||
      init.body instanceof ArrayBuffer ||
      init.body instanceof Blob ||
      ArrayBuffer.isView(init.body)

    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await baseFetch(input, init)

        // 429 (rate limited) and 5xx (transient gateway failures) are the only
        // statuses worth replaying; 4xx are real request errors. A retry only
        // happens while still inside fetch(), so no stream byte was ever
        // delivered and the provider cannot double-bill the completion.
        const retryable = response.status === 429 || response.status >= 500
        if (!retryable || attempt >= maxAttempts || !replayableBody) {
          return response
        }

        // Free the socket before replaying.
        await response.body?.cancel().catch(() => {})

        const retryAfterMs = parseRetryAfterHeader(response.headers.get('retry-after'))
        const backoffMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
        await abortableSleep(retryAfterMs == null ? backoffMs : Math.min(retryAfterMs, maxDelayMs), signal)
      } catch (error) {
        // Abort must always win: never re-issue a cancelled request.
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw error
        }
        if (attempt >= maxAttempts || !replayableBody) {
          throw error
        }
        lastError = error
        await abortableSleep(Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs), signal)
      }
    }

    // Unreachable in practice (every loop path returns or throws), kept for
    // exhaustiveness so TypeScript sees a Response on all paths.
    if (lastError) throw lastError
    return baseFetch(input, init)
  }
}

function parseRetryAfterHeader(raw: string | null): number | null {
  if (!raw) return null
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }
  const dateMs = Date.parse(raw)
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now())
  }
  return null
}

function abortableSleep(ms: number, signal: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms)
    function cleanup() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    function finish() {
      cleanup()
      resolve()
    }
    function onAbort() {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
