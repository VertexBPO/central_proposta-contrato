'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusProposta } from '@/lib/db/types'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Textarea } from '@/components/Textarea'
import { ClicksignEmbed } from '@/components/ClicksignEmbed'
import {
  submeterParaAprovacao,
  aprovarProposta,
  devolverProposta,
  rejeitarProposta,
  cancelarProposta,
  enviarPropostaParaAssinatura,
  confirmarAssinaturaVertexProposta,
  enviarContratoParaAssinatura,
  confirmarAssinaturaVertexContrato,
} from './actions'

interface Props {
  id: string
  status: StatusProposta
  papel: 'admin' | 'operador'
  host: string
  propostaVertexKey: string | null
  propostaVertexAssinou: boolean
  contratoVertexKey: string | null
  contratoVertexAssinou: boolean
}

type ModalType = 'devolver' | 'rejeitar' | 'cancelar' | null
// Assinatura embedded: qual documento a Vertex está assinando.
type SignAlvo = 'proposta' | 'contrato' | null

export function PropostaAcoes({
  id,
  status,
  papel,
  host,
  propostaVertexKey,
  propostaVertexAssinou,
  contratoVertexKey,
  contratoVertexAssinou,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalType>(null)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Estado do modal de assinatura embedded
  const [signAlvo, setSignAlvo] = useState<SignAlvo>(null)
  const [signKey, setSignKey] = useState<string>('')

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

  // Gera a proposta + cria documento ClickSign e já abre o modal pra Vertex assinar.
  async function gerarEAssinarProposta() {
    setErro(null)
    setLoading(true)
    const r = await enviarPropostaParaAssinatura(id)
    setLoading(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Falha ao enviar para assinatura.')
      return
    }
    if (r.assinatura_key) {
      setSignKey(r.assinatura_key)
      setSignAlvo('proposta')
    } else {
      startTransition(() => router.refresh())
    }
  }

  async function gerarContratoManual() {
    setErro(null)
    setLoading(true)
    const r = await enviarContratoParaAssinatura(id)
    setLoading(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Falha ao gerar contrato.')
      return
    }
    if (r.assinatura_key) {
      setSignKey(r.assinatura_key)
      setSignAlvo('contrato')
    } else {
      startTransition(() => router.refresh())
    }
  }

  function abrirAssinaturaProposta() {
    if (!propostaVertexKey) return
    setSignKey(propostaVertexKey)
    setSignAlvo('proposta')
  }

  function abrirAssinaturaContrato() {
    if (!contratoVertexKey) return
    setSignKey(contratoVertexKey)
    setSignAlvo('contrato')
  }

  // Quando a Vertex termina de assinar no widget embedded.
  async function aoAssinarVertex() {
    const alvo = signAlvo
    setSignAlvo(null)
    setSignKey('')
    if (alvo === 'proposta') await confirmarAssinaturaVertexProposta(id)
    else if (alvo === 'contrato') await confirmarAssinaturaVertexContrato(id)
    startTransition(() => router.refresh())
  }

  const podeSubmeter = status === 'rascunho' || status === 'devolvida'
  const podeAprovar = isAdmin && status === 'aguardando_aprovacao'
  const podeEnviarAssinatura = status === 'aprovada'
  const podeAssinarProposta = status === 'proposta_assinatura_pendente' && !propostaVertexAssinou && !!propostaVertexKey
  const aguardandoCliente = status === 'proposta_assinatura_pendente' && propostaVertexAssinou
  const podeGerarContrato = isAdmin && ['aguardando_cadastro', 'proposta_assinada'].includes(status)
  const podeAssinarContrato = status === 'contrato_assinatura_pendente' && !contratoVertexAssinou && !!contratoVertexKey
  const aguardandoClienteContrato = status === 'contrato_assinatura_pendente' && contratoVertexAssinou
  const podeCancelar = isAdmin && !['contrato_assinado', 'cancelada'].includes(status)

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
        {podeEnviarAssinatura && (
          <Button onClick={gerarEAssinarProposta} loading={loading}>
            Gerar proposta e assinar (Vertex)
          </Button>
        )}
        {podeAssinarProposta && (
          <Button onClick={abrirAssinaturaProposta}>Assinar proposta (Vertex)</Button>
        )}
        {aguardandoCliente && (
          <span style={{ fontSize: 13, color: '#8A9AB5', alignSelf: 'center' }}>
            Aguardando o cliente assinar a proposta…
          </span>
        )}
        {podeGerarContrato && (
          <Button onClick={gerarContratoManual} loading={loading}>
            Gerar contrato e assinar (Vertex)
          </Button>
        )}
        {podeAssinarContrato && (
          <Button onClick={abrirAssinaturaContrato}>Assinar contrato (Vertex)</Button>
        )}
        {aguardandoClienteContrato && (
          <span style={{ fontSize: 13, color: '#8A9AB5', alignSelf: 'center' }}>
            Aguardando o cliente assinar o contrato…
          </span>
        )}
        {podeCancelar && (
          <Button variant="ghost" onClick={() => abrir('cancelar')}>
            Cancelar proposta
          </Button>
        )}
      </div>

      {erro && <p style={{ color: '#D64545', fontSize: 13, marginTop: 8 }}>{erro}</p>}

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

      <Modal
        open={signAlvo !== null}
        onClose={() => { setSignAlvo(null); setSignKey('') }}
        title={signAlvo === 'contrato' ? 'Assinar contrato (Vertex)' : 'Assinar proposta (Vertex)'}
      >
        {signKey ? (
          <ClicksignEmbed signatureKey={signKey} host={host} onSigned={aoAssinarVertex} altura={560} />
        ) : (
          <p style={{ fontSize: 13, color: '#8A9AB5' }}>Sem chave de assinatura disponível.</p>
        )}
      </Modal>
    </>
  )
}
