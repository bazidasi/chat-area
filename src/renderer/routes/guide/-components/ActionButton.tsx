/**
 * ActionButton - Reusable button for provider setup and navigation actions
 */

import { Box, Button, Flex, Group, Stack, Text } from '@mantine/core'
import { IconCirclePlus, IconExternalLink, IconInfoCircle, IconSettings } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trackJkClickEvent } from '@/analytics/jk'
import { JK_EVENTS, JK_PAGE_NAMES } from '@/analytics/jk-events'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { navigateToSettings } from '@/modals/settings-navigation'
import platform from '@/platform'
import guideRedirectLoadingGif from '@/static/guide/guide-redirect-loading.gif'

interface LoginButtonProps {
  onLoginSuccess?: () => void
}

const GUIDE_ACTION_BUTTON_MAX_WIDTH = 320
const AUTO_NEW_CHAT_DELAY_SECONDS = 3
const guideActionButtonWidthStyle = {
  width: '100%',
  maxWidth: GUIDE_ACTION_BUTTON_MAX_WIDTH,
} as const

/**
 * Fibonacci fork: the chatbox account login flow (email code + license
 * activation) is removed. The guide's login button now opens the Fibonacci
 * provider settings where the user configures their API token.
 */
export function LoginButton({ onLoginSuccess: _onLoginSuccess }: LoginButtonProps = {}) {
  const { t } = useTranslation()

  const trackLoginButtonClick = useCallback(() => {
    trackJkClickEvent(JK_EVENTS.LOGIN_BUTTON_CLICK, {
      pageName: JK_PAGE_NAMES.HELP_PAGE,
    })
  }, [])

  return (
    <Stack mt="md" gap="sm" style={guideActionButtonWidthStyle}>
      <Button
        onClick={() => {
          trackLoginButtonClick()
          navigateToSettings('/provider/fibonacci')
        }}
        variant="light"
        fullWidth
        h={42}
      >
        {t('Set up Fibonacci AI')}
      </Button>
    </Stack>
  )
}

export function ProviderSettingsButton() {
  const { t } = useTranslation()

  return (
    <Flex mt="md" style={guideActionButtonWidthStyle}>
      <Button
        leftSection={<ScalableIcon icon={IconSettings} size={18} />}
        onClick={() => navigateToSettings('/provider')}
        variant="light"
        fullWidth
        h={42}
      >
        {t('Set up API')}
      </Button>
    </Flex>
  )
}

/**
 * 普通"新对话"按钮，用于引导完成后的正常跳转场景（登录成功、对话轮次上限等）
 * 对应 tool: show_new_chat_button（客户端本地生成）
 */
interface NewChatButtonProps {
  label?: string
}

export function NewChatButton({ label }: NewChatButtonProps = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Flex mt="md" style={guideActionButtonWidthStyle}>
      <Button variant="light" fullWidth h={42} onClick={() => navigate({ to: '/' })}>
        <ScalableIcon icon={IconCirclePlus} className="me-2" />
        {label ?? t('New Chat')}
      </Button>
    </Flex>
  )
}

interface AutoNewChatLoadingProps {
  waitForWindowFocusBeforeAutoNavigate?: boolean
}

export function AutoNewChatLoading({ waitForWindowFocusBeforeAutoNavigate }: AutoNewChatLoadingProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [remainingSeconds, setRemainingSeconds] = useState(AUTO_NEW_CHAT_DELAY_SECONDS)

  useEffect(() => {
    let cancelled = false
    let countdownTimer: ReturnType<typeof setInterval> | undefined
    let completeTimer: ReturnType<typeof setTimeout> | undefined

    const clearTimers = () => {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = undefined
      }
      if (completeTimer) {
        clearTimeout(completeTimer)
        completeTimer = undefined
      }
    }

    const startCountdown = () => {
      if (cancelled || countdownTimer || completeTimer || document.visibilityState !== 'visible') return

      setRemainingSeconds(AUTO_NEW_CHAT_DELAY_SECONDS)
      countdownTimer = setInterval(() => {
        setRemainingSeconds((current) => Math.max(0, current - 1))
      }, 1000)
      completeTimer = setTimeout(() => {
        clearTimers()
        setRemainingSeconds(0)
        void navigate({ to: '/' })
      }, AUTO_NEW_CHAT_DELAY_SECONDS * 1000)
    }

    const cancelWindowFocusListener = waitForWindowFocusBeforeAutoNavigate
      ? platform.onWindowFocused(startCountdown)
      : undefined

    const handleVisibilityChange = () => {
      if (!waitForWindowFocusBeforeAutoNavigate && document.visibilityState === 'visible') {
        startCountdown()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    const runInitialCheck = async () => {
      if (waitForWindowFocusBeforeAutoNavigate) {
        const isFocused = await platform.isWindowFocused().catch(() => false)
        if (!cancelled && isFocused) {
          startCountdown()
        }
        return
      }

      startCountdown()
    }
    void runInitialCheck()

    return () => {
      cancelled = true
      clearTimers()
      cancelWindowFocusListener?.()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [navigate, waitForWindowFocusBeforeAutoNavigate])

  return (
    <Group
      mt="xs"
      gap="sm"
      align="center"
      wrap="nowrap"
      style={{
        ...guideActionButtonWidthStyle,
        maxWidth: 520,
      }}
    >
      <Box
        component="img"
        src={guideRedirectLoadingGif}
        alt=""
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          objectFit: 'contain',
          flex: '0 0 auto',
        }}
      />
      <Stack gap={2} flex={1}>
        <Text
          fw={700}
          c="chatbox-brand"
          style={{
            fontSize: 16,
            lineHeight: 1.25,
          }}
        >
          {t('Opening a new chat...')}
        </Text>
        <Text
          c="chatbox-brand"
          style={{
            fontSize: 14,
            lineHeight: 1.35,
          }}
        >
          {t('Sit back, relax. Chatbox will start a new chat in {{count}}s...', { count: remainingSeconds })}
        </Text>
      </Stack>
    </Group>
  )
}

/**
 * 提示 block，用于用户误将引导助手当作普通对话时的引导提醒
 * 对应 tool: show_new_chat_tip（后端 AI 判断用户偏离话题时返回）
 */
export function NewChatTip() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Box
      mt="md"
      p="md"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        background: 'var(--mantine-color-yellow-light)',
        border: 'none',
        boxShadow:
          'inset 3px 0 0 var(--mantine-color-yellow-light-color), var(--neo-shadow-outset-sm)',
      }}
    >
      <Flex align="center" gap="xs" mb={4}>
        <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-yellow-8)', flexShrink: 0 }} />
        <Text size="sm" fw={600} style={{ color: 'var(--mantine-color-yellow-8)' }}>
          {t('This is the onboarding assistant')}
        </Text>
      </Flex>
      <Flex align="center" gap={6} wrap="wrap">
        <Text size="sm" c="dimmed">
          {t('For general conversations, please click')}
        </Text>
        <Button variant="light" size="compact-sm" onClick={() => navigate({ to: '/' })}>
          <ScalableIcon icon={IconCirclePlus} className="me-1" />
          {t('New Chat')}
        </Button>
        <Text size="sm" c="dimmed">
          {t('on the side bar to start a new conversation.')}
        </Text>
      </Flex>
    </Box>
  )
}

export function ViewLicenseButton() {
  const { t } = useTranslation()

  return (
    <Flex mt="xs" style={guideActionButtonWidthStyle}>
      <Button variant="light" fullWidth h={42} onClick={() => navigateToSettings('/provider/fibonacci')}>
        <ScalableIcon icon={IconSettings} className="me-2" />
        {t('View Provider Settings')}
      </Button>
    </Flex>
  )
}

interface FreeTrialLinkProps {
  /** Optional hook that fires after the link successfully opens — used by the guide flow to start polling. */
  onAfterClick?: () => void
}

export function FreeTrialLink({ onAfterClick: _onAfterClick }: FreeTrialLinkProps = {}) {
  const { t } = useTranslation()

  // Fibonacci fork: free-plan claiming ran through the chatbox account service,
  // which no longer exists. Point the user at the provider settings instead.
  return (
    <Flex mt="md">
      <Button
        leftSection={<ScalableIcon icon={IconExternalLink} size={18} />}
        onClick={() => navigateToSettings('/provider/fibonacci')}
        variant="light"
        style={guideActionButtonWidthStyle}
        h={42}
      >
        {t('Set up Fibonacci AI')}
      </Button>
    </Flex>
  )
}
