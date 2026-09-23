import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { isLegacyBrandColor } from '@chatbox/core/domain/settings'
import { DEFAULT_INTERFACE_COLORS, getDefaultInterfaceColors, resolveInterfaceBrandColor } from '@shared/theme-colors'
import { useLayoutEffect, useMemo } from 'react'
import { settingsStore, useLanguage, useSettingsStore } from '@/stores/settingsStore'
import { uiStore, useUIStore } from '@/stores/uiStore'
import { isRTL } from '@/i18n/locales'
import { type Language, Theme } from '../../shared/types'
import platform from '../platform'
import DesktopPlatform from '../platform/desktop_platform'

export const switchTheme = async (theme: Theme) => {
  let finalTheme = 'light' as 'light' | 'dark'
  if (theme === Theme.System) {
    finalTheme = (await platform.shouldUseDarkColors()) ? 'dark' : 'light'
  } else {
    finalTheme = theme === Theme.Dark ? 'dark' : 'light'
  }
  uiStore.setState({
    realTheme: finalTheme,
  })
  localStorage.setItem('initial-theme', finalTheme)
  if (platform instanceof DesktopPlatform) {
    await platform.switchTheme(finalTheme)
  }
}

export default function useAppTheme() {
  const theme = useSettingsStore((state) => state.theme)
  const interfaceColorsCustomized = useSettingsStore((state) => state.interfaceColorsCustomized === true)
  const storedInterfaceColors = useSettingsStore((state) => state.interfaceColors)
  const interfaceColors =
    interfaceColorsCustomized && storedInterfaceColors ? storedInterfaceColors : getDefaultInterfaceColors()
  const realTheme = useUIStore((state) => state.realTheme)
  const language = useLanguage()

  useLayoutEffect(() => {
    switchTheme(theme)
  }, [theme])

  useLayoutEffect(() => {
    platform.onSystemThemeChange(() => {
      const theme = settingsStore.getState().theme
      switchTheme(theme)
    })
  }, [])

  useLayoutEffect(() => {
    // update material-ui theme
    document.querySelector('html')?.setAttribute('data-theme', realTheme)
    // update tailwindcss theme
    if (realTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [realTheme])

  useLayoutEffect(() => {
    const rootStyle = document.documentElement.style
    if (!interfaceColorsCustomized) {
      // Follow source CSS defaults so palette edits in globals.css / theme-colors.ts
      // are not shadowed by a stale persisted snapshot.
      for (const prop of [
        '--chatbox-background-primary',
        '--chatbox-background-secondary',
        '--chatbox-background-tertiary',
        '--chatbox-brand',
      ]) {
        rootStyle.removeProperty(prop)
      }
      return
    }
    const raw = interfaceColors[realTheme]
    // Legacy settings carry the old palette as a whole — brand *and*
    // backgrounds. Paint the current defaults until the persisted copy migrates.
    const legacy = isLegacyBrandColor(raw.brand) || raw.brand.toLowerCase() === '#ffffff'
    const colors = legacy ? DEFAULT_INTERFACE_COLORS[realTheme] : raw
    rootStyle.setProperty('--chatbox-background-primary', colors.backgroundPrimary)
    rootStyle.setProperty('--chatbox-background-secondary', colors.backgroundSecondary)
    rootStyle.setProperty('--chatbox-background-tertiary', colors.backgroundTertiary)
    rootStyle.setProperty('--chatbox-brand', resolveAppBrandColor(raw.brand, realTheme))
  }, [interfaceColors, interfaceColorsCustomized, realTheme])

  const themeObj = useMemo(
    () =>
      createTheme(
        getThemeDesign(
          realTheme,
          language,
          resolveAppBrandColor(interfaceColors[realTheme].brand, realTheme)
        )
      ),
    [interfaceColors, language, realTheme]
  )
  return themeObj
}

/** Resolve the brand for paint, forcing legacy magenta/burgundy values back to dark-red defaults. */
export function resolveAppBrandColor(brand: string, theme: 'light' | 'dark'): string {
  if (isLegacyBrandColor(brand) || brand.toLowerCase() === '#ffffff') {
    return DEFAULT_INTERFACE_COLORS[theme].brand
  }
  return resolveInterfaceBrandColor(brand, theme)
}

export function getThemeDesign(
  realTheme: 'light' | 'dark',
  language: Language,
  brandColor = getDefaultInterfaceColors()[realTheme].brand
): ThemeOptions {
  return {
    palette: {
      mode: realTheme,
      primary: {
        main: brandColor,
      },
      ...(realTheme === 'light'
        ? {}
        : {
            // MUI 内部无法处理 css 变量，需要使用具体颜色值
            // (OpenCode dark palette: background-base / raised surface)
            background: {
              default: '#101010',
              paper: '#1c1c1c',
            },
          }),
    },
    components: {
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: realTheme === 'dark' ? '#282828' : undefined,
            color: realTheme === 'dark' ? '#ffffff' : undefined,
          },
        },
      },
    },
    typography: {
      // In Chinese and Japanese the characters are usually larger,
      // so a smaller fontsize may be appropriate.
      ...(isRTL(language)
        ? {
            fontFamily: 'Cairo, Arial, sans-serif',
          }
        : {}),
      fontSize: 14,
    },
    direction: isRTL(language) ? 'rtl' : 'ltr',
    breakpoints: {
      values: {
        xs: 0,
        sm: 640, // 修改sm的值与tailwindcss保持一致
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  }
}
