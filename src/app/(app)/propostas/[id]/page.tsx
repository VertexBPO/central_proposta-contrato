import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Client, Proposal, ProposalTemplate, ContractTemplate, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/db/status'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { PropostaAcoes } from './acoes'

export const dynamic = 'force-dynamic'

interface AuditLog {
  id: string
  user_id: string | null
  acao: string
  justificativa: string | null
  criado_em: string
}

export default async function PropostaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: propRaw } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle()
  if (!propRaw) notFound()
  const proposta = propRaw as Proposal

  const [{ data: cli }, { data: tpl }, { data: logs }, {
    data: { user },
  }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', proposta.client_id).maybeSingle(),
    supabase
      .from('proposal_templates')
      .select('*')
      .eq('id', proposta.proposal_template_id)
      .maybeSingle(),
    supabase
      .from('audit_logs')
      .select('id, user_id, acao, justificativa, criado_em')
      .eq('entidade_id', id)
      .order('criado_em', { ascending: false })
      .limit(20),
    supabase.auth.getUser(),
  ])

  const cliente = cli as Client | null
  const template = tpl as ProposalTemplate | null

  const contractTemplateId = proposta.contract_template_id_override ?? template?.contract_template_id
  const { data: ctpl } = contractTemplateId
    ? await supabase.from('contract_templates').select('*').eq('id', contractTemplateId).maybeSingle()
    : { data: null }
  const contractTemplate = ctpl as ContractTemplate | null

  let papel: 'admin' | 'operador' = 'operador'
  if (user) {
    const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
    if (me) papel = me.papel as 'admin' | 'operador'
  }

  const auditLogs = (logs ?? []) as AuditLog[]
  const valorTotal = Number(proposta.valor_adesao) + Number(proposta.valor_parcela) * proposta.num_parcelas

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title={`Proposta ${proposta.numero}`}
        subtitle={cliente ? cliente.razao_social : '—'}
        actions={<Badge variant={STATUS_VARIANT[proposta.status]}>{STATUS_LABEL[proposta.status]}</Badge>}
      />

      <PropostaAcoes id={proposta.id} status={proposta.status} papel={papel} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <a
          href={`/api/propostas/${proposta.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '8px 16px',
            background: '#F0F4FB',
            color: '#0D1B3E',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          📄 Visualizar PDF da Proposta
        </a>
        <a
          href={`/api/propostas/${proposta.id}/contrato-pdf`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '8px 16px',
            background: '#F0F4FB',
            color: '#0D1B3E',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          📄 Visualizar PDF do Contrato
        </a>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Resumo comercial</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 13 }}>
              <Resumo label="Template" value={template?.nome ?? '—'} />
              <Resumo label="Prazo" value={`${proposta.prazo_meses} ${proposta.prazo_meses === 1 ? 'mês' : 'meses'}`} />
              <Resumo label="Data início" value={formatDate(proposta.data_inicio_contrato)} />
              <Resumo label="Valor de adesão" value={formatCurrency(Number(proposta.valor_adesao))} />
              <Resumo label={`${proposta.num_parcelas}× parcela`} value={formatCurrency(Number(proposta.valor_parcela))} />
              <Resumo label="Valor total" value={formatCurrency(valorTotal)} bold />
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Escopo</h3>
            <div
              style={{
                background: '#F0F4FB',
                padding: 16,
                borderRadius: 10,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              {proposta.escopo_final}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#8A9AB5' }}>
              Tipo: <strong style={{ color: '#0D1B3E' }}>{proposta.escopo_tipo}</strong>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Histórico</h3>
            {auditLogs.length === 0 ? (
              <p style={{ color: '#8A9AB5', fontSize: 13 }}>Sem eventos registrados ainda.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #E5EAF2', fontSize: 13 }}
                  >
                    <span style={{ color: '#8A9AB5', fontSize: 11, width: 110, flexShrink: 0 }}>
                      {new Date(log.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span style={{ fontWeight: 600 }}>{log.acao}</span>
                    {log.justificativa && (
                      <span style={{ color: '#8A9AB5', flex: 1 }}>{log.justificativa}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Cliente</h3>
            {cliente && (
              <>
                <Link href={`/clientes/${cliente.id}`} style={{ fontSize: 14, fontWeight: 600 }}>
                  {cliente.razao_social}
                </Link>
                <div style={{ fontSize: 12, color: '#8A9AB5', marginTop: 4 }}>CNPJ {formatCnpj(cliente.cnpj)}</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>{cliente.email}</div>
                {cliente.telefone && <div style={{ fontSize: 12 }}>{cliente.telefone}</div>}
              </>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Contrato vinculado</h3>
            <div style={{ fontSize: 13 }}>{contractTemplate?.nome ?? '—'}</div>
            {proposta.contract_template_id_override && (
              <div style={{ fontSize: 11, color: '#E8A93C', marginTop: 4 }}>(override aplicado)</div>
            )}
          </Card>
        </aside>
      </section>
    </div>
  )
}

function Resumo({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8A9AB5', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: '#0D1B3E' }}>{value}</div>
    </div>
  )
}
