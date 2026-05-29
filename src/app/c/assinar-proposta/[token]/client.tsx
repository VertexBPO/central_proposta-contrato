'use client'

import { useState } from 'react'
import { ClicksignEmbed } from '@/components/ClicksignEmbed'
import { CadastroClient } from '@/app/c/cadastro/[token]/client'
import { confirmarAssinaturaClienteProposta } from './actions'

interface Props {
  token: string
  numero: string
  status: string
  empresa: string
  emailCliente: string
  responsavelAtual: string
  clienteKey: string
  host: string
}

type Etapa = 'assinar' | 'cadastro'

export function AssinarPropostaClient(props: Props) {
  const { token, numero, status, empresa, emailCliente, responsavelAtual, clienteKey, host } = props
  // Se já assinou, pula direto pro cadastro do contrato.
  const jaAssinou = ['proposta_assinada', 'aguardando_cadastro', 'contrato_gerado', 'contrato_assinatura_pendente'].includes(status)
  const [etapa, setEtapa] = useState<Etapa>(jaAssinou ? 'cadastro' : 'assinar')
  const [confirmando, setConfirmando] = useState(false)

  async function aoAssinar() {
    if (confirmando) return
    setConfirmando(true)
    await confirmarAssinaturaClienteProposta(token)
    setEtapa('cadastro')
  }

  if (etapa === 'cadastro') {
    return (
      <CadastroClient
        token={token}
        numero={numero}
        empresa={empresa}
        emailCliente={emailCliente}
        responsavelAtual={responsavelAtual}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', padding: 24 }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0D1B3E', marginBottom: 4 }}>
            Assine a proposta {numero}
          </h1>
          <p style={{ fontSize: 14, color: '#8A9AB5' }}>{empresa} · Vertex BPO</p>
        </div>

        {!clienteKey ? (
          <div style={{ background: '#FCE8E8', color: '#D64545', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            Assinatura indisponível: este link ainda não tem uma solicitação de assinatura ativa.
          </div>
        ) : (
          <ClicksignEmbed signatureKey={clienteKey} host={host} onSigned={aoAssinar} altura={680} />
        )}
      </div>
    </div>
  )
}
