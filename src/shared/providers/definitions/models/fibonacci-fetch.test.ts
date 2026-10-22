import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFibonacciResilientFetch } from './fibonacci-fetch'

function jsonResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

const OK = jsonResponse(200)

describe('createFibonacciResilientFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes successful responses through without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(OK)
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const res = await fetcher('https://gw/chat', { method: 'POST', body: '{}' })

    expect(res).toBe(OK)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('replays after a 429 and succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { 'retry-after': '0' }))
      .mockResolvedValueOnce(OK)
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const promise = fetcher('https://gw/chat', { method: 'POST', body: '{}' })
    await vi.runAllTimersAsync()
    const res = await promise

    expect(res).toBe(OK)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honors Retry-After seconds but caps the wait', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { 'retry-after': '3600' }))
      .mockResolvedValueOnce(OK)
    const fetcher = createFibonacciResilientFetch(fetchMock, {
      baseDelayMs: 1,
      maxDelayMs: 25,
    })

    const promise = fetcher('https://gw/chat', { method: 'POST', body: '{}' })
    // Cap is 25ms — if the 1h Retry-After were honored raw, this would time out.
    await vi.advanceTimersByTimeAsync(30)
    const res = await promise

    expect(res).toBe(OK)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries 5xx gateway failures and gives up after max attempts returning the last response', async () => {
    const last = jsonResponse(503)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(last)
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const promise = fetcher('https://gw/chat', { method: 'POST', body: '{}' })
    await vi.runAllTimersAsync()
    const res = await promise

    expect(res).toBe(last)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('retries network-level failures (TypeError) and succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(OK)
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const promise = fetcher('https://gw/chat', { method: 'POST', body: '{}' })
    await vi.runAllTimersAsync()
    const res = await promise

    expect(res).toBe(OK)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-replayable bodies (streams)', async () => {
    const streamBody = new ReadableStream<Uint8Array>()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { 'retry-after': '0' }))
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const res = await fetcher('https://gw/chat', { method: 'POST', body: streamBody })

    expect(res.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never replays an aborted request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { 'retry-after': '0' }))
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })
    const controller = new AbortController()

    const promise = fetcher('https://gw/chat', { method: 'POST', body: '{}', signal: controller.signal })
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns 4xx client errors immediately without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401))
    const fetcher = createFibonacciResilientFetch(fetchMock, { baseDelayMs: 1 })

    const res = await fetcher('https://gw/chat', { method: 'POST', body: '{}' })

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
