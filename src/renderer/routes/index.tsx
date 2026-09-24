import NiceModal from '@ebay/nice-modal-react'
import { ActionIcon, Avatar, Box, Divider, Flex, ScrollArea, Space, Stack, Text } from '@mantine/core'
import {
  type AgentModeEntry,
  type CopilotDetail,
  createMessage,
  type ImageSource,
  ModelProviderEnum,
  type Session,
  type SessionSettings,
} from '@shared/types'
import {
  type Icon,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconMessageCircle2Filled,
  IconPhoto,
  IconPresentation,
  IconX,
} from '@tabler/icons-react'
import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { trackJkClickEvent } from '@/analytics/jk'
import { JK_EVENTS, JK_PAGE_NAMES } from '@/analytics/jk-events'
import { rendererApplication } from '@/app/renderer-application'
import { BlurText } from '@/components/animate-ui/primitives/effects/blur-text'
import { Fade } from '@/components/animate-ui/primitives/effects/fade'
import { Slide, Slides } from '@/components/animate-ui/primitives/effects/slide'
import { HalftoneBackground } from '@/components/backgrounds/halftone'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { ImageInStorage } from '@/components/Image'
import InputBox, { type InputBoxPayload } from '@/components/InputBox/InputBox'
import WorkChatModeToggle from '@/components/InputBox/WorkChatModeToggle'
import Page from '@/components/layout/Page'
import { getForceShowNewUserScenarioCardsFlag } from '@/dev/devToolsFlags'
import { useMyCopilots, useRemoteCopilotsByCursor } from '@/hooks/useCopilots'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import * as remote from '@/packages/remote'
import { router } from '@/router'
import { useAuthInfoStore } from '@/stores/authInfoStore'
import { resolveChatboxLicenseDefaultModel } from '@/stores/defaultChatModel'
import { getHasCompletedFirstSuccessfulChat } from '@/stores/firstSuccessfulChat'
import { getSessionAgentModeEntry } from '@/stores/session/agent-mode'
import { switchCurrentSession } from '@/stores/session/crud'
import { generate } from '@/stores/session/generation'
import { submitNewUserMessage } from '@/stores/session/messages'
import { initEmptyChatSession } from '@/stores/sessionHelpers'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { NewUserScenarioGrid } from './-new-user-scenarios/NewUserScenarioGrid'
import { type NewUserScenario, newUserScenarios, resolveNewUserScenarioContent } from './-new-user-scenarios/scenarios'

const scenarioAgentModeOff = {
  value: 'off',
  locked: false,
  lockReason: null,
} satisfies AgentModeEntry

const firstChatScenarioDefaultModel = {
  provider: ModelProviderEnum.ChatboxAI,
  modelId: 'chatboxai-3.5',
} satisfies Pick<SessionSettings, 'provider' | 'modelId'>

export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: zodValidator(
    z.object({
      copilotId: z.string().optional(),
      copilot: z.string().optional(),
      settings: z.string().optional(),
    })
  ),
})

function Index() {
  const { t, i18n } = useTranslation()
  const isSmallScreen = useIsSmallScreen()

  const newSessionState = useUIStore((s) => s.newSessionState)
  const setNewSessionState = useUIStore((s) => s.setNewSessionState)
  const addSessionKnowledgeBase = useUIStore((s) => s.addSessionKnowledgeBase)
  const showCopilotsInNewSession = useUIStore((s) => s.showCopilotsInNewSession)
  const setQuote = useUIStore((s) => s.setQuote)
  const widthFull = useUIStore((s) => s.widthFull)
  const sessionWebBrowsingMap = useUIStore((s) => s.sessionWebBrowsingMap)
  const newSessionWebBrowsingDefault = useUIStore((s) => s.newSessionWebBrowsingDefault)
  const newSessionCommandApprovalModeDefault = useUIStore((s) => s.newSessionCommandApprovalModeDefault)
  const newSessionWorkingDirectoriesDefault = useUIStore((s) => s.newSessionWorkingDirectoriesDefault)
  const setSessionWebBrowsing = useUIStore((s) => s.setSessionWebBrowsing)
  const clearSessionWebBrowsing = useUIStore((s) => s.clearSessionWebBrowsing)
  const sessionAgentModeMap = useUIStore((s) => s.sessionAgentModeMap)
  const clearSessionAgentMode = useUIStore((s) => s.clearSessionAgentMode)
  const [session, setSession] = useState<Session>({
    id: 'new',
    ...initEmptyChatSession(),
  })
  const [hasCompletedFirstSuccessfulChat, setHasCompletedFirstSuccessfulChat] = useState<boolean | null>(null)
  const [forceShowNewUserScenarioCards, setForceShowNewUserScenarioCards] = useState(
    getForceShowNewUserScenarioCardsFlag
  )
  const hasUserSelectedModelRef = useRef(false)

  const defaultChatModel = useSettingsStore((s) => s.defaultChatModel)
  const licenseKey = useSettingsStore((s) => s.licenseKey)
  const licenseDetail = useSettingsStore((s) => s.licenseDetail)
  const licensePlanName = useSettingsStore((s) => s.licensePlanName)
  const hasExpiredLicense = useSettingsStore((s) => s.hasExpiredLicense)
  const isLoggedIn = useAuthInfoStore((s) => Boolean(s.accessToken && s.refreshToken))

  const selectedModel = useMemo(() => {
    if (session.settings?.provider && session.settings?.modelId) {
      return {
        provider: session.settings.provider,
        modelId: session.settings.modelId,
      }
    }
  }, [session.settings?.provider, session.settings?.modelId])

  useEffect(() => {
    let cancelled = false

    setForceShowNewUserScenarioCards(getForceShowNewUserScenarioCardsFlag())

    getHasCompletedFirstSuccessfulChat()
      .then((completed) => {
        if (!cancelled) {
          setHasCompletedFirstSuccessfulChat(completed)
        }
      })
      .catch((error) => {
        console.warn('[new-user-scenarios] failed to resolve first successful chat state:', error)
        if (!cancelled) {
          setHasCompletedFirstSuccessfulChat(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSession((old) => {
      if (
        hasCompletedFirstSuccessfulChat === false &&
        isLoggedIn &&
        !session.copilotId &&
        !hasUserSelectedModelRef.current
      ) {
        if (
          old.settings?.provider === firstChatScenarioDefaultModel.provider &&
          old.settings?.modelId === firstChatScenarioDefaultModel.modelId
        ) {
          return old
        }
        return {
          ...old,
          settings: {
            ...(old.settings || {}),
            ...firstChatScenarioDefaultModel,
          },
        }
      }
      if (old.settings?.provider && old.settings?.modelId) {
        return old
      }
      const defaultModel = defaultChatModel
        ? {
            provider: defaultChatModel.provider,
            modelId: defaultChatModel.model,
          }
        : resolveChatboxLicenseDefaultModel({
            licenseKey,
            hasExpiredLicense,
            licenseDetail,
            licensePlanName,
          })
      if (!defaultModel) {
        return old
      }
      return {
        ...old,
        settings: {
          ...(old.settings || {}),
          ...defaultModel,
        },
      }
    })
  }, [
    defaultChatModel,
    hasCompletedFirstSuccessfulChat,
    hasExpiredLicense,
    isLoggedIn,
    licenseDetail,
    licenseKey,
    licensePlanName,
    session.copilotId,
  ])

  const { copilots: myCopilots } = useMyCopilots()
  const { copilots: remoteCopilots } = useRemoteCopilotsByCursor({ limit: 10 })
  const selectedCopilotId = useMemo(() => session?.copilotId, [session?.copilotId])
  const selectedCopilot = useMemo(
    () => myCopilots.find((c) => c.id === selectedCopilotId) || remoteCopilots.find((c) => c.id === selectedCopilotId),
    [myCopilots, remoteCopilots, selectedCopilotId]
  )
  useEffect(() => {
    setSession((old) => ({
      ...old,
      assistantAvatarKey:
        selectedCopilot?.avatar?.type === 'storage-key' ? selectedCopilot.avatar.storageKey : undefined,
      picUrl: selectedCopilot?.avatar?.type === 'url' ? selectedCopilot.avatar.url : selectedCopilot?.picUrl,
      backgroundImage: selectedCopilot?.backgroundImage,
      name: selectedCopilot?.name || 'Untitled',
      threadName: '',
      messages: selectedCopilot
        ? [
            {
              id: uuidv4(),
              role: 'system',
              contentParts: [
                {
                  type: 'text',
                  text: selectedCopilot.prompt,
                },
              ],
            },
          ]
        : initEmptyChatSession().messages,
    }))
  }, [selectedCopilot])

  const routerState = useRouterState()
  useEffect(() => {
    const { copilotId, copilot } = routerState.location.search
    if (copilot) {
      let c: CopilotDetail | null = null
      try {
        c = JSON.parse(copilot) as CopilotDetail
      } catch (_e) {
        return
      }

      setSession((old) => ({
        ...old,
        copilotId: c.id,
        assistantAvatarKey: c.avatar?.type === 'storage-key' ? c.avatar.storageKey : undefined,
        picUrl: c.avatar?.type === 'url' ? c.avatar.url : c.picUrl,
        backgroundImage: c.backgroundImage,
        name: c.name || 'Untitled',
        threadName: '',
        messages: [
          {
            id: uuidv4(),
            role: 'system',
            contentParts: [
              {
                type: 'text',
                text: c.prompt,
              },
            ],
          },
        ],
      }))
    } else if (copilotId) {
      setSession((old) => ({ ...old, copilotId }))
    }
  }, [routerState.location.search])

  const createPersistedChatSession = useCallback(
    async (options?: {
      name?: string
      threadName?: string
      messages?: Session['messages']
      settingsPatch?: Partial<SessionSettings>
      settingsOverride?: Partial<SessionSettings>
    }) => {
      // Transient choices made while the chat was "new" win; otherwise new chats
      // continue the last explicit choice remembered from any earlier chat.
      const effectiveApprovalMode = newSessionState.commandApprovalMode ?? newSessionCommandApprovalModeDefault
      const effectiveWorkingDirectories = newSessionState.workingDirectories ?? newSessionWorkingDirectoriesDefault
      const newSession = await rendererApplication.sessions.createSession({
        name: options?.name ?? session.name,
        type: 'chat',
        assistantAvatarKey: session.assistantAvatarKey,
        picUrl: session.picUrl,
        backgroundImage: session.backgroundImage,
        messages: options?.messages ?? session.messages,
        copilotId: session.copilotId,
        threadName: options?.threadName ?? session.threadName ?? '',
        settings: {
          ...session.settings,
          ...options?.settingsPatch,
          // Bake the exact mode shown while the chat was "new" into the created session, so
          // remembered defaults and transient selections follow the same resolution path.
          agentMode: getSessionAgentModeEntry('new', undefined, sessionAgentModeMap),
          // Working directories bound while the chat was still "new" (not yet persisted),
          // falling back to the remembered default from earlier chats.
          ...(effectiveWorkingDirectories?.length ? { workingDirectories: effectiveWorkingDirectories } : {}),
          ...(effectiveApprovalMode
            ? {
                commandApprovalMode: effectiveApprovalMode,
                // Keep the legacy flag in lockstep for older readers.
                ...(effectiveApprovalMode === 'full_access' ? { agentFullAccess: true } : {}),
              }
            : newSessionState.agentFullAccess
              ? { agentFullAccess: true }
              : {}),
          ...options?.settingsOverride,
        },
      })

      if (session.copilotId) {
        void remote
          .recordCopilotUsage({ id: session.copilotId, action: 'create_session' })
          .catch((error) => console.warn('[recordCopilotUsage] failed', error))
      }

      // Transfer knowledge base / Work Mode settings from newSessionState to the actual
      // session, then clear it so nothing bleeds into the next new chat. (workingDirectories
      // and the command approval policy are already baked into the created session's settings above;
      // this only clears them.)
      if (newSessionState.knowledgeBase) {
        addSessionKnowledgeBase(newSession.id, newSessionState.knowledgeBase)
      }
      if (
        newSessionState.knowledgeBase ||
        newSessionState.workingDirectories?.length ||
        newSessionState.agentFullAccess ||
        newSessionState.commandApprovalMode
      ) {
        setNewSessionState({})
      }

      // Transfer either the transient choice or the remembered new-chat default.
      // Clearing only removes the transient "new" slot; the remembered default remains.
      const newSessionWebBrowsing = sessionWebBrowsingMap.new ?? newSessionWebBrowsingDefault
      if (newSessionWebBrowsing !== undefined) {
        setSessionWebBrowsing(newSession.id, newSessionWebBrowsing)
        clearSessionWebBrowsing('new')
      }

      // Transfer agent mode setting from "new" session to the actual session
      if (sessionAgentModeMap.new) {
        clearSessionAgentMode('new')
      }

      switchCurrentSession(newSession.id)
      localStorage.removeItem('new-chat')

      return newSession
    },
    [
      session,
      addSessionKnowledgeBase,
      newSessionState.knowledgeBase,
      newSessionState.workingDirectories,
      newSessionState.agentFullAccess,
      newSessionState.commandApprovalMode,
      newSessionCommandApprovalModeDefault,
      newSessionWorkingDirectoriesDefault,
      setNewSessionState,
      sessionWebBrowsingMap,
      newSessionWebBrowsingDefault,
      setSessionWebBrowsing,
      clearSessionWebBrowsing,
      sessionAgentModeMap,
      clearSessionAgentMode,
    ]
  )

  const handleSubmit = useCallback(
    async ({ constructedMessage, needGenerating = true, onUserMessageReady, settingsPatch }: InputBoxPayload) => {
      const newSession = await createPersistedChatSession({ settingsPatch })

      void submitNewUserMessage(newSession.id, {
        newUserMsg: constructedMessage,
        needGenerating,
        onUserMessageReady,
      })
    },
    [createPersistedChatSession]
  )

  const handleScenarioSelect = useCallback(
    async (scenario: NewUserScenario) => {
      const scenarioContent = resolveNewUserScenarioContent(scenario, i18n.language)
      trackJkClickEvent(JK_EVENTS.LEAD_CHAT_CARD_CLICK, {
        pageName: JK_PAGE_NAMES.CHAT_PAGE,
        content: t(scenario.titleKey),
        contentType: session.settings?.modelId ?? firstChatScenarioDefaultModel.modelId,
      })
      const assistantMessage = createMessage('assistant', '')
      assistantMessage.generating = true
      const newSession = await createPersistedChatSession({
        name: scenarioContent.sessionTitle,
        threadName: scenarioContent.sessionTitle,
        messages: [
          createMessage('system', scenarioContent.systemPrompt),
          createMessage('user', scenarioContent.firstUserMessage),
          assistantMessage,
        ],
        settingsOverride: { agentMode: scenarioAgentModeOff },
      })

      void generate(newSession.id, assistantMessage, { operationType: 'send_message' })
    },
    [createPersistedChatSession, i18n.language, session.settings?.modelId, t]
  )

  const onSelectModel = useCallback((p: string, m: string) => {
    hasUserSelectedModelRef.current = true
    setSession((old) => ({
      ...old,
      settings: {
        ...(old.settings || {}),
        provider: p,
        modelId: m,
      },
    }))
  }, [])

  const onClickSessionSettings = useCallback(async () => {
    const res: Session = await NiceModal.show('session-settings', {
      session,
      disableAutoSave: true,
    })
    if (res) {
      setSession((old) => ({
        ...old,
        ...res,
      }))
    }
    return true
  }, [session])

  const showNewUserScenarios =
    (forceShowNewUserScenarioCards || (hasCompletedFirstSuccessfulChat === false && isLoggedIn)) && !session.copilotId

  return (
    <div className="relative isolate h-full">
      {/* Spans the whole page — including behind the transparent title-bar header —
          so paddings/header no longer clip the animation. */}
      <HalftoneBackground className="absolute inset-0 z-0 pointer-events-none" />
      <div className="relative z-[1] flex h-full flex-col">
        <Page title="">
          <div className="relative flex flex-col h-full min-h-0 overflow-hidden pb-md">
            {/* Hero + composer cluster, centered in the viewport when it fits;
                scrolls as one unit when it doesn't. */}
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center overflow-y-auto pb-md">
              {showNewUserScenarios ? (
                <Stack className="my-auto w-full" py="xl">
                  <NewUserScenarioGrid scenarios={newUserScenarios} onSelect={handleScenarioSelect} />
                </Stack>
              ) : (
                <Stack align="center" gap="lg" className="w-full pt-14 pb-6" px="md">
                  <Slide direction="up" offset={12}>
                    <Stack align="center" gap={6} pt="md">
                      <Text fw={800} fz={isSmallScreen ? 24 : 34} ta="center" lh={1.15}>
                        <BlurText text={t('What can I help you with today?')} />
                      </Text>
                      <span className="h-[3px] w-10 rounded-full bg-chatbox-brand" />
                      {!isSmallScreen && (
                        <Text size="sm" c="chatbox-tertiary" ta="center" mt={4}>
                          {t('Ask anything — chat, create images, analyze files, and more.')}
                        </Text>
                      )}
                    </Stack>
                  </Slide>
                </Stack>
              )}

              {session.copilotId ? (
                <Box px="md">
                  <Stack gap="sm" className={widthFull ? 'w-full' : 'w-full max-w-4xl mx-auto'}>
                    <Flex align="center" gap="sm">
                      <CopilotItem
                        name={session.name}
                        avatar={
                          session.assistantAvatarKey
                            ? { type: 'storage-key', storageKey: session.assistantAvatarKey }
                            : undefined
                        }
                        picUrl={session.picUrl}
                        selected
                        onClick={() => onClickSessionSettings?.()}
                      />
                      <ActionIcon
                        size={32}
                        radius="lg"
                        c="chatbox-tertiary"
                        bg="#F1F3F5"
                        onClick={() => setSession((old) => ({ ...old, copilotId: undefined }))}
                      >
                        <ScalableIcon icon={IconX} size={24} />
                      </ActionIcon>
                    </Flex>

                    <Text c="chatbox-secondary" className="line-clamp-5">
                      {session.messages[0]?.contentParts
                        ?.map((part) => (part.type === 'text' ? part.text : ''))
                        .join('') || ''}
                    </Text>
                  </Stack>
                </Box>
              ) : (
                showCopilotsInNewSession && (
                  <CopilotPicker onSelect={(copilot) => setSession((old) => ({ ...old, copilotId: copilot?.id }))} />
                )
              )}

              {/* Chat / Work mode switch — sits between the welcome message and
              the composer, driving the same agent-mode entry as the panel. */}
              {!showNewUserScenarios && !session.copilotId && (
                <WorkChatModeToggle sessionId="new" model={selectedModel} sessionSettings={session.settings} />
              )}

              <Box className="w-full max-w-4xl mx-auto">
                <InputBox
                  sessionType="chat"
                  sessionId="new"
                  draftCopilotId={session.copilotId}
                  draftCopilotName={session.copilotId ? session.name : undefined}
                  model={selectedModel}
                  // fullWidth
                  onSelectModel={onSelectModel}
                  onClickSessionSettings={onClickSessionSettings}
                  onSubmit={handleSubmit}
                />
              </Box>

              {!session.copilotId && !showNewUserScenarios && (
                <Fade delay={260} className={widthFull ? 'w-full' : 'w-full max-w-4xl mx-auto'}>
                  <Stack gap="xs" px="sm" pb={isSmallScreen ? 0 : 'xs'}>
                    {!isSmallScreen && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Slides delay={320} holdDelay={90}>
                          <HomeFeatureCard
                            icon={IconPhoto}
                            tag={t('Create Image')}
                            title={t('Image Generator')}
                            description={t('Create high-quality images instantly from text.')}
                            onClick={() => router.navigate({ to: '/image-creator' })}
                          />
                          <HomeFeatureCard
                            icon={IconPresentation}
                            tag={t('Make Slides')}
                            title={t('AI Presentation')}
                            description={t('Turn ideas into engaging, professional presentations.')}
                            onClick={() => setQuote(t('Create a professional presentation about '))}
                          />
                          <HomeFeatureCard
                            icon={IconCode}
                            tag={t('Generate Code')}
                            title={t('Dev Assistant')}
                            description={t('Generate clean, production-ready code in seconds.')}
                            onClick={() => setQuote(t('Write production-ready code for '))}
                          />
                        </Slides>
                      </div>
                    )}
                  </Stack>
                </Fade>
              )}
            </div>
          </div>
        </Page>
      </div>
    </div>
  )
}

const MAX_COPILOTS_TO_SHOW = 10

/**
 * Home feature card (desktop): icon in a brand-tinted square, brand tag
 * pill, title and one-line description — mirrors the reference home layout.
 * Entrance stagger is handled by the parent <Slides> (animate-ui).
 */
const HomeFeatureCard = ({
  icon,
  tag,
  title,
  description,
  onClick,
}: {
  icon: Icon
  tag: string
  title: string
  description: string
  onClick?: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'chatbox-suggestion-card group/card relative flex w-full cursor-pointer flex-col items-start gap-2 text-left',
      'rounded-2xl bg-chatbox-background-secondary px-4 py-3'
    )}
  >
    <span
      className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: 'var(--chatbox-background-brand-secondary)',
        color: 'var(--chatbox-tint-brand)',
      }}
    >
      {tag}
    </span>
    <span
      className="flex h-9 w-9 items-center justify-center rounded-xl"
      style={{ background: 'var(--chatbox-background-brand-secondary)' }}
    >
      <ScalableIcon icon={icon} size={18} className="text-chatbox-tint-brand" />
    </span>
    <span className="text-sm font-semibold text-chatbox-tint-primary">{title}</span>
    <span className="text-xs leading-relaxed text-chatbox-tint-tertiary">{description}</span>
  </button>
)

const CopilotPicker = ({ selectedId, onSelect }: { selectedId?: string; onSelect?(copilot?: CopilotDetail): void }) => {
  const { t } = useTranslation()
  const isSmallScreen = useIsSmallScreen()
  const widthFull = useUIStore((s) => s.widthFull)
  const { copilots: myCopilots } = useMyCopilots()
  const { copilots: remoteCopilots } = useRemoteCopilotsByCursor()

  const copilots = useMemo(
    () =>
      myCopilots.length >= MAX_COPILOTS_TO_SHOW
        ? myCopilots
        : [
            ...myCopilots,
            ...(myCopilots.length && remoteCopilots.length ? [undefined] : []),
            ...remoteCopilots
              .filter((c) => !myCopilots.map((mc) => mc.id).includes(c.id))
              .slice(0, MAX_COPILOTS_TO_SHOW - myCopilots.length - 1),
          ],
    [myCopilots, remoteCopilots]
  )

  const showMoreButton = useMemo(
    () => copilots.length < myCopilots.length + remoteCopilots.length,
    [copilots.length, myCopilots.length, remoteCopilots.length]
  )

  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, onScrollPositionChange] = useState({ x: 0, y: 0 })

  if (!copilots.length) {
    return null
  }

  return (
    <Box px="md">
      <Stack gap="xs" className={widthFull ? 'w-full' : 'w-full max-w-4xl mx-auto'}>
        <Flex align="center" justify="space-between">
          <Text size="xxs" c="chatbox-tertiary">
            {t('My Copilots').toUpperCase()}
          </Text>

          {!isSmallScreen && (
            <Flex align="center" gap="sm">
              <ActionIcon
                variant="transparent"
                color="chatbox-tertiary"
                // onClick={() => setPage((p) => Math.max(p - 1, 0))}
                onClick={() => {
                  if (viewportRef.current) {
                    // const scrollWidth = viewportRef.current.scrollWidth
                    const clientWidth = viewportRef.current.clientWidth
                    const newScrollPosition = Math.max(scrollPosition.x - clientWidth, 0)
                    viewportRef.current.scrollTo({ left: newScrollPosition, behavior: 'smooth' })
                    onScrollPositionChange({ x: newScrollPosition, y: 0 })
                  }
                }}
              >
                <ScalableIcon icon={IconChevronLeft} />
              </ActionIcon>
              <ActionIcon
                variant="transparent"
                color="chatbox-tertiary"
                // onClick={() => setPage((p) => p + 1)}
                onClick={() => {
                  if (viewportRef.current) {
                    const scrollWidth = viewportRef.current.scrollWidth
                    const clientWidth = viewportRef.current.clientWidth
                    const newScrollPosition = Math.min(scrollPosition.x + clientWidth, scrollWidth - clientWidth)
                    viewportRef.current.scrollTo({ left: newScrollPosition, behavior: 'smooth' })
                    onScrollPositionChange({ x: newScrollPosition, y: 0 })
                  }
                }}
              >
                <ScalableIcon icon={IconChevronRight} />
              </ActionIcon>
            </Flex>
          )}
        </Flex>

        <ScrollArea
          type={isSmallScreen ? 'never' : 'scroll'}
          mx="-md"
          scrollbars="x"
          offsetScrollbars="x"
          viewportRef={viewportRef}
          onScrollPositionChange={onScrollPositionChange}
          className="copilot-picker-scroll-area"
        >
          {scrollPosition.x > 8 && !isSmallScreen && (
            <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-chatbox-background-primary to-transparent"></div>
          )}
          {!isSmallScreen && (
            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-chatbox-background-primary to-transparent"></div>
          )}
          <Flex wrap="nowrap" gap="xs">
            <Space w="xs" />
            {copilots.map((copilot) =>
              copilot ? (
                <CopilotItem
                  key={copilot.id}
                  name={copilot.name}
                  avatar={copilot.avatar}
                  picUrl={copilot.picUrl}
                  selected={selectedId === copilot.id}
                  onClick={() => {
                    onSelect?.(copilot)
                  }}
                />
              ) : (
                <Divider key="divider" orientation="vertical" my="xs" mx="xxs" />
              )
            )}
            {showMoreButton && (
              <CopilotItem
                name={t('View All Copilots')}
                noAvatar={true}
                selected={false}
                onClick={() =>
                  router.navigate({
                    to: '/copilots',
                  })
                }
              />
            )}
            <Space w="xs" />
          </Flex>
        </ScrollArea>
      </Stack>
    </Box>
  )
}

const CopilotItem = ({
  name,
  avatar,
  picUrl,
  selected,
  onClick,
  noAvatar = false,
}: {
  name: string
  avatar?: ImageSource
  picUrl?: string
  selected?: boolean
  onClick?(): void
  noAvatar?: boolean
}) => {
  const isSmallScreen = useIsSmallScreen()
  return (
    <Flex
      align="center"
      gap={isSmallScreen ? 'xxs' : 'xs'}
      py="xs"
      px={isSmallScreen ? 'xs' : 'md'}
      bd={selected ? 'none' : '1px solid var(--chatbox-border-primary)'}
      bg={selected ? 'var(--chatbox-background-brand-secondary)' : 'transparent'}
      className={clsx(
        'max-w-[75vw] sm:max-w-[50vw] cursor-pointer shrink-0 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)]',
        isSmallScreen ? 'rounded-full' : 'rounded-lg'
      )}
      onClick={onClick}
    >
      {!noAvatar &&
        (avatar?.type === 'storage-key' || avatar?.type === 'url' || picUrl ? (
          <Avatar
            src={avatar?.type === 'storage-key' ? '' : avatar?.url || picUrl}
            alt={name}
            size={isSmallScreen ? 20 : 24}
            radius="lg"
            className="flex-shrink-0 oc-ring"
          >
            {avatar?.type === 'storage-key' ? (
              <ImageInStorage storageKey={avatar.storageKey} className="object-cover object-center w-full h-full" />
            ) : (
              name?.charAt(0)?.toUpperCase()
            )}
          </Avatar>
        ) : (
          <Stack
            w={isSmallScreen ? 20 : 24}
            h={isSmallScreen ? 20 : 24}
            align="center"
            justify="center"
            className="flex-shrink-0 rounded-full bg-chatbox-background-brand-secondary"
          >
            <ScalableIcon icon={IconMessageCircle2Filled} size={24} className="text-chatbox-tint-brand" />
          </Stack>
        ))}
      <Text fw="600" c={selected ? 'chatbox-brand' : 'chatbox-primary'} lineClamp={1}>
        {name}
      </Text>
    </Flex>
  )
}
