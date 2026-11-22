import type { SVGProps } from 'react'

export function FibonacciLogo({
  size = 32,
  accent = false,
  className = '',
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; accent?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M 63.28 56.34 L 62.66 55.65 L 61.45 55.29 L 57.64 56.45 L 56.36 57.33 L 55.91 59.70 L 56.45 63.12 L 57.27 64.57 L 59.54 66.75 L 62.67 68.29 L 67.54 68.68 L 69.75 68.37 L 72.04 67.58 L 76.00 65.09 L 77.74 63.28 L 79.54 60.53 L 80.46 58.48 L 81.24 55.20 L 81.40 49.33 L 80.79 45.90 L 79.77 42.78 L 78.66 40.27 L 76.97 37.68 L 74.31 34.63 L 71.96 32.62 L 67.92 30.04 L 65.18 28.89 L 60.76 27.71 L 54.97 27.09 L 50.70 27.33 L 42.93 29.01 L 36.91 31.41 L 32.50 33.84 L 26.94 38.14 L 21.93 43.77 L 18.77 48.88 L 15.84 56.34 L 14.36 62.67"
        stroke={accent ? '#d6199b' : 'currentColor'}
        strokeWidth="5.62"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
