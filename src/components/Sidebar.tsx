'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface ItemMenu {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
}

const ITENS: ItemMenu[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/propostas/nova', label: 'Nova proposta', icon: '＋' },
  { href: '/clientes', label: 'Contratantes', icon: '◉' },
  { href: '/aprovacoes', label: 'Aprovações', icon: '✓', adminOnly: true },
  { href: '/templates/propostas', label: 'Templates', icon: '◰', adminOnly: true },
  { href: '/contratantes', label: 'Contratada', icon: '◈', adminOnly: true },
  { href: '/usuarios', label: 'Usuários', icon: '◌', adminOnly: true },
  { href: '/parametros', label: 'Parâmetros', icon: '⚙', adminOnly: true },
  { href: '/auditoria', label: 'Auditoria', icon: '◇', adminOnly: true },
]

interface SidebarProps {
  papel: 'admin' | 'operador'
  nome: string
}

export function Sidebar({ papel, nome }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [hover, setHover] = useState<string | null>(null)

  const itensVisiveis = ITENS.filter((item) => !item.adminOnly || papel === 'admin')

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Iniciais do nome pro avatar
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside
      style={{
        width: 240,
        background:
          'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.08) 0%, transparent 50%), ' +
          'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.04) 0%, transparent 50%), ' +
          'linear-gradient(180deg, #0D1B3E 0%, #0A1530 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '24px 0',
        position: 'relative',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Brand */}
      <div style={{ padding: '0 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            marginBottom: 2,
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #4F7CFF 0%, #2E6FE5 100%)',
              boxShadow: '0 2px 8px rgba(46,111,229,0.4)',
              fontSize: 12,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            V
          </span>
          Vertex
        </div>
        <div style={{ fontSize: 11, color: '#8A9AB5', letterSpacing: 0.3, marginLeft: 32 }}>
          Central de Propostas
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {itensVisiveis.map((item) => {
          const ativo = pathname.startsWith(item.href)
          const isHover = hover === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHover(item.href)}
              onMouseLeave={() => setHover(null)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: ativo ? 600 : 500,
                color: ativo ? '#FFFFFF' : isHover ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                background: ativo
                  ? 'linear-gradient(90deg, rgba(46,111,229,0.18) 0%, rgba(46,111,229,0.04) 100%)'
                  : isHover
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {ativo && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    borderRadius: '0 2px 2px 0',
                    background: 'linear-gradient(180deg, #4F7CFF 0%, #2E6FE5 100%)',
                  }}
                />
              )}
              <span
                style={{
                  width: 18,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: ativo ? '#4F7CFF' : 'rgba(255,255,255,0.5)',
                  transition: 'color 0.15s',
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: '16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4F7CFF 0%, #2E6FE5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(46,111,229,0.3)',
            }}
          >
            {iniciais || '?'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nome}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#8A9AB5',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              {papel}
            </div>
          </div>
        </div>
        <button
          onClick={sair}
          style={{
            width: '100%',
            color: '#8A9AB5',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.color = '#8A9AB5'
          }}
        >
          ⏻ Sair
        </button>
      </div>
    </aside>
  )
}
