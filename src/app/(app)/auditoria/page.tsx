import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'

export const dynamic = 'force-dynamic'

interface AuditLog {
  id: string
  user_id: string | null
  acao: string
  entidade: string
  entidade_id: string | null
  justificativa: string | null
  ip: string | null
  criado_em: string
}

interface UserMap {
  [id: string]: { nome: string; email: string }
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string; acao?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('users').select('papel').eq('id', user.id).maybeSingle()
  if (!me || me.papel !== 'admin') redirect('/dashboard')

  const { entidade, acao } = await searchParams

  let query = supabase.from('audit_logs').select('*').order('criado_em', { ascending: false }).limit(200)
  if (entidade) query = query.eq('entidade', entidade)
  if (acao) query = query.eq('acao', acao)

  const { data } = await query
  const logs = (data ?? []) as AuditLog[]

  // Carrega usuários referenciados (apenas os que aparecem)
  const userIds = Array.from(new Set(logs.map((l) => l.user_id).filter(Boolean) as string[]))
  const { data: usersData } = userIds.length
    ? await supabase.from('users').select('id, nome, email').in('id', userIds)
    : { data: [] }
  const userMap: UserMap = {}
  ;(usersData ?? []).forEach((u: { id: string; nome: string; email: string }) => {
    userMap[u.id] = { nome: u.nome, email: u.email }
  })

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader title="Auditoria" subtitle={`Últimos ${logs.length} eventos`} />

      <Card>
        {logs.length === 0 ? (
          <p style={{ color: '#8A9AB5' }}>Nenhum log de auditoria registrado.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5EAF2' }}>
                <th style={th}>Quando</th>
                <th style={th}>Usuário</th>
                <th style={th}>Ação</th>
                <th style={th}>Entidade</th>
                <th style={th}>Justificativa</th>
                <th style={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #E5EAF2' }}>
                  <td style={td}>
                    {new Date(log.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={td}>
                    {log.user_id
                      ? userMap[log.user_id]?.nome ?? log.user_id.slice(0, 8)
                      : <span style={{ color: '#8A9AB5' }}>cliente</span>}
                  </td>
                  <td style={td}>
                    <Badge variant="primary">{log.acao}</Badge>
                  </td>
                  <td style={td}>{log.entidade}</td>
                  <td style={{ ...td, color: '#8A9AB5', maxWidth: 320 }}>{log.justificativa ?? '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#8A9AB5' }}>{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#8A9AB5',
  textTransform: 'uppercase',
}
const td: React.CSSProperties = { padding: '10px 8px', verticalAlign: 'top' }
