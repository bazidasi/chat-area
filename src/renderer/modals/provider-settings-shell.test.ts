import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), 'src/renderer', relativePath), 'utf8')
}

describe('provider settings workspace', () => {
  test('uses a desktop raised workspace and keeps mobile route split', () => {
    const route = readSource('routes/settings/provider/route.tsx')
    const list = readSource('components/settings/provider/ProviderList.tsx')

    expect(route).toContain("provider-settings-workspace")
    expect(route).toContain("p={isSmallScreen ? 'md' : 'xl'}")
    expect(route).toContain('provider-detail-surface')
    expect(list).toContain('provider-list-item--selected')
    expect(list).toContain('provider-list-item--interactive')
    expect(list).toContain("t('Providers')")
    expect(list).toContain('data-testid={TestId.settings.providerItem}')
    expect(list).toContain('data-testid={TestId.settings.addProvider}')
  })

  test('uses token-based provider workspace and neutral selected state', () => {
    const styles = readSource('static/neumorphism.css')

    expect(styles).toMatch(/\.provider-settings-workspace\s*\{[^}]*box-shadow:\s*var\(--neo-shadow-outset-sm\);/s)
    expect(styles).toMatch(/\.provider-list-item--selected\s*\{[^}]*--neo-shadow-outset-xs/s)
    expect(styles).toMatch(/\.provider-detail-surface \.mantine-Button-root\[data-variant='light'\]/s)
  })
})
