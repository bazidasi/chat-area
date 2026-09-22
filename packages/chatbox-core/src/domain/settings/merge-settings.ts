import deepmerge from 'deepmerge'
import { createDefaultSettings } from './settings-defaults'
import { type Settings, SettingsSchema } from './settings-schema'
import { inferInterfaceColorsCustomization, normalizePersistedBrandColors } from './settings-brand-migration'

export function mergeSettingsWithDefaults(persisted: unknown): Settings {
  const persistedSettings =
    persisted && typeof persisted === 'object' && !Array.isArray(persisted) ? (persisted as Partial<Settings>) : {}
  if (persistedSettings && typeof persistedSettings === 'object') {
    inferInterfaceColorsCustomization(persistedSettings as unknown as Record<string, unknown>)
  }
  const mergedSettings = deepmerge<Settings, Partial<Settings>>(createDefaultSettings(), persistedSettings, {
    arrayMerge: (_target, source) => source,
  })
  normalizePersistedBrandColors(mergedSettings as Record<string, unknown>)
  const parsedSettings = SettingsSchema.safeParse(mergedSettings)
  return parsedSettings.success ? parsedSettings.data : mergedSettings
}
