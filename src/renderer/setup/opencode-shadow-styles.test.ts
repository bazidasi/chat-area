import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

function readRendererSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), 'src/renderer', relativePath), 'utf8')
}

describe('OpenCode shadow surface system', () => {
  test('defines shared raised, floating, inset-focus, and critical-focus recipes', () => {
    const globalStyles = readRendererSource('static/globals.css')
    const componentStyles = readRendererSource('static/neumorphism.css')

    expect(globalStyles).toContain('--neo-shadow-float: var(--shadow-xs-border-base), var(--shadow-md);')
    expect(globalStyles).toContain('--neo-shadow-boxed: var(--shadow-md);')
    expect(globalStyles).toContain('--neo-shadow-boxed-hover: var(--shadow-lg);')
    expect(globalStyles).toContain(
      '--neo-shadow-boxed: -1px -1px 0 rgba(255, 255, 255, 0.12),'
    )
    expect(globalStyles).toContain('1px 1px 0 rgba(0, 0, 0, 0.7), var(--shadow-md);')
    expect(globalStyles).toContain('--neo-shadow-boxed-focus: var(--neo-shadow-boxed), var(--neo-ring);')
    expect(globalStyles).not.toContain(
      '--neo-shadow-boxed-focus: 0 0 0 3px color-mix(in srgb, var(--chatbox-brand)'
    )
    expect(globalStyles).toContain('--neo-shadow-inset-focus: var(--neo-shadow-inset)')
    expect(globalStyles).toContain('var(--border-critical-selected), var(--neo-elevation-xs),')
    expect(globalStyles).toMatch(
      /\.chatbox-input-beam\s*\{[^}]*overflow:\s*visible !important;[^}]*\}/s
    )
    expect(globalStyles).toMatch(
      /\.chatbox-input-surface\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-boxed\);/s
    )
    expect(readRendererSource('components/InputBox/InputBox.tsx')).toContain('chatbox-input-beam')
    expect(readRendererSource('components/InputBox/InputBox.tsx')).toContain('borderRadius={29}')
    expect(globalStyles).toMatch(
      /\.chatbox-suggestion-card\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-boxed\);/s
    )
    expect(globalStyles).toMatch(
      /\.chatbox-mode-switch\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-boxed\);/s
    )
    expect(componentStyles).toMatch(
      /\.neo-main-frame\s*\{[^}]*box-shadow:\s*0 -1px 0 0 var\(--border-weak-base\)/s
    )
    expect(componentStyles).not.toMatch(/\.neo-main-frame\s*\{[^}]*1px 0 0 0 var\(--border-weak-base\)/s)
    expect(componentStyles).toMatch(/\.oc-ring\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-outset-sm\);/s)
  })

  test('styles shared controls and Mantine overlays without flat perimeter borders', () => {
    const styles = readRendererSource('static/neumorphism.css')

    expect(styles).toMatch(/\.oc-button\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-outset-sm\);/s)
    expect(styles).toMatch(/\.oc-input\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-inset-sm\);/s)
    expect(styles).toMatch(
      /\.mantine-Button-root\[data-variant='outline'\]\s*\{[^}]*border:\s*none;[^}]*box-shadow:\s*var\(--neo-shadow-outset-xs\);/s
    )
    expect(styles).toMatch(
      /\.mantine-Menu-dropdown,[\s\S]*?\.mantine-Select-dropdown\s*\{[^}]*border:\s*none;[^}]*box-shadow:\s*var\(--neo-shadow-float\);/s
    )
    expect(styles).toMatch(/\.mantine-Tooltip-tooltip\s*\{[^}]*border:\s*none;/s)
  })

  test('draws every focus and selection ring with the one accent ring token', () => {
    const globalStyles = readRendererSource('static/globals.css')
    const componentStyles = readRendererSource('static/neumorphism.css')
    const chatStyles = readRendererSource('static/neumorphism-chat.css')

    // One accent, one geometry: a gap in the page surface then a 2px arc of
    // the accent. The arc is a box-shadow so it follows border-radius.
    expect(globalStyles).toContain('--neo-ring-accent: var(--chatbox-brand);')
    expect(globalStyles).toContain(
      '--neo-ring: 0 0 0 2px var(--background-weak), 0 0 0 4px var(--neo-ring-accent);'
    )
    expect(globalStyles).toContain('--neo-ring-select: 0 0 0 1px var(--neo-ring-accent);')

    // Every state recipe is composed from those, never a private mix.
    for (const recipe of [
      '--neo-shadow-focus:',
      '--neo-shadow-boxed-focus:',
      '--neo-shadow-select:',
      '--neo-shadow-inset-focus:',
      '--neo-shadow-critical-focus:',
    ]) {
      const declaration = globalStyles.slice(globalStyles.indexOf(recipe))
      const value = declaration.slice(0, declaration.indexOf(';'))
      expect(value).toContain('var(--neo-ring')
    }

    // The global fallback is solid accent, not a translucent mix.
    expect(componentStyles).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--neo-ring-accent\);/s)

    // Selection and jump-to-message share the select ring.
    expect(chatStyles).toMatch(
      /\[data-highlighted='true'\]\s*\{[^}]*var\(--neo-shadow-outset-sm\), var\(--neo-ring-select\)/s
    )

    // No ad-hoc accent ring survives anywhere in the three style layers.
    for (const styles of [globalStyles, componentStyles, chatStyles]) {
      expect(styles).not.toMatch(/0 0 0 \d+px color-mix\(in srgb, var\(--chatbox-brand\)/)
      expect(styles).not.toMatch(
        /outline:[^;]*color-mix\(in srgb, var\(--chatbox-brand\)\s*\d+%[^;]*;/
      )
    }
  })

  test('keeps shared React primitives on shadow classes', () => {
    expect(readRendererSource('components/ui/button.tsx')).not.toContain('border border-input')
    expect(readRendererSource('components/ui/input.tsx')).not.toContain('border border-input')
    expect(readRendererSource('components/ui/textarea.tsx')).not.toContain('border border-input')
    expect(readRendererSource('components/ui/dialog.tsx')).toContain('oc-ring oc-ring--large')
    expect(readRendererSource('components/ui/sheet.tsx')).toContain('oc-ring oc-ring--large')
    expect(readRendererSource('components/ui/tooltip.tsx')).toContain('oc-ring oc-ring--floating')
  })

  test('does not add OpenCode global border reset', () => {
    const globalStyles = readRendererSource('static/globals.css')

    expect(globalStyles).not.toMatch(/\*,\s*::after,\s*::before[\s\S]{0,200}\{\s*border:\s*0\s+solid;/)
  })

  test('preserves semantic and structural borders', () => {
    expect(readRendererSource('routes/copilots/-components/CopilotSettingsModal.tsx')).toContain(
      'border-dashed'
    )
    expect(readRendererSource('components/ModelSelectorV2/ChatboxProviderRows.tsx')).toContain('border-b')
    expect(readRendererSource('static/Block.css')).toContain('border')
  })
})
