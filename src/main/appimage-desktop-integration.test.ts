import { describe, expect, it } from 'vitest'
import { pickIconCandidate, rewriteDesktopEntry, type IconCandidate } from './appimage-desktop-integration'

const SAMPLE = `[Desktop Entry]
Name=Fibonacci Chat Area
Comment=AI chat client powered by Fibonacci AI
Exec=AppRun --no-sandbox %U
Icon=fibonacci-chat-area
Terminal=false
Type=Application
Categories=Network;Chat;Development;
StartupWMClass=Fibonacci Chat Area
`

const OVERRIDES = {
  execPath: '/home/you/Downloads/Fibonacci-Chat-Area-1.0.0-x86_64.AppImage',
  icon: 'fibonacci-chat-area',
  startupWMClass: 'fibonacci-chat-area',
}

describe('rewriteDesktopEntry', () => {
  it('points Exec at the running AppImage and rewrites icon + WM class', () => {
    const result = rewriteDesktopEntry(SAMPLE, OVERRIDES)

    expect(result).toContain('Exec="/home/you/Downloads/Fibonacci-Chat-Area-1.0.0-x86_64.AppImage" --no-sandbox %U')
    expect(result).toContain('Icon=fibonacci-chat-area')
    expect(result).toContain('StartupWMClass=fibonacci-chat-area')
    expect(result).toContain('Name=Fibonacci Chat Area')
    expect(result).toContain('Categories=Network;Chat;Development;')
    expect(result).not.toContain('AppRun')
  })

  it('appends a field code when the original Exec has none', () => {
    const plain = SAMPLE.replace('Exec=AppRun --no-sandbox %U', 'Exec=AppRun')
    const result = rewriteDesktopEntry(plain, OVERRIDES)

    expect(result).toContain('Exec="/home/you/Downloads/Fibonacci-Chat-Area-1.0.0-x86_64.AppImage" %U')
  })

  it('inserts StartupWMClass right after Type when the source entry has none', () => {
    const withoutWmClass = SAMPLE.split('\n')
      .filter((line) => !line.startsWith('StartupWMClass='))
      .join('\n')
    const result = rewriteDesktopEntry(withoutWmClass, OVERRIDES)
    const lines = result.split('\n')

    expect(lines[lines.indexOf('Type=Application') + 1]).toBe('StartupWMClass=fibonacci-chat-area')
  })

  it('keeps desktop actions untouched', () => {
    const withActions = `${SAMPLE}\n[Desktop Action NewWindow]\nExec=AppRun --new-window\nName=New window\n`
    const result = rewriteDesktopEntry(withActions, OVERRIDES)

    expect(result).toContain('[Desktop Action NewWindow]')
    expect(result).toContain('Exec=AppRun --new-window')
  })
})

describe('pickIconCandidate', () => {
  it('prefers the largest pixel size, then the largest file', () => {
    const candidates: IconCandidate[] = [
      { path: 'top-level.png', bytes: 999999 },
      { path: 'usr/share/icons/hicolor/256x256/apps/app.png', pixels: 256, bytes: 100 },
      { path: 'usr/share/icons/hicolor/512x512/apps/app.png', pixels: 512, bytes: 50 },
    ]

    expect(pickIconCandidate(candidates)?.path).toContain('512x512')
    expect(pickIconCandidate([])).toBeNull()
  })
})
