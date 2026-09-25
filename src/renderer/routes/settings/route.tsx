import { ActionIcon, Box, Flex, Stack, Text, UnstyledButton } from '@mantine/core'
import { TestId } from '@shared/automation/testids'
import {
  IconAdjustmentsHorizontal,
  IconArchive,
  IconBook,
  IconBox,
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconCircleDottedLetterM,
  IconCode,
  IconFileText,
  IconHelpCircle,
  IconInfoCircle,
  IconMessageChatbot,
  IconKeyboard,
  IconMessages,
  IconRobotFace,
  IconWand,
  IconWorldWww,
} from '@tabler/icons-react'
import { createFileRoute, Link, Outlet, useCanGoBack, useRouter, useRouterState } from '@tanstack/react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import Divider from '@/components/common/Divider'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import Page from '@/components/layout/Page'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import platform from '@/platform'
import { featureFlags } from '@/utils/feature-flags'
import { navigateToDynamicPath } from '@/router'

type SettingsItem = {
  key: string
  label: string
  icon: React.ReactNode
  noTranslate?: boolean
  to?: string
}

const ITEMS: SettingsItem[] = [
  {
    key: 'provider',
    label: 'Model Provider',
    icon: <IconCategory className="w-full h-full" />,
  },
  {
    key: 'default-models',
    label: 'Default Models',
    icon: <IconBox className="w-full h-full" />,
  },
  {
    key: 'web-search',
    label: 'Web Search',
    icon: <IconWorldWww className="w-full h-full" />,
  },
  ...(featureFlags.mcp
    ? [
        {
          key: 'mcp',
          label: 'MCP',
          icon: <IconCircleDottedLetterM className="w-full h-full" />,
        },
      ]
    : []),
  ...(featureFlags.knowledgeBase
    ? [
        {
          key: 'knowledge-base',
          label: 'Knowledge Base',
          icon: <IconBook className="w-full h-full" />,
        },
      ]
    : []),
  ...(featureFlags.skills
    ? [
        {
          key: 'skills',
          label: 'Skills',
          noTranslate: true,
          icon: <IconWand className="w-full h-full" />,
        },
        // Agent settings share the skills gate: both surface only where agent mode runs.
        {
          key: 'agent',
          label: 'Agent',
          icon: <IconRobotFace className="w-full h-full" />,
        },
      ]
    : []),
  {
    key: 'document-parser',
    label: 'Document Parser',
    icon: <IconFileText className="w-full h-full" />,
  },
  {
    key: 'chat',
    label: 'Chat Settings',
    icon: <IconMessages className="w-full h-full" />,
  },
  {
    key: 'archive',
    label: 'Archived Chats',
    icon: <IconArchive className="w-full h-full" />,
  },
  ...(platform.type === 'mobile'
    ? []
    : [
        {
          key: 'hotkeys',
          label: 'Keyboard Shortcuts',
          icon: <IconKeyboard className="w-full h-full" />,
        },
      ]),
  {
    key: 'general',
    label: 'General Settings',
    icon: <IconAdjustmentsHorizontal className="w-full h-full" />,
  },
  {
    key: 'my-copilots',
    label: 'My Copilots',
    icon: <IconMessageChatbot className="w-full h-full" />,
    to: '/copilots',
  },
  {
    key: 'help',
    label: 'Help',
    icon: <IconHelpCircle className="w-full h-full" />,
    to: '/guide',
  },
  {
    key: 'dev-tools',
    label: 'Dev Tools',
    icon: <IconCode className="w-full h-full" />,
    to: '/dev',
  },
  {
    key: 'about',
    label: 'About',
    icon: <IconInfoCircle className="w-full h-full" />,
    to: '/about',
  },
]

const SETTINGS_CATEGORIES = [
  { key: 'models', label: 'Models' },
  { key: 'tools', label: 'Tools & Integrations' },
  { key: 'chat-data', label: 'Chat & Data' },
  { key: 'application', label: 'Application' },
  { key: 'more', label: 'More' },
] as const

const SETTINGS_CATEGORY_BY_KEY: Record<string, (typeof SETTINGS_CATEGORIES)[number]['key']> = {
  provider: 'models',
  'default-models': 'models',
  'web-search': 'tools',
  mcp: 'tools',
  'knowledge-base': 'tools',
  skills: 'tools',
  agent: 'tools',
  'document-parser': 'tools',
  chat: 'chat-data',
  archive: 'chat-data',
  hotkeys: 'application',
  general: 'application',
  'my-copilots': 'more',
  help: 'more',
  'dev-tools': 'more',
  about: 'more',
}

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const isSmallScreen = useIsSmallScreen()

  return (
    <Page
      className="neo-settings-page"
      title={t('Settings')}
      left={
        isSmallScreen && canGoBack ? (
          <ActionIcon
            className="controls"
            variant="subtle"
            size={28}
            color="chatbox-secondary"
            mr="sm"
            onClick={() => router.history.back()}
          >
            <IconChevronLeft />
          </ActionIcon>
        ) : undefined
      }
    >
      <SettingsRoot />
      <Toaster richColors position="bottom-center" style={{ zIndex: 2147483647 }} />
    </Page>
  )
}

function getSettingsNavTestId(key: string) {
  if (key === 'chat') return TestId.settings.navChat
  if (key === 'general') return TestId.settings.navGeneral
  if (key === 'default-models') return TestId.settings.navDefaultModels
  return undefined
}

function SettingsNavItem({
  item,
  active,
  disabled,
  isSmallScreen,
  label,
}: {
  item: SettingsItem
  active: boolean
  disabled: boolean
  isSmallScreen: boolean
  label: string
}) {
  const row = (
    <Flex
      component="span"
      gap="xs"
      p={isSmallScreen ? 'md' : 'sm'}
      pr={isSmallScreen ? 'xl' : 'md'}
      py={isSmallScreen ? 'sm' : 4}
      align="center"
      c={active ? 'chatbox-brand' : 'chatbox-secondary'}
      bg={active ? 'var(--chatbox-background-brand-secondary)' : 'transparent'}
      className={clsx(
        'cursor-pointer select-none rounded-lg',
        active ? '' : 'hover:!bg-chatbox-background-gray-secondary'
      )}
    >
      <Box component="span" flex="0 0 auto" w={20} h={20}>
        {item.icon}
      </Box>
      <Text
        flex={1}
        lineClamp={1}
        span
        className={`!text-inherit ${isSmallScreen ? 'min-h-[32px] leading-[32px]' : ''}`}
      >
        {label}
      </Text>
      {isSmallScreen && (
        <ScalableIcon icon={IconChevronRight} size={20} className="!text-chatbox-tint-tertiary" />
      )}
    </Flex>
  )

  if (item.to) {
    return (
      <UnstyledButton
        className="block w-full"
        onClick={() => navigateToDynamicPath({ to: item.to!, search: {} })}
        data-testid={getSettingsNavTestId(item.key)}
      >
        {row}
        {isSmallScreen && <Divider />}
      </UnstyledButton>
    )
  }

  return (
    <Link
      disabled={disabled}
      to={`/settings/${item.key}` as any}
      className="block w-full no-underline"
      data-testid={getSettingsNavTestId(item.key)}
    >
      {row}
      {isSmallScreen && <Divider />}
    </Link>
  )
}

export function SettingsRoot() {
  const { t } = useTranslation()
  const routerState = useRouterState()
  const key = routerState.location.pathname.split('/')[2]
  const isSmallScreen = useIsSmallScreen()

  const categoryGroups = SETTINGS_CATEGORIES.map((category) => ({
    ...category,
    items: ITEMS.filter((item) => SETTINGS_CATEGORY_BY_KEY[item.key] === category.key),
  })).filter((category) => category.items.length > 0)

  return (
    <Flex flex={1} h="100%" miw={isSmallScreen ? undefined : 0}>
      {(!isSmallScreen || routerState.location.pathname === '/settings') && (
        <Stack
          p={isSmallScreen ? 0 : 'xxs'}
          gap={isSmallScreen ? 0 : 'sm'}
          maw={isSmallScreen ? undefined : 240}
          className={clsx(
            'neo-settings-nav border-solid border-0 border-r overflow-auto border-chatbox-border-secondary',
            isSmallScreen ? 'w-full border-r-0' : 'flex-[1_0_auto]'
          )}
        >
          {categoryGroups.map((category) => (
            <Stack key={category.key} gap={0}>
              <Text
                size="xxs"
                fw={700}
                c="chatbox-tertiary"
                className={clsx(
                  'px-2 pb-1 pt-3 uppercase tracking-[0.12em]',
                  isSmallScreen && 'px-3 pt-4'
                )}
              >
                {t(category.label)}
              </Text>
              {category.items.map((item) => (
                <SettingsNavItem
                  key={item.key}
                  item={item}
                  active={item.to ? routerState.location.pathname.startsWith(item.to) : item.key === key}
                  disabled={
                    routerState.location.pathname === `/settings/${item.key}` ||
                    routerState.location.pathname.startsWith(`/settings/${item.key}/`)
                  }
                  isSmallScreen={isSmallScreen}
                  label={'noTranslate' in item && item.noTranslate ? item.label : t(item.label)}
                />
              ))}
            </Stack>
          ))}

          {isSmallScreen && (
            <Link to={`/about`} className="block w-full no-underline">
              <Flex
                component="span"
                gap="xs"
                p="md"
                pr="xl"
                py="sm"
                align="center"
                c="chatbox-secondary"
                className="cursor-pointer select-none rounded-lg"
              >
                <Box component="span" flex="0 0 auto" w={20} h={20}>
                  <ScalableIcon icon={IconInfoCircle} size={20} />
                </Box>
                <Text flex={1} lineClamp={1} span className="!text-inherit min-h-[32px] leading-[32px]">
                  {t('About')}
                </Text>
                <ScalableIcon icon={IconChevronRight} size={20} className="!text-chatbox-tint-tertiary" />
              </Flex>
              <Divider />
            </Link>
          )}
        </Stack>
      )}
      {!(isSmallScreen && routerState.location.pathname === '/settings') && (
        <Box flex="1 1 80%" className="overflow-auto neo-settings-content">
          <Outlet />
        </Box>
      )}
    </Flex>
  )
}
