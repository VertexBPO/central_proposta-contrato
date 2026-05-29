'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { aprovarPropostaPeloCliente, rejeitarPropostaPeloCliente } from './actions'

interface Props {
  token: string
  numero: string
  empresa: string
  status: string
  propostaId: string
}

type Etapa = 'visualizar' | 'rejeitando' | 'aprovado' | 'rejeitado' | 'ja_decidida'

export function AprovarClient({ token, numero, empresa, status, propostaId }: Props) {
  const jaDecidida = ['aprovada_cliente', 'proposta_assinatura_pendente', 'proposta_assinada', 'aguardando_cadastro', 'contrato_gerado', 'contrato_assinatura_pendente', 'contrato_assinado'].includes(status)
  const jaRejeitada = status === 'perdida' || status === 'rejeitada'

  const inicial: Etapa = jaRejeitada ? 'rejeitado' : jaDecidida ? 'ja_decidida' : 'visualizar'

  const [etapa, setEtapa] = useState<Etapa>(inicial)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aprovar() {
    setErro(null)
    setSalvando(true)
    const r = await aprovarPropostaPeloCliente(token)
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao aprovar.')
      return
    }
    setEtapa('aprovado')
  }

  async function rejeitar() {
    setErro(null)
    setSalvando(true)
    const r = await rejeitarPropostaPeloCliente(token, motivo)
    setSalvando(false)
    if (!r.ok) {
      setErro(r.erro ?? 'Erro ao rejeitar.')
      return
    }
    setEtapa('rejeitado')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FB', padding: 24 }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <Header empresa={empresa} numero={numero} />

        {etapa === 'visualizar' && (
          <>
            <PdfFrame propostaId={propostaId} />
            <Acoes>
              <Button variant="ghost" onClick={() => setEtapa('rejeitando')} style={{ color: '#D64545' }}>
                Rejeitar
              </Button>
              <Button onClick={aprovar} loading={salvando}>
                ✓ Aprovar proposta
              </Button>
            </Acoes>
            {erro && <Erro mensagem={erro} />}
          </>
        )}

        {etapa === 'rejeitando' && (
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Rejeitar proposta</h2>
            <p style={{ fontSize: 13, color: '#8A9AB5', marginBottom: 16 }}>
              Conta pra Vertex o motivo. Esse retorno é usado pra entender o que melhorar.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: valor acima do orçamento, prazo não atende, etc."
              rows={6}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #E5EAF2',
                borderRadius: 10,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            {erro && <Erro mensagem={erro} />}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setEtapa('visualizar')}>
                Voltar
              </Button>
              <Button variant="danger" onClick={rejeitar} loading={salvando}>
                Confirmar rejeição
              </Button>
            </div>
          </Card>
        )}

        {etapa === 'aprovado' && (
          <Card>
            <Icone bg="#E6F5EC" cor="#1B9E5C">✓</Icone>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Proposta aprovada!</h2>
            <p style={{ fontSize: 14, color: '#5A6B85', marginBottom: 16 }}>
              Agora você receberá um e-mail da Clicksign com o link pra assinar a proposta digitalmente.
              Após a Vertex também assinar, você receberá um novo link pra preencher o cadastro do contrato.
            </p>
            <p style={{ fontSize: 13, color: '#8A9AB5' }}>Pode fechar essa página.</p>
          </Card>
        )}

        {etapa === 'rejeitado' && (
          <Card>
            <Icone bg="#FCE8E8" cor="#D64545">✕</Icone>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Proposta rejeitada</h2>
            <p style={{ fontSize: 14, color: '#5A6B85' }}>
              Vertex recebeu o seu retorno. Em breve entraremos em contato se houver ajuste a propor.
            </p>
          </Card>
        )}

        {etapa === 'ja_decidida' && (
          <Card>
            <Icone bg="#F0F4FB" cor="#2E6FE5">i</Icone>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 8 }}>Proposta já decidida</h2>
            <p style={{ fontSize: 14, color: '#5A6B85' }}>
              Essa proposta já avançou na esteira. Status atual: <strong>{status}</strong>.
              Se você acabou de assinar, em breve receberá os próximos passos por e-mail.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function Header({ empresa, numero }: { empresa: string; numero: string }) {
  return (
    <div style={{ marginBottom: 24, textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #4F7CFF 0%, #2E6FE5 100%)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(46,111,229,0.3)',
        }}
      >
        V
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0D1B3E', marginBottom: 4 }}>
        Proposta Comercial {numero}
      </h1>
      <p style={{ fontSize: 14, color: '#8A9AB5' }}>{empresa} · Enviada pela Vertex BPO</p>
    </div>
  )
}

function PdfFrame({ propostaId }: { propostaId: string }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(13,27,62,0.06)',
      }}
    >
      <iframe
        src={`/api/propostas/${propostaId}/pdf`}
        title="Proposta"
        style={{ width: '100%', height: '70vh', border: 'none', display: 'block' }}
      />
    </div>
  )
}

function Acoes({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
        padding: 16,
        background: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(13,27,62,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  )
}

function Icone({ bg, cor, children }: { bg: string; cor: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        background: bg,
        color: cor,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 700,
        margin: '0 auto 16px',
      }}
    >
      {children}
    </div>
  )
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <div
      style={{
        background: '#FCE8E8',
        color: '#D64545',
        padding: 12,
        borderRadius: 10,
        fontSize: 13,
        marginTop: 12,
      }}
    >
      {mensagem}
    </div>
  )
}
