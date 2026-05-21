import { createClient } from '@/lib/supabase/server'
import { ContractTemplate, ProposalTemplate } from '@/lib/db/types'
import { TemplatesPropostasClient } from './client'

export const dynamic = 'force-dynamic'

export default async function TemplatesPropostasPage() {
  const supabase = await createClient()

  const [{ data: propostas }, { data: contratos }] = await Promise.all([
    supabase.from('proposal_templates').select('*').order('nome'),
    supabase.from('contract_templates').select('*').eq('ativo', true).order('nome'),
  ])

  return (
    <TemplatesPropostasClient
      templates={(propostas ?? []) as ProposalTemplate[]}
      contratos={(contratos ?? []) as ContractTemplate[]}
    />
  )
}
