'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Client } from '@/lib/db/types'
import { apagarCliente } from './actions'
import { EditarClienteModal } from './[id]/editar-cliente'

interface Props {
  cliente: Client
  isAdmin: boolean
}

export function ClienteRowActions({ cliente, isAdmin }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [apagando, setApagando] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  function abrirEdicao(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditOpen(true)
  }

  async function apagar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Apagar contratante "${cliente.razao_social}"?\n\nSoft delete: vai sumir das listas mas histórico de propostas mantém o vínculo.`)) return
    setApagando(true)
    const r = await apagarCliente(cliente.id)
    setApagando(false)
    if (!r.ok) {
      window.alert(r.erro ?? 'Erro.')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <>
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

      <EditarClienteModal
        cliente={cliente}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        isAdmin={isAdmin}
      />
    </>
  )
}
