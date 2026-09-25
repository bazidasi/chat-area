import { useMantineTheme } from '@mantine/core'
import type { IconProps } from '@tabler/icons-react'
import { type ElementType, type ForwardedRef, forwardRef, type RefAttributes } from 'react'

type Props = Omit<IconProps, 'size'> & {
  size?: number
  icon: ElementType<IconProps & RefAttributes<SVGSVGElement>>
}

/**
 * Stroke weight keyed to rendered size.
 *
 * A single stroke number across mixed sizes is always optically unbalanced: the
 * Tabler/Lucide default of 2 is drawn on a 24px grid, so reusing it at 20px
 * adds 10% of the canvas as line weight and the icon reads noticeably heavier
 * than a 16px glyph next to it. Small glyphs also need proportionally more
 * stroke to stay legible. Interpolating off the size keeps every icon in a
 * surface on one apparent weight.
 *
 * Reference: default 2.0 at the native 24px grid.
 */
const STROKE_AT_NATIVE_SIZE = 2
const NATIVE_GRID = 24

/**
 * Resolve a stroke weight for `size` that lands on the native 2.0-at-24 weight,
 * nudged lighter where the glyph is large enough to carry the extra line mass.
 */
export function opticalIconStroke(size: number): number {
  const native = (STROKE_AT_NATIVE_SIZE / NATIVE_GRID) * size
  // Small glyphs need a touch more than native to survive downscaling; large
  // ones need less or the counters fill in.
  const weight = size <= 16 ? 1.16 : size >= 24 ? 0.86 : 1
  return Math.round(native * weight * 100) / 100
}

function ScalableIconInner({ icon: IconComponent, size = 16, ...others }: Props, ref: ForwardedRef<SVGSVGElement>) {
  const theme = useMantineTheme()
  const scale = theme.scale ?? 1
  return <IconComponent ref={ref} size={size * scale} {...others} />
}

export const ScalableIcon = forwardRef(ScalableIconInner)
