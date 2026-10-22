import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { TextShimmer } from '@/components/animations/text-shimmer'

/**
 * "Thinking" indicator. Was the thinking-orbs orb; now the vibefarsi
 * text-shimmer sweeping a highlight across a localized "Thinking…" label
 * (globals.css owns the `shimmer` keyframes).
 */
function Loading({ className, duration }: { className?: string; duration?: number }) {
  const { t } = useTranslation()
  return (
    <TextShimmer className={className} duration={duration}>
      {t('Thinking…')}
    </TextShimmer>
  )
}

export default memo(Loading)
