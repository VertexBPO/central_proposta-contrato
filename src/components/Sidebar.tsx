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

interface GrupoMenu {
  label: string
  icon: string
  adminOnly?: boolean
  items: ItemMenu[]
}

type Entrada = ItemMenu | GrupoMenu

function isGrupo(e: Entrada): e is GrupoMenu {
  return 'items' in e
}

const ENTRADAS: Entrada[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/aprovacoes', label: 'Aprovações', icon: '✓', adminOnly: true },
  { href: '/propostas/nova', label: 'Nova proposta', icon: '＋' },
  {
    label: 'Cadastros',
    icon: '◰',
    adminOnly: true,
    items: [
      { href: '/templates/propostas', label: 'Templates', icon: '◰' },
      { href: '/contratantes', label: 'Contratada', icon: '◈' },
      { href: '/clientes', label: 'Contratantes', icon: '◉' },
      { href: '/usuarios', label: 'Usuários', icon: '◌' },
    ],
  },
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

  // Cadastros começa aberto se está numa rota dele
  const algumaRotaCadastros = ['/templates', '/contratantes', '/clientes', '/usuarios'].some((r) =>
    pathname.startsWith(r),
  )
  const [cadastrosAberto, setCadastrosAberto] = useState(algumaRotaCadastros)

  const entradasVisiveis = ENTRADAS.filter((e) => !e.adminOnly || papel === 'admin').map((e) => {
    if (isGrupo(e)) {
      return { ...e, items: e.items.filter(() => papel === 'admin') }
    }
    return e
  })

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function renderItem(item: ItemMenu, inside = false) {
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
          padding: inside ? '8px 14px 8px 36px' : '10px 14px',
          borderRadius: 8,
          fontSize: inside ? 13 : 13.5,
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
        {!inside && (
          <span
            style={{
              width: 18,
              display: 'inline-flex',
              justifyContent: 'center',
              fontSize: 14,
              color: ativo ? '#4F7CFF' : 'rgba(255,255,255,0.5)',
            }}
          >
            {item.icon}
          </span>
        )}
        {item.label}
      </Link>
    )
  }

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
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
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

      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {entradasVisiveis.map((e, idx) => {
          if (!isGrupo(e)) return renderItem(e as ItemMenu)

          // Grupo expansível
          const grupo = e as GrupoMenu
          const grupoHover = hover === `grupo-${grupo.label}`
          return (
            <div key={`grupo-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                type="button"
                onClick={() => setCadastrosAberto((a) => !a)}
                onMouseEnter={() => setHover(`grupo-${grupo.label}`)}
                onMouseLeave={() => setHover(null)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: grupoHover ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                  background: grupoHover ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span
                  style={{
                    width: 18,
                    display: 'inline-flex',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {grupo.icon}
                </span>
                <span style={{ flex: 1 }}>{grupo.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {cadastrosAberto ? '▾' : '▸'}
                </span>
              </button>
              {cadastrosAberto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {grupo.items.map((it) => renderItem(it, true))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

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
