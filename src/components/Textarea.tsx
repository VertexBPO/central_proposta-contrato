'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
      <textarea
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
          minHeight: 120,
          resize: 'vertical',
          fontFamily: 'inherit',
          ...style,
        }}
      />
      {error && (
        <span style={{ fontSize: 12, color: '#D64545' }}>{error}</span>
      )}
    </label>
  )
})
