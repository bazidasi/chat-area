import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Loading from './Loading'

describe('Loading (text shimmer)', () => {
  it('renders the shimmer "Thinking…" indicator with the inline animation', () => {
    const html = renderToStaticMarkup(<Loading />)
    expect(html).toContain('Thinking…')
    expect(html).toContain('bg-clip-text')
    expect(html).toContain('animation:shimmer 3s linear infinite')
  })

  it('forwards className and a custom duration', () => {
    const html = renderToStaticMarkup(<Loading className="w-14 h-7" duration={2} />)
    expect(html).toContain('w-14 h-7')
    expect(html).toContain('animation:shimmer 2s linear infinite')
  })
})
