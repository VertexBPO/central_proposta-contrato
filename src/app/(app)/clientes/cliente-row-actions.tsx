'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { apagarCliente } from './actions'

interface Props {
  id: string
  nome: string
  isAdmin: boolean
}

export function ClienteRowActions({ id, nome, isAdmin }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [apagando, setApagando] = useState(false)

  function abrirEdicao(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/clientes/${id}`)
  }

  async function apagar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Apagar contratante "${nome}"?\n\nSoft delete: vai sumir das listas mas histórico de propostas mantém o vínculo.`)) return
    setApagando(true)
    const r = await apagarCliente(id)
    setApagando(false)
    if (!r.ok) {
      window.alert(r.erro ?? 'Erro.')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={abrirEdicao}
        style={{
          padding: '6px 10px',
          background: '#F0F4FB',
          color: '#0D1B3E',
          border: 'none',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ✎ Editar
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={apagar}
          disabled={apagando}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            color: '#D64545',
            border: '1px solid #D64545',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: apagando ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: apagando ? 0.6 : 1,
          }}
        >
          🗑️ {apagando ? 'Apagando…' : 'Apagar'}
        </button>
      )}
    </div>
  )
}
