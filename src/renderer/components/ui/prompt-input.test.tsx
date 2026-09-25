// @vitest-environment jsdom

import { createRef } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test-utils'
import { PromptInput, type PromptInputHandle } from './prompt-input'

describe('PromptInput', () => {
  test('renders the shared frame, toolbar, and stop action while loading', () => {
    const onStop = vi.fn()

    const { container } = render(
      <PromptInput value="hello" onChange={vi.fn()} onStop={onStop} loading toolbar={<span>toolbar content</span>} />
    )

    expect(container.firstElementChild?.className).toContain('rounded-[29px]')
    expect(container.firstElementChild?.className).toContain('bg-chatbox-background-secondary')
    expect(screen.getByText('toolbar content')).toBeTruthy()
    expect(screen.getByRole('textbox').className).toContain('border-none')
    expect(screen.getByRole('button', { name: 'توقف' }).parentElement?.textContent).toContain('toolbar content')
    fireEvent.click(screen.getByRole('button', { name: 'توقف' }))
    expect(onStop).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'مدل پیش‌فرض' })).toBeNull()
  })

  test('bare mode exposes the same textarea through both refs and renders no actions', () => {
    const ref = createRef<PromptInputHandle>()
    const inputRef = createRef<HTMLTextAreaElement>()

    render(
      <PromptInput
        ref={ref}
        variant="bare"
        value="draft"
        onChange={vi.fn()}
        inputRef={inputRef}
        enterToSubmit={false}
        readOnly
        className="flex-1"
      />
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveProperty('readOnly', true)
    expect(textarea.className).toContain('flex-1')
    expect(textarea.className).toContain('leading-6')
    expect(textarea.className).toContain('border-none')
    expect(ref.current?.getElement()).toBe(textarea)
    expect(inputRef.current).toBe(textarea)
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('submits on Enter but not on Shift+Enter or IME composition', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<PromptInput value="hello" onChange={vi.fn()} onSubmit={onSubmit} />)
    const textarea = screen.getByRole('textbox')

    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSubmit).toHaveBeenLastCalledWith('hello')

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true })
    expect(onSubmit).toHaveBeenCalledOnce()

    rerender(<PromptInput variant="bare" value="hello" onChange={vi.fn()} onSubmit={onSubmit} enterToSubmit={false} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  test('lets a caller prevent the built-in submit with textareaProps.onKeyDown', () => {
    const onSubmit = vi.fn()
    render(
      <PromptInput
        value="hello"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        textareaProps={{ onKeyDown: (event) => event.preventDefault() }}
      />
    )

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
