import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Soft-UI Toggle / ToggleGroup (ui/toggle).
 *
 * Adapted from the generic "Toggle" prompt onto the app's theme tokens:
 * - pressed state uses bg-secondary + text-foreground (--secondary is
 *   mapped to --chatbox-background-secondary, --foreground to
 *   --chatbox-tint-primary); unpressed items are muted
 *   (text-muted-foreground) with a hover background
 * - ToggleGroup is role="group" with type "single" (one or none) or
 *   "multiple"; ArrowRight / ArrowLeft move focus between items and
 *   swap meaning in RTL (in RTL "next" is ArrowLeft)
 * - sizes sm / md / lg (h-8 / h-9 / h-10) and an outline variant that
 *   boxes the whole group with a border
 * - single groups render a sliding highlight pill measured from the
 *   active item's offsetLeft / offsetWidth; multiple groups paint each
 *   pressed button directly with bg-secondary
 * - motion is short (150-300ms) and disabled under
 *   prefers-reduced-motion (motion-reduce:transition-none + the app-wide
 *   [data-reduce-motion] rules)
 */

type ToggleSize = 'sm' | 'md' | 'lg'

const toggleSizeClasses: Record<ToggleSize, string> = {
  sm: 'h-8 gap-1 px-2.5 text-xs',
  md: 'h-9 gap-1.5 px-3 text-sm',
  lg: 'h-10 gap-1.5 px-4 text-sm',
}

const toggleBaseClasses =
  'relative z-[1] inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium outline-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none'


interface ToggleGroupContextValue {
  type: 'single' | 'multiple'
  size: ToggleSize
  disabled: boolean
  isPressed: (value: string) => boolean
  toggleValue: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null)

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext)
  if (!context) {
    throw new Error('ToggleGroupItem must be rendered inside a ToggleGroup')
  }
  return context
}

function escapeSelectorValue(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, '\\$&')
}

export interface ToggleGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Selection mode: "single" keeps one or none pressed, "multiple" many. */
  type?: 'single' | 'multiple'
  /** Controlled pressed value(s). */
  value?: string | string[]
  /** Uncontrolled initial value(s). */
  defaultValue?: string | string[]
  onValueChange?: (value: string | undefined | string[]) => void
  size?: ToggleSize
  /** "outline" boxes the whole group with a border. */
  variant?: 'default' | 'outline'
  disabled?: boolean
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      type = 'single',
      value,
      defaultValue,
      onValueChange,
      size = 'md',
      variant = 'default',
      disabled = false,
      className,
      children,
      onKeyDown,
      ...props
    },
    forwardedRef
  ) => {
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = React.useState<string | string[] | undefined>(
      defaultValue ?? (type === 'multiple' ? [] : undefined)
    )
    const activeValue = isControlled ? value : internalValue
    const groupRef = React.useRef<HTMLDivElement | null>(null)

    const isPressed = React.useCallback(
      (itemValue: string) =>
        type === 'multiple' ? Array.isArray(activeValue) && activeValue.includes(itemValue) : activeValue === itemValue,
      [activeValue, type]
    )

    const toggleValue = React.useCallback(
      (itemValue: string) => {
        if (disabled) return
        if (type === 'multiple') {
          const current = Array.isArray(activeValue) ? activeValue : []
          const next = current.includes(itemValue)
            ? current.filter((candidate) => candidate !== itemValue)
            : [...current, itemValue]
          if (!isControlled) setInternalValue(next)
          onValueChange?.(next)
          return
        }
        // single: one or none
        const next = activeValue === itemValue ? undefined : itemValue
        if (!isControlled) setInternalValue(next)
        onValueChange?.(next)
      },
      [activeValue, disabled, isControlled, onValueChange, type]
    )

    /* Arrow navigation is direction-aware: in RTL "next" is ArrowLeft. */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return

      const group = groupRef.current
      if (!group) return
      const isRtl = getComputedStyle(group).direction === 'rtl'
      const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight'
      const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft'
      if (event.key !== nextKey && event.key !== previousKey) return

      const items = Array.from(group.querySelectorAll<HTMLButtonElement>('button[data-toggle-item]')).filter(
        (item) => !item.disabled
      )
      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
      if (currentIndex === -1 || items.length === 0) return

      event.preventDefault()
      const offset = event.key === nextKey ? 1 : -1
      const nextIndex = (currentIndex + offset + items.length) % items.length
      items[nextIndex]?.focus()
    }

    /* single mode: sliding highlight pill measured from the active button */
    const activeStringValue = typeof activeValue === 'string' ? activeValue : undefined
    const showPill = type === 'single' && Boolean(activeStringValue)
    const [pillStyle, setPillStyle] = React.useState<{ left: number; width: number } | null>(null)

    const measurePill = React.useCallback(() => {
      const group = groupRef.current
      if (!group || !showPill || !activeStringValue) {
        setPillStyle(null)
        return
      }
      const active = group.querySelector<HTMLButtonElement>(
        `button[data-toggle-item="${escapeSelectorValue(activeStringValue)}"]`
      )
      if (!active) {
        setPillStyle(null)
        return
      }
      setPillStyle({ left: active.offsetLeft, width: active.offsetWidth })
    }, [activeStringValue, showPill])

    React.useLayoutEffect(() => {
      measurePill()
    }, [measurePill])

    React.useEffect(() => {
      const group = groupRef.current
      if (!group || !showPill) return
      const observer = new ResizeObserver(() => measurePill())
      observer.observe(group)
      // labels may reflow once webfonts settle
      if (typeof document !== 'undefined' && document.fonts) {
        void document.fonts.ready.then(() => measurePill())
      }
      return () => observer.disconnect()
    }, [measurePill, showPill])

    return (
      <ToggleGroupContext.Provider value={{ type, size, disabled, isPressed, toggleValue }}>
        <div
          ref={(node) => {
            groupRef.current = node
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
          }}
          role="group"
          aria-disabled={disabled || undefined}
          className={cn(
            'relative inline-flex items-center gap-1 rounded-full p-1',
            variant === 'outline'
              ? 'border border-solid border-border bg-background'
              : 'bg-[var(--neo-surface)] shadow-[var(--neo-shadow-inset-sm)]',
            disabled && 'opacity-50',
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {showPill && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 z-0 rounded-full bg-[var(--neo-surface-raised)] shadow-[var(--neo-shadow-outset-xs)] transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
              style={{ left: pillStyle?.left ?? 0, width: pillStyle?.width ?? 0, opacity: pillStyle ? 1 : 0 }}
            />
          )}
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)
ToggleGroup.displayName = 'ToggleGroup'

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Identifier used for selection and for the sliding pill lookup. */
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, onClick, disabled, ...props }, ref) => {
    const { type, size, disabled: groupDisabled, isPressed, toggleValue } = useToggleGroupContext()
    const pressed = isPressed(value)

    return (
      <button
        ref={ref}
        type="button"
        data-toggle-item={value}
        aria-pressed={pressed}
        disabled={disabled || groupDisabled}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) toggleValue(value)
        }}
        className={cn(
          toggleBaseClasses,
          toggleSizeClasses[size],
          pressed
            ? type === 'multiple'
              ? 'bg-secondary text-foreground shadow-[var(--neo-shadow-outset-xs)]'
              : 'text-foreground'
            : 'text-muted-foreground hover:bg-[var(--chatbox-background-tertiary)] hover:text-foreground',
          className
        )}
        {...props}
      />
    )
  }
)
ToggleGroupItem.displayName = 'ToggleGroupItem'

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  size?: ToggleSize
}

/** Standalone toggle button (no group): aria-pressed + soft-UI states. */
const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed = false, onPressedChange, size = 'md', className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onPressedChange?.(!pressed)
      }}
      className={cn(
        toggleBaseClasses,
        toggleSizeClasses[size],
        pressed
          ? 'bg-secondary text-foreground shadow-[var(--neo-shadow-outset-xs)]'
          : 'text-muted-foreground hover:bg-[var(--chatbox-background-tertiary)] hover:text-foreground',
        className
      )}
      {...props}
    />
  )
)
Toggle.displayName = 'Toggle'

export { Toggle, ToggleGroup, ToggleGroupItem }

/*
 * Usage:
 *
 *   // single (one or none) — sliding highlight pill
 *   const [value, setValue] = React.useState('chat')
 *   <ToggleGroup type="single" value={value} onValueChange={(next) => setValue(String(next))}>
 *     <ToggleGroupItem value="chat">Chat Mode</ToggleGroupItem>
 *     <ToggleGroupItem value="work">Work Mode</ToggleGroupItem>
 *   </ToggleGroup>
 *
 *   // multiple — each pressed item paints its own bg-secondary
 *   <ToggleGroup type="multiple" defaultValue={['search']} variant="outline" size="sm">
 *     <ToggleGroupItem value="search">Search</ToggleGroupItem>
 *     <ToggleGroupItem value="tools">Tools</ToggleGroupItem>
 *   </ToggleGroup>
 *
 *   // standalone
 *   <Toggle pressed={on} onPressedChange={setOn}>Web Search</Toggle>
 */
