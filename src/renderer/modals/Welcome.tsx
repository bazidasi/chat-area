import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Box, Button, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { AdaptiveModal } from '@/components/common/AdaptiveModal'
import { navigateToSettings } from './settings-navigation'

const Welcome = NiceModal.create(() => {
  const { t } = useTranslation()
  const modal = useModal()

  const onClose = () => {
    modal.resolve()
    modal.hide()
  }

  const onSetupProvider = () => {
    navigateToSettings('/provider/fibonacci')
    modal.resolve('setup')
    modal.hide()
  }

  return (
    <AdaptiveModal
      opened={modal.visible}
      onClose={onClose}
      withCloseButton={false}
      centered={true}
      radius="xl"
      classNames={{
        body: 'p-0 overflow-hidden',
      }}
    >
      <Stack gap="xl" align="center" className="w-full px-8 py-8"
        style={{
          borderRadius: '20px',
          background: 'var(--neo-surface-raised)',
          boxShadow: 'var(--neo-shadow-outset-sm), inset 0 1px 0 color-mix(in srgb, var(--neo-shadow-light) 65%, transparent)',
        }}
      >
        <GradientOrb />

        <Stack gap="xs" align="center" pt="md">
          <Title order={1} fw={800} size="xl" c="chatbox-primary" style={{ letterSpacing: 1 }}>
            {t('WELCOME!')}
          </Title>
          <Text size="md" c="chatbox-secondary" ta="center" fw={500}>
            {t('Welcome to Chatbox! Discover the power of AI with Chatbox.')}
          </Text>
        </Stack>

        <Stack gap="sm" w="100%" align="center" pt="sm">
          <Button
            fullWidth
            h={44}
            fw={600}
            size="md"
            radius="md"
            onClick={onSetupProvider}
            style={{
              background: 'var(--chatbox-tint-primary)',
              color: '#ffffff',
            }}
          >
            {t('Get Started')}
          </Button>
          <Button
            fullWidth
            h={44}
            fw={500}
            size="md"
            variant="outline"
            radius="md"
            c="chatbox-secondary"
            onClick={onClose}
          >
            {t('Skip')}
          </Button>
        </Stack>

        <Text size="xs" c="chatbox-tertiary" ta="center" pt="xs">
          {t('Need an API key?')}{' '}
          <Button
            component="a"
            href="https://my.fibonacci.monster/user/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            variant="transparent"
            c="chatbox-brand"
            fw={600}
            p={0}
            onClick={(e) => {
              e.stopPropagation()
              modal.hide()
            }}
          >
            {t('Get API Token')}
          </Button>
        </Text>
      </Stack>
    </AdaptiveModal>
  )
})

function GradientOrb() {
  return (
    <Box
      w={72}
      h={72}
      style={{
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 34% 28%, #f5d5d5 0%, #8b0000 38%, #6b0000 68%, #3d0000 100%)',
        boxShadow: '0 8px 32px rgba(139,0,0,0.3), inset 0 -4px 12px rgba(0,0,0,0.15)',
      }}
    />
  )
}

export default Welcome
