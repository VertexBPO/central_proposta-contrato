import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Client } from '@/lib/db/types'
import { formatCnpj } from '@/lib/db/cnpj'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { q } = await searchParams

  let query = supabase
    .from('clients')
    .select('*')
    .is('deletado_em', null)
    .order('razao_social')

  if (q && q.trim()) {
    const termo = q.trim()
    query = query.or(`razao_social.ilike.%${termo}%,cnpj.ilike.%${termo}%`)
  }

  const { data } = await query
  const clientes = (data ?? []) as Client[]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader title="Contratantes" subtitle={`${clientes.length} empresa(s) cadastrada(s)`} />

      <form style={{ marginBottom: 16 }}>
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por razão social ou CNPJ…"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #E5EAF2',
            background: '#FFFFFF',
            fontSize: 14,
            minHeight: 44,
          }}
        />
      </form>

      {clientes.length === 0 ? (
        <Card>
          <p style={{ color: '#8A9AB5' }}>
            {q ? 'Nenhum contratante encontrado para essa busca.' : 'Nenhum contratante cadastrado ainda. Crie uma nova proposta — o contratante preenche os próprios dados.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientes.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} style={{ textDecoration: 'none' }}>
              <Card padding={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0D1B3E', marginBottom: 4 }}>
                      {c.razao_social}
                    </h3>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8A9AB5' }}>
                      <span>CNPJ {formatCnpj(c.cnpj)}</span>
                      {c.email && <span>{c.email}</span>}
                      {c.responsavel_nome && <span>{c.responsavel_nome}</span>}
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
  )
}
