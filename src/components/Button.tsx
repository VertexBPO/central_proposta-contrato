'use client'

import { ButtonHTMLAttributes, ReactNode, useState } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  children: ReactNode
}

interface VariantStyle {
  base: React.CSSProperties
  hover: React.CSSProperties
}

const styles: Record<Variant, VariantStyle> = {
  primary: {
    base: {
      background: 'linear-gradient(135deg, #0D1B3E 0%, #1B2D5A 100%)',
      color: '#FFFFFF',
      boxShadow: '0 1px 2px rgba(13,27,62,0.2), 0 2px 4px rgba(13,27,62,0.15)',
    },
    hover: {
      background: 'linear-gradient(135deg, #1B2D5A 0%, #2E6FE5 100%)',
      boxShadow: '0 2px 6px rgba(13,27,62,0.25), 0 4px 12px rgba(46,111,229,0.25)',
      transform: 'translateY(-1px)',
    },
  },
  secondary: {
    base: {
      background: '#FFFFFF',
      color: '#0D1B3E',
      border: '1px solid #E5EAF2',
      boxShadow: '0 1px 2px rgba(13,27,62,0.04)',
    },
    hover: {
      background: '#F8FAFE',
      borderColor: '#0D1B3E',
      boxShadow: '0 2px 6px rgba(13,27,62,0.08)',
      transform: 'translateY(-1px)',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: '#0D1B3E',
    },
    hover: {
      background: 'rgba(13,27,62,0.05)',
    },
  },
  danger: {
    base: {
      background: 'linear-gradient(135deg, #D64545 0%, #C03030 100%)',
      color: '#FFFFFF',
      boxShadow: '0 1px 2px rgba(214,69,69,0.2), 0 2px 4px rgba(214,69,69,0.15)',
    },
    hover: {
      background: 'linear-gradient(135deg, #C03030 0%, #A82020 100%)',
      boxShadow: '0 2px 6px rgba(214,69,69,0.25), 0 4px 12px rgba(214,69,69,0.25)',
      transform: 'translateY(-1px)',
    },
  },
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false)
  const isDisabled = disabled || loading
  const variantStyle = styles[variant]

  return (
    <button
      {...rest}
      disabled={isDisabled}
      onMouseEnter={(e) => {
        if (!isDisabled) setHover(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setHover(false)
        onMouseLeave?.(e)
      }}
      style={{
        padding: '10px 20px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: '20px',
        transition: 'all 0.18s ease',
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 44,
        border: 'none',
        ...variantStyle.base,
        ...(hover && !isDisabled ? variantStyle.hover : {}),
        ...style,
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
