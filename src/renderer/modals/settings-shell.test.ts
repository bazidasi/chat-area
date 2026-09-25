import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), 'src/renderer', relativePath), 'utf8')
}

describe('responsive settings shell', () => {
  test('uses a constrained centered panel on desktop', () => {
    const source = readSource('modals/Settings.tsx')

    expect(source).toContain("const isSmallScreen = useIsSmallScreen()")
    expect(source).toContain('fullScreen={isSmallScreen}')
    expect(source).toContain("size={isSmallScreen ? '100%' : 'min(1200px, calc(100vw - 48px))'}")
    expect(source).toContain("'h-[min(800px,calc(100dvh-48px))] overflow-hidden rounded-xl'")
    expect(source).toContain("width: isSmallScreen ? '100%' : 'min(1200px, calc(100vw - 48px))'")
    expect(source).toContain("background: 'var(--chatbox-background-sidebar)'")
    expect(readSource('static/neumorphism.css')).toMatch(
      /\.neo-settings-content\s*\{[^}]*overflow-y:\s*auto;/s
    )
    expect(source).toContain('className="h-full min-h-0 neo-settings-content"')
    expect(source).not.toContain('className="overflow-auto neo-settings-content"')
  })

  test('groups and tightens desktop settings navigation', () => {
    const route = readSource('routes/settings/route.tsx')

    expect(route).toContain("label: 'Models'")
    expect(route).toContain("label: 'Tools & Integrations'")
    expect(route).toContain("label: 'Chat & Data'")
    expect(route).toContain("label: 'Application'")
    expect(route).toContain('SETTINGS_CATEGORY_BY_KEY')
    expect(route).toContain("maw={isSmallScreen ? undefined : 240}")
    expect(route).toContain("p={isSmallScreen ? 'md' : 'sm'}")
    expect(route).not.toContain('w={20} h={20} mr="xs"')
  })

  test('uses a darker sidebar token and tighter desktop shell gutters', () => {
    const styles = readSource('static/globals.css')
    const root = readSource('routes/__root.tsx')
    const sidebar = readSource('Sidebar.tsx')

    expect(styles).toContain('--chatbox-background-sidebar: var(--chatbox-background-secondary);')
    expect(styles).toContain('--sidebar: var(--chatbox-background-sidebar);')
    expect(root).toContain("padding: { xs: 0, sm: '8px' }")
    expect(sidebar).toContain('sidebarWidth - 8')
  })

  test('keeps mobile settings as a full-page route', () => {
    const navigation = readSource('modals/settings-navigation.ts')
    const route = readSource('routes/settings/route.tsx')

    expect(navigation).toContain("to: `/settings${path ?")
    expect(route).toContain('<Page')
    expect(route).toContain('isSmallScreen')
  })
})
