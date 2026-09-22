import { isDefaultInterfaceColorSnapshot } from '../../theme-colors'
import { createDefaultSettings } from './settings-defaults'

// Shared one-shot cleanup: persisted settings from older themes carry pink
// (#f000c0/#ff4fd8 pre-commit era), magenta (#e0209e default, #e91499/#ff3fae/#d6199b
// variants) or burgundy (#87262e/#a04050) brand colors. Replace them with the
// current dark-red defaults so the new palette takes effect. Custom user colors are kept.
export const LEGACY_BRAND_COLORS = new Set([
  '#f000c0',
  '#ff4fd8',
  '#ff3fae',
  '#d6199b',
  '#e91499',
  '#e0209e',
  '#87262e',
  '#a04050',
])

type ThemeKey = 'light' | 'dark'

export function isLegacyBrandColor(color: unknown): boolean {
  return typeof color === 'string' && LEGACY_BRAND_COLORS.has(color.toLowerCase())
}

function hasLegacyBrand(settings: Record<string, unknown>): boolean {
  const colors = settings.interfaceColors as Partial<Record<ThemeKey, { brand?: unknown }>> | undefined
  if (!colors || typeof colors !== 'object') return false
  for (const theme of ['light', 'dark'] as const) {
    const brand = colors[theme]?.brand
    if (isLegacyBrandColor(brand) || (typeof brand === 'string' && brand.toLowerCase() === '#ffffff')) {
      return true
    }
  }
  return false
}

/**
 * Call on raw persisted settings BEFORE merging with defaults. Infers
 * `interfaceColorsCustomized` when the flag is absent so custom palettes are
 * not mistaken for "use source defaults" after deepmerge fills in `false`.
 */
export function inferInterfaceColorsCustomization(settings: Record<string, unknown>): void {
  if (settings.interfaceColorsCustomized !== undefined) return
  const colors = settings.interfaceColors
  if (!colors || typeof colors !== 'object') {
    settings.interfaceColorsCustomized = false
    return
  }
  const followsDefaults = hasLegacyBrand(settings) || isDefaultInterfaceColorSnapshot(colors)
  settings.interfaceColorsCustomized = !followsDefaults
}

/**
 * Mutates a settings-shaped object so source default palette edits propagate:
 * - swaps legacy magenta/burgundy/white brands for the current defaults
 * - when not customized, refreshes persisted colors to the current source defaults
 *
 * Custom user colors keep `interfaceColorsCustomized: true` and are left untouched.
 * Safe to call on merged or migrated objects (run `inferInterfaceColorsCustomization`
 * on the raw persisted payload first).
 */
export function normalizePersistedBrandColors(settings: Record<string, unknown>): void {
  const colors = settings.interfaceColors
  if (!colors || typeof colors !== 'object') return

  const defaults = createDefaultSettings().interfaceColors
  const applyDefaults = () => {
    settings.interfaceColors = {
      light: { ...defaults.light },
      dark: { ...defaults.dark },
    }
  }

  if (hasLegacyBrand(settings)) {
    applyDefaults()
    settings.interfaceColorsCustomized = false
    return
  }

  if (settings.interfaceColorsCustomized === true) return

  // false (or missing on paths that skipped inference): follow source defaults
  applyDefaults()
  settings.interfaceColorsCustomized = false
}
