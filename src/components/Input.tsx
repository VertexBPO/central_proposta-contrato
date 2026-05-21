'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, style, ...rest },
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
      <input
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
          ...style,
        }}
      />
      {error && (
        <span style={{ fontSize: 12, color: '#D64545' }}>{error}</span>
      )}
    </label>
  )
})
