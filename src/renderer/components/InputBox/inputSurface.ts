// The input box surface, shared with PendingActionBar so a pause can take over
// the same slot without the frame or the height shifting.
// Matches the reference composer: large 29px-radius well, no hard border.
// OpenCode elevation (outset-lg + dark hairline edge) and the brand focus
// glow both live on .chatbox-input-surface in globals.css.
export const INPUT_SURFACE_CLASS_NAME =
  'chatbox-input-surface relative flex flex-col justify-between gap-xs rounded-[26px] bg-chatbox-background-secondary px-3 pt-2 pb-1.5'

/** Desktop only: keeps the swap between input and pause from jumping. */
export const INPUT_SURFACE_MIN_HEIGHT_CLASS_NAME = 'min-h-[72px]'

export const INPUT_SURFACE_STYLE = {}
