import { ModelProviderEnum, type Session } from '@shared/types'

/**
 * Default-model resolution for this build.
 *
 * The upstream implementation mapped Chatbox license tiers to chatbox-ai
 * models. Only Fibonacci is registered here, so every default resolves to the
 * Fibonacci default model regardless of any stored license payload.
 */

export type ChatboxDefaultModelSettings = Record<string, unknown>

export type DefaultChatModelSelection = {
  provider: string
  modelId: string
}

export function resolveChatboxLicenseDefaultModel(
  _settings?: ChatboxDefaultModelSettings
): DefaultChatModelSelection {
  return {
    provider: ModelProviderEnum.Fibonacci,
    modelId: 'fibonacci-1-pro-max',
  }
}

export function applyChatboxLicenseDefaultModelToSession<T extends Pick<Session, 'type' | 'settings'>>(
  session: T,
  settings?: ChatboxDefaultModelSettings
): T {
  if (session.type !== 'chat' || (session.settings?.provider && session.settings?.modelId)) {
    return session
  }

  const defaultModel = resolveChatboxLicenseDefaultModel(settings)

  return {
    ...session,
    settings: {
      ...(session.settings || {}),
      ...defaultModel,
    },
  }
}
