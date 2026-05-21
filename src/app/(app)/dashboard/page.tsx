import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Client, Proposal, StatusProposta, formatCurrency, formatDate } from '@/lib/db/types'
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/db/status'
import { formatCnpj } from '@/lib/db/cnpj'

export const dynamic = 'force-dynamic'

interface SearchParams {
  status?: StatusProposta
}

type PropWithClient = Proposal & { clients: Client }

const CARDS: { status: StatusProposta; label: string; cor: string }[] = [
  { status: 'rascunho', label: 'Rascunhos', cor: '#8A9AB5' },
  { status: 'aguardando_aprovacao', label: 'Aguardando aprovação', cor: '#E8A93C' },
  { status: 'enviada', label: 'Enviadas', cor: '#2E6FE5' },
  { status: 'aberta', label: 'Abertas', cor: '#2E6FE5' },
  { status: 'em_negociacao', label: 'Em negociação', cor: '#E8A93C' },
  { status: 'fechada', label: 'Fechadas', cor: '#1B9E5C' },
  { status: 'contrato_gerado', label: 'Contratos', cor: '#1B9E5C' },
  { status: 'perdida', label: 'Perdidas', cor: '#D64545' },
]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { status: statusFiltro } = await searchParams

  // Counts em paralelo
  const counts = await Promise.all(
    CARDS.map(async (c) => {
      const { count } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', c.status)
      return { ...c, valor: count ?? 0 }
    })
  )

  // Lista (filtrada ou tudo)
  let query = supabase
    .from('proposals')
    .select('*, clients (*)')
    .order('atualizado_em', { ascending: false })
    .limit(50)

  if (statusFiltro) {
    query = query.eq('status', statusFiltro)
  }

  const { data } = await query
  const propostas = (data ?? []) as PropWithClient[]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do funil comercial"
        actions={
          <Link href="/propostas/nova">
            <Button>+ Nova proposta</Button>
          </Link>
        }
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {counts.map((card) => {
          const ativo = statusFiltro === card.status
          return (
            <Link
              key={card.status}
              href={ativo ? '/dashboard' : `/dashboard?status=${card.status}`}
              style={{ textDecoration: 'none' }}
            >
              <Card
                padding={16}
                style={{ borderColor: ativo ? card.cor : '#E5EAF2', borderWidth: ativo ? 2 : 1, borderStyle: 'solid' }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#8A9AB5',
                    marginBottom: 6,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: card.cor }}>{card.valor}</div>
              </Card>
            </Link>
          )
        })}
      </section>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            {statusFiltro ? `Propostas: ${STATUS_LABEL[statusFiltro]}` : 'Propostas recentes'}
          </h2>
          {statusFiltro && (
            <Link href="/dashboard" style={{ fontSize: 13, color: '#8A9AB5' }}>
              limpar filtro
            </Link>
          )}
        </div>
        {propostas.length === 0 ? (
          <p style={{ color: '#8A9AB5', fontSize: 14 }}>
            {statusFiltro
              ? 'Nenhuma proposta com esse status.'
              : 'Nenhuma proposta ainda. Crie a primeira pelo botão acima.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {propostas.map((p) => {
              const total = Number(p.valor_adesao) + Number(p.valor_parcela) * p.num_parcelas
              return (
                <Link
                  key={p.id}
                  href={`/propostas/${p.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #E5EAF2',
                    textDecoration: 'none',
                    gap: 16,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, width: 110 }}>
                      {p.numero}
                    </span>
                    <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    <span style={{ fontSize: 13, color: '#0D1B3E', minWidth: 0, flex: 1 }}>
                      {p.clients?.razao_social}{' '}
                      <span style={{ color: '#8A9AB5', fontSize: 12 }}>
                        — {formatCnpj(p.clients?.cnpj ?? '')}
                      </span>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#8A9AB5' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1B3E' }}>
                      {formatCurrency(total)}
                    </div>
                    <div>{formatDate(p.data_proposta)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
