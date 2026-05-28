import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Client, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/db/status'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { EditarClienteBtn } from './editar-cliente'

export const dynamic = 'force-dynamic'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cli }, { data: props }, { data: { user } }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).maybeSingle(),
    supabase.from('proposals').select('*').eq('client_id', id).order('data_proposta', { ascending: false }),
    supabase.auth.getUser(),
  ])

  if (!cli) notFound()
  const cliente = cli as Client
  const propostas = (props ?? []) as Proposal[]

  let isAdmin = false
  if (user) {
    const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
    isAdmin = me?.papel === 'admin'
  }

  const fechadas = propostas.filter((p) => ['fechada', 'contrato_gerado'].includes(p.status)).length
  const perdidas = propostas.filter((p) => p.status === 'perdida').length
  const ticketMedio =
    fechadas > 0
      ? propostas
          .filter((p) => ['fechada', 'contrato_gerado'].includes(p.status))
          .reduce((s, p) => s + Number(p.valor_adesao) + Number(p.valor_parcela) * p.num_parcelas, 0) / fechadas
      : 0

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title={cliente.razao_social}
        subtitle={`CNPJ ${formatCnpj(cliente.cnpj)}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <EditarClienteBtn cliente={cliente} isAdmin={isAdmin} />
            <Link href={`/propostas/nova?cliente=${cliente.id}`}>
              <Button>+ Nova proposta</Button>
            </Link>
          </div>
        }
      />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card padding={20}>
          <div style={{ fontSize: 12, color: '#8A9AB5', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total de propostas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0D1B3E' }}>{propostas.length}</div>
        </Card>
        <Card padding={20}>
          <div style={{ fontSize: 12, color: '#8A9AB5', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Fechadas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1B9E5C' }}>{fechadas}</div>
        </Card>
        <Card padding={20}>
          <div style={{ fontSize: 12, color: '#8A9AB5', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Perdidas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#D64545' }}>{perdidas}</div>
        </Card>
        <Card padding={20}>
          <div style={{ fontSize: 12, color: '#8A9AB5', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Ticket médio</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E' }}>{formatCurrency(ticketMedio)}</div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Empresa</h3>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>E-mail</dt>
              <dd>{cliente.email}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Telefone</dt>
              <dd>{cliente.telefone || '—'}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Endereço</dt>
              <dd>
                {[cliente.endereco_logradouro, cliente.endereco_numero, cliente.endereco_complemento]
                  .filter(Boolean)
                  .join(', ') || '—'}
                {cliente.endereco_bairro && (
                  <>
                    <br />
                    {cliente.endereco_bairro}
                    {cliente.endereco_cidade && ` — ${cliente.endereco_cidade}/${cliente.endereco_uf}`}
                  </>
                )}
              </dd>
            </div>
          </dl>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 16 }}>Responsável</h3>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Nome</dt>
              <dd>{cliente.responsavel_nome || '—'}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Cargo</dt>
              <dd>{cliente.responsavel_cargo || '—'}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>CPF</dt>
              <dd>{cliente.responsavel_cpf || '—'}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>E-mail corporativo</dt>
              <dd>{cliente.responsavel_email || '—'}</dd>
            </div>
            <div>
              <dt style={{ color: '#8A9AB5', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Endereço residencial</dt>
              <dd>
                {[cliente.responsavel_endereco_logradouro, cliente.responsavel_endereco_numero, cliente.responsavel_endereco_complemento]
                  .filter(Boolean)
                  .join(', ') || '—'}
                {cliente.responsavel_endereco_bairro && (
                  <>
                    <br />
                    {cliente.responsavel_endereco_bairro}
                    {cliente.responsavel_endereco_cidade && ` — ${cliente.responsavel_endereco_cidade}/${cliente.responsavel_endereco_uf}`}
                  </>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Histórico de propostas</h3>
          {propostas.length === 0 ? (
            <Card>
              <p style={{ color: '#8A9AB5' }}>Nenhuma proposta criada para essa empresa ainda.</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {propostas.map((p) => (
                <Link key={p.id} href={`/propostas/${p.id}`} style={{ textDecoration: 'none' }}>
                  <Card padding={16}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#0D1B3E', fontWeight: 600 }}>
                            {p.numero}
                          </span>
                          <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: '#8A9AB5' }}>
                          {formatDate(p.data_proposta)} ·{' '}
                          {formatCurrency(Number(p.valor_adesao) + Number(p.valor_parcela) * p.num_parcelas)} ·{' '}
                          {p.prazo_meses} {p.prazo_meses === 1 ? 'mês' : 'meses'}
                        </div>
                      </div>
                      <span style={{ color: '#8A9AB5', fontSize: 18 }}>›</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
