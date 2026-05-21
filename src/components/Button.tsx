'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  children: ReactNode
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: '#0D1B3E',
    color: '#FFFFFF',
  },
  secondary: {
    background: '#FFFFFF',
    color: '#0D1B3E',
    border: '1px solid #0D1B3E',
  },
  ghost: {
    background: 'transparent',
    color: '#0D1B3E',
  },
  danger: {
    background: '#D64545',
    color: '#FFFFFF',
  },
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={{
        padding: '10px 20px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: '20px',
        transition: 'opacity 0.15s, background 0.15s',
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 44,
        ...styles[variant],
        ...style,
      }}
    >
      {loading ? '...' : children}
    </button>
  )
}
