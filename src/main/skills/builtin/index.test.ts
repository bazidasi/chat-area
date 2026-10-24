import { describe, expect, it } from 'vitest'
import { builtinSkills } from './index'

describe('builtinSkills', () => {
  it('only includes practical built-in skills', () => {
    // Fibonacci fork: the chatbox product-info skill (and its chatbox_cli
    // toolset) was removed together with the chatbox backend services.
    expect(builtinSkills.map((item) => item.metadata.name)).toEqual([
      'data-analysis',
      'vibedrop',
      'frontend-design',
    ])
  })

  it('does not ship the chatbox product information skill', () => {
    expect(builtinSkills.find((item) => item.metadata.name === 'chatbox-product-info')).toBeUndefined()
  })

  it('keeps data analysis aligned with the sandbox harness', () => {
    const skill = builtinSkills.find((item) => item.metadata.name === 'data-analysis')

    expect(skill).toBeDefined()
    expect(skill?.body).toContain('code_execution')
    expect(skill?.body).toContain('Node.js, PowerShell on Windows, or Bash')
    expect(skill?.body).toContain('create_download')
    expect(skill?.body).toContain('Python, pandas, matplotlib, R, and system package managers are not available')
  })

  it('includes VibeDrop static hosting skill', () => {
    const skill = builtinSkills.find((item) => item.metadata.name === 'vibedrop')

    expect(skill).toBeDefined()
    expect(skill?.metadata.description).toContain('Deploy any static site')
    expect(skill?.body).toContain('vibedrop deploy ./dist')
    expect(skill?.body).toContain('https://app.vibedrop.cc/claim')
  })
})
