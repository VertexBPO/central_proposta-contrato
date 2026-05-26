import { createClient } from '@/lib/supabase/server'
import { Client, Contractor, ProposalTemplate, CustomPlaceholder } from '@/lib/db/types'
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

  const [{ data: templates }, { data: contratantes }, { data: customs }, clienteRes] = await Promise.all([
    supabase
      .from('proposal_templates')
      .select('id, nome, slug, descricao, escopo_padrao, contract_template_id, ativo, criado_em, atualizado_em')
      .eq('ativo', true)
      .order('nome'),
    supabase.from('contractors').select('*').eq('ativo', true).order('razao_social'),
    supabase
      .from('custom_placeholders')
      .select('*')
      .in('categoria', ['proposta_assessoria', 'proposta_bpo', 'contrato'])
      .eq('ativo', true)
      .order('nome'),
    clienteId
      ? supabase.from('clients').select('*').eq('id', clienteId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <NovaPropostaForm
      templates={(templates ?? []) as ProposalTemplate[]}
      contratantes={(contratantes ?? []) as Contractor[]}
      customPlaceholders={(customs ?? []) as CustomPlaceholder[]}
      clientePre={(clienteRes.data ?? null) as Client | null}
    />
  )
}
