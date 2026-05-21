import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Client, Proposal, formatCurrency, formatDate } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

type PropWithClient = Proposal & { clients: Client }

export default async function AprovacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin') redirect('/dashboard')

  const { data } = await supabase
    .from('proposals')
    .select('*, clients (*)')
    .eq('status', 'aguardando_aprovacao')
    .order('atualizado_em', { ascending: true })

  const propostas = (data ?? []) as PropWithClient[]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Aprovações"
        subtitle={`${propostas.length} proposta(s) aguardando sua aprovação`}
      />

      {propostas.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>Nenhuma proposta aguardando aprovação.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {propostas.map((p) => {
            const total = Number(p.valor_adesao) + Number(p.valor_parcela) * p.num_parcelas
            return (
              <Link key={p.id} href={`/propostas/${p.id}`} style={{ textDecoration: 'none' }}>
                <Card padding={20}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{p.numero}</span>
                        <Badge variant="warning">Aguardando aprovação</Badge>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0D1B3E', marginBottom: 4 }}>
                        {p.clients.razao_social}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A9AB5' }}>
                        CNPJ {formatCnpj(p.clients.cnpj)} · Submetida em {formatDate(p.data_proposta)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0D1B3E' }}>{formatCurrency(total)}</div>
                      <div style={{ fontSize: 11, color: '#8A9AB5' }}>
                        {p.prazo_meses} {p.prazo_meses === 1 ? 'mês' : 'meses'}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
