import type { CSSProperties } from 'react'

export const SELECTED_CLASS =
  '!bg-chatbox-background-brand-secondary text-chatbox-tint-primary [box-shadow:var(--neo-shadow-select)]'
export const HOVER_CLASS = 'hover:bg-chatbox-background-secondary-hover'
export const MODEL_SELECTOR_SURFACE_CLASS = 'bg-chatbox-background-primary'
export const FALLBACK_UPGRADE_URL = 'https://chatboxai.app/#pricing'
export const DESKTOP_DETAIL_CARD_WIDTH = 320
export const DESKTOP_DETAIL_CARD_MARGIN = 4
export const DESKTOP_DETAIL_CARD_OUTER_WIDTH = DESKTOP_DETAIL_CARD_WIDTH + DESKTOP_DETAIL_CARD_MARGIN * 2
export const DESKTOP_DETAIL_CARD_GAP = 12
export const DESKTOP_DETAIL_VIEWPORT_MARGIN = 12
export const EMPTY_MODEL_IDS: string[] = []

export const CARD_SURFACE_STYLE: CSSProperties = {
  background: 'var(--chatbox-background-primary)',
  boxShadow: 'var(--neo-shadow-outset-lg)',
}

export const DRAWER_SURFACE_STYLE: CSSProperties = {
  background: 'var(--chatbox-background-primary)',
}

export const MOBILE_TAP_RESET_STYLE: CSSProperties = {
  WebkitTapHighlightColor: 'transparent',
}
