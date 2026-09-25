import { beforeEach, describe, expect, it } from 'vitest'
import { projectRegistryStore } from './projectRegistryStore'

describe('projectRegistryStore', () => {
  beforeEach(() => {
    projectRegistryStore.setState({ version: 1, projects: [] })
  })

  it('ensures one canonical project per root path and updates lastOpenedAt', () => {
    const first = projectRegistryStore.getState().ensureProjectByPath('/work/project/')
    const second = projectRegistryStore.getState().ensureProjectByPath('/work/./project')

    expect(second.id).toBe(first.id)
    expect(second.rootPath).toBe('/work/project')
    expect(projectRegistryStore.getState().listProjects()).toHaveLength(1)
  })

  it('supports update and remove operations', () => {
    const project = projectRegistryStore.getState().addProject({ id: 'project-1', name: 'Project', rootPath: '/project' })
    expect(projectRegistryStore.getState().updateProject(project.id, { name: 'Renamed' })?.name).toBe('Renamed')
    projectRegistryStore.getState().removeProject(project.id)
    expect(projectRegistryStore.getState().listProjects()).toEqual([])
  })
})
