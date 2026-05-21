import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  padding?: number | string
  style?: CSSProperties
}

export function Card({ children, padding = 24, style }: CardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 16,
        padding,
        boxShadow: '0 1px 3px rgba(13, 27, 62, 0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
