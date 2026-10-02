import { TestId } from '@shared/automation/testids'
import type React from 'react'
import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react'
import { PromptInput } from '@/components/ui/prompt-input'
import { useMessageInput } from '@/hooks/useMessageInput'
import * as dom from '../../hooks/dom'

export type MessageInputFieldRef = {
  getValue: () => string
  setValue: (val: string | ((prev: string) => string)) => void
  clearDraft: () => void
  getElement: () => HTMLTextAreaElement | null
}

type MessageInputFieldProps = {
  isNewSession: boolean
  viewportHeight: number
  isReadOnly: boolean
  placeholder: string
  ariaLabel: string
  autoFocus: boolean
  /** Called on every value change (including programmatic setValue). */
  onValueChange: (value: string) => void
  /** Called only on real user typing (onChange), not programmatic setValue. */
  onUserInput?: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void
}

export const MessageInputField = memo(
  forwardRef<MessageInputFieldRef, MessageInputFieldProps>(
    (
      {
        isNewSession,
        viewportHeight,
        isReadOnly,
        placeholder,
        ariaLabel,
        autoFocus,
        onValueChange,
        onUserInput,
        onKeyDown,
        onPaste,
      },
      ref
    ) => {
      const { messageInput, setMessageInput, clearDraft } = useMessageInput('', { isNewSession })
      const inputRef = useRef<HTMLTextAreaElement | null>(null)
      const messageInputRef = useRef(messageInput)
      messageInputRef.current = messageInput

      useEffect(() => {
        onValueChange(messageInput)
      }, [messageInput, onValueChange])

      useImperativeHandle(
        ref,
        () => ({
          getValue: () => messageInputRef.current,
          setValue: (val) => setMessageInput(val),
          clearDraft: () => clearDraft(),
          getElement: () => inputRef.current,
        }),
        [setMessageInput, clearDraft]
      )

      const maxRows = Math.max(4, Math.floor(viewportHeight / 100))

      return (
        <PromptInput
          variant="bare"
          value={messageInput}
          onChange={setMessageInput}
          onUserInput={onUserInput}
          enterToSubmit={false}
          readOnly={isReadOnly}
          autoFocus={autoFocus}
          placeholder={placeholder}
          minRows={1}
          maxHeight={maxRows * 24}
          inputRef={inputRef}
          className="min-w-0 flex-1"
          textareaProps={{
            id: dom.messageInputID,
            'aria-label': ariaLabel,
            'data-testid': TestId.chat.messageInput,
            onKeyDown,
            onPaste,
          }}
        />
      )
    }
  )
)
