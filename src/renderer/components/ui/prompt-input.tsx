'use client'

import { ArrowUp, ChevronDown, Paperclip, Square } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const PROMPT_INPUT_FRAME_CLASS =
  'rounded-[29px] bg-chatbox-background-secondary px-3.5 pt-3 pb-2 transition-colors'

export const PROMPT_INPUT_TEXTAREA_CLASS =
  'block w-full resize-none border-none bg-transparent px-2 py-1 text-sm leading-6 text-chatbox-tint-primary outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50'

export interface PromptInputHandle {
  focus: () => void
  getElement: () => HTMLTextAreaElement | null
}

export type PromptInputTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'ref' | 'rows' | 'placeholder' | 'disabled' | 'readOnly' | 'autoFocus'
> & {
  'data-testid'?: string
}

export interface PromptInputProps {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onStop?: () => void
  onUserInput?: () => void
  loading?: boolean
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  placeholder?: string
  attachLabel?: string
  modelLabel?: string
  sendLabel?: string
  stopLabel?: string
  showAttachAction?: boolean
  enterToSubmit?: boolean
  minRows?: number
  maxHeight?: number
  variant?: 'card' | 'bare'
  /** Rendered next to the send button, e.g. a model picker. */
  tools?: React.ReactNode
  /** Rendered as a full-width row under the send button. */
  toolbar?: React.ReactNode
  textareaProps?: PromptInputTextareaProps
  inputRef?: React.RefCallback<HTMLTextAreaElement> | React.MutableRefObject<HTMLTextAreaElement | null> | null
  children?: React.ReactNode
  className?: string
}

/**
 * جعبه‌ی پرامپت. Auto-growing textarea; Enter sends, Shift+Enter breaks a line.
 * The send button sits at the inline-end (left in RTL) like every Persian chat app.
 */
export const PromptInput = React.forwardRef<PromptInputHandle, PromptInputProps>(function PromptInput(
  {
    value,
    onChange,
    onSubmit,
    onStop,
    onUserInput,
    loading,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    placeholder = 'از هوش مصنوعی بپرسید…',
    attachLabel = 'پیوست',
    modelLabel = 'مدل پیش‌فرض',
    sendLabel = 'ارسال',
    stopLabel = 'توقف',
    showAttachAction = false,
    enterToSubmit = true,
    minRows = 1,
    maxHeight = 200,
    variant = 'card',
    tools,
    toolbar,
    textareaProps,
    inputRef,
    children,
    className,
  },
  ref
) {
  const [internal, setInternal] = React.useState('')
  const v = value ?? internal
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const setTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node
      if (typeof inputRef === 'function') {
        inputRef(node)
      } else if (inputRef) {
        inputRef.current = node
      }
    },
    [inputRef]
  )

  React.useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getElement: () => textareaRef.current,
  }))

  React.useEffect(() => {
    const el = textareaRef.current
    if (!el || typeof v !== 'string') return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [maxHeight, v])

  function submit() {
    if (!v.trim() || loading || disabled) return
    onSubmit?.(v.trim())
    if (value === undefined) setInternal('')
  }

  const textareaClassName =
    variant === 'bare'
      ? cn(PROMPT_INPUT_TEXTAREA_CLASS, className, textareaProps?.className)
      : cn(PROMPT_INPUT_TEXTAREA_CLASS, textareaProps?.className)

  const textarea = (
    <textarea
      {...textareaProps}
      ref={setTextareaRef}
      rows={minRows}
      value={v}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      onChange={(e) => {
        if (value === undefined) setInternal(e.target.value)
        onChange?.(e.target.value)
        onUserInput?.()
      }}
      onKeyDown={(e) => {
        textareaProps?.onKeyDown?.(e)
        if (e.defaultPrevented || !enterToSubmit) return
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault()
          submit()
        }
      }}
      className={textareaClassName}
    />
  )

  if (variant === 'bare') {
    return (
      <>
        {textarea}
        {children}
      </>
    )
  }

  const action = loading ? (
    <button
      type="button"
      aria-label={stopLabel}
      onClick={onStop}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-foreground text-background"
    >
      <Square className="size-3 fill-current" />
    </button>
  ) : (
    <button
      type="button"
      aria-label={sendLabel}
      disabled={!v.trim() || disabled}
      onClick={submit}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ArrowUp className="size-4" />
    </button>
  )

  return (
    <div className={cn(PROMPT_INPUT_FRAME_CLASS, className)}>
      {textarea}
      {toolbar ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {action}
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {showAttachAction && (
              <button
                type="button"
                aria-label={attachLabel}
                disabled={disabled}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Paperclip className="size-4" />
              </button>
            )}
            {tools ?? (
              <button
                type="button"
                disabled={disabled}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {modelLabel}
                <ChevronDown className="size-3" />
              </button>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
})
