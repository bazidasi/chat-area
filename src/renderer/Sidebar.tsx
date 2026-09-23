import { registerPlugin } from '@capacitor/core'
import NiceModal from '@ebay/nice-modal-react'
import { Box, Flex, Text } from '@mantine/core'
import { TestId } from '@shared/automation/testids'
import {
  IconArchive,
  IconCirclePlus,
  IconCode,
  IconDownload,
  IconHelpCircle,
  IconInfoCircle,
  IconMessageChatbot,
  IconPhotoPlus,
  IconSearch,
  IconSettingsFilled,
} from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
// animate-ui: motion-backed Button (hover/tap scale) for the primary sidebar
// actions; shares the same variant API as ui/button.
import { Button } from '@/components/animate-ui/components/buttons/button'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import { isRTL } from '@/i18n/locales'
import { animateSidebarEntrance } from '@/lib/animations/neo-animations'
import { cn } from '@/lib/utils'
import { ScalableIcon } from './components/common/ScalableIcon'
import ThemeSwitchButton from './components/dev/ThemeSwitchButton'
import SessionList from './components/session/SessionList'
import { FORCE_ENABLE_DEV_PAGES } from './dev/devToolsConfig'
import useNeedRoomForMacWinControls from './hooks/useNeedRoomForWinControls'
import { useIsSmallScreen, useSidebarWidth } from './hooks/useScreenChange'
import useVersion from './hooks/useVersion'
import { navigateToSettings } from './modals/settings-navigation'
import { trackingEvent } from './packages/event'
import icon from './static/icon.png'
import { useLanguage } from './stores/settingsStore'
import { useUIStore } from './stores/uiStore'
import { installUpdate, useUpdateStore } from './stores/updateStore'
import { CHATBOX_BUILD_PLATFORM, CHATBOX_BUILD_TARGET } from './variables'

interface ChatboxWebViewPlugin {
  setTextInteractionEnabled(options: { enabled: boolean }): Promise<void>
}

const ChatboxWebView = registerPlugin<ChatboxWebViewPlugin>('ChatboxWebView')

function setIosTextInteractionEnabled(enabled: boolean) {
  if (CHATBOX_BUILD_TARGET !== 'mobile_app' || CHATBOX_BUILD_PLATFORM !== 'ios') {
    return
  }

  void ChatboxWebView.setTextInteractionEnabled({ enabled }).catch((error: unknown) => {
    console.warn('Failed to update iOS text interaction:', error)
  })
}

export default function Sidebar() {
  const { t } = useTranslation()
  const versionHook = useVersion()
  const language = useLanguage()
  const navigate = useNavigate()
  const showSidebar = useUIStore((s) => s.showSidebar)
  const setShowSidebar = useUIStore((s) => s.setShowSidebar)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setOpenSearchDialog = useUIStore((s) => s.setOpenSearchDialog)

  const sessionListViewportRef = useRef<HTMLDivElement>(null)

  const sidebarWidth = useSidebarWidth()

  const isSmallScreen = useIsSmallScreen()

  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  const { needRoomForMacWindowControls } = useNeedRoomForMacWinControls()

  const isRtlLayout = isRTL(language)

  // GSAP: soft staggered entrance for the sidebar regions marked with data-neo-anim
  useEffect(() => {
    const root = document.querySelector(`[data-testid="${TestId.sidebar.root}"]`)
    const cleanup = animateSidebarEntrance(root as HTMLElement | null)
    return () => {
      cleanup?.()
    }
  }, [isSmallScreen])

  const handleCreateNewSession = useCallback(() => {
    navigate({ to: `/` })

    if (isSmallScreen) {
      setShowSidebar(false)
    }
    trackingEvent('create_new_conversation', { event_category: 'user' })
  }, [navigate, setShowSidebar, isSmallScreen])

  const handleCreateNewPictureSession = useCallback(() => {
    navigate({ to: '/image-creator' })
    if (isSmallScreen) {
      setShowSidebar(false)
    }
    trackingEvent('open_image_creator', { event_category: 'user' })
  }, [isSmallScreen, setShowSidebar, navigate])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isSmallScreen) return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      resizeStartX.current = e.clientX
      resizeStartWidth.current = sidebarWidth
    },
    [isSmallScreen, sidebarWidth]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = isRtlLayout ? resizeStartX.current - e.clientX : e.clientX - resizeStartX.current
      const newWidth = Math.max(200, Math.min(500, resizeStartWidth.current + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, isRtlLayout, setSidebarWidth])

  useEffect(() => {
    setIosTextInteractionEnabled(!(isSmallScreen && showSidebar))

    return () => {
      setIosTextInteractionEnabled(true)
    }
  }, [isSmallScreen, showSidebar])

  return (
    <Fragment>
      <SidebarRoot
        variant="inset"
        side={isRtlLayout ? ('right' as const) : ('left' as const)}
        collapsible="offcanvas"
      >
        <SidebarHeader>
          {needRoomForMacWindowControls && <div className="h-6 shrink-0" />}
          <div data-testid={TestId.sidebar.root} className="flex flex-col gap-1 px-1 pt-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" onClick={() => navigate({ to: '/about' })}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--neo-surface-raised)',
                      boxShadow: 'var(--neo-shadow-outset-sm)',
                    }}
                  >
                    <img
                      src={icon}
                      alt="Fibonacci Chat Area"
                      className="size-4"
                      style={{ filter: 'drop-shadow(0 1px 2px hsl(0 0% 0% / 0.35))' }}
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Fibonacci Chat Area</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {/\d/.test(versionHook.version) ? `v${versionHook.version}` : t('AI Chat')}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Flex align="center" justify="flex-end" gap={2} data-neo-anim>
              {FORCE_ENABLE_DEV_PAGES && <ThemeSwitchButton size="xs" />}
              <Tooltip label={t('Search')} openDelay={1000} withArrow>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-chatbox-tint-tertiary hover:text-chatbox-tint-primary"
                  aria-label={t('Search') || undefined}
                  onClick={() => setOpenSearchDialog(true, true)}
                >
                  <IconSearch size={16} />
                </Button>
              </Tooltip>
              <Tooltip label={t('Clear Conversation List')} openDelay={1000} withArrow>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-chatbox-tint-tertiary hover:text-chatbox-tint-primary"
                  aria-label={t('Clear Conversation List') || undefined}
                  onClick={() => NiceModal.show('clear-session-list')}
                >
                  <IconArchive size={16} />
                </Button>
              </Tooltip>
              <Tooltip label={t('Collapse')} openDelay={1000} withArrow>
                <SidebarTrigger
                  data-testid={TestId.sidebar.collapse}
                  aria-label={t('Collapse') || undefined}
                  className="size-7 text-chatbox-tint-tertiary hover:text-chatbox-tint-primary"
                />
              </Tooltip>
            </Flex>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SessionList sessionListViewportRef={sessionListViewportRef} />
        </SidebarContent>

        <SidebarFooter>
          <SidebarUpdateBanner />
          <div className="flex flex-col gap-1.5 px-1" data-neo-anim>
            <Button
              data-testid={TestId.sidebar.newChat}
              onClick={handleCreateNewSession}
              className="w-full justify-start rounded-xl"
            >
              <ScalableIcon icon={IconCirclePlus} className="mr-2" />
              {t('New Chat')}
            </Button>
            <Button
              variant="secondary"
              data-testid={TestId.sidebar.newImage}
              onClick={handleCreateNewPictureSession}
              className="w-full justify-start rounded-xl"
            >
              <ScalableIcon icon={IconPhotoPlus} className="mr-2" />
              {t('Create Image')}
            </Button>
          </div>
          <SidebarMenu className="mt-1 pb-1">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate({ to: '/copilots' })}>
                <ScalableIcon icon={IconMessageChatbot} />
                <span>{t('My Copilots')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                data-testid={TestId.sidebar.settingsTrigger}
                onClick={() => navigateToSettings()}
              >
                <ScalableIcon icon={IconSettingsFilled} />
                <span>{t('Settings')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {!versionHook.isExceeded && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate({ to: '/guide' })}>
                  <ScalableIcon icon={IconHelpCircle} />
                  <span>{t('Help')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {FORCE_ENABLE_DEV_PAGES && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate({ to: '/dev' })}>
                  <ScalableIcon icon={IconCode} />
                  <span>Dev Tools</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <AboutMenuButton versionHook={versionHook} navigate={navigate} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </SidebarRoot>

      {!isSmallScreen && showSidebar && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'sidebar-resizer fixed top-0 bottom-0 z-50 w-1 cursor-col-resize bg-chatbox-border-primary opacity-0 transition-opacity duration-200 hover:opacity-70',
            isRtlLayout ? 'right-0' : 'left-0'
          )}
          style={isRtlLayout ? { right: sidebarWidth } : { left: sidebarWidth }}
        />
      )}
    </Fragment>
  )
}

/**
 * Desktop: shows update banner when an update is downloaded and ready to install.
 * Not shown on mobile (mobile uses dot indicator on About link).
 */
function SidebarUpdateBanner() {
  const isMobile = CHATBOX_BUILD_TARGET === 'mobile_app'
  if (isMobile) return null
  return <SidebarUpdateBannerInner />
}

function SidebarUpdateBannerInner() {
  const { t } = useTranslation()
  const updateStatus = useUpdateStore((s) => s.status)
  const updateVersion = useUpdateStore((s) => s.version)

  if (updateStatus !== 'downloaded') return null

  return (
    <Box px="xs" pb={4}>
      <Flex
        align="center"
        gap="xs"
        px="sm"
        py={6}
        className="cursor-pointer rounded-lg bg-chatbox-background-brand-secondary"
        onClick={installUpdate}
      >
        <ScalableIcon icon={IconDownload} size={16} className="text-chatbox-brand flex-shrink-0" />
        <Text size="sm" c="chatbox-brand" lineClamp={1} flex={1}>
          {`${t('Update ready to install')}${updateVersion ? ` (v${updateVersion})` : ''}`}
        </Text>
      </Flex>
    </Box>
  )
}

/**
 * About link with update dot indicator.
 * Desktop: shows dot when electron-updater detects update (downloaded/available).
 * Mobile: shows dot when remote API says needCheckUpdate.
 */
function useShowUpdateDot(versionHook: ReturnType<typeof useVersion>) {
  const updateStatus = useUpdateStore((s) => s.status)
  const isMobile = CHATBOX_BUILD_TARGET === 'mobile_app'
  return isMobile ? versionHook.needCheckUpdate : updateStatus === 'downloaded'
}

function AboutMenuButton({
  versionHook,
  navigate,
}: {
  versionHook: ReturnType<typeof useVersion>
  navigate: ReturnType<typeof useNavigate>
}) {
  const { t } = useTranslation()
  const showDot = useShowUpdateDot(versionHook)

  return (
    <SidebarMenuButton
      tooltip={`${t('About')} ${/\d/.test(versionHook.version) ? `(${versionHook.version})` : ''}`}
      onClick={() => navigate({ to: '/about' })}
    >
      <ScalableIcon icon={IconInfoCircle} />
      <span className="flex items-center gap-1.5">
        {`${t('About')} ${/\d/.test(versionHook.version) ? `(${versionHook.version})` : ''}`}
      </span>
      {showDot && <span className="ml-auto size-2 rounded-full bg-[var(--chatbox-brand)]" />}
    </SidebarMenuButton>
  )
}
