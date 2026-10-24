import type { ComponentProps } from 'react'
import { SegmentedControl as MantineSegmentedControl } from '@mantine/core'

type SegmentedControlProps = Omit<ComponentProps<typeof MantineSegmentedControl>, 'value' | 'onChange' | 'data'> & {
  value: string
  onChange: (value: string) => void
  data: { label: string; value: string }[]
}

export default function SegmentedControl({ value, onChange, data, ...props }: SegmentedControlProps) {
  return (
    <MantineSegmentedControl
      value={value}
      onChange={onChange}
      data={data}
      fullWidth
      transitionDuration={200}
      transitionTimingFunction="ease"
      color="chatbox-brand"
      {...props}
      styles={{
        root: {
          padding: 0,
        },
        indicator: {
          borderRadius: 0,
        },
        label: {
          // Keep tall scripts (Vazirmatn/Cairo descenders) clear of the control
          // edges at small sizes and low-DPI displays.
          paddingInline: '0.75rem',
          paddingTop: '0.375rem',
          paddingBottom: '0.375rem',
          lineHeight: 1.45,
        },
      }}
    />
  )
}
