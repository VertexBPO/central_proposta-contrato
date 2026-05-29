import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { clicksignHost } from '@/lib/clicksign/client'
import { AssinarContratoClient } from './client'

export const dynamic = 'force-dynamic'

export default async function AssinarContratoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: prop } = await admin
    .from('proposals')
    .select('id, numero, status, magic_link_expira_em, client_id')
    .eq('magic_link_token', token)
    .maybeSingle()

  if (!prop) notFound()
  if (prop.magic_link_expira_em && new Date(prop.magic_link_expira_em) < new Date()) notFound()

  const [{ data: cli }, { data: ctr }] = await Promise.all([
    admin.from('clients').select('razao_social').eq('id', prop.client_id).maybeSingle(),
    admin.from('contracts').select('assinatura_cliente_key').eq('proposal_id', prop.id).maybeSingle(),
  ])

  return (
    <AssinarContratoClient
      token={token}
      numero={prop.numero}
      status={prop.status}
      empresa={cli?.razao_social ?? ''}
      clienteKey={ctr?.assinatura_cliente_key ?? ''}
      host={clicksignHost()}
    />
  )
}
