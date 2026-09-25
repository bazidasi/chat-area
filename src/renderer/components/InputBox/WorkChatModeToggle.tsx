import { Flex } from '@mantine/core'
import type { AgentModeEntry, SessionSettings } from '@shared/types'
import { IconBriefcase, IconMessageCircle } from '@tabler/icons-react'
import { type FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle'
import platform from '@/platform'
import { projectRegistryStore, useWorkProjects } from '@/stores/projectRegistryStore'
import { useUIStore } from '@/stores/uiStore'
import { setSessionAgentMode, useSessionAgentMode } from '@/stores/session/agent-mode'
import { getAgentModeUIState } from './agentModeState'
import { useModelToolCapabilities } from './useModelToolCapabilities'

/**
 * Chat / Work mode switch for the new-chat page, sitting between the
 * welcome message and the input box. It drives the same per-session
 * agent-mode entry as the composer's mode panel — 'off' is Chat Mode,
 * 'on' is Work Mode — so both stay in sync.
 *
 * - desktop only: Work Mode needs the sandbox, so this renders nothing
 *   on mobile/web, matching the mode panel's behaviour
 * - the Work item is disabled while the selected model cannot run agent
 *   tools; generation re-checks the capability anyway
 */

interface WorkChatModeToggleProps {
  sessionId: string
  model?: { provider: string; modelId: string }
  sessionSettings?: SessionSettings
}

const WorkChatModeToggle: FC<WorkChatModeToggleProps> = ({ sessionId, model, sessionSettings }) => {
  const { t } = useTranslation()
  const entry: AgentModeEntry = useSessionAgentMode(sessionId)
  const workProjects = useWorkProjects()
  const activeWorkProjectId = useUIStore((s) => s.activeWorkProjectId)
  const setAgentModeLastSelected = useUIStore((s) => s.setAgentModeLastSelected)
  const setActiveWorkProjectId = useUIStore((s) => s.setActiveWorkProjectId)
  const setSidebarMode = useUIStore((s) => s.setSidebarMode)
  const setNewSessionState = useUIStore((s) => s.setNewSessionState)
  const { modelSupportsAgentMode } = useModelToolCapabilities(model, sessionSettings ?? ({} as SessionSettings))
  const uiState = useMemo(() => getAgentModeUIState(entry, modelSupportsAgentMode), [entry, modelSupportsAgentMode])

  // Work Mode is desktop-only; mobile and web stay chat-only.
  if (!platform.isDesktopLike) {
    return null
  }

  const handleModeChange = async (value: string) => {
    if (value === 'on' && sessionId === 'new') {
      let projectId = activeWorkProjectId
      if (!projectId && platform.openDirectoryDialog) {
        const result = await platform.openDirectoryDialog()
        if (result.canceled || !result.path) return
        const project = projectRegistryStore.getState().ensureProjectByPath(result.path)
        projectId = project.id
        setActiveWorkProjectId(project.id)
        setNewSessionState((prev) => ({
          ...prev,
          projectId: project.id,
          workingDirectories: [project.rootPath, ...(prev.workingDirectories ?? []).filter((path) => path !== project.rootPath)],
        }))
      }
      if (projectId) {
        setSidebarMode('work')
        const project = workProjects.find((candidate) => candidate.id === projectId)
        setNewSessionState((prev) => ({
          ...prev,
          projectId,
          ...(project
            ? {
                workingDirectories: [
                  project.rootPath,
                  ...(prev.workingDirectories ?? []).filter((path) => path !== project.rootPath),
                ],
              }
            : {}),
        }))
      }
    }
    void setSessionAgentMode(sessionId, value === 'on' ? 'on' : 'off', { source: 'user' })
    setAgentModeLastSelected(value === 'on' ? 'on' : 'off')
  }

  return (
    <Flex justify="center" className="w-full max-w-4xl mx-auto" mb="xs">
      <ToggleGroup
        type="single"
        size="md"
        aria-label={t('Mode') || undefined}
        value={uiState.isActive ? 'on' : 'off'}
        className="chatbox-mode-switch"
        onValueChange={(value) => {
          // single groups can clear the value; the mode always stays set
          if (typeof value !== 'string') return
          void handleModeChange(value)
        }}
      >
        <ToggleGroupItem value="off" aria-label={t('Chat Mode') || undefined}>
          <ScalableIcon icon={IconMessageCircle} size={16} />
          {t('Chat Mode')}
        </ToggleGroupItem>
        <ToggleGroupItem value="on" aria-label={t('Work Mode') || undefined} disabled={!modelSupportsAgentMode}>
          <ScalableIcon icon={IconBriefcase} size={16} />
          {t('Work Mode')}
        </ToggleGroupItem>
      </ToggleGroup>
    </Flex>
  )
}

export default WorkChatModeToggle
