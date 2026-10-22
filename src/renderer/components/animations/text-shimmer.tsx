import { cn } from '@/lib/utils'

/**
 * متن درخشان. A highlight sweeps across the text — the standard "thinking"
 * indicator. Needs the `shimmer` keyframes in globals.css.
 *
 * Source: vibefarsi.ir/animations/text-shimmer (replaces the thinking-orbs
 * orb across the app).
 */
export function TextShimmer({
  children,
  className,
  duration = 3,
  ...rest
}: React.ComponentPropsWithoutRef<'span'> & { duration?: number }) {
  return (
    <span
      className={cn('inline-block bg-clip-text text-transparent', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--muted-foreground) 0%, var(--foreground) 45%, var(--foreground) 55%, var(--muted-foreground) 100%)',
        backgroundSize: '250% auto',
        animation: `shimmer ${duration}s linear infinite`,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}

export default TextShimmer
