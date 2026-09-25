import { canonicalizeWorkProjectPath, type WorkProject } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { create, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from './safeStorage'

const PROJECT_REGISTRY_VERSION = 1
const PROJECT_REGISTRY_KEY = 'work-project-registry'

export type AddWorkProjectInput = {
  id?: string
  name: string
  rootPath: string
  createdAt?: number
  lastOpenedAt?: number
}

export type UpdateWorkProjectInput = Partial<Pick<WorkProject, 'name' | 'rootPath' | 'lastOpenedAt'>>

type ProjectRegistryState = {
  version: number
  projects: WorkProject[]
  addProject: (input: AddWorkProjectInput) => WorkProject
  updateProject: (id: string, updates: UpdateWorkProjectInput) => WorkProject | null
  removeProject: (id: string) => void
  ensureProjectByPath: (rootPath: string, name?: string) => WorkProject
  listProjects: () => WorkProject[]
}

function normalizeRootPath(rootPath: string): string {
  const normalized = canonicalizeWorkProjectPath(rootPath)
  if (!normalized) throw new Error('A work project requires a non-empty root path')
  return normalized
}

function defaultProjectName(rootPath: string): string {
  const parts = rootPath.split('/').filter(Boolean)
  return parts[parts.length - 1] || rootPath
}

export const projectRegistryStore = create<ProjectRegistryState>()(
  persist(
    (set, get) => ({
      version: PROJECT_REGISTRY_VERSION,
      projects: [],
      addProject: (input) => {
        const now = Date.now()
        const project: WorkProject = {
          id: input.id ?? uuidv4(),
          name: input.name,
          rootPath: normalizeRootPath(input.rootPath),
          createdAt: input.createdAt ?? now,
          lastOpenedAt: input.lastOpenedAt ?? now,
        }
        set({ projects: [...get().projects, project] })
        return project
      },
      updateProject: (id, updates) => {
        const current = get().projects.find((project) => project.id === id)
        if (!current) return null
        const updated: WorkProject = {
          ...current,
          ...updates,
          ...(updates.rootPath === undefined ? {} : { rootPath: normalizeRootPath(updates.rootPath) }),
        }
        set({ projects: get().projects.map((project) => (project.id === id ? updated : project)) })
        return updated
      },
      removeProject: (id) => {
        set({ projects: get().projects.filter((project) => project.id !== id) })
      },
      ensureProjectByPath: (rootPath, name) => {
        const canonicalPath = normalizeRootPath(rootPath)
        const existing = get().projects.find((project) => project.rootPath === canonicalPath)
        if (existing) {
          return get().updateProject(existing.id, { lastOpenedAt: Date.now() }) ?? existing
        }
        return get().addProject({ name: name || defaultProjectName(canonicalPath), rootPath: canonicalPath })
      },
      listProjects: () => get().projects,
    }),
    {
      name: PROJECT_REGISTRY_KEY,
      version: PROJECT_REGISTRY_VERSION,
      skipHydration: true,
      storage: safeStorage,
      partialize: (state) => ({ version: state.version, projects: state.projects }),
    }
  )
)

let initPromise: Promise<ProjectRegistryState> | undefined
export function initProjectRegistryStore(): Promise<ProjectRegistryState> {
  if (!initPromise) {
    initPromise = new Promise<ProjectRegistryState>((resolve) => {
      const unsub = projectRegistryStore.persist.onFinishHydration((value) => {
        unsub()
        resolve(value)
      })
      projectRegistryStore.persist.rehydrate()
    })
  }
  return initPromise
}

export function useWorkProjects(): WorkProject[] {
  return useStore(projectRegistryStore, (state) => state.projects)
}
