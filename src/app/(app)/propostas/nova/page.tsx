import { createClient } from '@/lib/supabase/server'
import { Client, ProposalTemplate } from '@/lib/db/types'
import { NovaPropostaForm } from './form'

export const dynamic = 'force-dynamic'

interface SearchParams {
  cliente?: string
}

export default async function NovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { cliente: clienteId } = await searchParams

  const [{ data: templates }, clienteRes] = await Promise.all([
    supabase
      .from('proposal_templates')
      .select('id, nome, slug, descricao, escopo_padrao, contract_template_id, ativo, criado_em, atualizado_em')
      .eq('ativo', true)
      .order('nome'),
    clienteId
      ? supabase.from('clients').select('*').eq('id', clienteId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <NovaPropostaForm
      templates={(templates ?? []) as ProposalTemplate[]}
      clientePre={(clienteRes.data ?? null) as Client | null}
    />
  )
}
