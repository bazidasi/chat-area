import { describe, expect, it } from 'vitest'
import { canonicalizeWorkProjectPath, WorkProjectRegistrySchema, WorkProjectSchema } from './work-project'

describe('work project types', () => {
  it('canonicalizes native and lexical path variants deterministically', () => {
    expect(canonicalizeWorkProjectPath('  /work/./project/../project/  ')).toBe('/work/project')
    expect(canonicalizeWorkProjectPath('C:\\work\\project\\.')).toBe('C:/work/project')
    expect(canonicalizeWorkProjectPath('//server/share//project/')).toBe('//server/share/project')
  })

  it('keeps legacy project records readable when timestamps are absent', () => {
    expect(WorkProjectSchema.parse({ id: 'p1', name: 'Project', rootPath: '/project' })).toEqual({
      id: 'p1',
      name: 'Project',
      rootPath: '/project',
    })
    expect(WorkProjectRegistrySchema.parse({ version: 1, projects: [] }).projects).toEqual([])
  })
})
