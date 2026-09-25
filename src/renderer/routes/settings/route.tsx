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
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import Divider from '@/components/common/Divider'
import { opticalIconStroke, ScalableIcon } from '@/components/common/ScalableIcon'
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

/** One rendered size for every rail icon, so the stroke resolver below can
 *  derive a single optical weight for the whole menu. */
const NAV_ICON_SIZE = 20
const NAV_ICON_STROKE = opticalIconStroke(NAV_ICON_SIZE)

/**
 * Rail icon. Renders through ScalableIcon so it honours the Mantine `scale`
 * (the previous `w-full h-full` sizing bypassed it) and carries the shared
 * stroke weight instead of the icon library's own default.
 */
function NavIcon({ icon }: { icon: ComponentProps<typeof ScalableIcon>['icon'] }) {
  return <ScalableIcon icon={icon} size={NAV_ICON_SIZE} stroke={NAV_ICON_STROKE} className="shrink-0" />
}

const ITEMS: SettingsItem[] = [
  {
    key: 'provider',
    label: 'Model Provider',
    icon: <NavIcon icon={IconCategory} />,
  },
  {
    key: 'default-models',
    label: 'Default Models',
    icon: <NavIcon icon={IconBox} />,
  },
  {
    key: 'web-search',
    label: 'Web Search',
    icon: <NavIcon icon={IconWorldWww} />,
  },
  ...(featureFlags.mcp
    ? [
        {
          key: 'mcp',
          label: 'MCP',
          icon: <NavIcon icon={IconCircleDottedLetterM} />,
        },
      ]
    : []),
  ...(featureFlags.knowledgeBase
    ? [
        {
          key: 'knowledge-base',
          label: 'Knowledge Base',
          icon: <NavIcon icon={IconBook} />,
        },
      ]
    : []),
  ...(featureFlags.skills
    ? [
        {
          key: 'skills',
          label: 'Skills',
          noTranslate: true,
          icon: <NavIcon icon={IconWand} />,
        },
        // Agent settings share the skills gate: both surface only where agent mode runs.
        {
          key: 'agent',
          label: 'Agent',
          icon: <NavIcon icon={IconRobotFace} />,
        },
      ]
    : []),
  {
    key: 'document-parser',
    label: 'Document Parser',
    icon: <NavIcon icon={IconFileText} />,
  },
  {
    key: 'chat',
    label: 'Chat Settings',
    icon: <NavIcon icon={IconMessages} />,
  },
  {
    key: 'archive',
    label: 'Archived Chats',
    icon: <NavIcon icon={IconArchive} />,
  },
  ...(platform.type === 'mobile'
    ? []
    : [
        {
          key: 'hotkeys',
          label: 'Keyboard Shortcuts',
          icon: <NavIcon icon={IconKeyboard} />,
        },
      ]),
  {
    key: 'general',
    label: 'General Settings',
    icon: <NavIcon icon={IconAdjustmentsHorizontal} />,
  },
  {
    key: 'my-copilots',
    label: 'My Copilots',
    icon: <NavIcon icon={IconMessageChatbot} />,
    to: '/copilots',
  },
  {
    key: 'help',
    label: 'Help',
    icon: <NavIcon icon={IconHelpCircle} />,
    to: '/guide',
  },
  {
    key: 'dev-tools',
    label: 'Dev Tools',
    icon: <NavIcon icon={IconCode} />,
    to: '/dev',
  },
  {
    key: 'about',
    label: 'About',
    icon: <NavIcon icon={IconInfoCircle} />,
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
            <ScalableIcon icon={IconChevronLeft} size={18} stroke={opticalIconStroke(18)} />
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
    >
      {item.icon}
      <Text
        flex={1}
        lineClamp={1}
        span
        className={clsx(
          'neo-settings-nav-item__label !text-inherit',
          isSmallScreen ? 'min-h-[32px] leading-[32px]' : ''
        )}
      >
        {label}
      </Text>
      {isSmallScreen && (
        <ScalableIcon
          icon={IconChevronRight}
          size={20}
          stroke={opticalIconStroke(20)}
          className="!text-chatbox-tint-tertiary"
        />
      )}
    </Flex>
  )

  const navItemClass = clsx('neo-settings-nav-item', active && 'neo-settings-nav-item--active')

  // The interactive surface sits on the focusable element, so hover, press and
  // :focus-visible all resolve against the same box. The mobile divider stays
  // outside it so the row's background never washes over the separator.
  if (item.to) {
    return (
      <Box component="div" className="w-full">
        <UnstyledButton
          className={navItemClass}
          onClick={() => navigateToDynamicPath({ to: item.to!, search: {} })}
          data-testid={getSettingsNavTestId(item.key)}
        >
          {row}
        </UnstyledButton>
        {isSmallScreen && <Divider />}
      </Box>
    )
  }

  return (
    <Box component="div" className="w-full">
      <Link
        disabled={disabled}
        to={`/settings/${item.key}` as any}
        className={navItemClass}
        data-disabled={disabled ? 'true' : undefined}
        aria-current={active ? 'page' : undefined}
        data-testid={getSettingsNavTestId(item.key)}
      >
        {row}
      </Link>
      {isSmallScreen && <Divider />}
    </Box>
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
            'neo-settings-nav border-solid border-0 border-e overflow-auto border-chatbox-border-secondary',
            isSmallScreen ? 'w-full border-e-0' : 'flex-[1_0_auto]'
          )}
        >
          {categoryGroups.map((category, categoryIndex) => (
            <Stack key={category.key} gap={0}>
              <Text
                size="xxs"
                fw={600}
                c="chatbox-tertiary"
                className={clsx(
                  // Sentence case reads as a quiet label rather than a shout;
                  // the first group tucks under the panel edge, later groups
                  // get enough air to separate from the rows above.
                  'px-2 pb-1 ltr:tracking-[0.02em]',
                  isSmallScreen ? 'px-3 pt-4' : categoryIndex === 0 ? 'pt-1.5' : 'pt-4'
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
