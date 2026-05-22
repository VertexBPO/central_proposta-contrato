'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { href: '/templates/propostas', label: 'Propostas' },
  { href: '/templates/contratos', label: 'Contratos' },
  { href: '/templates/escopos', label: 'Escopos' },
  { href: '/templates/emails', label: 'E-mails' },
]

export function TemplatesNav() {
  const pathname = usePathname()
  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E5EAF2' }}>
      {ABAS.map((aba) => {
        const ativo = pathname.startsWith(aba.href)
        return (
          <Link
            key={aba.href}
            href={aba.href}
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: ativo ? '#0D1B3E' : '#8A9AB5',
              borderBottom: `2px solid ${ativo ? '#0D1B3E' : 'transparent'}`,
              marginBottom: -1,
              textDecoration: 'none',
            }}
          >
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
