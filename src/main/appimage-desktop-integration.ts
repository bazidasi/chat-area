import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'path'

/**
 * AppImage desktop integration for Linux.
 *
 * An AppImage is a portable format: running it installs nothing, so GNOME/KDE
 * application search cannot find the app and users perceive it as "not fully
 * installed". To fix that we install a desktop entry plus an hicolor icon into
 * the user's XDG data directories while the app runs, pointing at the running
 * AppImage file. Package installs (deb/rpm) ship system-wide desktop entries
 * and never take this path, because the APPIMAGE/APPDIR environment variables
 * are only set by the AppImage runtime itself.
 */

export const DESKTOP_FILE_NAME = 'fibonacci-chat-area.desktop'
export const ICON_NAME = 'fibonacci-chat-area'
export const STARTUP_WM_CLASS = 'fibonacci-chat-area'

export interface DesktopEntryOverrides {
  /** Absolute path of the running AppImage file. */
  execPath: string
  /** Bare icon name (no extension) installed into the hicolor tree. */
  icon: string
  startupWMClass: string
}

/**
 * Rewrite the Exec/Icon/StartupWMClass keys of an electron-builder generated
 * .desktop file for user-level integration. Keys belonging to [Desktop Action]
 * groups are left untouched.
 */
export function rewriteDesktopEntry(original: string, overrides: DesktopEntryOverrides): string {
  const lines = original.split('\n')
  const result: string[] = []
  let inMainGroup = true
  let hasStartupWMClass = false
  let typeIndex = -1

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) {
      inMainGroup = trimmed === '[Desktop Entry]'
    }
    if (!inMainGroup) {
      result.push(line)
      continue
    }
    const keyMatch = /^(Exec|Icon|StartupWMClass)=(.*)$/.exec(trimmed)
    if (keyMatch) {
      const key = keyMatch[1]
      if (key === 'Exec') {
        // Drop the original executable token (AppRun) but keep its arguments
        // and the desktop field code so URLs still reach the app.
        const args = keyMatch[2]
          .trim()
          .split(/\s+/)
          .slice(1)
          .filter((arg) => arg.length > 0)
        if (!/%[a-zA-Z%]/.test(args.join(' '))) {
          args.push('%U')
        }
        result.push(`Exec="${overrides.execPath}"${args.length > 0 ? ` ${args.join(' ')}` : ''}`)
      } else if (key === 'Icon') {
        result.push(`Icon=${overrides.icon}`)
      } else {
        hasStartupWMClass = true
        result.push(`StartupWMClass=${overrides.startupWMClass}`)
      }
      continue
    }
    if (/^Type=/.test(trimmed)) {
      typeIndex = result.length
    }
    result.push(line)
  }

  if (!hasStartupWMClass) {
    const insertLine = `StartupWMClass=${overrides.startupWMClass}`
    if (typeIndex >= 0) {
      result.splice(typeIndex + 1, 0, insertLine)
    } else {
      result.push(insertLine)
    }
  }

  return result.join('\n')
}

export interface IconCandidate {
  path: string
  /** Pixel size parsed from an hicolor size directory, when present. */
  pixels?: number
  bytes: number
}

/** Pick the best icon: prefer the largest declared pixel size, then the largest file. */
export function pickIconCandidate(candidates: IconCandidate[]): IconCandidate | null {
  if (candidates.length === 0) {
    return null
  }
  return [...candidates].sort((a, b) => (b.pixels ?? 0) - (a.pixels ?? 0) || b.bytes - a.bytes)[0]
}

function listIconCandidates(appDir: string): IconCandidate[] {
  const candidates: IconCandidate[] = []
  const push = (file: string, pixels?: number) => {
    try {
      candidates.push({ path: file, pixels, bytes: fs.statSync(file).size })
    } catch {
      // ignore unreadable candidates
    }
  }
  const hicolorRoot = path.join(appDir, 'usr', 'share', 'icons', 'hicolor')
  try {
    for (const sizeDir of fs.readdirSync(hicolorRoot)) {
      const parsed = /^(\d+)x\d+$/.exec(sizeDir)
      const appsDir = path.join(hicolorRoot, sizeDir, 'apps')
      let files: string[] = []
      try {
        files = fs.readdirSync(appsDir)
      } catch {
        continue
      }
      for (const file of files) {
        if (file.toLowerCase().endsWith('.png')) {
          push(path.join(appsDir, file), parsed ? Number(parsed[1]) : undefined)
        }
      }
    }
  } catch {
    // no hicolor tree inside the AppDir
  }
  for (const dir of [appDir, path.join(appDir, 'icons')]) {
    try {
      for (const file of fs.readdirSync(dir)) {
        if (file.toLowerCase().endsWith('.png')) {
          push(path.join(dir, file))
        }
      }
    } catch {
      // directory missing
    }
  }
  return candidates
}

function refreshApplicationDatabase(applicationsDir: string): void {
  try {
    execFile('update-desktop-database', [applicationsDir], { timeout: 5000 }, () => {
      // best-effort; desktop environments also pick up new entries via file monitoring
    })
  } catch {
    // helper binary not installed — harmless
  }
}

/**
 * Register the running AppImage into the user's application menu. Idempotent:
 * the desktop entry is only rewritten when its content actually changed, so a
 * moved/renamed AppImage self-heals on the next launch.
 */
export function integrateAppImageDesktopEntry(env: NodeJS.ProcessEnv = process.env): void {
  try {
    if (process.platform !== 'linux') {
      return
    }
    const appImage = env.APPIMAGE
    const appDir = env.APPDIR
    if (!appImage || !appDir || !fs.existsSync(appImage)) {
      return
    }

    const dataHome = env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
    const applicationsDir = path.join(dataHome, 'applications')
    const desktopFileTarget = path.join(applicationsDir, DESKTOP_FILE_NAME)

    const sourceDesktopFile = fs
      .readdirSync(appDir)
      .filter((file) => file.endsWith('.desktop'))
      .map((file) => path.join(appDir, file))[0]
    if (!sourceDesktopFile) {
      return
    }

    // Install the largest bundled icon into the user hicolor tree.
    const icon = pickIconCandidate(listIconCandidates(appDir))
    if (icon) {
      const parsed = /(\d+)x\d+/.exec(icon.path)
      const pixels = parsed ? Number(parsed[1]) : 512
      const iconDir = path.join(dataHome, 'icons', 'hicolor', `${pixels}x${pixels}`, 'apps')
      fs.mkdirSync(iconDir, { recursive: true })
      fs.copyFileSync(icon.path, path.join(iconDir, `${ICON_NAME}.png`))
    }

    // Write the desktop entry pointing at the running AppImage file.
    fs.mkdirSync(applicationsDir, { recursive: true })
    const content = rewriteDesktopEntry(fs.readFileSync(sourceDesktopFile, 'utf8'), {
      execPath: appImage,
      icon: ICON_NAME,
      startupWMClass: STARTUP_WM_CLASS,
    })
    const existing = fs.existsSync(desktopFileTarget) ? fs.readFileSync(desktopFileTarget, 'utf8') : null
    if (existing !== content) {
      fs.writeFileSync(desktopFileTarget, content)
      refreshApplicationDatabase(applicationsDir)
    }
  } catch (error) {
    console.warn('[appimage-desktop-integration] failed:', error)
  }
}
