import { ReactNode } from 'react'

type Variant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral'

const styles: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: '#E5EAF2', fg: '#0D1B3E' },
  success: { bg: '#E6F5EC', fg: '#1B9E5C' },
  error: { bg: '#FCE8E8', fg: '#D64545' },
  warning: { bg: '#FCF1DC', fg: '#A87519' },
  info: { bg: '#E1ECFA', fg: '#1F4FA8' },
  neutral: { bg: '#F0F4FB', fg: '#8A9AB5' },
}

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: Variant }) {
  const s = styles[variant]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        background: s.bg,
        color: s.fg,
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '16px',
      }}
    >
      {children}
    </span>
  )
}
