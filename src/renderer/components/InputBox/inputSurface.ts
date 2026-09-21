// The input box surface, shared with PendingActionBar so a pause can take over
// the same slot without the frame or the height shifting.
// Matches the reference composer: large 24px-radius well, no hard border.
// The soft-UI extrusion lift and the magenta focus glow both live on
// .chatbox-input-surface in globals.css so light and dark stay in one place.
export const INPUT_SURFACE_CLASS_NAME =
  'chatbox-input-surface relative flex flex-col justify-between gap-xs rounded-[24px] bg-chatbox-background-secondary px-3.5 pt-3 pb-2'

/** Desktop only: keeps the swap between input and pause from jumping. */
export const INPUT_SURFACE_MIN_HEIGHT_CLASS_NAME = 'min-h-[104px]'

export const INPUT_SURFACE_STYLE = {}
