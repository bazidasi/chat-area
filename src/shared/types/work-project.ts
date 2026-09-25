import { z } from 'zod'

/**
 * A project is a named workspace directory used to scope work-mode sessions.
 * Timestamps are optional so registry data written before they existed remains
 * readable.
 */
export const WorkProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootPath: z.string().min(1),
  createdAt: z.number().optional(),
  lastOpenedAt: z.number().optional(),
})

export const WorkProjectRegistrySchema = z.object({
  version: z.number().int().nonnegative().default(1),
  projects: z.array(WorkProjectSchema).default([]),
})

export type WorkProject = z.infer<typeof WorkProjectSchema>
export type WorkProjectRegistry = z.infer<typeof WorkProjectRegistrySchema>

/**
 * Canonicalize a project path without depending on the host filesystem.
 *
 * This normalizes separators, duplicate/trailing separators, and lexical `.` /
 * `..` segments. It intentionally does not resolve symlinks or case-fold path
 * segments; the stable key is therefore deterministic across the desktop,
 * web, and mobile renderers while retaining the host's path semantics.
 */
export function canonicalizeWorkProjectPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''

  const normalized = trimmed.replace(/\\/g, '/')
  const driveMatch = normalized.match(/^([A-Za-z]):(.*)$/)
  const isUnc = normalized.startsWith('//')
  const isAbsolute = normalized.startsWith('/')
  const body = driveMatch ? driveMatch[2] : normalized

  const segments: string[] = []
  for (const segment of body.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') {
        segments.pop()
      } else if (!isAbsolute && !driveMatch) {
        segments.push(segment)
      }
      continue
    }
    segments.push(segment)
  }

  const joined = segments.join('/')
  if (driveMatch) {
    const drive = driveMatch[1].toUpperCase()
    return `${drive}:${isAbsolute || body.startsWith('/') ? '/' : ''}${joined}`.replace(/\/+$/, '') || `${drive}:/`
  }
  if (isUnc) return `//${joined}`.replace(/\/+$/, '') || '//'
  if (isAbsolute) return `/${joined}`.replace(/\/+$/, '') || '/'
  return joined || '.'
}
