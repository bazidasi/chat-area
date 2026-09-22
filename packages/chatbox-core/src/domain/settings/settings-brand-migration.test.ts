import { describe, expect, test } from 'vitest'
import { getDefaultInterfaceColors } from '../../theme-colors'
import { mergeSettingsWithDefaults } from './merge-settings'
import {
  inferInterfaceColorsCustomization,
  LEGACY_BRAND_COLORS,
  normalizePersistedBrandColors,
} from './settings-brand-migration'
import { createDefaultSettings } from './settings-defaults'

type MutableSettings = Record<string, unknown>

const customColors = {
  light: {
    backgroundPrimary: '#fff0f0',
    backgroundSecondary: '#ffe0e0',
    backgroundTertiary: '#ffd0d0',
    brand: '#aa0000',
  },
  dark: {
    backgroundPrimary: '#101010',
    backgroundSecondary: '#181818',
    backgroundTertiary: '#202020',
    brand: '#cc0000',
  },
}

const pinkEraColors = {
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
}

describe('interface color customization migration', () => {
  test('defaults start not customized', () => {
    expect(createDefaultSettings().interfaceColorsCustomized).toBe(false)
  })

  test('missing flag + default snapshot is treated as not customized', () => {
    const persisted: MutableSettings = { interfaceColors: getDefaultInterfaceColors() }
    inferInterfaceColorsCustomization(persisted)
    expect(persisted.interfaceColorsCustomized).toBe(false)
  })

  test('missing flag + historical default snapshot is treated as not customized', () => {
    const persisted: MutableSettings = {
      interfaceColors: {
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
    }
    inferInterfaceColorsCustomization(persisted)
    expect(persisted.interfaceColorsCustomized).toBe(false)
  })

  test('missing flag + custom colors is treated as customized', () => {
    const persisted: MutableSettings = { interfaceColors: customColors }
    inferInterfaceColorsCustomization(persisted)
    expect(persisted.interfaceColorsCustomized).toBe(true)
  })

  test('explicit customized flag is left alone by inference', () => {
    const persisted: MutableSettings = {
      interfaceColors: getDefaultInterfaceColors(),
      interfaceColorsCustomized: true,
    }
    inferInterfaceColorsCustomization(persisted)
    expect(persisted.interfaceColorsCustomized).toBe(true)
  })

  test('normalize refreshes non-customized colors to current source defaults', () => {
    const settings: MutableSettings = {
      interfaceColors: {
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
      interfaceColorsCustomized: false,
    }
    normalizePersistedBrandColors(settings)
    expect(settings.interfaceColors).toEqual(getDefaultInterfaceColors())
    expect(settings.interfaceColorsCustomized).toBe(false)
  })

  test('normalize preserves custom colors when customized', () => {
    const settings: MutableSettings = {
      interfaceColors: customColors,
      interfaceColorsCustomized: true,
    }
    normalizePersistedBrandColors(settings)
    expect(settings.interfaceColors).toEqual(customColors)
    expect(settings.interfaceColorsCustomized).toBe(true)
  })

  test('legacy brand forces defaults even if previously customized', () => {
    const legacyBrand = [...LEGACY_BRAND_COLORS][0]
    const settings: MutableSettings = {
      interfaceColors: {
        light: { ...customColors.light, brand: legacyBrand },
        dark: customColors.dark,
      },
      interfaceColorsCustomized: true,
    }
    normalizePersistedBrandColors(settings)
    expect(settings.interfaceColors).toEqual(getDefaultInterfaceColors())
    expect(settings.interfaceColorsCustomized).toBe(false)
  })

  test('merge keeps custom colors across hydrate', () => {
    const merged = mergeSettingsWithDefaults({
      interfaceColors: customColors,
      interfaceColorsCustomized: true,
    })
    expect(merged.interfaceColors).toEqual(customColors)
    expect(merged.interfaceColorsCustomized).toBe(true)
  })

  test('merge upgrades a pre-flag default snapshot to current defaults', () => {
    const merged = mergeSettingsWithDefaults({
      interfaceColors: {
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
    })
    expect(merged.interfaceColors).toEqual(getDefaultInterfaceColors())
    expect(merged.interfaceColorsCustomized).toBe(false)
  })

  test('merge upgrades a pre-flag pink-era snapshot to current defaults', () => {
    const merged = mergeSettingsWithDefaults({ interfaceColors: pinkEraColors })
    expect(merged.interfaceColors).toEqual(getDefaultInterfaceColors())
    expect(merged.interfaceColorsCustomized).toBe(false)
  })

  test('pink-era snapshot forces defaults even when flagged customized', () => {
    const settings: MutableSettings = {
      interfaceColors: pinkEraColors,
      interfaceColorsCustomized: true,
    }
    normalizePersistedBrandColors(settings)
    expect(settings.interfaceColors).toEqual(getDefaultInterfaceColors())
    expect(settings.interfaceColorsCustomized).toBe(false)
  })

  test('merge preserves pre-flag custom colors', () => {
    const merged = mergeSettingsWithDefaults({
      interfaceColors: customColors,
    })
    expect(merged.interfaceColors).toEqual(customColors)
    expect(merged.interfaceColorsCustomized).toBe(true)
  })
})
