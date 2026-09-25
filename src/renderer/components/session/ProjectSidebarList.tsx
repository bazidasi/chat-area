import { ActionIcon, Box, Button, Flex, Text } from '@mantine/core'
import type { SessionMetaRecord, WorkProject } from '@shared/types'
import {
  IconChevronDown,
  IconCirclePlus,
  IconDots,
  IconFolder,
  IconGripVertical,
  IconListDetails,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import { ScalableIcon } from '../common/ScalableIcon'
import { rendererApplication } from '@/app/renderer-application'
import { router } from '@/router'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
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

  const sessionsByProject = useMemo(() => {
    const grouped = new Map<string, SessionMetaRecord[]>()
    for (const session of sessionMetaList ?? []) {
      if (!session.projectId) continue
      grouped.set(session.projectId, [...(grouped.get(session.projectId) ?? []), session])
    }
    return grouped
  }, [sessionMetaList])

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
      <Flex align="center" justify="space-between" px="md" pt="sm" pb="xs">
        <Flex align="center" gap={6}>
          <Text size="sm" fw={600} c="chatbox-secondary">
            {t('Projects')}
          </Text>
          <ScalableIcon icon={IconChevronDown} size={14} className="text-chatbox-tint-tertiary" />
        </Flex>
        <Flex align="center" gap={2}>
          <Tooltip label={t('Reorder projects')} openDelay={700} withArrow>
            <ActionIcon variant="subtle" size="sm" aria-label={t('Reorder projects') || undefined} disabled>
              <IconGripVertical size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('Add project')} openDelay={700} withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label={t('Add project') || undefined}
              onClick={onAddProject}
            >
              <IconFolder size={16} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>

      {projects.map((project) => {
        const projectSessions = sessionsByProject.get(project.id) ?? []
        const expanded = expandedProjects.has(project.id) || projectSessions.length <= 4
        const visibleSessions = expanded ? projectSessions : projectSessions.slice(0, 4)
        const isActiveProject = project.id === activeProjectId

        return (
          <Box key={project.id}>
            <Flex align="center" gap={6} px="sm" py={6}>
              <ScalableIcon icon={IconFolder} size={18} className={isActiveProject ? 'text-chatbox-brand' : 'text-chatbox-tint-tertiary'} />
              <Text flex={1} size="sm" lineClamp={1} c={isActiveProject ? 'chatbox-brand' : 'chatbox-secondary'}>
                {project.name}
              </Text>
              <Tooltip label={t('Project options')} openDelay={700} withArrow>
                <ActionIcon variant="subtle" size="sm" aria-label={t('Project options') || undefined} disabled>
                  <IconDots size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('Project tasks')} openDelay={700} withArrow>
                <ActionIcon variant="subtle" size="sm" aria-label={t('Project tasks') || undefined} disabled>
                  <IconListDetails size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('New session in project')} openDelay={700} withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label={t('New session in project') || undefined}
                  onClick={() => startProjectSession(project)}
                >
                  <IconCirclePlus size={16} />
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
      })}

      <Box px="md" pt="lg" pb="sm">
        <Text size="sm" fw={600} c="chatbox-secondary">
          {t('Tasks')}
        </Text>
        <Text mt={4} size="xs" c="chatbox-tertiary">
          {t('No tasks yet')}
        </Text>
      </Box>
    </Flex>
  )
}
