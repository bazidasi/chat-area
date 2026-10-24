import { ModelProviderEnum } from '@shared/types'
import { describe, expect, it } from 'vitest'
import {
  applyChatboxLicenseDefaultModelToSession,
  type ChatboxDefaultModelSettings,
  resolveChatboxLicenseDefaultModel,
} from './defaultChatModel'

function makeSettings(overrides: Partial<ChatboxDefaultModelSettings> = {}): ChatboxDefaultModelSettings {
  return {
    hasExpiredLicense: false,
    ...overrides,
  }
}

// Fibonacci fork: default-model resolution no longer reads Chatbox license
// payloads at all — the only registered provider is Fibonacci, so every
// selection resolves to its default model.
describe('resolveChatboxLicenseDefaultModel', () => {
  it('resolves to the Fibonacci default model for any settings shape', () => {
    expect(resolveChatboxLicenseDefaultModel(makeSettings())).toEqual({
      provider: ModelProviderEnum.Fibonacci,
      modelId: 'fibonacci-1-pro-max',
    })
  })

  it('ignores stored license payloads (expired or otherwise)', () => {
    expect(
      resolveChatboxLicenseDefaultModel(
        makeSettings({
          licenseKey: 'license-key',
          hasExpiredLicense: true,
          licenseDetail: {
            name: 'Chatbox AI Pro',
            defaultModel: 'chatboxai-4',
          },
        })
      )
    ).toEqual({
      provider: ModelProviderEnum.Fibonacci,
      modelId: 'fibonacci-1-pro-max',
    })
  })
})

describe('applyChatboxLicenseDefaultModelToSession', () => {
  it('applies the Fibonacci default model to preset chat sessions without a selected model', () => {
    const session = {
      type: 'chat' as const,
      settings: {},
    }
    const result = applyChatboxLicenseDefaultModelToSession(session, makeSettings())
    expect(result.settings?.provider).toBe(ModelProviderEnum.Fibonacci)
    expect(result.settings?.modelId).toBe('fibonacci-1-pro-max')
  })

  it('does not override an existing preset session model', () => {
    const session = {
      type: 'chat' as const,
      settings: {
        provider: ModelProviderEnum.Fibonacci,
        modelId: 'fibonacci-2-coder',
      },
    }
    const result = applyChatboxLicenseDefaultModelToSession(session, makeSettings())
    expect(result.settings?.modelId).toBe('fibonacci-2-coder')
  })

  it('does not apply chat defaults to picture sessions', () => {
    const session = {
      type: 'picture' as const,
      settings: {},
    }
    const result = applyChatboxLicenseDefaultModelToSession(session, makeSettings())
    expect(result.settings?.provider).toBeUndefined()
  })
})
