import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INTERFACE_COLORS,
  HISTORICAL_DEFAULT_INTERFACE_COLOR_PALETTES,
  INTERFACE_COLOR_PRESETS,
  interfaceColorsEqual,
  isDefaultInterfaceColorSnapshot,
  isInterfaceBrandColorAllowed,
  renameInterfaceColorPreset,
  resolveInterfaceBrandColor,
  resolveInterfaceBrandColors,
  withColorOpacity,
} from './theme-colors'

describe('INTERFACE_COLOR_PRESETS', () => {
  it('provides the default, Claude, and Mist Blue presets', () => {
    expect(INTERFACE_COLOR_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }))).toEqual([
      { id: 'default', label: 'Default' },
      { id: 'claude-classic', label: 'Claude Classic' },
      { id: 'mist-blue', label: 'Mist Blue' },
    ])
  })

  it('uses the application default colors for the default preset', () => {
    expect(INTERFACE_COLOR_PRESETS[0].colors).toEqual(DEFAULT_INTERFACE_COLORS)
  })

  it('provides complete light and dark palettes for every preset', () => {
    for (const preset of INTERFACE_COLOR_PRESETS) {
      expect(preset.colors.light).toEqual({
        backgroundPrimary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundSecondary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundTertiary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        brand: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      })
      expect(preset.colors.dark).toEqual({
        backgroundPrimary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundSecondary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundTertiary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        brand: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      })
    }
  })

  it('uses a 60% alpha channel for preset badge backgrounds', () => {
    expect(withColorOpacity('#d97757', 0.6)).toBe('#d9775799')
  })
})

describe('interface brand color', () => {
  it('rejects white regardless of letter case', () => {
    expect(isInterfaceBrandColorAllowed('#ffffff')).toBe(false)
    expect(isInterfaceBrandColorAllowed('#FFFFFF')).toBe(false)
  })

  it('replaces white with the default brand color for the active theme', () => {
    expect(resolveInterfaceBrandColor('#ffffff', 'light')).toBe(DEFAULT_INTERFACE_COLORS.light.brand)
    expect(resolveInterfaceBrandColor('#FFFFFF', 'dark')).toBe(DEFAULT_INTERFACE_COLORS.dark.brand)
    expect(resolveInterfaceBrandColor('#123456', 'light')).toBe('#123456')
  })

  it('replaces white brand colors across a complete palette', () => {
    expect(
      resolveInterfaceBrandColors({
        light: { ...INTERFACE_COLOR_PRESETS[0].colors.light, brand: '#ffffff' },
        dark: { ...INTERFACE_COLOR_PRESETS[0].colors.dark, brand: '#FFFFFF' },
      })
    ).toEqual({
      light: { ...INTERFACE_COLOR_PRESETS[0].colors.light, brand: DEFAULT_INTERFACE_COLORS.light.brand },
      dark: { ...INTERFACE_COLOR_PRESETS[0].colors.dark, brand: DEFAULT_INTERFACE_COLORS.dark.brand },
    })
  })
})

describe('renameInterfaceColorPreset', () => {
  const presets = [
    {
      id: 'custom-1',
      label: 'Custom Preset 1',
      colors: INTERFACE_COLOR_PRESETS[0].colors,
    },
  ]

  it('renames the matching preset and trims the label', () => {
    expect(renameInterfaceColorPreset(presets, 'custom-1', '  My Colors  ')[0].label).toBe('My Colors')
  })

  it('does not accept a blank label', () => {
    expect(renameInterfaceColorPreset(presets, 'custom-1', '   ')).toBe(presets)
  })
})

describe('isDefaultInterfaceColorSnapshot', () => {
  it('treats the current defaults as a non-customized snapshot', () => {
    expect(isDefaultInterfaceColorSnapshot(DEFAULT_INTERFACE_COLORS)).toBe(true)
  })

  it('treats historical shipped defaults as non-customized snapshots', () => {
    for (const palette of HISTORICAL_DEFAULT_INTERFACE_COLOR_PALETTES) {
      expect(isDefaultInterfaceColorSnapshot(palette)).toBe(true)
    }
  })

  it('treats custom palettes as customized', () => {
    const custom = {
      light: { ...DEFAULT_INTERFACE_COLORS.light, brand: '#123456' },
      dark: { ...DEFAULT_INTERFACE_COLORS.dark, brand: '#654321' },
    }
    expect(isDefaultInterfaceColorSnapshot(custom)).toBe(false)
    expect(isDefaultInterfaceColorSnapshot(INTERFACE_COLOR_PRESETS[1].colors)).toBe(false)
    expect(isDefaultInterfaceColorSnapshot(null)).toBe(false)
  })

  it('compares colors case-insensitively', () => {
    const upper = {
      light: {
        backgroundPrimary: DEFAULT_INTERFACE_COLORS.light.backgroundPrimary.toUpperCase(),
        backgroundSecondary: DEFAULT_INTERFACE_COLORS.light.backgroundSecondary.toUpperCase(),
        backgroundTertiary: DEFAULT_INTERFACE_COLORS.light.backgroundTertiary.toUpperCase(),
        brand: DEFAULT_INTERFACE_COLORS.light.brand.toUpperCase(),
      },
      dark: {
        backgroundPrimary: DEFAULT_INTERFACE_COLORS.dark.backgroundPrimary.toUpperCase(),
        backgroundSecondary: DEFAULT_INTERFACE_COLORS.dark.backgroundSecondary.toUpperCase(),
        backgroundTertiary: DEFAULT_INTERFACE_COLORS.dark.backgroundTertiary.toUpperCase(),
        brand: DEFAULT_INTERFACE_COLORS.dark.brand.toUpperCase(),
      },
    }
    expect(interfaceColorsEqual(upper, DEFAULT_INTERFACE_COLORS)).toBe(true)
    expect(isDefaultInterfaceColorSnapshot(upper)).toBe(true)
  })
})
