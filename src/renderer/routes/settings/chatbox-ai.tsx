import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ModelProviderEnum } from '@shared/types'
import { useEffect } from 'react'

/**
 * Fibonacci fork: the chatbox-ai login/license page is removed. The route
 * remains only as a redirect so stale deep-links land on the Fibonacci
 * provider settings instead of a dead page.
 */
export const Route = createFileRoute('/settings/chatbox-ai')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/provider/$providerId', params: { providerId: ModelProviderEnum.Fibonacci } })
  },
})

/** In-modal render path (the settings modal mounts RouteComponent directly). */
export function RouteComponent() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({
      to: '/settings/provider/$providerId',
      params: { providerId: ModelProviderEnum.Fibonacci },
      replace: true,
    })
  }, [navigate])
  return null
}
