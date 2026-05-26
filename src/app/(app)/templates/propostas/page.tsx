import { createClient } from '@/lib/supabase/server'
import { ContractTemplate, ProposalTemplate, CustomPlaceholder } from '@/lib/db/types'
import { TemplatesPropostasClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TemplatesPropostasPage() {
  const supabase = await createClient()

  const [{ data: propostas }, { data: contratos }, { data: customs }] = await Promise.all([
    supabase.from('proposal_templates').select('*').order('nome'),
    supabase.from('contract_templates').select('*').eq('ativo', true).order('nome'),
    supabase
      .from('custom_placeholders')
      .select('*')
      .in('categoria', ['proposta_assessoria', 'proposta_bpo'])
      .order('nome'),
  ])

  return (
    <TemplatesPropostasClient
      templates={(propostas ?? []) as ProposalTemplate[]}
      contratos={(contratos ?? []) as ContractTemplate[]}
      customPlaceholders={(customs ?? []) as CustomPlaceholder[]}
    />
  )
}
