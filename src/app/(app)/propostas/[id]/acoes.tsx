'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusProposta, FormaAceite } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import {
  submeterParaAprovacao,
  aprovarProposta,
  devolverProposta,
  rejeitarProposta,
  marcarFechada,
  cancelarProposta,
  enviarProposta,
  enviarContratoParaAssinatura,
} from './actions'

interface Props {
  id: string
  status: StatusProposta
  papel: 'admin' | 'operador'
}

type ModalType = 'devolver' | 'rejeitar' | 'fechada' | 'cancelar' | null

export function PropostaAcoes({ id, status, papel }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalType>(null)
  const [texto, setTexto] = useState('')
  const [formaAceite, setFormaAceite] = useState<FormaAceite>('email')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const isAdmin = papel === 'admin'

  function abrir(t: ModalType) {
    setTexto('')
    setErro(null)
    setModal(t)
  }

  async function executar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null)
    setLoading(true)
    const r = await fn()
    setLoading(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao executar ação.')
      return
    }
    setModal(null)
    startTransition(() => router.refresh())
  }

  const podeSubmeter = status === 'rascunho' || status === 'devolvida'
  const podeAprovar = isAdmin && status === 'aguardando_aprovacao'
  const podeEnviar = status === 'aprovada'
  const podeFechar = ['enviada', 'aberta', 'em_negociacao'].includes(status)
  const podeGerarContrato = status === 'fechada'
  const podeCancelar = isAdmin && !['contrato_gerado', 'cancelada'].includes(status)

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {podeSubmeter && (
          <Button onClick={() => executar(() => submeterParaAprovacao(id))} loading={loading}>
            Submeter para aprovação
          </Button>
        )}
        {podeAprovar && (
          <>
            <Button onClick={() => executar(() => aprovarProposta(id))} loading={loading}>
              Aprovar
            </Button>
            <Button variant="secondary" onClick={() => abrir('devolver')}>
              Devolver
            </Button>
            <Button variant="danger" onClick={() => abrir('rejeitar')}>
              Rejeitar
            </Button>
          </>
        )}
        {podeEnviar && (
          <Button onClick={() => executar(() => enviarProposta(id))} loading={loading}>
            Enviar proposta ao cliente
          </Button>
        )}
        {podeGerarContrato && (
          <Button onClick={() => executar(() => enviarContratoParaAssinatura(id))} loading={loading}>
            Gerar contrato e enviar p/ assinatura
          </Button>
        )}
        {podeFechar && (
          <Button variant="secondary" onClick={() => abrir('fechada')}>
            Marcar fechada
          </Button>
        )}
        {podeCancelar && (
          <Button variant="ghost" onClick={() => abrir('cancelar')}>
            Cancelar proposta
          </Button>
        )}
      </div>

      <Modal open={modal === 'devolver'} onClose={() => setModal(null)} title="Devolver proposta">
        <Textarea label="Motivo da devolução" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
        {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          <Button onClick={() => executar(() => devolverProposta(id, texto))} loading={loading}>
            Devolver
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'rejeitar'} onClose={() => setModal(null)} title="Rejeitar proposta">
        <Textarea label="Motivo da rejeição" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
        {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => executar(() => rejeitarProposta(id, texto))} loading={loading}>
            Rejeitar
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'fechada'} onClose={() => setModal(null)} title="Marcar como fechada">
        <Select label="Forma de aceite" value={formaAceite} onChange={(e) => setFormaAceite(e.target.value as FormaAceite)}>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp (com print)</option>
          <option value="verbal">Verbal (com áudio)</option>
          <option value="outro">Outro</option>
        </Select>
        <div style={{ marginTop: 12 }}>
          <Textarea label="Detalhe (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
        </div>
        {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
          <Button onClick={() => executar(() => marcarFechada(id, formaAceite, texto || undefined))} loading={loading}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'cancelar'} onClose={() => setModal(null)} title="Cancelar proposta">
        <Textarea label="Motivo do cancelamento" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
        {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setModal(null)}>Voltar</Button>
          <Button variant="danger" onClick={() => executar(() => cancelarProposta(id, texto))} loading={loading}>
            Cancelar proposta
          </Button>
        </div>
      </Modal>
    </>
  )
}
