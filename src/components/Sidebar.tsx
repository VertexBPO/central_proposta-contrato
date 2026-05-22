'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ItemMenu {
  href: string
  label: string
  adminOnly?: boolean
}

const ITENS: ItemMenu[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/propostas/nova', label: 'Nova proposta' },
  { href: '/clientes', label: 'Contratantes' },
  { href: '/aprovacoes', label: 'Aprovações', adminOnly: true },
  { href: '/templates/propostas', label: 'Templates', adminOnly: true },
  { href: '/contratantes', label: 'Contratada', adminOnly: true },
  { href: '/usuarios', label: 'Usuários', adminOnly: true },
  { href: '/parametros', label: 'Parâmetros', adminOnly: true },
  { href: '/auditoria', label: 'Auditoria', adminOnly: true },
]

interface SidebarProps {
  papel: 'admin' | 'operador'
  nome: string
}

export function Sidebar({ papel, nome }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const itensVisiveis = ITENS.filter((item) => !item.adminOnly || papel === 'admin')

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      style={{
        width: 240,
        background: '#0D1B3E',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '24px 0',
      }}
    >
      <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Vertex</div>
        <div style={{ fontSize: 12, color: '#8A9AB5' }}>Central de Propostas</div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {itensVisiveis.map((item) => {
          const ativo = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                color: '#FFFFFF',
                background: ativo ? 'rgba(255,255,255,0.1)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{nome}</div>
        <div style={{ fontSize: 11, color: '#8A9AB5', marginBottom: 12, textTransform: 'uppercase' }}>
          {papel}
        </div>
        <button
          onClick={sair}
          style={{
            color: '#8A9AB5',
            fontSize: 13,
            background: 'transparent',
            padding: 0,
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
