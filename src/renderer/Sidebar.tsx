import { registerPlugin } from '@capacitor/core'
import { ActionIcon, Button as MantineButton, Flex, Text } from '@mantine/core'
import { rendererApplication } from '@/app/renderer-application'
import { TestId } from '@shared/automation/testids'
import {
  IconArchive,
  IconArrowLeft,
  IconArrowRight,
  IconCirclePlus,
  IconPhotoPlus,
  IconPlus,
  IconSearch,
  IconSettingsFilled,
  IconWand,
  IconX,
} from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import { isRTL } from '@/i18n/locales'
import { animateSidebarEntrance } from '@/lib/animations/neo-animations'
import { cn } from '@/lib/utils'
import { UserAvatar } from './components/common/Avatar'
import ThemeSwitchButton from './components/dev/ThemeSwitchButton'
import ProjectSidebarList from './components/session/ProjectSidebarList'
import SessionList from './components/session/SessionList'
import useNeedRoomForMacWinControls from './hooks/useNeedRoomForWinControls'
import { useIsSmallScreen, useSidebarWidth } from './hooks/useScreenChange'
import platform from './platform'
import { navigateToSettings } from './modals/settings-navigation'
import { trackingEvent } from './packages/event'
import icon from './static/icon.png'
import { projectRegistryStore, useWorkProjects } from './stores/projectRegistryStore'
import { useLanguage } from './stores/settingsStore'
import { useUIStore } from './stores/uiStore'
import { router } from './router'
import { CHATBOX_BUILD_PLATFORM, CHATBOX_BUILD_TARGET } from './variables'

interface ChatboxWebViewPlugin {
  setTextInteractionEnabled(options: { enabled: boolean }): Promise<void>
}

const ChatboxWebView = registerPlugin<ChatboxWebViewPlugin>('ChatboxWebView')

function setIosTextInteractionEnabled(enabled: boolean) {
  if (CHATBOX_BUILD_TARGET !== 'mobile_app' || CHATBOX_BUILD_PLATFORM !== 'ios') {
    return
  }

  void ChatboxWebView.setTextInteractionEnabled({ enabled }).catch(() => {})
}

interface SidebarTopActionProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  onClick: () => void
  testId?: string
}

function SidebarTopAction({ icon, label, shortcut, onClick, testId }: SidebarTopActionProps) {
  return (
    <MantineButton
      variant="subtle"
      fullWidth
      leftSection={icon}
      rightSection={shortcut ? <Text size="xs" c="chatbox-tertiary">{shortcut}</Text> : undefined}
      className="justify-between"
      onClick={onClick}
      data-testid={testId}
    >
      <span className="truncate">{label}</span>
    </MantineButton>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const showSidebar = useUIStore((s) => s.showSidebar)
  const setShowSidebar = useUIStore((s) => s.setShowSidebar)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setOpenSearchDialog = useUIStore((s) => s.setOpenSearchDialog)
  const agentModeLastSelected = useUIStore((s) => s.agentModeLastSelected)
  const activeWorkProjectId = useUIStore((s) => s.activeWorkProjectId)
  const setActiveWorkProjectId = useUIStore((s) => s.setActiveWorkProjectId)
  const setNewSessionState = useUIStore((s) => s.setNewSessionState)
  const workProjects = useWorkProjects()

  const sessionListViewportRef = useRef<HTMLDivElement>(null)
  const sidebarWidth = useSidebarWidth()
  const isSmallScreen = useIsSmallScreen()
  const isWorkMode = agentModeLastSelected === 'on'
  const activeProjectId =
    activeWorkProjectId ?? workProjects.slice().sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0]?.id ?? null

  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
  const { needRoomForMacWindowControls } = useNeedRoomForMacWinControls()
  const isRtlLayout = isRTL(language)

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

  const handleOpenSearch = useCallback(() => {
    setOpenSearchDialog(true, true)
  }, [setOpenSearchDialog])

  const handleCreateNewPictureSession = useCallback(() => {
    navigate({ to: '/image-creator' })
    if (isSmallScreen) {
      setShowSidebar(false)
    }
    trackingEvent('open_image_creator', { event_category: 'user' })
  }, [isSmallScreen, navigate, setShowSidebar])

  const handleOpenArchive = useCallback(() => {
    navigateToSettings('/archive')
  }, [])

  const handleOpenSkillsSettings = useCallback(() => {
    navigateToSettings('/skills')
  }, [])

  const handleAddProject = useCallback(async () => {
    if (!platform.openDirectoryDialog) return
    const result = await platform.openDirectoryDialog()
    if (result.canceled || !result.path) return
    const project = projectRegistryStore.getState().ensureProjectByPath(result.path)
    setActiveWorkProjectId(project.id)
    setNewSessionState((prev) => ({
      ...prev,
      projectId: project.id,
      workingDirectories: [
        project.rootPath,
        ...(prev.workingDirectories ?? []).filter((path) => path !== project.rootPath),
      ],
    }))
  }, [setActiveWorkProjectId, setNewSessionState])

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setActiveWorkProjectId(projectId)
      const project = workProjects.find((candidate) => candidate.id === projectId)
      if (project) {
        setNewSessionState((prev) => ({
          ...prev,
          projectId: project.id,
          workingDirectories: [
            project.rootPath,
            ...(prev.workingDirectories ?? []).filter((path) => path !== project.rootPath),
          ],
        }))
      }
    },
    [setActiveWorkProjectId, setNewSessionState, workProjects]
  )

  useEffect(() => {
    if (!isWorkMode || workProjects.length > 0) return
    let cancelled = false
    void (async () => {
      const metas = await rendererApplication.sessions.listAllSessionsMeta()
      const discovered: string[] = []
      for (const meta of metas) {
        const session = await rendererApplication.sessions.getSession(meta.id)
        const rootPath = session?.settings?.workingDirectories?.[0]
        if (!rootPath) continue
        const project = projectRegistryStore.getState().ensureProjectByPath(rootPath)
        discovered.push(project.id)
        if (!session.projectId) {
          await rendererApplication.sessions.updateSession(meta.id, { projectId: project.id })
        }
      }
      if (!cancelled && discovered[0]) {
        setActiveWorkProjectId(discovered[0])
      }
    })().catch((error) => console.warn('Failed to discover legacy work projects', error))
    return () => {
      cancelled = true
    }
  }, [isWorkMode, setActiveWorkProjectId, workProjects.length])

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
          <div data-testid={TestId.sidebar.root} className="flex flex-col gap-2 px-1 pt-1">
            <div className="flex items-center gap-2">
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-lg"
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
              <ActionIcon variant="subtle" size="sm" aria-label={t('Back') || undefined} onClick={() => router.history.back()}>
                <IconArrowLeft size={16} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="sm" aria-label={t('Forward') || undefined} onClick={() => router.history.forward()}>
                <IconArrowRight size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={t('Close sidebar') || undefined}
                onClick={() => setShowSidebar(false)}
              >
                <IconX size={16} />
              </ActionIcon>
            </div>

            <div className="flex flex-col gap-1" dir="ltr">
              <SidebarTopAction
                icon={<IconPlus size={16} />}
                label={t('New task')}
                shortcut="Ctrl+N"
                onClick={handleCreateNewSession}
                testId={TestId.sidebar.newChat}
              />
              <SidebarTopAction
                icon={<IconSearch size={16} />}
                label={t('Search')}
                shortcut="Ctrl+K"
                onClick={handleOpenSearch}
              />
              <SidebarTopAction
                icon={<IconPhotoPlus size={16} />}
                label={t('Create Image')}
                onClick={handleCreateNewPictureSession}
                testId={TestId.sidebar.newImage}
              />
              <SidebarTopAction
                icon={<IconArchive size={16} />}
                label={t('Archive')}
                onClick={handleOpenArchive}
              />
              <SidebarTopAction
                icon={<IconWand size={16} />}
                label={t('Skill settings')}
                onClick={handleOpenSkillsSettings}
              />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {isWorkMode ? (
            <ProjectSidebarList
              projects={workProjects}
              activeProjectId={activeProjectId}
              onAddProject={handleAddProject}
              onSelectProject={handleSelectProject}
            />
          ) : (
            <SessionList sessionListViewportRef={sessionListViewportRef} scope="all" />
          )}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 pb-3">
            <UserAvatar size={32} />
            <Text flex={1} size="sm" lineClamp={1} c="chatbox-secondary">
              {t('You')}
            </Text>
            <ThemeSwitchButton size="sm" />
            <ActionIcon
              variant="subtle"
              size="sm"
              data-testid={TestId.sidebar.settingsTrigger}
              aria-label={t('Settings') || undefined}
              onClick={() => navigateToSettings()}
            >
              <IconSettingsFilled size={16} />
            </ActionIcon>
          </div>
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
          style={isRtlLayout ? { right: sidebarWidth - 8 } : { left: sidebarWidth - 8 }}
        />
      )}
    </Fragment>
  )
}
