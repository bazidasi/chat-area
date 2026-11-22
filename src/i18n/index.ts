import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from './locales/en/translation.json'
import type { Language } from '@/types'

export const languageNameMap: Record<Language, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  de: 'Deutsch',
  fr: 'Français',
  'pt-PT': 'Português',
  es: 'Español',
  ar: 'العربية',
  fa: 'فارسی',
  'it-IT': 'Italiano',
  sv: 'Svenska',
  'nb-NO': 'Norsk',
}

export const languages = Object.keys(languageNameMap) as Language[]

const RTL_LANGUAGES: readonly Language[] = ['ar', 'fa']

export function isRTL(language: Language | string | undefined): boolean {
  return Boolean(language && (RTL_LANGUAGES as readonly string[]).includes(language))
}

const localeModules = import.meta.glob<{ default: Record<string, string> }>('./locales/*/translation.json')

export async function loadAndSwitchLanguage(lang: Language): Promise<void> {
  if (lang !== 'en' && !i18n.hasResourceBundle(lang, 'translation')) {
    const loader = localeModules[`./locales/${lang}/translation.json`]
    if (loader) {
      const mod = await loader()
      i18n.addResourceBundle(lang, 'translation', mod.default, true, true)
    }
  }
  await i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  keySeparator: false,
  nsSeparator: false,
})

export default i18n
