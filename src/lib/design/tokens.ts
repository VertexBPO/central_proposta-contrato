export const colors = {
  primary: '#0D1B3E',
  primaryHover: '#1A2954',
  background: '#F0F4FB',
  surface: '#FFFFFF',
  textPrimary: '#0D1B3E',
  textSecondary: '#8A9AB5',
  border: '#E5EAF2',
  success: '#1B9E5C',
  error: '#D64545',
  warning: '#E8A93C',
  info: '#2E6FE5',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const

export const typography = {
  display: { fontSize: 32, lineHeight: '40px', fontWeight: 700 },
  h1: { fontSize: 24, lineHeight: '32px', fontWeight: 600 },
  h2: { fontSize: 20, lineHeight: '28px', fontWeight: 600 },
  h3: { fontSize: 16, lineHeight: '24px', fontWeight: 600 },
  body: { fontSize: 14, lineHeight: '20px', fontWeight: 400 },
  small: { fontSize: 12, lineHeight: '16px', fontWeight: 400 },
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const

export const shadows = {
  sm: '0 1px 3px rgba(13, 27, 62, 0.08)',
  md: '0 4px 12px rgba(13, 27, 62, 0.12)',
  lg: '0 12px 32px rgba(13, 27, 62, 0.16)',
} as const
