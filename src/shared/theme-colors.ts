export type InterfaceTheme = 'light' | 'dark'

export type InterfaceThemeColors = {
  backgroundPrimary: string
  backgroundSecondary: string
  backgroundTertiary: string
  brand: string
}

export type InterfaceColors = Record<InterfaceTheme, InterfaceThemeColors>

export type InterfaceColorPreset = {
  id: string
  label: string
  colors: InterfaceColors
}

export const DEFAULT_INTERFACE_COLORS: InterfaceColors = {
  light: {
    backgroundPrimary: '#e4e9f1',
    backgroundSecondary: '#e9edf5',
    backgroundTertiary: '#dde3ed',
    brand: '#8b0000',
  },
  dark: {
    backgroundPrimary: '#1a1d24',
    backgroundSecondary: '#22262e',
    backgroundTertiary: '#262b34',
    brand: '#b71c1c',
  },
}

export const INTERFACE_COLOR_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    colors: DEFAULT_INTERFACE_COLORS,
  },
  {
    id: 'claude-classic',
    label: 'Claude Classic',
    colors: {
      light: {
        backgroundPrimary: '#f7f6f2',
        backgroundSecondary: '#eeede7',
        backgroundTertiary: '#e2e1db',
        brand: '#d97757',
      },
      dark: {
        backgroundPrimary: '#262624',
        backgroundSecondary: '#333330',
        backgroundTertiary: '#41413d',
        brand: '#e89173',
      },
    },
  },
  {
    id: 'mist-blue',
    label: 'Mist Blue',
    colors: {
      light: {
        backgroundPrimary: '#f6f8fa',
        backgroundSecondary: '#eaf0f5',
        backgroundTertiary: '#d9e3ec',
        brand: '#5784aa',
      },
      dark: {
        backgroundPrimary: '#1c252e',
        backgroundSecondary: '#253240',
        backgroundTertiary: '#324252',
        brand: '#7fb3dd',
      },
    },
  },
] satisfies ReadonlyArray<InterfaceColorPreset>

/**
 * Full palettes that shipped as application defaults in earlier releases.
 * Persisted settings that still match one of these (or the current defaults)
 * are treated as "never customized" so source palette edits propagate.
 * Custom user colors and non-default presets are preserved.
 */
export const HISTORICAL_DEFAULT_INTERFACE_COLOR_PALETTES: readonly InterfaceColors[] = [
  {
    // Pre-commit pink era (shipped as defaults before the first git commit)
    light: {
      backgroundPrimary: '#e0e5ec',
      backgroundSecondary: '#e4e9f2',
      backgroundTertiary: '#d4dae4',
      brand: '#f000c0',
    },
    dark: {
      backgroundPrimary: '#24272e',
      backgroundSecondary: '#2a2e36',
      backgroundTertiary: '#1d2026',
      brand: '#ff4fd8',
    },
  },
  {
    // Initial magenta era
    light: {
      backgroundPrimary: '#e4e9f1',
      backgroundSecondary: '#e9edf5',
      backgroundTertiary: '#dde3ed',
      brand: '#e91499',
    },
    dark: {
      backgroundPrimary: '#262b35',
      backgroundSecondary: '#2c313d',
      backgroundTertiary: '#303644',
      brand: '#ff3fae',
    },
  },
  {
    // Burgundy era
    light: {
      backgroundPrimary: '#e4e9f1',
      backgroundSecondary: '#e9edf5',
      backgroundTertiary: '#dde3ed',
      brand: '#87262e',
    },
    dark: {
      backgroundPrimary: '#262b35',
      backgroundSecondary: '#2c313d',
      backgroundTertiary: '#303644',
      brand: '#a04050',
    },
  },
]

function normalizeHex(color: unknown): string {
  return typeof color === 'string' ? color.trim().toLowerCase() : ''
}

function themeColorsMatch(a: InterfaceThemeColors | undefined, b: InterfaceThemeColors | undefined): boolean {
  if (!a || !b) return false
  return (
    normalizeHex(a.backgroundPrimary) === normalizeHex(b.backgroundPrimary) &&
    normalizeHex(a.backgroundSecondary) === normalizeHex(b.backgroundSecondary) &&
    normalizeHex(a.backgroundTertiary) === normalizeHex(b.backgroundTertiary) &&
    normalizeHex(a.brand) === normalizeHex(b.brand)
  )
}

export function interfaceColorsEqual(a: InterfaceColors, b: InterfaceColors): boolean {
  return themeColorsMatch(a.light, b.light) && themeColorsMatch(a.dark, b.dark)
}

/**
 * True when a persisted palette is a known shipped default (current or historical),
 * i.e. the user never customized interface colors.
 */
export function isDefaultInterfaceColorSnapshot(colors: unknown): boolean {
  if (!colors || typeof colors !== 'object') return false
  const candidate = colors as Partial<InterfaceColors>
  if (!candidate.light || !candidate.dark) return false
  if (interfaceColorsEqual(candidate as InterfaceColors, getDefaultInterfaceColors())) return true
  return HISTORICAL_DEFAULT_INTERFACE_COLOR_PALETTES.some((palette) =>
    interfaceColorsEqual(candidate as InterfaceColors, palette)
  )
}

export function getDefaultInterfaceColors(): InterfaceColors {
  return {
    light: { ...DEFAULT_INTERFACE_COLORS.light },
    dark: { ...DEFAULT_INTERFACE_COLORS.dark },
  }
}

export function isInterfaceBrandColorAllowed(color: string): boolean {
  return color.toLowerCase() !== '#ffffff'
}

export function resolveInterfaceBrandColor(color: string, theme: InterfaceTheme): string {
  return isInterfaceBrandColorAllowed(color) ? color : DEFAULT_INTERFACE_COLORS[theme].brand
}

export function resolveInterfaceBrandColors(colors: InterfaceColors): InterfaceColors {
  return {
    light: { ...colors.light, brand: resolveInterfaceBrandColor(colors.light.brand, 'light') },
    dark: { ...colors.dark, brand: resolveInterfaceBrandColor(colors.dark.brand, 'dark') },
  }
}

export function renameInterfaceColorPreset(
  presets: InterfaceColorPreset[],
  presetId: string,
  label: string
): InterfaceColorPreset[] {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return presets

  return presets.map((preset) => (preset.id === presetId ? { ...preset, label: trimmedLabel } : preset))
}

export function withColorOpacity(color: string, opacity: number): string {
  const alpha = Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
  return `${color}${alpha.toString(16).padStart(2, '0')}`
}
