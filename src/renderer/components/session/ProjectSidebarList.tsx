import { ActionIcon, Box, Button, Flex, Popover, Text } from '@mantine/core'
import type { SessionMetaRecord, WorkProject } from '@shared/types'
import { CirclePlus, Folder, FolderPlus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { rendererApplication } from '@/app/renderer-application'
import { EmptyState } from '@/components/ui/empty-state'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import { Command as VibeFarsiCommand } from '@/components/ui/vf-command'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { cn } from '@/lib/utils'
import { router } from '@/router'
import { useUIStore } from '@/stores/uiStore'
import SessionItem from './SessionItem'

interface ProjectSidebarListProps {
  projects: WorkProject[]
  activeProjectId: string | null
  onAddProject: () => void
  onSelectProject: (projectId: string) => void
}

export default function ProjectSidebarList({
  projects,
  activeProjectId,
  onAddProject,
  onSelectProject,
}: ProjectSidebarListProps) {
  const { t } = useTranslation()
  const { sessionMetaList } = rendererApplication.sessionHooks.useSessionList('all')
  const setNewSessionState = useUIStore((s) => s.setNewSessionState)
  const setShowSidebar = useUIStore((s) => s.setShowSidebar)
  const isSmallScreen = useIsSmallScreen()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set())
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)

  const sessionsByProject = useMemo(() => {
    const grouped = new Map<string, SessionMetaRecord[]>()
    for (const session of sessionMetaList ?? []) {
      if (!session.projectId) continue
      grouped.set(session.projectId, [...(grouped.get(session.projectId) ?? []), session])
    }
    return grouped
  }, [sessionMetaList])

  const projectItems = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id,
        label: project.name,
        icon: Folder,
        group: t('Projects'),
      })),
    [projects, t]
  )

  const startProjectSession = (project: WorkProject) => {
    setNewSessionState((prev) => ({
      ...prev,
      projectId: project.id,
      workingDirectories: [
        project.rootPath,
        ...(prev.workingDirectories ?? []).filter((path) => path !== project.rootPath),
      ],
    }))
    onSelectProject(project.id)
    router.navigate({ to: '/' })
    if (isSmallScreen) setShowSidebar(false)
  }

  return (
    <Flex direction="column" className="min-h-0 flex-1 overflow-y-auto">
      <div className="sidebar-list-heading sidebar-projects-heading">
        <div>
          <Text className="sidebar-section-label">{t('Projects')}</Text>
          <Text className="sidebar-list-hint">
            {projects.length > 0
              ? t('{{count}} workspace folders', { count: projects.length })
              : t('Organize work by folder')}
          </Text>
        </div>
        <div className="flex items-center gap-1">
          {projects.length > 0 && (
            <Popover
              opened={projectPickerOpen}
              onChange={setProjectPickerOpen}
              position="bottom-start"
              shadow="md"
              width={280}
              withinPortal
            >
              <Popover.Target>
                <Tooltip label={t('Search projects')} openDelay={700} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={t('Search projects') || undefined}
                    onClick={() => setProjectPickerOpen((opened) => !opened)}
                  >
                    <Search size={16} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown p="xs">
                <VibeFarsiCommand
                  items={projectItems}
                  placeholder={t('Search projects') || ''}
                  emptyText={t('No projects found') || ''}
                  onSelect={(item) => {
                    setProjectPickerOpen(false)
                    onSelectProject(item.id)
                  }}
                />
              </Popover.Dropdown>
            </Popover>
          )}
          <Tooltip label={t('Add project')} openDelay={700} withArrow>
            <ActionIcon variant="subtle" size="sm" aria-label={t('Add project') || undefined} onClick={onAddProject}>
              <FolderPlus size={17} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          className="sidebar-empty-state border-0 p-6"
          icon={FolderPlus}
          title={t('No projects yet')}
          description={t('Add a folder to keep work history together.')}
          action={
            <Button
              variant="light"
              color="chatbox-brand"
              fullWidth
              leftSection={<FolderPlus size={16} />}
              onClick={onAddProject}
            >
              {t('Add project')}
            </Button>
          }
        />
      ) : (
        projects.map((project) => {
          const projectSessions = sessionsByProject.get(project.id) ?? []
          const expanded = expandedProjects.has(project.id) || projectSessions.length <= 4
          const visibleSessions = expanded ? projectSessions : projectSessions.slice(0, 4)
          const isActiveProject = project.id === activeProjectId

          return (
            <Box key={project.id} className={cn('sidebar-project', isActiveProject && 'sidebar-project-active')}>
              <Flex
                align="center"
                gap={8}
                px="sm"
                py={7}
                role="button"
                tabIndex={0}
                aria-current={isActiveProject ? 'true' : undefined}
                className="sidebar-project-row"
                onClick={() => onSelectProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectProject(project.id)
                  }
                }}
              >
                <Folder size={16} className={isActiveProject ? 'text-chatbox-brand' : 'text-chatbox-tint-tertiary'} />
                <div className="min-w-0 flex-1">
                  <Text
                    size="sm"
                    fw={isActiveProject ? 600 : 500}
                    lineClamp={1}
                    c={isActiveProject ? 'chatbox-brand' : 'chatbox-secondary'}
                  >
                    {project.name}
                  </Text>
                  <Text size="10px" c="chatbox-tertiary" className="truncate">
                    {projectSessions.length > 0
                      ? t('{{count}} tasks', { count: projectSessions.length })
                      : t('No tasks yet')}
                  </Text>
                </div>
                <Tooltip label={t('New session in project')} openDelay={700} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={t('New session in project') || undefined}
                    onClick={(event) => {
                      event.stopPropagation()
                      startProjectSession(project)
                    }}
                  >
                    <CirclePlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Flex>

              {projectSessions.length === 0 ? (
                <Text px="md" pb="sm" size="xs" c="chatbox-tertiary">
                  {t('No tasks yet')}
                </Text>
              ) : (
                <>
                  {visibleSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      selected={router.state.location.pathname === `/session/${session.id}`}
                    />
                  ))}
                  {projectSessions.length > 4 && (
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      className="mx-md"
                      onClick={() =>
                        setExpandedProjects((prev) => {
                          const next = new Set(prev)
                          if (next.has(project.id)) next.delete(project.id)
                          else next.add(project.id)
                          return next
                        })
                      }
                    >
                      {expanded ? t('Show less') : t('Show more')}
                    </Button>
                  )}
                </>
              )}
            </Box>
          )
        })
      )}
    </Flex>
  )
}
