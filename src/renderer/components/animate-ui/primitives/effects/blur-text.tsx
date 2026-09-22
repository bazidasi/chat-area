import { type FC, useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * BlurText — per-word blur-in entrance for a heading.
 *
 * - each word is an inline-block span with an increasing
 *   animation-delay (delayMs per word); the gaps between words are kept
 *   with &nbsp; so wrapping stays identical to plain text
 * - the document direction lays the spans out, so in RTL the words keep
 *   their natural right-to-left order and are never reversed
 * - the accessible name stays on the container; the animated word spans
 *   are aria-hidden, so screen readers read one clean string
 * - motion is short (per-word durationMs) and disabled under
 *   prefers-reduced-motion (see .chatbox-blur-word in globals.css and
 *   the app-wide [data-reduce-motion] rules)
 *
 * Usage:
 *   <Text fw={700} ta="center">
 *     <BlurText text={t('What can I help you with today?')} />
 *   </Text>
 */

interface BlurTextProps {
  text: string
  /** Delay between consecutive words, in ms. */
  delayMs?: number
  /** Per-word animation duration, in ms. */
  durationMs?: number
  className?: string
}

export const BlurText: FC<BlurTextProps> = ({ text, delayMs = 40, durationMs = 300, className }) => {
  // Pre-compute the render list: words carry their ordinal (for the
  // increasing delay) and every gap becomes an explicit &nbsp;.
  const items = useMemo(() => {
    let wordOrdinal = -1
    return text
      .split(/(\s+)/)
      .filter((chunk) => chunk.length > 0)
      .map((chunk, position) => {
        if (/^\s+$/.test(chunk)) {
          // keep the visual gaps between words
          return { id: `gap-${position}`, word: null, value: '\u00A0' }
        }
        wordOrdinal += 1
        return { id: `word-${position}`, word: wordOrdinal, value: chunk }
      })
  }, [text])

  return (
    <span className={cn('inline', className)} aria-label={text}>
      {items.map((item) =>
        item.word === null ? (
          item.value
        ) : (
          <span
            key={item.id}
            aria-hidden="true"
            className="chatbox-blur-word"
            style={{ animationDelay: `${item.word * delayMs}ms`, animationDuration: `${durationMs}ms` }}
          >
            {item.value}
          </span>
        )
      )}
    </span>
  )
}

export default BlurText
