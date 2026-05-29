'use client'

import { useState } from 'react'
import { ClicksignEmbed } from '@/components/ClicksignEmbed'
import { confirmarAssinaturaClienteContrato } from './actions'

interface Props {
  token: string
  numero: string
  status: string
  empresa: string
  clienteKey: string
  host: string
}

export function AssinarContratoClient({ token, numero, status, empresa, clienteKey, host }: Props) {
  const jaAssinado = status === 'contrato_assinado'
  const [assinado, setAssinado] = useState(jaAssinado)
  const [confirmando, setConfirmando] = useState(false)

  async function aoAssinar() {
    if (confirmando) return
    setConfirmando(true)
    await confirmarAssinaturaClienteContrato(token)
    setAssinado(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', padding: 24 }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0D1B3E', marginBottom: 4 }}>
            Assine o contrato {numero}
          </h1>
          <p style={{ fontSize: 14, color: '#8A9AB5' }}>{empresa} · Vertex BPO</p>
        </div>

        {assinado ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5EAF2',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(13,27,62,0.06)',
            }}
          >
            <div
              style={{
                width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16,
                background: '#E6F5EC', color: '#1B9E5C', fontSize: 28, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Contrato assinado!</h2>
            <p style={{ fontSize: 14, color: '#5A6B85' }}>
              Tudo certo. Você receberá por e-mail a proposta e o contrato assinados. Pode fechar esta página.
            </p>
          </div>
        ) : !clienteKey ? (
          <div style={{ background: '#FCE8E8', color: '#D64545', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            Assinatura indisponível: o contrato ainda não tem uma solicitação de assinatura ativa.
          </div>
        ) : (
          <ClicksignEmbed signatureKey={clienteKey} host={host} onSigned={aoAssinar} altura={680} />
        )}
      </div>
    </div>
  )
}
