'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Textarea } from '@/components/Textarea'
import { gerarMagicLink, marcarPerdida } from '@/app/(app)/propostas/[id]/actions'
import { StatusProposta } from '@/lib/db/types'

type ModalType = 'magic' | 'perdida' | null

const STATUS_PERMITE_PERDER: StatusProposta[] = [
  'rascunho',
  'aguardando_aprovacao',
  'aprovada',
  'enviada',
  'aberta',
  'em_negociacao',
  'devolvida',
]

interface Props {
  id: string
  status: StatusProposta
}

export function AcoesRapidas({ id, status }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalType>(null)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)

  const podePerder = STATUS_PERMITE_PERDER.includes(status)

  function abrir(t: ModalType) {
    setMotivo('')
    setErro(null)
    setLink(null)
    setModal(t)
  }

  function stop(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function executarLink() {
    setErro(null)
    setLoading(true)
    const r = await gerarMagicLink(id)
    setLoading(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao gerar link.')
      return
    }
    if (r.magic_link) setLink(r.magic_link)
  }

  async function executarPerdida() {
    setErro(null)
    setLoading(true)
    const r = await marcarPerdida(id, motivo)
    setLoading(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao marcar como perdida.')
      return
    }
    setModal(null)
    startTransition(() => router.refresh())
  }

  return (
    <div onClick={stop} style={{ display: 'flex', gap: 6 }}>
      <a
        href={`/api/propostas/${id}/pdf`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '6px 10px',
          background: '#F0F4FB',
          color: '#0D1B3E',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        📄 PDF
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          abrir('magic')
        }}
        style={{
          padding: '6px 10px',
          background: '#F0F4FB',
          color: '#0D1B3E',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        🔗 Link
      </button>
      {podePerder && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            abrir('perdida')
          }}
          style={{
            padding: '6px 10px',
            background: '#FCE8E8',
            color: '#D64545',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ❌ Perdida
        </button>
      )}

      <Modal open={modal === 'magic'} onClose={() => setModal(null)} title="Link de acesso para o contratante">
        {link ? (
          <>
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              Compartilhe este link com o contratante (válido por 24h):
            </p>
            <code
              style={{
                display: 'block',
                padding: 12,
                background: '#F0F4FB',
                borderRadius: 8,
                fontSize: 12,
                wordBreak: 'break-all',
                border: '1px solid #E5EAF2',
              }}
            >
              {link}
            </code>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button onClick={() => setModal(null)}>Fechar</Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Gerar novo link de acesso para o contratante preencher/atualizar os dados da empresa?
            </p>
            {erro && <p style={{ color: '#D64545', fontSize: 13 }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
              <Button onClick={executarLink} loading={loading}>Gerar link</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={modal === 'perdida'} onClose={() => setModal(null)} title="Marcar como perdida">
        <Textarea label="Motivo da perda" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} />
        {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          <Button onClick={executarPerdida} loading={loading}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  )
}
