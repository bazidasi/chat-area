import { useEffect } from 'react'
import { settingsStore } from '@/stores/settingsStore'

export function useSystemLanguageWhenInit() {
  useEffect(() => {
    // 通过定时器延迟启动，防止处理状态底层存储的异步加载前错误的初始数据
    setTimeout(() => {
      // Fresh installs start in the built-in default language (Farsi) — the
      // OS locale is intentionally NOT auto-detected anymore. Users can pick
      // any language in settings; their saved choice is never overwritten.
      settingsStore.setState({
        languageInited: true,
      })
    }, 2000)
  }, [])
}
