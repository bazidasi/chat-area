import { Button, Flex, Image, Indicator, ScrollArea, Stack, Text } from '@mantine/core'
import { AutomationAdjacentAttr, TestId } from '@shared/automation/testids'
import { ModelProviderEnum, type ProviderBaseInfo } from '@shared/types'
import { IconChevronRight, IconPlus } from '@tabler/icons-react'
import { Link, useRouterState } from '@tanstack/react-router'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import CustomProviderIcon from '@/components/CustomProviderIcon'
import Divider from '@/components/common/Divider'
import { opticalIconStroke, ScalableIcon } from '@/components/common/ScalableIcon'
import { useProviders } from '@/hooks/useProviders'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { FEATURED_PROVIDER_IDS, ProviderIconImage } from './providerIcons'

interface ProviderListProps {
  providers: ProviderBaseInfo[]
  onAddProvider: () => void
}

export function ProviderList({ providers, onAddProvider }: ProviderListProps) {
  const { t } = useTranslation()
  const isSmallScreen = useIsSmallScreen()
  const routerState = useRouterState()

  const providerId = useMemo(() => {
    const pathSegments = routerState.location.pathname.split('/').filter(Boolean)
    const providerIndex = pathSegments.indexOf('provider')
    return providerIndex !== -1 ? pathSegments[providerIndex + 1] : undefined
  }, [routerState.location.pathname])

  const { providers: availableProviders } = useProviders()

  const activatedProviderIds = useMemo(() => new Set(availableProviders.map((p) => p.id)), [availableProviders])

  // Sort providers: Fibonacci AI first, then activated/custom providers, then featured presets
  const sortedProviders = useMemo(() => {
    const fibonacci = providers.filter((p) => p.id === 'fibonacci')
    const activated: ProviderBaseInfo[] = []
    const featured: ProviderBaseInfo[] = []

    for (const p of providers) {
      if (p.id === 'fibonacci' || p.id === ModelProviderEnum.ChatboxAI) continue

      if (activatedProviderIds.has(p.id) || p.isCustom) {
        activated.push(p)
      } else if (FEATURED_PROVIDER_IDS.includes(p.id)) {
        featured.push(p)
      }
    }

    return [...fibonacci, ...activated, ...featured]
  }, [providers, activatedProviderIds])

  return (
    <Stack
      data-testid={TestId.settings.providerList}
      maw={isSmallScreen ? undefined : 232}
      className={clsx(
        'provider-list-surface border-solid border-0',
        isSmallScreen
          ? 'w-full border-e-0'
          : 'provider-list-surface--desktop flex-[1_0_auto] border-e border-chatbox-border-secondary'
      )}
      gap={0}
    >
      {!isSmallScreen && (
        <Text size="xxs" fw={700} c="chatbox-tertiary" className="px-3 pb-1 pt-3 uppercase ltr:tracking-[0.12em]">
          {t('Providers')}
        </Text>
      )}
      <ScrollArea flex={1} type={isSmallScreen ? 'never' : 'hover'} scrollHideDelay={100}>
        <Stack p={isSmallScreen ? 0 : 'xxs'} gap={isSmallScreen ? 0 : 'xs'}>
          {sortedProviders.map((provider) => {
            const selected = provider.id === providerId
            return (
              <Link
                key={provider.id}
                to={provider.id === 'chatbox-ai' ? `/settings/provider/chatbox-ai` : `/settings/provider/$providerId`}
                params={{ providerId: provider.id }}
                className={clsx(
                  'block no-underline',
                  !isSmallScreen && 'provider-list-item-link'
                )}
                data-selected={selected ? 'true' : 'false'}
                data-testid={TestId.settings.providerItem}
                {...{ [AutomationAdjacentAttr.providerId]: provider.id }}
              >
                <Flex
                  component="span"
                  align="center"
                  gap="xs"
                  p={isSmallScreen ? 'md' : 'sm'}
                  pr={isSmallScreen ? 'xl' : 'sm'}
                  py={isSmallScreen ? 'sm' : 4}
                  c={selected && isSmallScreen ? 'chatbox-brand' : 'chatbox-secondary'}
                  className={clsx(
                    'provider-list-item cursor-pointer select-none rounded-lg',
                    !isSmallScreen && selected && 'provider-list-item--selected',
                    !isSmallScreen && !selected && 'provider-list-item--interactive'
                  )}
                >
                  {provider.isCustom ? (
                    provider.iconUrl ? (
                      <Image w={isSmallScreen ? 32 : 26} h={isSmallScreen ? 32 : 26} src={provider.iconUrl} alt={provider.name} />
                    ) : (
                      <CustomProviderIcon
                        providerId={provider.id}
                        providerName={provider.name}
                        size={isSmallScreen ? 32 : 26}
                      />
                    )
                  ) : (
                    <ProviderIconImage providerId={provider.id} size={isSmallScreen ? 32 : 26} />
                  )}

                  <Text
                    span
                    size="sm"
                    flex={isSmallScreen ? 1 : undefined}
                    className="!text-inherit whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {t(provider.name)}
                  </Text>

                  {activatedProviderIds.has(provider.id) && (
                    <Indicator size={8} color="chatbox-success" className="ms-auto" />
                  )}

                  {isSmallScreen && (
                    <ScalableIcon
                      icon={IconChevronRight}
                      size={20}
                      stroke={opticalIconStroke(20)}
                      className="!text-chatbox-tint-tertiary ms-2"
                    />
                  )}
                </Flex>

                {isSmallScreen && <Divider />}
              </Link>
            )
          })}
        </Stack>
      </ScrollArea>
      <Stack gap="xs" mx="md" my="sm">
        <Button
          data-testid={TestId.settings.addProvider}
          variant="outline"
          leftSection={<ScalableIcon icon={IconPlus} />}
          onClick={onAddProvider}
        >
          {t('Add')}
        </Button>
      </Stack>
    </Stack>
  )
}
