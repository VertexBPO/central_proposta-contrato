'use client'

import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, style, children, ...rest },
  ref
) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#0D1B3E',
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
      <select
        ref={ref}
        {...rest}
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          border: `1px solid ${error ? '#D64545' : '#E5EAF2'}`,
          background: '#FFFFFF',
          color: '#0D1B3E',
          fontSize: 14,
          lineHeight: '20px',
          minHeight: 44,
          width: '100%',
          appearance: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3e%3cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A9AB5' stroke-width='2' stroke-linecap='round'/%3e%3c/svg%3e\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: 40,
          ...style,
        }}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: 12, color: '#D64545' }}>{error}</span>
      )}
    </label>
  )
})
