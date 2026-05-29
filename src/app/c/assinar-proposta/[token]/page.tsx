import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { clicksignHost } from '@/lib/clicksign/client'
import { AssinarPropostaClient } from './client'

export const dynamic = 'force-dynamic'

export default async function AssinarPropostaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: prop } = await admin
    .from('proposals')
    .select('id, numero, status, magic_link_expira_em, assinatura_cliente_key, client_id')
    .eq('magic_link_token', token)
    .maybeSingle()

  if (!prop) notFound()
  if (prop.magic_link_expira_em && new Date(prop.magic_link_expira_em) < new Date()) notFound()

  const { data: cli } = await admin
    .from('clients')
    .select('razao_social, email, responsavel_nome')
    .eq('id', prop.client_id)
    .maybeSingle()

  return (
    <AssinarPropostaClient
      token={token}
      numero={prop.numero}
      status={prop.status}
      empresa={cli?.razao_social ?? ''}
      emailCliente={cli?.email ?? ''}
      responsavelAtual={cli?.responsavel_nome ?? ''}
      clienteKey={prop.assinatura_cliente_key ?? ''}
      host={clicksignHost()}
    />
  )
}
